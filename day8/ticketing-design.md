# TicketHub System Design

## 1. Requirements

### Functional requirements

- Visitors can browse and search events, and view event details and a seat map with current seat availability.
- Registered users can temporarily hold available seats, pay for an order, and view their confirmed tickets.
- A user can hold no more than four seats for one event. Holds expire after five minutes unless checkout is in progress.
- Users receive a clear success or failure result for checkout. A completed ticket is associated with a paid order and a specific seat.
- The system records payment attempts and handles repeated payment notifications without charging or issuing tickets twice.

### Non-functional requirements

- **Speed:** Event listings and cached event details should normally load in under 300 ms at the 95th percentile. Seat availability and hold responses should normally complete in under 500 ms at the 95th percentile, excluding the payment provider.
- **Correctness:** A seat can belong to at most one active hold and at most one completed sale. Payment retries, network retries, and duplicate callbacks must be idempotent. The database, not a cache or browser, is the authority for seat availability.
- **Fairness:** At a scheduled sale, users enter a waiting room and are admitted in a published, auditable order (randomized within the pre-sale waiting room, then first-in-first-out). Admission is rate-limited and shared across servers; refreshing or opening multiple tabs does not improve a user's place. A per-user ticket limit and bot/rate controls reduce bulk buying.
- **Availability and resilience:** Browsing may continue if checkout is degraded. A waiting room absorbs surges, and failed payment or background jobs can be retried without losing confirmed orders.
- **Security and privacy:** Require authenticated checkout, authorize every order/ticket lookup, protect payment details through a payment provider, and avoid storing card numbers. Encrypt traffic and sensitive stored data.

## 2. Traffic and capacity estimates

Assumptions: a day has 86,400 seconds; the provided daily figures are spread evenly only to calculate an average. Real traffic is burstier. For a rough normal API estimate, treat each page view as one dynamic request; static assets are delivered separately through the CDN. The popular-sale estimate assumes each of the 200,000 buyers makes six dynamic API calls during the first ten minutes (for example, event/seat reads, a hold, checkout, and ticket/order status).

### Normal day

- **Page views:** 50,000 visitors x 10 pages = **500,000 page views/day**, or **5.8 page views/second on average**.
- Those daily visitors are **2.5% of the 2 million registered users**; registration count is a stored-user scale, not a claim that all accounts are active each day.
- **Tickets sold:** 5,000 tickets/day / 86,400 = **0.058 ticket sales/second on average** (about one ticket every 17 seconds).
- This is a modest average, but the system should be sized for peaks rather than treating the daily average as a peak target.

### Popular concert sale

- **Attempting buyers:** 200,000 / 600 seconds = **333 buyers/second on average** over ten minutes.
- **Dynamic API calls:** 200,000 x 6 / 600 = **2,000 API requests/second on average** over the sale window. A five-times short burst would be about **10,000 requests/second**; this is a planning assumption, not a measured peak.
- **Tickets:** 20,000 seats offered in ten minutes means up to **33 ticket sales/second on average** if every seat sells evenly. The remaining 180,000 people cannot buy one of those seats.
- The ten-minute ticket-sale rate is about **576 times** the normal-day average ticket-sale rate. The sale has **four times** as many potential ticket purchases as a normal day's sales compressed into ten minutes. Under the one-request-per-page assumption above, the sale's assumed API request rate is about **345 times** the normal average API request rate.

The waiting room limits how many users reach the seat and checkout services at once. The CDN and cache absorb repeatable reads; inventory writes remain protected by database transactions. Capacity should be load-tested against the assumed 10,000 request/second short burst and tuned using real results.

## 3. API

All endpoints are versioned under `/api/v1`. Checkout endpoints require authentication. Mutating checkout calls accept an `Idempotency-Key`, which the server stores with the result so a retry returns the original outcome rather than creating another hold, order, or payment.

| Method and path | Purpose |
|---|---|
| `GET /events?query=&date_from=&date_to=&cursor=` | Browse/search upcoming events; paginated and cacheable. |
| `GET /events/{event_id}` | Read event details, venue, sale state, and ticket limits. |
| `GET /events/{event_id}/seats` | Get seat-map data and an availability snapshot. This is advisory; a seat is not secured until a hold succeeds. |
| `POST /events/{event_id}/holds` | Hold one or more seat IDs for the authenticated user. Returns the hold ID and expiry time, or a conflict if any requested seat is unavailable. |
| `DELETE /holds/{hold_id}` | Release the user's unexpired hold early. |
| `POST /orders` | Create a pending order from the user's valid hold and start payment. Requires an idempotency key. |
| `POST /payments/webhook` | Receive signed, idempotent payment-provider status notifications. |
| `GET /me/tickets` | List the authenticated user's confirmed tickets. |
| `GET /me/orders/{order_id}` | View order and payment status for its owner. |

## 4. Data model

Use a relational SQL database for inventory, orders, and payment state. Primary and foreign keys enforce relationships. In the following schema, IDs are UUIDs unless otherwise noted.

| Table | Important columns and constraints |
|---|---|
| `users` | `id` primary key, `email` required unique, `created_at` |
| `events` | `id` primary key, `name`, `venue`, `starts_at`, `sale_opens_at`, `status` |
| `seats` | `id` primary key, `event_id` foreign key to `events`, `section`, `row_label`, `seat_number`, `status` (`available`, `held`, `sold`), nullable `held_by_user_id` foreign key to `users`, nullable `hold_expires_at`, nullable `pending_order_id` foreign key to `orders`; unique (`event_id`, `section`, `row_label`, `seat_number`) |
| `orders` | `id` primary key, `user_id` foreign key to `users`, `status` (`pending`, `paid`, `failed`, `refunded`), `total_amount`, unique `idempotency_key`, `created_at` |
| `order_items` | `id` primary key, `order_id` foreign key to `orders`, `seat_id` foreign key to `seats`, `price`; created only when payment is successfully finalized; unique `seat_id` ensures a seat cannot appear in two completed order records |
| `payments` | `id` primary key, `order_id` foreign key to `orders`, provider reference unique, `status`, amount, unique provider event/idempotency reference |

An event has many seats. A user can have many orders, and an order has one or more order items. Each order item refers to one seat; each seat belongs to one event. An order can have payment attempts/records, each associated with that order. Index `seats(event_id, status)` for availability queries, `orders(user_id, created_at)` for order history, and `order_items(order_id)` for ticket retrieval. The unique constraints complement, but do not replace, the transaction logic below.

## 5. Preventing double-booking

The seat row in the primary SQL database is authoritative. A seat-map response may be slightly stale, so the hold request must attempt to claim seats atomically:

1. Start a short database transaction. Lock the requested seat rows in a consistent order to reduce deadlocks.
2. For every requested seat, update it from `available` to `held` for this user, setting `hold_expires_at`. Also allow reclaiming a `held` row only if its expiry is at or before the database's current time. The update condition checks the current status/expiry; require the number of updated rows to equal the number requested.
3. If any seat cannot be claimed, roll back the whole transaction and return `409 Conflict`; none of the requested seats are held. Otherwise commit and return the hold.

The row lock and conditional update serialize competing requests: when two people request the same seat, only one transaction can change it from available (or expired) to held. The second sees the committed held state and fails. Expired holds are also treated as reclaimable during the claim transaction, so correctness does not depend on a cleanup job running on time. A background job can clear old hold metadata for tidiness, but it is not the correctness mechanism.

To check out, a transaction verifies that all seats are still held by that user and that the hold has not expired, creates a pending order, associates the reserved seats with it through `pending_order_id`, then extends the reservation for a bounded payment window. Payment runs outside the database transaction. A verified, idempotent payment success is finalized in another transaction that confirms those seats still belong to that pending order, marks the order paid and seats sold, and creates the order items. Creating order items only at successful finalization means failed orders do not permanently prevent a later sale of the same seat. A unique `order_items.seat_id` constraint is a final safeguard against duplicate completed sales. If payment fails or times out, release seats only when they are still reserved for that order; if a success callback arrives after the reservation was released, void/refund it rather than issue a second ticket. The client never marks a seat sold, and caches are never used to decide whether a hold is valid.

## 6. Architecture

```text
 [Web / Mobile Clients]
       |  browse, queue token, checkout
       v
 [CDN + WAF] ------ static assets / cached public event data
       |
       v
 [Load Balancer / API Gateway] <----> [Shared Rate Limits + Sale Waiting Room]
       |                                      |
       v                                      +---- admits fair, bounded batches
 [Stateless Ticket API Servers] <-------------+
       |             |                 \
       | browse      | inventory/order  \ payment request
       v             v                   v
 [Read Cache]  [SQL Primary]       [Payment Provider]
                    |  ^                  |
                    |  +--- signed webhook+
                    |
                    +----> [Read Replica]
                    |
                    +----> [Queue] ----> [Workers / Notifications]
```

- **CDN and WAF:** Deliver static assets and cache public event data close to visitors; filter common abusive traffic. Never cache authoritative hold/sale decisions as if they were current.
- **Load balancer and API gateway:** Route requests to healthy stateless API instances, authenticate/validate requests, enforce rate limits, and apply request timeouts.
- **Shared waiting room:** Places sale entrants in one coordinated queue and admits bounded batches using auditable tokens. It smooths the 200,000-person arrival burst and applies the sale's fairness rule across API instances.
- **Ticket API servers:** Scale horizontally to handle browsing, seat map, hold, order, and ticket requests. They contain no local inventory authority; all seat claims go through the SQL primary.
- **Read cache and SQL read replica:** Reduce load from repeated event and seat-map reads. Short cache lifetimes are acceptable for display-only availability because every hold is revalidated against the primary.
- **SQL primary:** Stores canonical seats, holds, orders, and payment state. Transactions, row locks, and constraints protect inventory correctness. Keep inventory writes on the primary; replica lag must never decide a sale.
- **Payment provider:** Processes card details so TicketHub does not store them. Webhooks are signature-checked and handled idempotently.
- **Queue and workers:** Send receipts/notifications and perform retryable background tasks after durable state changes. They are not on the seat-claim critical path.

During a big sale, the waiting room limits concurrency, the CDN/cache serve repeated reads, and stateless APIs can add instances. The primary database is the deliberate bottleneck for contested inventory: it serializes seat claims instead of accepting unsafe parallel writes. Monitor queue wait time, request latency, database lock time, and payment outcomes; shed or defer nonessential work before compromising inventory correctness.

## 7. Trade-offs

- **Fair waiting room versus immediate access:** A queue provides controlled, auditable admission and protects checkout from a thundering herd, but users wait even when some seats are available. Randomizing the pre-sale line is harder to explain than simple first-come-first-served, but reduces advantages from faster networks or automated early refreshes.
- **Strongly consistent SQL inventory versus greater write distribution:** A primary with transactions and row locks gives a clear correctness boundary and makes double-booking preventable. It limits write throughput for highly contested seats and can become a hot spot; distributing seat ownership across independent databases would scale writes but make cross-seat orders and consistency harder.
- **Cached seat maps versus perfectly fresh displays:** Caching lets many users browse without overwhelming the database, but a displayed seat can be taken before the user clicks it. Rechecking and atomically holding in the primary keeps checkout correct, at the cost of occasional conflict responses and a seat map that is not a reservation.
- **Five-minute holds versus conversion time:** A short expiry lets abandoned seats return quickly to inventory, but can inconvenience a buyer who is completing payment. A bounded payment extension helps complete legitimate checkouts but reduces the time seats are available to others.

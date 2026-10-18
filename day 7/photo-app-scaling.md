# SnapShare Photo-App Scaling Plan

## Assumptions and Workload

- SnapShare has 10 million registered users, and 10% are active on a typical day.
- Each daily active user uploads one photo and views 50 feed pages per day.
- Each original photo averages 2 MB; each photo also has one 50 KB thumbnail (0.05 MB, using decimal units).
- Requests and uploads are spread evenly across 24 hours for the average rate; peak feed traffic is 5 times the average.
- The annual storage estimate covers 365 days of new uploads, with no deletion, compression, or storage replication included. It counts both originals and thumbnails, but excludes metadata and operational overhead.

Daily active users (DAU):

`10,000,000 registered users x 10% = 1,000,000 DAU`

## Traffic and Storage Estimates

- **Uploads:** 1,000,000 photos/day / 86,400 seconds/day = **11.6 uploads/second on average** (about 12/s).
- **Feed views:** 1,000,000 users x 50 pages/day = 50,000,000 page views/day; / 86,400 = **579 views/second on average** and **2,894 views/second at 5x peak**.
- **Photo storage per year:** 1,000,000 photos/day x 365 days x (2 MB + 0.05 MB) = **748,250,000 MB/year**, or about **748 TB/year** in decimal units (about 680 TiB).

## Read or Write Heavy?

SnapShare is **read-heavy**: each active user generates 50 feed-page views for every one photo upload, so the expected feed-reading workload substantially exceeds the upload workload. The design should scale and optimize reads with a CDN for photo delivery, a cache for frequently requested feed data, and a read replica for database queries, while still keeping uploads reliable through durable object storage and asynchronous thumbnail processing.

## Architecture

```text
                            +----------------------+
                            |        CDN           |
                            | cached photos/thumbs |
                            +----------+-----------+
                                       ^
                                       | photo delivery
                                       |
[Mobile/Web Client] ---- feed/upload requests ----> [Load Balancer]
       |                                              |
       | direct photo upload                         v
       +------------------------------------> [App Servers]
                                                    |       \
                                  feed cache read   |        \ photo bytes
                                                    v         v
                                                [Cache]  [Object Storage]
                                                    |       originals + thumbs
                                                    v              ^
                                             [Database Primary]    |
                                                    |              |
                                                    v              |
                                             [Read Replica]        |
                                                                   |
[App Servers] -- thumbnail job --> [Queue] --> [Thumbnail Worker]
                                               |          |
                                               |          +-- writes thumbnail --> Object Storage
                                               +-- job status/metadata --> Database Primary
```

## Component Responsibilities

- **CDN:** Serves cached photo and thumbnail files from locations near users, reducing latency and origin traffic.
- **Load balancer:** Distributes incoming API requests across healthy app servers so traffic can scale horizontally and a failed server does not take down the service.
- **App servers:** Authenticate users, validate requests, coordinate uploads, maintain photo metadata, and build feed responses.
- **Cache:** Keeps frequently requested feed data and metadata in fast memory to reduce repeated database reads.
- **Database primary:** Stores durable structured data such as users, follow relationships, photo metadata, and upload/job status, and handles writes.
- **Database read replica:** Serves feed and other read queries to offload the primary, with the understanding that replication may lag briefly.
- **Object storage:** Stores original photos and generated thumbnails as durable, scalable files, rather than placing large binary files in database rows.
- **Queue:** Buffers thumbnail jobs so upload requests can finish without waiting for image processing and jobs can be retried after worker failures.
- **Thumbnail worker:** Consumes queued jobs, creates the 50 KB thumbnail, stores it in object storage, and updates the photo's processing status.

## Why Photos Belong in Object Storage

Photos are large binary files, so putting them in database rows would inflate database storage and backups, increase the cost and time of database operations, and make it harder to scale file delivery independently. Store photo files in object storage, and keep their object keys, ownership, dimensions, and other searchable metadata in the database; the CDN can cache and deliver the files efficiently.

## Upload Flow

1. The client asks an app server to start an upload; the app authenticates the user, validates the request, and creates a pending photo record in the database.
2. The app returns a short-lived upload URL for the original photo in object storage, and the client uploads the photo bytes directly there.
3. After the object upload succeeds, the client confirms completion to the app; the app records the original object's key and publishes a thumbnail job to the queue.
4. The app can return the photo as pending while the queue buffers work; the client does not need to wait for thumbnail generation.
5. A thumbnail worker consumes the job, reads the original from object storage, creates the thumbnail, and writes it back to object storage.
6. The worker updates the photo metadata and processing status in the database; once available, the thumbnail and original can be delivered through the CDN.

## Trade-Offs

- **Direct client upload versus proxying through app servers:** Direct uploads reduce app-server bandwidth and make large uploads easier to scale, but require secure, short-lived upload URLs and careful validation of completed objects.
- **Asynchronous thumbnails versus immediate processing:** A queue makes uploads faster and lets workers scale independently, but thumbnails are not immediately available and the system must handle retries, duplicate jobs, and visible pending/failed states.
- **Read replica and cache versus immediate consistency:** They improve feed-read capacity and latency, but cached data can be stale and a replica may lag behind the primary; critical writes and read-after-write checks may need to use the primary.
- **Object storage plus CDN versus database-only storage:** Files scale and deliver independently from application data, but the system must coordinate metadata with object lifecycle, access permissions, and cleanup of abandoned uploads.

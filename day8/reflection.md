# Reflection

The most difficult concept in the course was reasoning about consistency when several people or services act on the same data at once. It was easy to describe a feature; it took more work to identify which component must be authoritative, where a transaction begins and ends, and what should happen when a request is retried or fails halfway through. I overcame this by writing down the important state changes as steps, then checking what could happen if two requests tried the same change or if one step failed.

For my capstone, I would improve the assumptions and failure-path explanations using the feedback I would most want to apply: make the difference between average traffic and a short peak clearer, and explain what happens when a dependency is slow or unavailable. I would add a load-test plan and more detail on how the design behaves under partial failure, rather than relying only on a diagram and average-rate estimates.

Next, I want to learn how to validate system-design estimates and architecture decisions with practical load testing and observability. I would like to build a small service, generate realistic concurrent requests, and use latency and error metrics to find where the design stops meeting its goals. That would help me turn design assumptions into evidence and make better scaling decisions.

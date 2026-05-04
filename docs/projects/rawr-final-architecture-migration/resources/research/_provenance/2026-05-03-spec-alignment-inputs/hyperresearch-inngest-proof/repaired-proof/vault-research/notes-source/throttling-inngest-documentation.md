---
title: Throttling - Inngest Documentation
id: throttling-inngest-documentation
created: '2026-05-03T08:17:32.936236Z'
source: https://www.inngest.com/docs/guides/throttling
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:32.936005Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Throttling - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Flow control
Throttling
Copy Markdown
Open
Throttling allows you to specify how many function runs can start within a time period. When the limit is reached, new function runs over the throttling limit will be
enqueued for the future
. Throttling is FIFO (first in first out). Some use cases for throttling include:
Evenly distributing function execution over time to reduce spikes.
Working around third-party API rate limits.
How to configure throttling
TypeScript
Go
Python
Copy
Copied
inngest
.createFunction
(
{
id
:
"unique-function-id"
,
throttle
:
{
limit
:
1
,
period
:
"5s"
,
burst
:
2
,
key
:
"event.data.user_id"
,
}
,
triggers
:
{ event
:
"ai/summary.requested"
}
,
}
,
async
({ event
,
step })
=>
{
}
,
);
You can configure throttling on each function using the optional
throttle
parameter.  The options directly control the generic cell rate algorithm parameters used within the queue.
Configuration reference
limit
: The total number of runs allowed to start within the given
period
.
period
: The period within the limit will be applied.
burst
: The number of runs allowed to start in the given window in a single burst on top of
limit
.
key
: An optional expression which returns a throttling key using event data. This allows you to apply unique throttle limits specific to a user.
GCRA breaks down the provided
period
into smaller windows based on the
limit
.
Without bursts, GCRA will admit a single request for every window. Inngest may attempt to start multiple pending function runs in a short time window, so to guarantee maximum throughput, we start
limit + burst
function runs in each window, which allows all requests to start within the configured
period
.
This is required as background jobs do not arrive at the same rate as the events triggering them.
Configuration information
Using throttle ensures that within a window of the given
period
, at most
limit + burst
runs may start.
Period must be between
1s
and
7d
, or between 1 second and 7 days. The minimum granularity is one second.
Throttling is currently applied per function. Two functions with the same key have two separate limits.
Every request is evenly weighted and counts as a single unit in the rate limiter.
How throttling works
Throttling uses the
generic cell rate algorithm (GCRA)
to limit function run
starts
directly in the queue. When you send an event or invoke a function that specifies throttling configuration, Inngest checks the function's throttle limit to see if there's capacity:
If there's capacity, the function run starts as usual.
If there is no capacity, the function run will begin when there's capacity in the future.
Note that throttling only applies to function run starts.  It does not apply to steps within a function.  This allows you to regulate how often functions begin work,
without
worrying about how many steps are in a function, or if steps run in parallel.  To limit how many steps can execute at once, use
concurrency controls
.
Throttling is
FIFO (first in first out)
, so the first function run to be enqueued will be the first to start when there's capacity.
Throttling vs Concurrency
Concurrency
limits the
number of executing steps across your function runs
.  This allows you to manage the total capacity of your functions.
Throttling
limits the number of
new function runs
being started.  It does not limit the number of executing steps.  For example, with a throttling limit of 1 per minute, only one run will start in a single minute.  However, that run may execute hundreds of steps, as throttling does not limit steps.
Throttling vs Rate Limiting
Rate limiting also specifies how many functions can start within a time period.  However, in Inngest rate limiting ignores function runs over the limit and does not enqueue them for future work. Throttling will enqueue runs over the limit for the future.
Rate limiting is
lossy
and provides hard limits on function runs, while throttling delays function runs over the limit until there’s capacity, smoothing spikes.
Tips
Configure
start timeouts
to prevent large backlogs with throttling
Further reference
TypeScript SDK Reference
Python SDK Reference

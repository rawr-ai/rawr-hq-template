---
title: Batching events - Inngest Documentation
id: batching-events-inngest-documentation
created: '2026-05-03T08:17:29.312108Z'
source: https://www.inngest.com/docs/guides/batching
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:29.311866Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Batching events - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Flow control
Batching events
Copy Markdown
Open
Batching allows a function to process multiple events in a single run. This is useful for high load systems where it's more efficient to handle a batch of events together rather than handling each event individually. Some use cases for batching include:
Reducing the number of requests to an external API that supports batch operations.
Creating a batch of database writes to reduce the number of transactions.
Reducing the number of requests to your
Inngest app
to improve performance or serverless costs.
How to configure batching
TypeScript
Code
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
"record-api-calls"
,
batchEvents
:
{
maxSize
:
100
,
timeout
:
"5s"
,
key
:
"event.data.user_id"
,
// Optional: batch events by user ID
if
:
"event.data.account_type == \"free\""
,
// Optional: Only batch events from free accounts
}
,
triggers
:
{ event
:
"log/api.call"
}
,
}
,
async
({ events
,
step })
=>
{
// NOTE: Use the `events` argument, which is an array of event payloads
const
attrs
=
events
.map
((evt)
=>
{
return
{
user_id
:
evt
.
data
.user_id
,
endpoint
:
evt
.
data
.endpoint
,
timestamp
:
toDateTime
(
evt
.ts)
,
account_type
:
evt
.
data
.account_type
,
};
});
const
result
=
await
step
.run
(
"record-data-to-db"
,
async
()
=>
{
return
db
.bulkWrite
(attrs);
});
return
{ success
:
true
,
recorded
:
result
.
length
};
}
);
Configuration reference
maxSize
- The maximum number of events to add to a single batch.
timeout
- The duration of time to wait to add events to a batch. If the batch is not full after this time, the function will be invoked with whatever events are in the current batch, regardless of size.
key
- An optional
expression
using event data to batch events by. Each unique value of the
key
will receive its own batch, enabling you to batch events by any particular key, like a user ID.
if
- An optional
boolean expression
using event data to conditionally batch events that evaluate to true on this expression.
It is recommended to consider the overall batch size that you will need to process including the typical event payload size. Processing large batches can lead to memory or performance issues in your application.
For system safety purposes, We also enforce a 10 MiB size limit for a batch, meaning if the size of the total number of events exceeds 10 MiB, the batch will start execution even if it's not full or has reached a timeout.
This limit cannot be changed at the moment.
How batching works
When batching is enabled, Inngest creates a new batch when the first event is received. The batch is filled with events until the
maxSize
is reached
or
the
timeout
is up. The function is then invoked with the full list of events in the batch. When
key
is set, Inngest will maintain a batch for each unique key, which allows you to batch events belonging to a single entity, for example a customer.
Depending on your SDK, the
events
argument will contain the full list of events within a batch. This allows you to operate on all of them within a single function.
Conditional Batching
Conditional Batching can be enabled by providing a boolean expression in
if
.  If the expression cannot be evaluated to a boolean value or if the expression evaluates to
false
, batching will be skipped for this event and the event will be scheduled for execution immediately.
Combining with other flow control methods
Batching does not work with all other flow control features.
Batching with Concurrency limits
You can combine batching with
concurrency
limits. For example, setting
concurrency: { limit: 1 }
will process one batch at a time.
Batching with Custom Concurrency keys
When a concurrency limit has a
key
,
the key is evaluated against the first event in the batch
. This means:
If your batch contains events with different key values, only the first event's key value is used for the concurrency check
This can lead to unintuitive behavior if events with different key values end up in the same batch, which can happen when there is no batch key or when the batch key is different from the concurrency key.
For predictable behavior,
use the same key expression for both batching and concurrency
. When the batch
key
and the concurrency
key
match, batches are naturally grouped by key value, so the concurrency limit applies per key as expected — allowing up to
n
concurrent batches per unique key.
Incompatible flow control features
You
cannot
use batching with
idempotency
,
rate limiting
,
cancellation events
, or
priority
.
Limitations
Check our
pricing page
to verify the batch size limits for each plan.
Further reference
TypeScript SDK Reference
Python SDK Reference

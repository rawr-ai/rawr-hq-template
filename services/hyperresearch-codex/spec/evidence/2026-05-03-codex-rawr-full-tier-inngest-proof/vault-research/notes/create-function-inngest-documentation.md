---
title: Create Function - Inngest Documentation
id: create-function-inngest-documentation
created: '2026-05-03T08:00:35.007434Z'
source: https://www.inngest.com/docs/reference/typescript/functions/create
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:00:35.007202Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Create Function - Inngest Documentation
Search...
Contact sales
Sign Up
Create Function
Copy Markdown
Open
Define your functions using the
createFunction
method on the
Inngest client
.
Copy
Copied
import
{ inngest }
from
"./client"
;
export
default
inngest
.createFunction
(
{
id
:
"import-product-images"
,
triggers
:
{ event
:
"shop/product.imported"
}
,
}
,
async
({ event
,
step
,
runId })
=>
{
// Your function code
}
);
inngest.createFunction(configuration, handler): InngestFunction
The
createFunction
method accepts a series of arguments to define your function.
Configuration
Name
id
Type
string
Required
required
Description
A unique identifier for your function. This should not change between deploys.
Name
name
Type
string
Required
optional
Description
A name for your function. If defined, this will be shown in the UI as a friendly display name instead of the ID.
Name
triggers
Type
Trigger | Trigger[]
Required
optional
Description
One or more triggers.
Trigger helpers
like
eventType()
and
cron()
are recommended, but you can also use normal objects.
Name
concurrency
Type
number | object | [object, object]
Required
optional
Description
Limit the number of concurrently running functions (
reference
)
Show nested properties
Name
limit
Type
number
Required
required
Description
The maximum number of concurrently running steps.
Name
scope
Type
'account' | 'env' | 'fn'
Required
optional
Description
The scope for the concurrency limit, which impacts whether concurrency is managed on an individual function, across an environment, or across your entire account.
fn
(default):  only the runs of this function affects the concurrency limit
env
:  all runs within the same environment that share the same evaluated key value will affect the concurrency limit.  This requires setting a
key
which evaluates to a virtual queue name.
account
:  every run that shares the same evaluated key value will affect the concurrency limit, across every environment.  This requires setting a
key
which evaluates to a virtual queue name.
Name
key
Type
string
Required
optional
Description
A unique key expression for which to restrict concurrently running steps to. The expression is evaluated for each triggering event and a unique key is generated. Read
our guide to writing expressions
for more info.
Name
throttle
Type
object
Required
optional
Description
Limits the number of new function runs started over a given period of time (
guide
).
Show nested properties
Name
limit
Type
number
Required
required
Description
The total number of runs allowed to start within the given
period
.
Name
period
Type
string
Required
required
Description
The period within which the
limit
will be applied.
Name
burst
Type
number
Required
optional
Description
The number of additional runs allowed to start in the given window in a single burst. This is added on top of the limit, which ensures high throughput within the period.
Name
key
Type
string
Required
optional
Description
A unique expression for which to apply the throttle limit to. The expression is evaluated for each triggering event and will be applied for each unique value. Read
our guide to writing expressions
for more info.
Name
idempotency
Type
string
Required
optional
Description
A key expression which is used to prevent duplicate events from triggering a function more than once in 24 hours. This is equivalent to setting
rateLimit
with a
key
, a
limit
of
1
and
period
of
24hr
.
Read the idempotency guide here
.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
Only run once for each customer id:
'event.data.customer_id'
Only run once for each account and email address:
'event.data.account_id + "-" + event.user.email'
Name
rateLimit
Type
object
Required
optional
Description
Options to configure how to rate limit function execution (
reference
)
Show nested properties
Name
limit
Type
number
Required
required
Description
The maximum number of functions to run in the given time period.
Name
period
Type
string
Required
required
Description
The time period of which to set the limit. The period begins when the first matching event is received.
Current permitted values are from
1s
to
60s
.
Name
key
Type
string
Required
optional
Description
A unique key expression to apply the limit to. The expression is evaluated for each triggering event.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
Rate limit per customer id:
'event.data.customer_id'
Rate limit per account and email address:
'event.data.account_id + "-" + event.user.email'
Name
debounce
Type
object
Required
optional
Description
Options to configure function debounce (
reference
)
Show nested properties
Name
period
Type
string
Required
required
Description
The time period of which to set the limit. The period begins when the first matching event is received.
Current permitted values are from
1s
to
7d
(
168h
).
Name
key
Type
string
Required
optional
Description
A unique key expression to apply the debounce to. The expression is evaluated for each triggering event.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
Debounce per customer id:
'event.data.customer_id'
Debounce per account and email address:
'event.data.account_id + "-" + event.user.email'
Name
priority
Type
object
Required
optional
Description
Options to configure how to prioritize functions
Show nested properties
Name
run
Type
string
Required
optional
Description
An expression which must return an integer between -600 and 600 (by default), with higher return values resulting in a higher priority.
Examples:
Return the priority within an event directly:
event.data.priority
(where
event.data.priority
is an int within your account's range)
Rate limit by a string field:
event.data.plan == 'enterprise' ? 180 : 0
See
reference
for more information.
Name
batchEvents
Type
object
Required
optional
Description
Configure how the function should consume batches of events (
reference
)
Show nested properties
Name
maxSize
Type
number
Required
required
Description
The maximum number of events a batch can have. Current limit is
100
.
Name
timeout
Type
string
Required
required
Description
How long to wait before invoking the function with the batch even if it's not full.
Current permitted values are from
1s
to
60s
.
Name
key
Type
string
Required
optional
Description
A unique key expression to apply the batching to. The expression is evaluated for each triggering event.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
Batch events per customer id:
'event.data.customer_id'
Batch events per account and email address:
'event.data.account_id + "-" + event.user.email'
Name
if
Type
string
Required
optional
Description
A boolean expression to conditionally batch events that evaluate to true on this expression. The expression is evaluated for each triggering event.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
Batch events for free account types:
'event.data.account_type == "free"'
Name
retries
Type
number
Required
optional
Description
Configure the number of times the function will be retried from
0
to
20
. Default:
4
Name
onFailure
Type
function
Required
optional
Description
A function that will be called only when this Inngest function fails after all retries have been attempted (
reference
)
Name
cancelOn
Type
array of objects
Required
optional
Description
Define events that can be used to cancel a running or sleeping function (
reference
)
Show nested properties
Name
event
Type
string | EventType
Required
required
Description
The event that will be used to cancel. This can be a string event name (e.g.
"app/user.deleted"
) or an event object created with
eventType()
Name
match
Type
string
Required
optional
Description
The property to match the event trigger and the cancelling event, using dot-notation, for example,
data.userId
. Read
our guide to writing expressions
for more info.
Name
if
Type
string
Required
optional
Description
An expression on which to conditionally match the original event trigger (
event
) and the wait event (
async
). Cannot be combined with
match
.
Expressions are defined using the Common Expression Language (CEL) with the events accessible using dot-notation. Read our
guide to writing expressions
for more info. Examples:
event.data.userId == async.data.userId && async.data.billing_plan == 'pro'
Name
timeout
Type
string
Required
optional
Description
The amount of time to wait to receive the cancelling event. A time string compatible with the
ms
package, e.g.
"30m"
,
"3 hours"
, or
"2.5d"
Name
timeouts
Type
object
Required
optional
Description
Options to configure timeouts for cancellation (
reference
)
Show nested properties
Name
start
Type
string
Required
optional
Description
The timeout for starting a function run.  If the time between scheduling and starting a function exceeds this duration, the function will be cancelled.
Examples are:
10s
,
45m
,
18h30m
.
Name
finish
Type
string
Required
optional
Description
The timeout for executing a run.  If a run takes longer than this duration to execute, the run will be cancelled.  This does not include the
time waiting for the function to start (see
timeouts.start
).
Examples are:
10s
,
45m
,
18h30m
.
Triggers
You can use
trigger helper functions
to define typed triggers with optional runtime validation:
Copy
Copied
import
{ eventType
,
cron }
from
"inngest"
;
import
{ z }
from
"zod"
;
const
orderPlaced
=
eventType
(
"shop/order.placed"
,
{
schema
:
z
.object
({ orderId
:
z
.string
()
,
total
:
z
.number
() })
,
});
inngest
.createFunction
(
{
id
:
"process-order"
,
triggers
:
[orderPlaced
,
cron
(
"0 * * * *"
)]
,
}
,
async
({ event
,
step })
=>
{
// event.data is fully typed
}
);
Alternatively, you can specify an array of up to 10 of the following triggers to invoke
your function with multiple events or crons. See the
Multiple Triggers
guide.
Cron triggers with overlapping schedules for a single function will be deduplicated.
Name
event
Type
string | EventType
Required
optional
Description
The event that will trigger this function to run. This can be a string event name (e.g.
"app/user.created"
) or an event object created with
eventType()
.
Name
cron
Type
string
Required
optional
Description
A
unix-cron
compatible schedule string.
Optional timezone prefix, e.g.
TZ=Europe/Paris 0 12 * * 5
.
When using an
event
trigger, you can optionally combine it with the
if
option to filter events:
Additional options
Name
if
Type
string
Required
optional
Description
A comparison expression that returns true or false whether the function should handle or ignore a given matching event.
Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read
our guide to writing expressions
for more info. Examples:
'event.data.action == "published"'
'event.data.priority >= 4'
Handler
The handler is your code that runs whenever the trigger occurs. Every function handler receives a single object argument which can be deconstructed. The key arguments are
event
and
step
. Note, that scheduled functions that use a
cron
trigger will not receive an
event
argument.
Copy
Copied
function
handler
({ event
,
events
,
step
,
runId
,
logger
,
attempt }) {
/* ... */
}
event
The event payload
object
that triggered the given function run. The event payload object will match what you send with
inngest.send()
. Below is an example event payload object:
Copy
Copied
{
name
:
"app/account.created"
,
data
:
{
userId
:
"1234567890"
}
,
v
:
"2023-05-12.1"
,
ts
:
1683898268584
}
events
events
is an array of
event
payload objects that's accessible when the
batchEvents
is set on the function configuration.
If batching is not configured, the array contains a single event payload matching the
event
argument.
step
The
step
object has methods that enable you to define
step.run()
- Run synchronous or asynchronous code as a retriable step in your function
step.sleep()
- Sleep for a given amount of time
step.sleepUntil()
- Sleep until a given time
step.invoke()
- Invoke another Inngest function as a step, receiving the result of the invoked function
step.waitForEvent()
- Pause a function's execution until another event is received
step.sendEvent()
- Send event(s) reliably within your function. Use this instead of
inngest.send()
to ensure reliable event delivery from within functions.
runId
The unique ID for the given function run. This can be useful for logging and looking up specific function runs in the Inngest dashboard.
logger
The
logger
object exposes the following interfaces.
Copy
Copied
export
interface
Logger
{
info
(
...
args
:
any
[])
:
void
;
warn
(
...
args
:
any
[])
:
void
;
error
(
...
args
:
any
[])
:
void
;
debug
(
...
args
:
any
[])
:
void
;
}
It is a proxy object that is either backed by
console
or the logger you provided (
reference
).
attempt
The current zero-indexed attempt number for this function execution. The first attempt will be 0, the second 1, and so on. The attempt number is incremented every time the function throws an error and is retried.
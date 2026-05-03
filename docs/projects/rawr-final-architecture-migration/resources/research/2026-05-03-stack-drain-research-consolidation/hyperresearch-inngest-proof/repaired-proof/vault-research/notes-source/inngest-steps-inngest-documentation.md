---
title: Inngest Steps - Inngest Documentation
id: inngest-steps-inngest-documentation
created: '2026-05-03T08:17:26.599114Z'
source: https://www.inngest.com/docs/learn/inngest-steps
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:26.598870Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Inngest Steps - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Steps
Inngest Steps
Copy Markdown
Open
Steps are fundamental building blocks in Inngest functions. Each step represents an individual task (or other unit of work) within a function that can be executed independently.
Steps are crucial because they allow functions to run specific tasks in a controlled and sequential (or parallel) manner. You can build complex workflows by chaining together simple, discrete operations.
On this page, you will learn about the benefits of using steps, and get an overview of the available step methods.
Benefits of Using Steps
Improved reliability
: structured steps enable precise control and handling of each task within a function.
Error handling
: capturing and managing errors at the step level means better error recovery.
Retry mechanism
: failing steps can be retried and recovered independently, without re-executing other successful steps.
Independent testing
: each step can be tested and debugged independently from others.
Improved code readability
: modular approach makes code easier to navigate and refactor.
If you'd like to learn more about how Inngest steps are executed, check the
"How Inngest functions are executed"
page.
Anatomy of an Inngest Step
The first argument of every Inngest step method is an
id
. Each step is treated as a discrete task which can be individually retried, debugged, or recovered. Inngest uses the ID to memoize step state across function versions.
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"import-product-images"
,
triggers
:
{ event
:
"shop/product.imported"
} }
,
async
({ event
,
step })
=>
{
const
uploadedImageURLs
=
await
step
.run
(
// step ID
"copy-images-to-s3"
,
// other arguments, in this case: a handler
async
()
=>
{
return
copyAllImagesToS3
(
event
.
data
.imageURLs);
});
}
);
The ID is also used to identify the function in the Inngest system.
Inngest's SDK also records a counter for each unique step ID. The counter increases every time the same step is called. This allows you to run the same step in a loop, without changing the ID.
Please note that each step is executed as
a separate HTTP request
. To ensure efficient and correct execution, place any non-deterministic logic (such as DB calls or API calls) within a
step.run()
call.
Available Step Methods
step.run()
This method executes a defined piece of code. Code within
step.run()
is automatically retried if it throws an error. When
step.run()
finishes successfully, the response is saved in the function run state and the step will not re-run.
Use it to run synchronous or asynchronous code as a retriable step in your function.
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"import-product-images"
,
triggers
:
{ event
:
"shop/product.imported"
} }
,
async
({ event
,
step })
=>
{
// Here goes the business logic
// By wrapping code in steps, it will be retried automatically on failure
const
uploadedImageURLs
=
await
step
.run
(
"copy-images-to-s3"
,
async
()
=>
{
return
copyAllImagesToS3
(
event
.
data
.imageURLs);
});
}
);
step.run()
acts as a code-level transaction. The entire step must succeed to complete.
step.sleep()
This method pauses execution for a specified duration. Even though it seems like a
setInterval
, your function does not run for that time (you don't use any compute). Inngest handles the scheduling for you. Use it to add delays or to wait for a specific amount of time before proceeding. At maximum, functions can sleep for a year (seven days for the
free tier plans
).
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"send-delayed-email"
,
triggers
:
{ event
:
"app/user.signup"
} }
,
async
({ event
,
step })
=>
{
await
step
.sleep
(
"wait-a-couple-of-days"
,
"2d"
);
// Do something else
}
);
step.sleepUntil() / step.sleep_until()
This method pauses execution until a specific date time. Any date time string in the format accepted by the Date object, for example
YYYY-MM-DD
or
YYYY-MM-DDHH:mm:ss
. At maximum, functions can sleep for a year (seven days for the
free tier plans
).
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"send-scheduled-reminder"
,
triggers
:
{ event
:
"app/reminder.scheduled"
} }
,
async
({ event
,
step })
=>
{
const
date
=
new
Date
(
event
.
data
.remind_at);
await
step
.sleepUntil
(
"wait-for-the-date"
,
date);
// Do something else
}
);
step.waitForEvent() / step.wait_for_event()
This method pauses a run's execution until a specific event is received.
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"send-onboarding-nudge-email"
,
triggers
:
{ event
:
"app/account.created"
} }
,
async
({ event
,
step })
=>
{
const
onboardingCompleted
=
await
step
.waitForEvent
(
"wait-for-onboarding-completion"
,
{ event
:
"app/onboarding.completed"
,
timeout
:
"3d"
,
if
:
"event.data.userId == async.data.userId"
}
);
// Do something else
}
);
step.waitForSignal() / step.wait_for_signal()
This method pauses a run's execution until a specific signal is received via our SDK or API.  Signals must
be unique across runs, and offer an API to resume specific runs given a unique signal vs events.
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"send-onboarding-nudge-email"
,
triggers
:
{ event
:
"app/account.created"
} }
,
async
({ event
,
step })
=>
{
const
onboardingCompleted
=
await
step
.waitForSignal
(
"wait-for-specific-signal"
,
{ signal
:
"task/0e7d16d1-8335-4b93-9122-76e7cc6d9eb6"
,
timeout
:
"3d"
}
);
// Do something with signal data
}
);
step.invoke()
This method is used to asynchronously call another Inngest function (
written in any language SDK
) and handle the result. Invoking other functions allows you to easily re-use functionality and compose them to create more complex workflows or map-reduce type jobs.
This method comes with its own configuration, which enables defining specific settings like concurrency limits.
Copy
Copied
// A function we will call in another place in our app
const
computeSquare
=
inngest
.createFunction
(
{ id
:
"compute-square"
,
triggers
:
{ event
:
"calculate/square"
} }
,
async
({ event })
=>
{
return
{ result
:
event
.
data
.number
*
event
.
data
.number };
// Result typed as { result: number }
}
);
// In this function, we'll call `computeSquare`
const
mainFunction
=
inngest
.createFunction
(
{ id
:
"main-function"
,
triggers
:
{ event
:
"main/event"
} }
,
async
({ step })
=>
{
const
square
=
await
step
.invoke
(
"compute-square-value"
,
{
function
:
computeSquare
,
data
:
{ number
:
4
}
,
// input data is typed, requiring input if it's needed
});
return
`Square of 4 is
${
square
.result
}
.`
;
// square.result is typed as number
}
);
step.sendEvent() / step.send_event()
This method sends events to Inngest to invoke functions with a matching event. Use
sendEvent()
when you want to trigger other functions, but you do not need to return the result. It is useful for example in
fan-out functions
.
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"user-onboarding"
,
triggers
:
{ event
:
"app/user.signup"
} }
,
async
({ event
,
step })
=>
{
// Do something
await
step
.sendEvent
(
"send-activation-event"
,
{
name
:
"app/user.activated"
,
data
:
{ userId
:
event
.
data
.userId }
,
});
// Do something else
}
);
Further reading
Quick Start
: learn how to build complex workflows.
"How Inngest functions are executed"
: Learn more about Inngest's execution model, including how steps are handled.
Docs guide:
"Multi-step functions"
.

---
title: Wait for an Event - Inngest Documentation
id: wait-for-an-event-inngest-documentation
created: '2026-05-03T08:17:28.808472Z'
source: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:28.808167Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Wait for an Event - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Steps
Wait for an Event
Copy Markdown
Open
You can pause a Function's run until a given event is received.
This is a useful pattern to react to specific user actions (for example, implement
Human in the loop
in AI Agent workflows), or to wait until something happens in external systems.
This is the recommended and preferred way to pause and resume a function via events or signals because:
Events fan out to many functions:  you can resume many runs from a single event, without changing application code.
Events are cleaner:  events decouple code from the functions they resume
Events have audit trails:  we store events in your OLAP store, giving you audit trails and insights automatically.
Use
step.waitForEvent()
to wait for a particular event to be received before continuing. It returns a
Promise
that is resolved with the received event or
null
if the event is not received within the timeout.
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
{
event
:
"app/onboarding.completed"
,
timeout
:
"3d"
,
// "async" is the received "ai/post.topic.selected" event here:
if
:
`async.data.completionId == "
${
generatedTopics
.completionId
}
"`
,
}
);
if
(
!
onboardingCompleted) {
// if no event is received within 3 days, onboardingCompleted will be null
}
else
{
// if the event is received, onboardingCompleted will be the event payload object
}
}
);
Check out the
step.waitForEvent()
TypeScript reference.
To add a simple time based delay to your code, use
step.sleep()
instead.
Examples
Dynamic functions that wait for additional user actions
Below is an example of an Inngest function that creates an Intercom or Customer.io-like drip email campaign, customized based on
Copy
Copied
export
default
inngest
.createFunction
(
{ id
:
"onboarding-email-drip-campaign"
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
// Send the user the welcome email immediately
await
step
.run
(
"send-welcome-email"
,
async
()
=>
{
await
sendEmail
(
event
.
user
.email
,
"welcome"
);
});
// Wait up to 3 days for the user to complete the final onboarding step
// If the event is received within these 3 days, onboardingCompleted will be the
// event payload itself, if not it will be null
const
onboardingCompleted
=
await
step
.waitForEvent
(
"wait-for-onboarding"
,
{
event
:
"app/onboarding.completed"
,
timeout
:
"3d"
,
// The "data.userId" must match in both the "app/account.created" and
// the "app/onboarding.completed" events
if
:
`async.data.userId == "
${
event
.
data
.userId
}
"`
,
});
// If the user has not completed onboarding within 3 days, send them a nudge email
if
(
!
onboardingCompleted) {
await
step
.run
(
"send-onboarding-nudge-email"
,
async
()
=>
{
await
sendEmail
(
event
.
user
.email
,
"onboarding_nudge"
);
});
}
else
{
// If they have completed onboarding, send them a tips email
await
step
.run
(
"send-tips-email"
,
async
()
=>
{
await
sendEmail
(
event
.
user
.email
,
"new_user_tips"
);
});
}
}
);
Preventing race conditions
The "wait for event" method begins listening for new events from when the code is executed. This means that events sent before the function is executed will not be handled by the wait.
To avoid race condition, always double-check the flow of events going through your functions.
Note: The "wait for event" mechanism will soon provide a "lookback" feature, including events from a given past timeframe.

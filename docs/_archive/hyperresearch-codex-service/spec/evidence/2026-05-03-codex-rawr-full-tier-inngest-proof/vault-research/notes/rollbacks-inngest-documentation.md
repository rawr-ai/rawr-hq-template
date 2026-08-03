---
title: Rollbacks - Inngest Documentation
id: rollbacks-inngest-documentation
created: '2026-05-03T08:00:37.512628Z'
source: https://www.inngest.com/docs/features/inngest-functions/error-retries/rollbacks
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:00:37.512392Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Rollbacks - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Error handling
Rollbacks
Copy Markdown
Open
Unlike an error being thrown in the main function's body, a failing step (one that has exhausted all retries) will throw a
StepError
. This allows you to handle failures for each step individually, where you can recover from the error gracefully.
If a step failure isn't handled, the error will bubble up to the function itself, which will then be marked as failed.
Below is an attempt to use DALL-E to generate an image from a prompt, and to fall back to Midjourney if it fails. Remember that these calls are split over separate requests, making the code much more durable against timeouts, transient errors, and these dependencies on external APIs.
Copy
Copied
inngest
.createFunction
(
{ id
:
"generate-result"
,
triggers
:
{ event
:
"prompt.created"
} }
,
async
({ event
,
step })
=>
{
// try one AI model, if it fails, try another
let
imageURL
:
string
|
null
=
null
;
let
via
:
"dall-e"
|
"midjourney"
;
try
{
imageURL
=
await
step
.run
(
"generate-image-dall-e"
,
()
=>
{
// open api call to generate image...
});
via
=
"dall-e"
;
}
catch
(err) {
imageURL
=
await
step
.run
(
"generate-image-midjourney"
,
()
=>
{
// midjourney call to generate image...
});
via
=
"midjourney"
;
}
await
step
.run
(
"notify-user"
,
()
=>
{
return
pusher
.trigger
(
event
.
data
.channelID
,
"image-result"
,
{
imageURL
,
via
,
});
});
}
,
);
Simple rollbacks
With this pattern, it's possible to assign a small rollback for each step, making sure that every action is safe regardless of how many steps are being run.
Copy
Copied
inngest
.createFunction
(
{ id
:
"add-data"
,
triggers
:
{ event
:
"app/row.data.added"
} }
,
async
({ event
,
step })
=>
{
// ignore the error - this step is fine if it fails
await
step
.run
(
"non-critical-step"
,
()
=>
{
return
updateMetric
();
})
.catch
();
// Add a rollback to a step
await
step
.run
(
"create-row"
,
async
()
=>
{
const
row
=
await
createRow
(
event
.
data
.rowId);
await
addDetail
(
event
.
data
.entry);
})
.catch
((err)
=>
step
.run
(
"rollback-row-creation"
,
async
()
=>
{
await
removeRow
(
event
.
data
.rowId);
})
,
);
}
,
);
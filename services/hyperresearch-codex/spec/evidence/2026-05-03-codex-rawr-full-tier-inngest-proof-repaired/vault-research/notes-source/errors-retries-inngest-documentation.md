---
title: Errors & Retries - Inngest Documentation
id: errors-retries-inngest-documentation
created: '2026-05-03T08:17:27.417348Z'
source: https://www.inngest.com/docs/guides/error-handling
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:27.417127Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Errors & Retries - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Errors & Retries
Copy Markdown
Open
Inngest Functions are designed to handle errors or exceptions gracefully and will automatically retry after an error or exception. This adds an immediate layer of durability to your code, ensuring it survives transient issues like network timeouts, outages, or database locks.
Inngest Functions come with:
Automatic Retries
Configurable with a custom retry policies to suit your specific use case.
Failure handlers
Utilize callbacks to handle all failing retries.
Rollbacks support
Each step within a function can have its own retry logic and be handled individually.
Types of failure
Inngest helps you handle both
errors
and
failures
, which are defined differently.
An
error
causes a step to retry. Exhausting all retry attempts will cause that step to
fail
, which means the step will never be attempted again this run.
A
failed
step can be handled with native language features such as
try
/
catch
, but unhandled errors will cause the function to
fail
, meaning the run is marked as "Failed" in the Inngest UI and all future executions are cancelled.
See how to handle step failure by
performing rollbacks
.
Failures, Retries and Idempotency
Re-running a step upon error requires its code to be idempotent, which means that running the same code multiple times won't have any side effect.
For example, a step inserting a new user to the database is not idempotent while a step
upserting a user
is.
Learn how to write idempotent steps that can be retried safely by reading
"Handling idempotency"
.
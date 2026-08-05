---
title: Flow Control - Inngest Documentation
id: flow-control-inngest-documentation
created: '2026-05-03T08:17:29.800832Z'
source: https://www.inngest.com/docs/guides/flow-control
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:29.800626Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Flow Control - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
Flow Control
Copy Markdown
Open
Flow control is a critical part of building robust applications. It allows you to manage the flow of data and events through your application which can help you manage resources, prevent overloading systems, and ensure that your application is responsive and reliable.
There are several methods to manage flow control for each Inngest function. Learn about each method and how to use them in your functions:
Concurrency
Limit the number of executing steps across your function runs. Ideal for limiting concurrent workloads by user, resource, or in general.
Throttling
Limit the throughput of function execution over a period of time. Ideal for working around third-party API rate limits.
Rate Limiting
Prevent excessive function runs over a given time period by
skipping
events beyond a specific limit. Ideal for protecting against abuse.
Debounce
Avoid unnecessary function invocations by de-duplicating events over a sliding time window. Ideal for preventing wasted work when a function might be triggered in quick succession.
Priority
Dynamically adjust the execution order of functions based on any data. Ideal for pushing critical work to the front of the queue.
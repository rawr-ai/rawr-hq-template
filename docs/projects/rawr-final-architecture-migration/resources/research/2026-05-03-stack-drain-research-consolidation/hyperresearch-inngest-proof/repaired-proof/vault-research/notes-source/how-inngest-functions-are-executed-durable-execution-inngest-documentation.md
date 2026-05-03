---
title: 'How Inngest functions are executed: Durable Execution - Inngest Documentation'
id: how-inngest-functions-are-executed-durable-execution-inngest-documentation
created: '2026-05-03T08:17:26.993784Z'
source: https://www.inngest.com/docs/learn/how-functions-are-executed
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:26.993553Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

How Inngest functions are executed: Durable Execution - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Concepts
How Inngest functions are executed: Durable Execution
Copy Markdown
Open
Most systems that offer durable execution require you to manage separate worker infrastructure, learn custom runtimes, or rewrite your application code to fit a specific programming model. Inngest takes a different approach: you write standard TypeScript, Python, or Go functions using a simple SDK, and Inngest handles execution durability, state persistence, retries, and flow control for you. There are no queues to configure, no workers to deploy, and no infrastructure to manage. Your functions run on your own compute, in any environment, including serverless.
One of the core features of Inngest is Durable Execution. Durable Execution allows your functions to be fault-tolerant and resilient to failures. The end result is that your code, and therefore, your overall application, is more reliable.
This page covers what Durable Execution is, how it works, and how it works with Inngest functions.
What is Durable Execution?
Durable Execution is a fault-tolerant approach to executing code that is achieved by handling failures and interruptions gracefully with automatic retries and state persistence. This means that your code can continue to run even if there are issues like network failures, timeouts, infrastructure outages, and other transient errors.
Key aspects of Durable Execution include:
State persistance
- Function state is persisted outside of the function execution context. This enables function execution to be resumed from the point of failure on the same
or
different infrastructure.
Fault-tolerance
- Errors or exceptions are caught by the execution layer and are automatically retried. Retry behavior can be customized to handle the accepted number of retries and handle different types of errors.
In practice, Durable Execution is implemented in the form of "durable functions," sometimes also called "durable workflows." Durable functions can throw errors or exceptions and automatically retry, resuming execution from the point of failure. Durable functions are designed to be long-running and stateful, meaning that they can persist state across function invocations and retries.
How Inngest functions work
Inngest functions are durable: they throw errors or exceptions, automatically retry from the point of failure, and can be stateful and long-running.
Inngest functions use "
Steps
" to define the execution flow of a function. Each step:
Is a unit of work that can be run and retried independently.
Captures any error or exception thrown within it.
Will not be re-executed if it has already been successfully executed.
Returns state (
data
) that can be used by subsequent steps.
Can be executed in parallel or sequentially, depending on the function's configuration.
Complex functions can consist of many steps. This allows a long-running function to be broken down into smaller, more manageable units of work. As each step is retried independently, and the function can be resumed from the point of failure, avoiding unnecessary re-execution of work.
In comparison, some Durable Execution systems modify the runtime environment to persist state or interrupt errors or exceptions. Inngest SDKs are written using standard language primitives, which enables Inngest functions to run in any environment or runtime - including serverless environments - without modification.
How steps are executed
Inngest functions are defined with a series of steps that define the execution flow of the function. Each step is defined with a unique ID and a function that defines the work to be done. The data returned can be used by subsequent steps.
Inngest functions execute incrementally,
step by step
. As a function is executed, the results of each step are returned to Inngest and persisted in a managed function state store. The steps that successfully executed are
memoized
. The function then resumes, skipping any steps that have already been completed and the SDK injects the data returned by the previous step into the function.
Each step in your function is executed as
a separate HTTP request
. Any non-deterministic logic (such as DB calls or API calls) must be placed within a
step.run()
call to ensure it executes efficiently and correctly in the context of the execution model.
Let's look at an example of a function and walk through how it is executed:
Copy
Copied
const
fn
=
inngest
.createFunction
(
{ id
:
"import-contacts"
,
triggers
:
{ event
:
"contacts/csv.uploaded"
} }
,
// The function handler:
async
({ event
,
step })
=>
{
const
rows
=
await
step
.run
(
"parse-csv"
,
async
()
=>
{
return
await
parseCsv
(
event
.
data
.fileURI);
});
const
normalizedRows
=
await
step
.run
(
"normalize-raw-csv"
,
async
()
=>
{
const
normalizedColumnMapping
=
getNormalizedColumnNames
();
return
normalizeRows
(rows
,
normalizedColumnMapping);
});
const
results
=
await
step
.run
(
"input-contacts"
,
async
()
=>
{
return
await
importContacts
(normalizedRows);
});
return
{ results };
}
);
Initial execution
When the function is first called, the
function handler
is called with only the
event
payload data sent.
When the first step is discovered, the
"parse-csv"
step is run. As the step has not been executed before, the step's code (the callback function) is run and the result is captured.
The function does not continue executing beyond this step. Each SDK uses a different method to interrupt the function execution before running any more code in your function handler.
Internally, the step's ID (
"parse-csv"
) is hashed as the state identifier to be used in future executions. Additionally, the steps' index (
0
in this case) is also included in the result.
The result is sent back to Inngest and persisted in the function state store.
Secondary executions - Memoization of steps
Each of the subsequent steps leverages the state of previous executions and memoization. Here's how it works:
The function is re-executed, this time with the
event
payload data and the state of the previous execution in JSON.
The next step is discovered (
"parse-csv"
).
The previous result is found in the state of previous executions. Internally, the SDK uses the hash of the step name to look up the result in the state data.
The step's code is not executed, instead the SDK injects the result into the return value of
step.run
, (in this example, the data will be returned as
rows
).
The function continues execution until the next step is discovered (
"normalize-raw-csv"
).
The step's code is executed and the result is returned to Inngest (in the same approach as steps 2-5 above).
Error handling
Some steps may throw errors or exceptions during execution. Here's how error handling works within function execution:
If an error occurs during the execution of a step (for example,
"input-contacts"
), the function is interrupted and the error is caught by the SDK.
The error is serialized and returned to Inngest. The number of attempts are logged and the error is persisted in the function state store.
Depending on the number of attempts configured for the function, the function may be retried (see:
Error handling
):
If the the function
has not
exhausted the number of attempts, the function is re-executed from the point of failure with the state of all previous step executions. The step is re-executed and follows the same process as above (see: steps 6-11).
If the function
has
exhausted the number of attempts, the function is re-executed with the error thrown. The function can then catch and handle the error as desired (see:
Handling a failing step
).
To learn about how determinism is handled and how you can version functions, read the
Versioning long running functions
guide.
How Inngest's execution model compares to Temporal
Temporal is a pull-based durable execution platform, and teams often evaluate both Temporal and Inngest when choosing how to build reliable, long-running workflows. The two systems take fundamentally different approaches to the problem.
Infrastructure and setup.
Temporal requires you to run and manage a Temporal Server cluster (or use Temporal Cloud), along with separate worker processes that poll for tasks. Inngest requires no separate infrastructure. Your functions run on your existing compute, whether that's a serverless platform, a container, or a traditional server. Inngest provides two ways to connect your functions to its execution engine:
serve
for serverless environments using HTTP endpoints, and
connect
for persistent worker-style deployments. Both approaches let Inngest handle orchestration, state management, and retries without requiring you to manage queue infrastructure or task polling.
Programming model.
Temporal uses a deterministic replay model where your entire workflow function is re-executed from the beginning on each step, relying on an internal event history to skip completed work. This requires developers to learn and follow strict determinism rules. Inngest uses a step-based memoization model where each step runs once, its result is persisted, and subsequent executions skip completed steps by injecting their stored results. This uses standard language features with no custom runtime rules.
Flow control.
Inngest includes
concurrency controls
,
prioritization
,
throttling
,
debouncing
,
rate limiting
, and
idempotency
as built-in features of the SDK, available in every environment: local development, self-hosted, and cloud. Temporal has recently introduced priority and fairness features for task queues, but fairness is a paid feature available only in Temporal Cloud.
Self-hosting.
Inngest can be self-hosted as a single binary with SQLite or Postgres as a backing store. Temporal self-hosting requires running multiple server components with a Cassandra or Postgres dependency, along with separate worker infrastructure.
Inngest
Temporal
Infrastructure
No separate infrastructure. Serve (serverless) or Connect (workers) on your compute.
Requires Temporal Server cluster + separate worker processes.
Programming model
Step-based memoization with standard language primitives.
Deterministic replay with strict runtime rules.
Flow control
Built-in:
concurrency
,
priority
,
throttling
,
debounce
,
rate limiting
. Available everywhere.
Priority and fairness features are paid, cloud-only.
Self-hosting
Single binary with SQLite or Postgres.
Multi-component cluster with Cassandra/Postgres.
Serverless support
Native. Designed for serverless-first environments.
Requires persistent worker processes; not serverless-native.
Conclusion
Inngest functions use steps and memoization to execute functions incrementally and durably. This approach ensures that functions are fault-tolerant and resilient to failures. By breaking down functions into steps, Inngest functions can be retried and resumed from the point of failure. This approach ensures that your code is more reliable and can handle transient errors gracefully.
Further reading
More information on Durable Execution in Inngest:
Blog post:
"How we built a fair multi-tenant queuing system"
Blog post:
"Debouncing in Queueing Systems: Optimizing Efficiency in Asynchronous Workflows"
Blog post:
"Accidentally Quadratic: Evaluating trillions of event matches in real-time"
Blog post:
"Queues aren't the right abstraction"

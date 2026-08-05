---
title: Connect - Inngest Documentation
id: connect-inngest-documentation
created: '2026-05-03T08:00:39.500841Z'
source: https://www.inngest.com/docs/setup/connect
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:00:39.500599Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Connect - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Guides
Deploying
Connect
Copy Markdown
Open
Connect is currently in Public Beta. Read more about the
Public Beta release phase here
.
The
connect
API allows your app to create an outbound persistent connection to Inngest. Each app can establish multiple connections to Inngest, which enable you to scale horizontally across multiple workers. The key benefits of using
connect
compared to
serve
are:
Lowest latency
- Persistent connections enable the lowest latency between your app and Inngest.
Elastic horizontal scaling
- Easily add more capacity by running additional workers.
Ideal for container runtimes
-  Deploy on Kubernetes or ECS without the need of a load balancer for inbound traffic
Simpler long running steps
- Step execution is not bound by platform http timeouts.
The number of concurrent worker connections available depends on your plan. For new plans, the limits are:
Free plan: 3 concurrent worker connections
All paid plans: 20 concurrent worker connections
Max apps per connection: 10
You can find your plan's connection limits on your
billing page
.
Minimum requirements
Language
TypeScript
: SDK
3.34.1
or higher.
Go
: SDK
0.11.2
or higher.
Python
: SDK
0.5.0
or higher.
Install the SDK with
pip install inngest[connect]
since there are additional dependencies required.
We also recommend the following constraints:
protobuf>=5.29.4,<6.0.0
psutil>=6.0.0,<7.0.0
websockets>=15.0.0,<16.0.0
Runtime
You must use a long running server (Render, Fly.io, Kubernetes, etc.). Serverless runtimes (AWS Lambda, Vercel, etc.) are not supported.
If using TypeScript, your runtime must support built-in WebSocket support (Node
22.4.0
or higher, Deno
1.4
or higher, Bun
1.1
or higher).
Getting started
Using
connect
with your app is simple. Using each SDK's "connect" method only requires a list of functions that are available to be executed. (Note: Python support is in beta;
upvote on our roadmap
)
Here is a one-file example of a fully-functioning app that connects to Inngest.
TypeScript
Go
Python
Copy
Copied
import
{ Inngest }
from
"inngest"
;
import
{ connect }
from
"inngest/connect"
;
const
inngest
=
new
Inngest
({
id
:
"my-app"
,
});
const
handleSignupFunction
=
inngest
.createFunction
(
{ id
:
"handle-signup"
,
triggers
:
[{ event
:
"user.created"
}] }
,
async
({ event
,
step })
=>
{
console
.log
(
"Function called"
,
event);
}
,
);
(
async
()
=>
{
const
connection
=
await
connect
({
apps
:
[{ client
:
inngest
,
functions
:
[handleSignupFunction] }]
,
});
console
.log
(
"Worker: connected"
,
connection);
})();
How does it work?
The
connect
API establishes a persistent WebSocket connection to Inngest. Each connection can handle executing multiple functions and steps concurrently. Each app can create multiple connections to Inngest enabling horizontal scaling. Additionally, connect has the following features:
Automatic re-connections
- The connection will automatically reconnect if it is closed.
Graceful shutdown
- The connection will gracefully shutdown when the app receives a signal to terminate (
SIGTERM
). New steps will not be accepted after the connection is closed, and existing steps will be allowed to complete.
Worker-level maximum concurrency (Coming soon)
- Each worker can configure the maximum number of concurrent steps it can handle. This allows Inngest to distribute load across multiple workers and not overload a single worker.
Local development
During local development, set the
INNGEST_DEV=1
environment variable to enable local development mode. This will cause the SDK to connect to
the Inngest dev server
. When your worker process is running it will automatically connect to the dev server and sync your functions' configurations.
No signing or event keys are required in local development mode.
Deploying to production
1
Set signing and event keys
To enable your application to securely connect to Inngest, you must set the
INNGEST_SIGNING_KEY
and
INNGEST_EVENT_KEY
environment variables.
These keys can be found in the Inngest Dashboard. Learn more about
Event keys
and
Signing Keys
.
2
Set your app version
The
appVersion
is used to identify the version of your app that is connected to Inngest. This allows Inngest to support rolling deploys where multiple versions of your app may be connected to Inngest.
When a new version of your app is connected to Inngest, the functions' configurations are synced to Inngest. When a new version is connected, Inngest update the function configuration in your environment and starts routing new function runs to the latest version.
You can set the
appVersion
to whatever you want, but we recommend using something that automatically changes with each deploy, like a git commit sha or Docker image tag.
Any platform
GitHub Actions
Render
Fly.io
Copy
Copied
// You can set the app version to any environment variable, you might use
// a build number ('v2025.02.12.01'), git commit sha ('f5a40ff'), or
// a custom value ('my-app-v1').
const
inngest
=
new
Inngest
({
id
:
'my-app'
,
appVersion
:
process
.
env
.
MY_APP_VERSION
,
// Use any environment variable you choose
})
3
Set the instance id (recommended)
The
instanceId
is used to identify the worker instance of your app that is connected to Inngest. This allows Inngest to support multiple instances (workers) of your app connected to Inngest.
By default, Inngest will attempt to use the hostname of the worker as the instance id. If you're running your app in a containerized environment, you can set the
instanceId
to the container id.
Any platform
Kubernetes + Docker
Render
Fly.io
Copy
Copied
// Set the instance ID to any environment variable that is unique to the worker
await
connect
({
apps
:
[
...
]
,
instanceId
:
process
.
env
.
MY_CONTAINER_ID
,
})
4
Set the max concurrency (recommended)
The
maxWorkerConcurrency
option is used to limit the number of concurrent steps that can be executed by the worker instance.
This allows Inngest to distribute load across multiple workers and not overload a single worker.
Copy
Copied
await
connect
({
apps
:
[
...
]
,
maxWorkerConcurrency
:
10
,
})
Lifecycle
As a connect worker is a long-running process, it's important to understand the lifecycle of the worker and how it relates to the deployment of a new version of your app. Here is an overview of the lifecycle of a connect worker and where you can hook into it to handle graceful shutdowns and other lifecycle events.
1
CONNECTING
- The worker is establishing a connection to Inngest. This starts when
connect()
is called.
First, the worker sends a request to the Inngest API via HTTP to get connection information. The response includes the WebSocket gateway URL. The worker then connects to the WebSocket gateway.
2
ACTIVE
- The worker is connected to Inngest and ready to execute functions.
The new
appVersion
is synced including the latest function configurations.
The worker begins sending and receiving "heartbeat" messages to Inngest to ensure the connection is still active.
The worker will automatically reconnect if the connection is lost.
TypeScript
Copy
Copied
// The connect promise will resolve when the connection is ACTIVE
const
connection
=
await
connect
({
apps
:
[
...
]
,
})
console
.log
(
`The worker connection is:
${
connection
.state
}
`
)
// The worker connection is: ACTIVE
3
RECONNECTING
- The worker is reconnecting to Inngest after a connection was lost.
The worker will automatically flush any in-flight steps via the HTTP API when the WebSocket connection is lost.
By default, the worker will attempt to reconnect to Inngest an infinite number of times.
4
CLOSING
- The worker is beginning the shutdown process.
New steps will not be accepted after this state is entered.
Existing steps will be allowed to complete. The worker will flush any in-flight steps via the HTTP API after the WebSocket connection is closed.
By default, the SDK listens for
SIGTERM
and
SIGINT
signals and begins the shutdown process. You can customize this behavior by in each SDK:
TypeScript
Go
Copy
Copied
// You can explicitly configure which signals the SDK should
// listen for by an array of signals to `handleShutdownSignals`:
const
connection
=
await
connect
({
apps
:
[
...
]
,
// ex. Only listen for SIGTERM, or pass an empty array to listen to no signals
handleShutdownSignals
:
[
'SIGTERM'
]
,
})
You can manually close the connection with the
close
method on the connection object:
Copy
Copied
await
connection
.close
()
// Connection is now closed
5
CLOSED
- The worker's WebSocket connection has closed.
By this stage, all in-flight steps will be flushed via the HTTP API as the WebSocket connection is closed, ensuring that no in-progress steps are lost.
TypeScript
Copy
Copied
// The `closed` promise will resolve when the connection is "CLOSED"
await
connection
.closed
// Connection is now closed
WebSocket connection and HTTP fallback
- While a WebSocket connection is open, the worker will receive and send all step results via the WebSocket connection. When the connection closes, the worker will fallback to the HTTP API to send any remaining step results.
Worker observability
In the Inngest Cloud dashboard, you can view the connection status of each of your workers. At a glance, you can see each worker's instance id, connection status, connected at timestamp, last heartbeat, the app version, and app version.
This view is helpful for debugging connection issues or verifying rolling deploys of new app versions.
Syncing and Rollbacks
Inngest keeps track of the version your workers are running on. This internal representation changes when you update your function configuration, provide a new app version identifier to the client configuration, or change the SDK version or language.
When you deploy a new version of your application, the first worker to connect to Inngest will automatically sync your app. This will update function configurations to the desired state configured in your code.
connect
supports rolling releases: During a deployment of your app, Inngest will run functions on all connected workers, regardless of the version, as long as they are able to process a request for a given function. This prevents traffic from concentrating on a single instance during rollouts and causing a thundering herd issue.
Once all old workers have terminated after a deployment, you can roll back to an old version by bringing back an old worker. Similar to the deployment process, this will update the function configuration to the previous state and gradually allow you to shift traffic to the old version by bringing up more old workers while terminating workers running the newer version.
Health checks
If you are running your app in a containerized environment, we recommend using a health check to ensure that your app is running and ready to accept connections. This is key for graceful rollouts of new app versions. If you are using Kubernetes, we recommend using the
readinessProbe
to check that the app is ready to accept connections.
The simplest way to implement a health check is to create an http endpoint that listens for health check requests. As connect is an outbound WebSocket connection, you'll need to create a small http server that listens for health check requests and returns a 200 status code when the connection to Inngest is active.
Here is an example of using
connect
with a basic Node.js http server to listen for health check requests and return a 200 status code when the connection to Inngest is active.
Node.js
Bun (JavaScript)
Copy
Copied
import
{ createServer }
from
"http"
;
import
{ connect
,
ConnectionState }
from
"inngest/connect"
;
import
{ inngest
,
functions }
from
"./src/inngest"
;
(
async
()
=>
{
const
connection
=
await
connect
({
apps
:
[{ client
:
inngest
,
functions }]
,
});
console
.log
(
"Worker: connected"
,
connection);
// This is a basic web server that only listens for the /ready endpoint
// and returns a 200 status code when the connection to Inngest is active.
const
httpServer
=
createServer
((req
,
res)
=>
{
if
(
req
.url
===
"/ready"
) {
if
(
connection
.state
===
ConnectionState
.
ACTIVE
) {
res
.writeHead
(
200
,
{
"Content-Type"
:
"text/plain"
});
res
.end
(
"OK"
);
}
else
{
res
.writeHead
(
500
,
{
"Content-Type"
:
"text/plain"
});
res
.end
(
"NOT OK"
);
}
return
;
}
res
.writeHead
(
404
,
{
"Content-Type"
:
"text/plain"
});
res
.end
(
"NOT FOUND"
);
});
// Start the server on a port of your choice
httpServer
.listen
(
8080
,
()
=>
{
console
.log
(
"Worker: HTTP server listening on port 8080"
);
});
// When the Inngest connection has gracefully closed,
// this will resolve and the app will exit.
await
connection
.closed;
console
.log
(
"Worker: Shut down"
);
// Stop the HTTP server
httpServer
.close
();
})();
Kubernetes readiness probe
If you are running your app in Kubernetes, you can use the
readinessProbe
to check that the app is ready to accept connections. For the above example running on port 8080, the readiness probe would look like this:
Copy
Copied
readinessProbe
:
httpGet
:
path
:
/ready
initialDelaySeconds
:
3
periodSeconds
:
10
successThreshold
:
3
failureThreshold
:
3
Worker concurrency
Worker concurrency is supported in the following versions of the SDK:
TypeScript
: SDK
3.45.1
or higher.
Go
: SDK
0.14.3
or higher.
Python
: SDK
0.5.12
or higher.
Each worker can configure the maximum number of concurrent steps it can execute simultaneously using the
maxWorkerConcurrency
option.
This allows you to control resource usage and prevent a single worker from being overwhelmed with too many concurrent requests.
By default, there is no limit on concurrent step execution. The worker will accept as many steps as Inngest sends to it.
When you set
maxWorkerConcurrency
, Inngest will distribute load across multiple workers based on their available capacity.
Workers with available capacity will receive more work, while workers at their limit will not receive additional steps until capacity becomes available.
When a worker reaches its
maxWorkerConcurrency
limit, you may see an
"All workers are at capacity"
error in the Inngest dashboard. This is expected behavior — the worker rejects the step and Inngest automatically re-enqueues it, retrying until a worker has available capacity. These capacity errors do
not
count towards your function's
retries
configuration.
Inngest uses the
instanceId
to track the
maxWorkerConcurrency
for each worker.
This means that if you have multiple workers with the same
instanceId
, they will share the same
maxWorkerConcurrency
limit.
Inngest considers the
maxWorkerConcurrency
from the latest connection request.
This means that if you update the
maxWorkerConcurrency
after a worker is connected and create a new connection, the worker's
maxWorkerConcurrency
will be updated to the new limit.
Benefits:
Prevents worker resource exhaustion (CPU, memory, connections)
Enables predictable resource allocation per worker
Helps with horizontal scaling over both homogeneous and heterogenous workers
TypeScript
Go
Python
Copy
Copied
await
connect
({
apps
:
[{ client
:
inngest
,
functions }]
,
instanceId
:
"example-worker"
,
maxWorkerConcurrency
:
10
,
// Max 10 concurrent steps on this worker
})
Environment variable:
You can also set the maximum worker concurrency via the
INNGEST_CONNECT_MAX_WORKER_CONCURRENCY
environment variable.
This is useful for configuring concurrency without changing code.
Copy
Copied
INNGEST_CONNECT_MAX_WORKER_CONCURRENCY
=
100
If both the option and environment variable are set, the option takes precedence.
Default behavior:
If
maxWorkerConcurrency
is not set (or set to
0
), there is no limit on concurrent step execution.
Inngest will send as many steps as limited by your account's concurrency limit.
Connection-level concurrency
You can set a different
maxWorkerConcurrency
for each connection from the same worker by specifying a unique
instanceId
for each connection.
This will allow you to have different
maxWorkerConcurrency
limits for different connections.
Due to different
instanceId
value, Inngest will consider each connection as a separate worker and will not share the same
maxWorkerConcurrency
limit.
TypeScript
Go
Python
Copy
Copied
// Connection 1 with different concurrency limit
await
connect
({
apps
:
[{ client
:
inngest
,
functions }]
,
instanceId
:
"worker-1-conn-1"
,
maxWorkerConcurrency
:
50
,
})
// Connection 2 with different concurrency limit
await
connect
({
apps
:
[{ client
:
inngest
,
functions }]
,
instanceId
:
"worker-1-conn-2"
,
maxWorkerConcurrency
:
20
,
})
Self hosted Inngest
Self-hosting support for
connect
is in development. Please
contact us
for more info.
If you are
self-hosting
Inngest, you need to ensure that the Inngest WebSocket gateway is accessible within your network. The Inngest WebSocket gateway is available at port
8289
.
Depending on your network configuration, you may need to set the gateway URL that the SDK uses to connect.
Copy
Copied
const
connection
=
await
connect
({
apps
:
[
...
]
,
gatewayUrl
:
"ws://my-cluster-host:8289/v0/connect"
,
})
Migrating from serve
We are working on enabling more fine-grained function and app migrations from existing
serve
apps to
connect
.
We recommend setting up a new app for trying out
connect
before migrating your existing
serve
apps.
---
title: Serve - Inngest Documentation
id: serve-inngest-documentation
created: '2026-05-03T08:00:34.576469Z'
source: https://www.inngest.com/docs/reference/serve
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:00:34.576210Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Serve - Inngest Documentation
Search...
Contact sales
Sign Up
Serve
Copy Markdown
Open
The
serve()
API handler is used to serve your application's
functions
via HTTP. This handler enables Inngest to remotely and securely read your functions' configuration and invoke your function code. This enables you to host your function code on any platform.
Copy
Copied
import
{ serve }
from
"inngest/next"
;
// or your preferred framework
import
{ inngest }
from
"./client"
;
import
{
importProductImages
,
sendSignupEmail
,
summarizeText
,
}
from
"./functions"
;
serve
({
client
:
inngest
,
functions
:
[sendSignupEmail
,
summarizeText
,
importProductImages]
,
});
serve
handlers are imported from convenient framework-specific packages like
"inngest/next"
,
"inngest/express"
, or
"inngest/lambda"
.
Click here for a full list of officially supported frameworks
. For any framework that is not support, you can
create a custom handler
.
serve(options)
Name
client
Type
Inngest client
Required
required
Description
An Inngest client (
reference
).
Name
functions
Type
InngestFunctions[]
Required
required
Description
An array of Inngest functions defined using
inngest.createFunction()
(
reference
).
Name
serveOrigin
Type
string
Required
optional
Description
The domain host of your application,
including
protocol, e.g.
https://myapp.com
. The SDK attempts to infer this via HTTP headers at runtime, but this may be required when using platforms like AWS Lambda or when using a reverse proxy. See also
INNGEST_SERVE_ORIGIN
.
Name
servePath
Type
string
Required
optional
Description
The path where your
serve
handler is hosted. The SDK attempts to infer this via HTTP headers at runtime. We recommend
/api/inngest
. See also
INNGEST_SERVE_PATH
.
Name
streaming
Type
true | false
Required
optional
Description
Enables streaming responses back to Inngest which can enable maximum serverless function timeouts. See
reference
for more information on the configuration.  See also
INNGEST_STREAMING
.
Name
id
Type
string
Required
optional
Description
The ID to use to represent this application instead of the client's ID. Useful for creating many Inngest endpoints in a single application.
Options like
signingKey
,
signingKeyFallback
,
logger
,
baseUrl
, and
fetch
are configured on the
Inngest client
, not on
serve()
. We always recommend setting the
INNGEST_SIGNING_KEY
environment variable over using the
signingKey
option directly. As with any secret, it's not a good practice to hard-code the signing key in your codebase.
How the
serve
API handler works
The API works by exposing a single endpoint at
/api/inngest
which handles different actions utilizing HTTP request methods:
GET
: Return function metadata and render a landing page in
development only
.
POST
: Invoke functions with the request body as incoming function state.
PUT
: Trigger the SDK to register all functions with Inngest using the signing key.
---
title: Security - Inngest Documentation
id: security-inngest-documentation
created: '2026-05-03T08:17:30.333132Z'
source: https://www.inngest.com/docs/learn/security
source_domain: www.inngest.com
fetched_at: '2026-05-03T08:17:30.332900Z'
fetch_provider: builtin
status: draft
type: note
tier: ground_truth
content_type: docs
deprecated: false
---

Security - Inngest Documentation
Search...
Contact sales
Sign Up
TypeScript SDK
v4
is now available!
See what's new
Resources
Security
Copy Markdown
Open
Security is a primary consideration when moving systems into production.  In this section we'll dive into how Inngest handles security, including endpoint security, encryption, standard practices, and how to add SAML authentication to your account. Learn more about
Inngest platform security
Best practices
that you can apply
Inngest platform security
Compliance, audits, and reports
Inngest is
SOC 2 Type II compliant
. Our company and platform is regularly audited to adhere to the standards of SOC 2. This ensures that we have the necessary controls in place to protect our customers' data and ensure the security and privacy of their information. Our platform and SDKs undergo periodic independent security assessments including penetration testing and red-team simulated attacks.
For more information on our security practices, or to request a copy of our SOC 2 report, please visit our
trust center
.
End to end encryption
All data in Inngest databases is encrypted at rest and encrypted in transit, including between Inngest's servers and your servers. For an added layer of encryption and control of your data, install
encryption middleware
and bring your own encryption key.
Signing keys and SDK security
In addition to TLS encryption, all requests between the Inngest platforms and your servers are signed with a
signing key
. The signing key is a pre-shared key which is unique to each environment.
The Inngest SDKs all automatically verify the signature via the
serve
endpoint adapter. Every request includes a signature with an embedded timestamp as to reject old requests to prevent replay attacks.
It's important that the signing key is kept secret.
If your signing key is exposed, it puts the security of your endpoints at risk. Note that it's possible to
rotate signing keys
with zero downtime.
Signing keys are also leveraged as an authentication mechanism to interact with the Inngest API for apps (e.g. checkpointing runs) as well as enabling
connect
workers
to establish a connection with Inngest servers.
API Keys
For programmatic access to
the Inngest REST API
, you can create
API keys
, scoping them to a specific environment. We recommend using API keys if or when you are writing custom scripts, tooling, or performing actions in CI/CD pipelines.
SAML
Enterprise users can enable SAML authentication to access their account. In order to enable SAML, you must:
Reach out to your account manager and request a SAML integration.
From there, we'll request configuration related to your SAML provider. This differs depending on your provider, and may include:
A metadata URL; an SSO URL; An IdP entity ID; an IdP x.509 certificate, and so on.
Your account manager will then send you the ACS and Metadata URL used to configure your account.
Your account manager will work with you to correctly map attributes to ensure fully functioning sign in.
It's important to note that once SAML is enabled, users
must
sign in via SAML. To learn more about enterprise plans for Inngest,
contact our team here
.
App syncing & function registration
Functions are defined within your codebase and run on your own infrastructure. Inngest must "
sync
" your application to read the current function configurations. For apps that use
serve
on public HTTP endpoints, Inngest syncs your application using one of two methods:
Direct sync
: Inngest sends a signed
PUT
request to your application's endpoint, your application's configuration including all function config is returned synchronously back to Inngest. This is the default method as of these SDK versions: TS
v3.31.0
, Python
0.4.18
.
Indirect sync
: Prior to direct sync, indirect syncs were the default. They can still be used to initiate a sync from your server. The handshake would be initiated by sending a
PUT
request to your endpoint which would then serialize and send the app configuration to the Inngest API, authenticating with the signing key set in your application. The SDK only sends requests to
https://api.inngest.com
unless configured to work with a self-hosted Inngest server.
For
connect
workers, app configuration is synced upon startup, directly with the Inngest API.
Security best practices
Encryption middleware
Inngest runs functions automatically, based off of event data that you send to Inngest. Additionally, Inngest runs steps transactionally, and stores the output of each
step.run
within function state. This may contain regulated, sensitive data.
If you process sensitive data, we
strongly
recommend, and sometimes require, end-to-end encryption enabled in our SDKs
.
End-to-end encryption middleware
intercepts requests, responses, and SDK logic on your own servers. With end to end encryption, data is encrypted on your servers with a key that only you have access to. The following applies:
All data in
event.data.encrypted
is encrypted
before
it leaves your servers. Inngest can never read data in this object.
All step output and function output is encrypted
before
it leaves your servers. Inngest only receives the encrypted values, and can never read this data. Function state is sent fully encrypted to the SDKs. The SDKs decrypt data on your servers and then resume as usual.
Middleware automatically decrypts the data as it's received within your application.
With this enabled, even in the case of unexpected issues your data is encrypted and secure. This greatly improves the security posture for sensitive data.
Firewall allowlist with Inngest IP addresses
Inngest's servers make outbound requests to your application and it's advised to add the Inngest IPs to your firewall allowlist.
For security and networking purposes, you may need to know the IP addresses that Inngest uses for outbound requests to your functions and webhooks. These IP addresses are used by Inngest's infrastructure to make authenticated requests to your endpoints.
You can find the current list of IP addresses at:
IPv4 addresses
-
https://www.inngest.com/ips-v4
IPv6 addresses
-
https://www.inngest.com/ips-v6
These IP ranges are used for all Inngest function invocations and webhook deliveries. If you need to whitelist these IPs in your firewall or security groups, please use the complete ranges listed on these pages.
Key rotation
Signing, event, and API keys can all be rotated using built in tools. If you need to rotate signing and event keys for your app, follow the steps in
this guide here
.

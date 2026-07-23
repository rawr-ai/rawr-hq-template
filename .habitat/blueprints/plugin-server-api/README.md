# API Server Plugin

`plugin-server-api` narrows the server-plugin kind to a caller-facing API
package. Its packet owns only the public client/server faces and embedded
service boundary that are additional to the reusable `service` kind. The
server face publishes server-side semantic capabilities; the application host
owns Elysia and oRPC fetch-transport realization, enforced by Nx import edges.
The closed package shell permits a local `AGENTS.md`; the `agent-router`
blueprint alone owns its placement and source shape.

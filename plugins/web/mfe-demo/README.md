# @rawr/plugin-mfe-demo

`@rawr/plugin-mfe-demo` is the web-runtime micro-frontend demo for the **support-example example domain**.

> Example-only scope: this plugin is a reference integration surface and does not represent a production support-example system.

## What It Demonstrates

- Support-triage oriented UI copy and run-state rendering in a host-mounted micro-frontend.
- Example server routes under the plugin namespace:
  - `/mfe-demo/health`
  - `/mfe-demo/support-example/status`
- Route-boundary hints that align with workflow examples:
  - first-party default: `/rpc`
  - published boundary: workflow OpenAPI routes (capability-scoped, exception-only for first-party callers)

## Local Usage

```bash
bun run rawr -- plugins web enable mfe-demo --risk off
bun run rawr -- plugins web status --json
bun run rawr -- dev up
```

Then open `/mounts` in the web app and locate the "Support triage example micro-frontend" card.

## Stability Note

The plugin package name and path remain intentionally stable (`@rawr/plugin-mfe-demo`, `plugins/web/mfe-demo`) while the internal demo semantics align with support-example.

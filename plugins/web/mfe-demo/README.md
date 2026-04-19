# @rawr/plugin-mfe-demo

`@rawr/plugin-mfe-demo` is the web-runtime micro-frontend demo for a generic mounted plugin surface.

> Example-only scope: this plugin is a reference integration surface and does not represent a production domain.

## What It Demonstrates

- Generic host-mounted UI copy and demo state rendering in a micro-frontend.
- Example server routes under the plugin namespace:
  - `/mfe-demo/health`
  - `/mfe-demo/status`
- Route-boundary hints that align with workflow examples:
  - first-party default: `/rpc`
  - published boundary: OpenAPI routes where external publication is allowed

## Local Usage

```bash
bun run rawr -- plugins web enable mfe-demo --risk off
bun run rawr -- plugins web status --json
bun run rawr -- dev up
```

Then open `/mounts` in the web app and locate the generic demo card.

## Stability Note

The plugin package name and path remain intentionally stable (`@rawr/plugin-mfe-demo`, `plugins/web/mfe-demo`) while the internal demo semantics stay intentionally generic.

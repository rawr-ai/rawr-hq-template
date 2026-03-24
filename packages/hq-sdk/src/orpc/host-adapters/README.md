# `src/orpc/host-adapters/`

Host adapters are concrete infrastructure bindings used by the runtime host.

They are distinct from `src/orpc/ports/`:

- `ports/` define the typed capability shapes the package can consume
- `host-adapters/` provide concrete implementations or framework bindings that
  satisfy those ports or power host-level integrations

This directory is a staging home inside the proto SDK while the shape is still
being explored. It is not the same thing as the package-facing port surface.

Current adapter families:

- `logger/embedded-placeholder.ts`
  - temporary embedded placeholder adapter for the logger port
- `analytics/embedded-placeholder.ts`
  - temporary embedded placeholder adapter for the analytics port
- `feedback/embedded-placeholder.ts`
  - temporary embedded placeholder adapter for the feedback port
- `sql/embedded-in-memory.ts`
  - temporary embedded in-memory adapter for the `DbPool` / `Sql` ports

The placeholder adapters exist to make the correct host-adapter shape explicit
without pretending that the current embedded implementations are the final
production integrations.

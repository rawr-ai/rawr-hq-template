# Runtime Release Migration Note

## Status

Planned. No Habitat runtime release has been authorized.

The bounded foundation continuation `0.5.15` contains the source-inventory and
declarative telemetry foundation only. It does **not** contain `app@2`, the
private runtime owner graph, `startApp(...)`, native harness contracts,
process health/readiness, or the Elysia/Inngest/MCP runtime
acceptance. A downstream repository must not infer or locally backport those
APIs from the architecture documents.

The exact registry `0.5.15` adoption receipt sealed task 3.2a and authorized the
completed task 3.3 SDK ownership transfer only; it did not open later runtime
owners out of sequence. Tasks 3.4 through 15 proceed in the active queue. Only task 15.7 may replace this
planned note with an exact adoption contract after task 15.5 lands the complete
runtime on canonical `main` and task 15.6 publishes the paired SDK/CLI release.

## Final Release Contract

The final runtime release must publish exactly the paired
`@habitat-ai/sdk@<released-version>` and
`@habitat-ai/cli@<released-version>` products from one accepted exact-main
source revision. Its release receipt must record:

- exact version, source commit, tag, package provenance, integrity, and
  registry-install smoke;
- sole admission of the complete `app@2` packet for one app/Nx project with app
  composition, `runtime/profiles/*`, `runtime/processes.ts`, thin entrypoints,
  and packed-consumer proof, with the immutable published `app@1` locator absent
  from the current pack and acceptance;
- the exact public `@habitat-ai/sdk/runtime/harnesses` closure, including
  native descriptor/mount types, immutable launch identity,
  required-resource readiness, distinct liveness/readiness probes, native
  handle, and no private runtime-package dependency;
- installed native Elysia, Inngest Serve/Connect, MCP stdio/Streamable HTTP,
  Oclif, web, desktop, and OpenShell verticals that mount lowered payloads and
  stop before their process lease releases;
- one `app@2` fixture launching separate Elysia `server` and native Inngest
  Serve `async` child processes, each accepting a real native boundary
  operation with a distinct lease, launch identity, readiness result, and
  independent idempotent stop;
- one MCP `server` fixture invoking real tool and resource boundaries through
  both native transports without introducing an MCP role, kind, service, app,
  or execution plane;
- a deployment consumer proving it receives only the cold portable process plan
  and immutable identity, never live runtime authority;
- the exact named Nx targets proving the app packet, installed SDK/CLI closure,
  process health, native Elysia/Inngest/MCP boundaries, and same-app process
  isolation.

Required-resource acquisition is a startup prerequisite. A missing required
resource prevents process mounting. Liveness proves only the selected process
or native host can answer; readiness fails closed over required resources and
selected harness contributions. Logs, findings, telemetry, listener creation,
and sibling health do not establish readiness. Habitat carries the immutable
deployment/source identity supplied at process start but does not select or
interpret deployment placement, product health, or release lineage.

The release must not add a `process`, `MCP`, or `async-server` blueprint kind or
a child Nx project for a process interior. Process runtime, lifecycle,
readiness, and observation stay local to one entrypoint-selected process.

## Consumer Adoption

An existing consumer with Habitat installed upgrades through its owner-local
OpenSpec and:

```sh
nx migrate @habitat-ai/cli@<released-version>
```

The migrated CLI dependency supplies the exact paired SDK. A consumer without
Habitat may initialize once with:

```sh
bunx nx add @habitat-ai/cli@<released-version> --no-interactive
```

Consumers install or migrate the release; they do not copy private Habitat
owners or reconstruct unreleased APIs from this change. Each consumer retains
product-owned app membership, process catalog contents, provider/config
selection, and hosted deployment acceptance. Habitat supplies the released
generic process-local substrate and its native harness verticals.

## Adoption Receipt

Task 15.7 replaces the placeholders above only after registry installation
succeeds. The durable handoff must name the exact released version, commit,
tag, provenance/integrity, migration command, generated migration files, and
consumer-owned acceptance targets. Until that receipt exists, the exact
adoption contract is: remain on the current supported release and keep any
downstream local runtime boundary owner-local; do not claim Habitat runtime
adoption.

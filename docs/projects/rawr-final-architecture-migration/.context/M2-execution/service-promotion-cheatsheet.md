# Service Promotion Cheat Sheet

Use this when deciding whether package-scoped code should become a service and when remediating prior promotions.

## Governing Correction

`*-host` packages are not a supported architecture. The prior guidance that allowed service-specific host/runtime packages is superseded.

The current rule is simpler:

- services own capability truth: behavior, contracts, validation, policy, orchestration, semantic algorithms, and reusable entities
- packages contain genuinely reusable cross-service primitives only: SDKs, common ports, common adapters, runtime substrate, or utilities with multiple real consumers
- plugins/apps/runtime surfaces provide concrete resources to service clients for now
- future Effect resource provisioning may centralize process/role resources, but that is not a reason to create transitional host packages now

Do not create `packages/<service>-host`, `packages/<service>-runtime`, `packages/<service>-adapters`, or equivalent.

## Classification Test

Promote package code when it owns one or more of:

- durable semantic truth
- canonical validation, merge, ranking, planning, or conflict semantics
- authoritative writes or state transitions
- ownership, claims, retirement, or garbage-collection policy
- undo/reversal semantics
- domain models that multiple surfaces project outward

Do not reject service status because:

- only one host uses it today
- it is internal-only
- it currently lives in `packages/`
- promotion requires concrete resource cleanup

## Boundary Rules

Service package:

- follows the `services/example-todo` topology
- keeps procedure input/output schemas inline in the owning `contract.ts`
- extracts only reusable non-IO entity schemas/types into intentional module entity files
- uses `src/service/shared/*` only for real cross-module primitives/errors
- declares concrete resource needs as typed `initialContext.deps` where needed
- owns semantic behavior in repositories/routers/shared internals

Plugin/app/runtime surface:

- constructs and passes concrete resources into `createClient(...)`
- owns CLI flags, command orchestration, human output, temp-home setup, and UX errors
- may keep single-service concrete resource factories locally while the resource substrate matures

Package:

- may own common ports/adapters only when there are multiple real service consumers
- must not become a dumping ground for single-service helper logic
- must not expose service use-case verbs that duplicate a service module

## Resource Guidance

Runtime adjacency is not host ownership. If a behavior needs filesystem, path, SQLite, env, or process access, split it into service behavior plus concrete resources.

Prefer Bun-native APIs for new concrete runtime code when stable:

- `Bun.file`, `Bun.write`, `BunFile`, and Web streams for file/blob/string IO
- `bun:sqlite` for local SQLite driver usage
- `Bun.SQL` when one Promise-based SQL facade across PostgreSQL/MySQL/SQLite is wanted
- Bun Shell `$` for bounded shell commands with interpolation escaping
- `Bun.spawn` for long-running subprocesses and stream control
- `Bun.Glob` for fast file discovery
- `Bun.env` / `import.meta.env` at Bun-local runtime surfaces
- `Bun.serve` for Bun-hosted HTTP resources

Keep Node compatibility APIs where Bun itself routes to Node-compatible semantics or where an existing dependency requires a Node-shaped interface.

## Implementation Sequence

1. Freeze classification and file matrix in a scratch note.
2. Scaffold or repair the service to match `example-todo`.
3. Move semantic behavior into service modules before moving concrete runtime code.
4. Replace service-specific `*-host` imports with plugin/app-local resource provision.
5. Delete service-specific host packages completely.
6. Remove stale dependencies, Nx/Vitest/root-script/inventory/doc references.
7. Add ratchets that fail on `packages/*-host`, `@rawr/*-host`, single-service helpers in packages, shared-schema dumps, extracted IO-schema buckets, and forwarding-only repositories.
8. Run static proof, service behavioral proof, command-surface proof, and platform smoke as separate gates.

## Proof Loop

Static proof:

```bash
bunx nx run <service>:typecheck --skip-nx-cache
bunx nx run <service>:build --skip-nx-cache
bunx nx run <service>:test --skip-nx-cache
bunx nx run <service>:structural --skip-nx-cache
bun run lint:boundaries
bun run build:affected
```

Behavioral proof:

- exercise the real consumer surface that reaches the promoted service
- assert domain outputs and side effects, not just exit code
- cover at least one read/query, one resolve/detail, one write/apply if applicable, one cache/index/undo path if applicable, and one expected failure path

Platform smoke:

```bash
bun run rawr -- hq up --observability required --open none
curl -sS http://localhost:3000/health
bun run rawr -- hq down
bun run rawr -- hq status --json
```

Do not claim platform smoke as service behavioral proof unless the smoke path actually exercises that service.

## Review Checklist

- Does the service own its behavior rather than forwarding to a same-named runtime method?
- Do procedure IO schemas live at the contract boundary, with only reusable entities extracted?
- Are concrete resources absent from `src/service/**` except typed resource contracts?
- Are service-specific host packages gone?
- Are plugin/app layers only provisioning resources and projecting UX?
- Does a structural verifier prevent the old mistake from recurring?

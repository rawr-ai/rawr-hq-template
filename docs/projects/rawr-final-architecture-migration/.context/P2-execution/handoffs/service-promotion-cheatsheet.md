# Service Promotion Cheat Sheet

Use this when evaluating whether a package should move into `services/`.

## Classification Test

Promote when the code owns one or more of:

- durable semantic truth
- canonical validation, merge, or conflict semantics
- authoritative writes
- ownership/claim tracking
- undo/reversal semantics
- domain models that multiple hosts project outward

Do not reject service status because:

- only one host uses it today
- it is internal-only
- it currently lives in `packages/`
- promotion requires adapter cleanup

## Target Split

Service package:

- `src/index.ts`
- `src/client.ts`
- `src/router.ts`
- `src/service/base.ts`
- `src/service/contract.ts`
- `src/service/impl.ts`
- `src/service/router.ts`
- `src/service/modules/<module>/{contract,module,router,schemas,repository}.ts`
- `src/service/shared/{errors,internal-errors,...}`
- `src/service/shared/ports/*` for host-owned runtime contracts

Host/runtime package when needed:

- concrete filesystem/process/env/SQLite/provider adapters
- boundary assembly helper
- source discovery and target resolution if those depend on runtime state

Host/plugin/app:

- CLI flags and output
- layered config loading
- command orchestration
- UX-specific post-steps

## Implementation Sequence

1. Freeze classification and file matrix in a scratch note.
2. Scaffold the service exactly like `example-todo`.
3. Extract typed service ports before moving runtime code.
4. Move read/planning paths first.
5. Move write/apply/undo paths second.
6. Rebind real hosts through a local seam.
7. Delete the old package.
8. Update root scripts, Vitest projects, architecture inventory, lint boundaries, and structural suites.
9. Update live architecture docs and migration notes.
10. Run static, command-surface, and live runtime proof.

## Repeatable Proof Loop

Minimum static proof:

```bash
bunx nx run <service>:typecheck --skip-nx-cache
bunx nx run <service>:build --skip-nx-cache
bunx nx run <service>:test --skip-nx-cache
bunx nx run <service>:structural --skip-nx-cache
bunx nx run <host-package>:typecheck --skip-nx-cache
bunx nx run <host-package>:build --skip-nx-cache
bunx nx run <host-package>:test --skip-nx-cache
bun run lint:boundaries
bun run build:affected
```

Minimum command/live proof:

```bash
bun run rawr -- <affected command> --json
bun run rawr -- hq up --observability required --open none
curl -sS http://localhost:3000/health
bun run rawr -- hq down
bun run rawr -- hq status --json
```

## Review Checklist

- Does the service look like `services/example-todo` internally?
- Are concrete adapters absent from `src/service/**`?
- Are hosts still responsible for UX/config/flags?
- Does the old package disappear completely?
- Are docs and proposals updated to say the migration actually happened?
- Is there a structural verifier preventing regression?

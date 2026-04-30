# Middle-Spine Verification Work Plan

Status: active implementation plan.
Branch: `codex/runtime-middle-spine-verification`.

## Objective

Build the least-design-risk verification harness for the runtime realization lab:
prove the load-bearing middle spine that is already specified enough, and keep
unresolved design areas explicitly fenced as negative space.

This work stays inside `tools/runtime-realization-type-env/**` and evidence docs.
The canonical runtime spec pinned in `proof-manifest.json` remains architecture
authority. The lab may earn `proof`, `vendor-proof`, or `simulation-proof`, but
it must not claim production runtime readiness.

## Safe Burn-Down Scope

| Claim | Target proof strength | Gate | Non-claim |
| --- | --- | --- | --- |
| SDK derivation emits normalized graph artifacts, service binding plans, surface plans, dispatcher descriptors, descriptor refs, and portable artifacts from explicit lab declarations. | `proof` | `typecheck`, `negative`, `simulate` | Does not resolve async step membership or cold server route derivation mechanics. |
| Runtime compiler emits `CompiledProcessPlan`, provider dependency graph, registry input, harness plans, topology seed, diagnostics, and `BootgraphInput`. | `simulation-proof` | `mini-runtime`, `simulate` | Does not acquire resources, lower provider plans, or mount real harnesses. |
| Bootgraph/provisioning skeleton orders fake modules, rolls back started modules, finalizes in reverse order, and emits lifecycle records. | `simulation-proof` | `mini-runtime` | Does not decide `ProviderEffectPlan` shape, refresh/retry policy, or provider-specific lowering. |
| Runtime access and service binding cache enforce sanctioned access, no raw runtime internals, construction-time cache identity, and invocation exclusion. | `proof` / `simulation-proof` | `typecheck`, `negative`, `mini-runtime` | Does not expose broader runtime resource method law beyond the pinned spec. |
| Adapter callbacks consume compiled/runtime artifacts and delegate into `ProcessExecutionRuntime`. | `simulation-proof` | `mini-runtime` | Does not prove real Elysia, Inngest, OCLIF, web, agent, or desktop host mounting. |
| Runtime catalog, diagnostics, redaction, rollback, and finalization records are in-memory observations. | `simulation-proof` | `mini-runtime` | Does not prove telemetry export, catalog persistence, deployment placement, or storage/indexing policy. |

## Negative Space To Preserve

- `ProviderEffectPlan` shape and lowering stay `xfail`.
- Async step membership, dispatcher access declaration, and cold server route
  derivation stay `xfail`.
- Real production harness paths, durable Inngest scheduling/retry/idempotency,
  telemetry export, catalog persistence, deployment placement, and external
  provider integrations stay migration-only or reserved.
- Vendor proof and simulation proof remain useful evidence, not production
  runtime readiness.

## Implementation Order

1. Preflight: verify Graphite branch, clean status, Nx project config, and pinned
   spec hash.
2. Derivation/compiler: add the contained derivation and compiler path first so
   downstream tests consume generated lab artifacts instead of hand-authored
   plans.
3. Bootgraph/catalog: add fake-module lifecycle execution, rollback/finalization,
   redacted records, and in-memory catalog output.
4. Runtime access/cache: add sanctioned access and binding cache proofs, with
   invocation excluded from cache identity.
5. Adapter/handoff: harden callback delegation and deployment handoff negative
   fixtures so adapters cannot execute descriptors directly and handoffs cannot
   carry live handles or secrets.
6. Evidence: update manifest, focus log, spine audit map, and diagnostic matrix
   only where gates match the claimed proof strength.

## Review Checklist

- Mechanical: paths, imports, Nx targets, and structural guard are aligned.
- Architectural: lifecycle phases stay separated and no second execution model is
  introduced.
- Testing: each test has a falsifiable oracle and targets a meaningful failure.
- Evidence honesty: manifest status, diagnostic color, report wording, and gates
  agree.
- Containment: no production imports, workspace/package promotion, or root gate
  drift.

## Verification

Run focused tests after each layer, then:

```bash
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:gate
bun run runtime-realization:type-env
git diff --check
git status --short --branch
gt status --short
```

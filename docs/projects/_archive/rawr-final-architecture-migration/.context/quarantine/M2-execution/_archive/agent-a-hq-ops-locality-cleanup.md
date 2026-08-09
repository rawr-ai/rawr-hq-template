# Agent A HQ Ops Locality Cleanup Scratchpad

Branch: `agent-service-module-ownership-hardening`
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`

## Governing Rule

No `*-host` packages. Services own behavior. Plugin/app/runtime layers provide concrete resources. `services/hq-ops/src/service/shared/**` is allowed only for cross-module service primitives, not module-owned config/repo-state/journal/security behavior.

## Shared File Matrix

| File | Actual consumers | Classification | Exact change |
| --- | --- | --- | --- |
| `services/hq-ops/src/service/shared/README.md` | Humans/agents; required by `scripts/phase-1/verify-hq-ops-service-shape.mjs` | `keep shared` | Update from stale U02 reservation wording to current locality rules and the exact allowed files. |
| `services/hq-ops/src/service/shared/errors.ts` | No code consumers; required by service-shape verifier as the shared ORPC boundary-error seam | `keep shared` | Keep as empty reserved cross-module boundary-error location. Do not move module-specific errors here. |
| `services/hq-ops/src/service/shared/internal-errors.ts` | No code consumers; required by service-shape verifier as the shared internal-error seam | `keep shared` | Keep as shared unexpected-internal helper seam matching `example-todo`; no module-local behavior found here. |
| `services/hq-ops/src/service/shared/ports/resources.ts` | `service/base.ts`; all four module repository providers; config/repo-state/journal/security repositories or support; `services/hq-ops/test/helpers.ts`; app/plugin concrete providers consume the inferred boundary type through `HqOpsBoundary["deps"]["resources"]` | `keep shared` | Keep as primitive resource port bundle because all modules use it. Add verifier ratchets so it remains primitive resources, not high-level behavior ports. |

## Consumer Proof

- `rg` and Narsil found `HqOpsResources` consumed by `base.ts`, every module provider/repository path, service tests, and app/plugin concrete resource providers.
- `errors.ts` and `internal-errors.ts` are currently seams rather than active dependencies; this matches `services/example-todo/src/service/shared/**`.
- No `service/shared/**` file contains config load/merge behavior, repo-state mutation policy, journal indexing/search behavior, or security scan/gate behavior.

## Exact Remediation

- Update `services/hq-ops/src/service/shared/README.md` to state active module-locality rules instead of U02 reservation-only language.
- Update `scripts/phase-1/verify-hq-ops-service-shape.mjs` to:
  - enforce an exact allowlist for `services/hq-ops/src/service/shared/**`;
  - fail on module-owned behavior files added under `shared`;
  - confirm `resources.ts` remains the single primitive resource port seam;
  - confirm every HQ Ops module still consumes `HqOpsResources`;
  - keep existing bans on obsolete high-level ports and forwarding repositories.

## Verifiers

- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `bunx nx run @rawr/hq-ops:typecheck --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:test --skip-nx-cache`
- `bunx nx run @rawr/hq-ops:structural --skip-nx-cache`

## Behavioral Proof

- No service behavior is being moved because the audit found no module behavior in `shared`.
- Behavioral proof remains the existing HQ Ops service tests, especially `ports-backed-service.test.ts`, which exercises config loading, repo-state writes, journal writes/search, and security resource behavior through the service client.
- Structural proof is strengthened by the updated shape verifier so future module behavior cannot be hidden under `service/shared/**`.

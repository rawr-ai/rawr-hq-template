# Triage

## Decisions

- **Use residual allowlists for U00 guardrails** [Source: M1-U00]
  - **Context:** `M1-U00` must install passing Phase 1 checks before `M1-U01` to `M1-U04` remove archived lanes, old operational owners, and legacy HQ facades.
  - **Type:** triage
  - **Notes:** The new Phase 1 checks should freeze the current hardened lane by classifying and narrowly allowlisting residual surfaces that later slices are responsible for deleting. They should fail on drift or expansion now, not wait for a future scaffold pass.
  - **Next check:** Tighten or remove each residual allowlist when `M1-U01`, `M1-U03`, and `M1-U04` land.

## Risks

- **Pre-existing lint:boundaries failure remains outside M1-U00 scope** [Source: M1-U00]
  - **Context:** `bun run lint:boundaries` still fails in the repo baseline while validating the U00 guardrail branch.
  - **Type:** risk
  - **Notes:** The failure is in existing `apps/server` files: one `@nx/enforce-module-boundaries` error in `apps/server/src/host-composition.ts` plus unused `eslint-disable` warnings in `apps/server/src/index.ts` and `apps/server/src/plugins.ts`. U00 does not touch those files.
  - **Next check:** Reassess when a later slice touches the affected `apps/server` boundary or when the repo baseline is explicitly cleaned up.

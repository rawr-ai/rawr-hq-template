# Hyperresearch Codex Spec Packet

This packet keeps the integration and parity rules beside the service package while the Codex runner is being built. `REMAINDER_PLAN.md` is the current canonical working plan for the remaining parity work.

The local package owns the reusable control-plane substrate: durable ledgers, fresh step loading, guarded Hyperresearch CLI calls, resume behavior, artifact validation, and CLI-topic projection. It does not own the downstream RAWR-authored Codex skill/reference/agent material during the current transition.

## Current Topology

- RAWR HQ-Template owns `@rawr/hyperresearch-codex` and the `@rawr/plugin-hyperresearch` CLI topic.
- The service has two callable oRPC modules: `fixtures` for the synthetic proof slice and `runs` for durable V8 lifecycle procedures. V8 ledger, step, source-capture, artifact, result, and integrity behavior lives under `src/service/modules/runs/helpers`; fixture-only ledger, step, and integrity behavior lives under `src/service/modules/fixtures/helpers`. Shared code is limited to durable entities/resources and the low-level Hyperresearch CLI backend adapter.
- RAWR HQ currently owns the active sync source for Codex skills, hook/MCP adoption references, and agent material.
- Final plugin-system testing installs the Hyperresearch CLI topic from RAWR HQ-Template, then syncs skill/reference/agent materials from RAWR HQ through the existing `rawr plugins sync ...` lane.
- This split is temporary. The separate template/personal parity migration should eventually make the source topology less split.

## Packet Files

- `REMAINDER_PLAN.md`: service-local working plan, implementation phases, proof ladder, and current claim boundaries.
- `INTEGRATION_SPEC.md`: package, CLI, and downstream sync boundaries.
- `PARITY_MATRIX.md`: Claude constructs and Codex adapter decisions.
- `FLOWS.md`: runtime, step loading, source capture, resume, failure, and final plugin proof flows.
- `TESTING_PLAN.md`: component gates, dry-run gates, live gates, and final Codex plugin-system proof.
- `evidence.md`: committed proof summaries for runtime, sync, and Codex-RAWR execution claims.
- `HIGHER_ORDER_RUNTIME_PROOF_PLAN.md`: first post-packet runtime proof plan for role-agent fan-out, resume, multi-source capture, and final provenance validation.
- `REVIEW_LEDGER.md`: active review findings and phase-exit status.
- `DRA_RUNBOOK.md`: Discover -> Review -> Act workflow and agent-loop contract.

## Phase Rule

Before starting a new design or implementation loop, update this packet if the loop changes integration topology, parity claims, or test gates. Then review `REVIEW_LEDGER.md` and close or explicitly defer any blocking finding.

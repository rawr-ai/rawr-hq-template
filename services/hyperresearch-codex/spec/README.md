# Hyperresearch Codex Spec Packet

This packet keeps the integration and parity rules beside the service package while the Codex runner is being built.

The local package owns the reusable control-plane substrate: durable ledgers, fresh step loading, guarded Hyperresearch CLI calls, resume behavior, artifact validation, and CLI-topic projection. It does not own the downstream RAWR-authored Codex skill/reference/agent material during the current transition.

## Current Topology

- RAWR HQ-Template owns `@rawr/hyperresearch-codex` and the `@rawr/plugin-hyperresearch` CLI topic.
- RAWR HQ currently owns the canonical sync source for Codex skills, hook/MCP adoption references, and agent material.
- Final plugin-system testing installs the Hyperresearch CLI topic from RAWR HQ-Template, then syncs skill/reference/agent materials from RAWR HQ through the existing `rawr plugins sync ...` lane.
- This split is temporary. The separate template/personal parity migration should eventually make the source topology less split.

## Packet Files

- `INTEGRATION_SPEC.md`: package, CLI, and downstream sync boundaries.
- `PARITY_MATRIX.md`: Claude constructs and Codex adapter decisions.
- `FLOWS.md`: runtime, step loading, source capture, resume, failure, and final plugin proof flows.
- `TESTING_PLAN.md`: component gates, dry-run gates, live gates, and final Codex plugin-system proof.
- `REVIEW_LEDGER.md`: active review findings and phase-exit status.
- `DRA_RUNBOOK.md`: Discover -> Review -> Act workflow and agent-loop contract.

## Phase Rule

Before starting a new design or implementation loop, update this packet if the loop changes integration topology, parity claims, or test gates. Then review `REVIEW_LEDGER.md` and close or explicitly defer any blocking finding.

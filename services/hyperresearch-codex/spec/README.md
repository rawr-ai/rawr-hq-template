# Hyperresearch Codex Spec Packet

This packet keeps the integration and parity rules beside the service package while the Codex runner is being built. `REMAINDER_PLAN.md` is the current canonical working plan for the remaining parity work.

The local package owns the reusable control-plane substrate: durable ledgers,
fresh step loading, guarded Hyperresearch CLI calls, resume behavior, artifact
validation, and CLI-topic projection. Separately governed curated
skill/reference/agent content is not an implementation input to this package.

## Current Topology

- RAWR HQ-Template owns `@rawr/hyperresearch-codex` and the `@rawr/plugin-hyperresearch` CLI topic.
- The service has two callable oRPC modules: `fixtures` for the synthetic proof slice and `runs` for durable V8 lifecycle procedures. V8 ledger, step, source-capture, artifact, result, and integrity behavior lives under `src/service/modules/runs/helpers`; fixture-only ledger, step, and integrity behavior lives under `src/service/modules/fixtures/helpers`. Shared code is limited to durable entities/resources and the low-level Hyperresearch CLI backend adapter.
- Personal RAWR HQ may independently own curated Codex skills, references, and agent content plus its release/acceptance/channel records.
- Cross-repository proof requires an exact versioned interface and immutable content artifact. A checkout path, Git relation, copied tree, or `rawr plugins` operation cannot substitute for that binding.
- Until the Template-owned agent-plugin lifecycle and provider adapter accept that artifact, this packet claims service/CLI proof only.

## Packet Files

- `REMAINDER_PLAN.md`: service-local working plan, implementation phases, proof ladder, and current claim boundaries.
- `REPLACEMENT_ATTEMPT_CLOSURE_PLAN.md`: fallback contract for ledgered replacement attempts when explicit child resume cannot cleanly complete a child handle.
- `INTEGRATION_SPEC.md`: package, CLI, and versioned artifact boundaries.
- `PARITY_MATRIX.md`: Claude constructs and Codex adapter decisions.
- `CHILD_AGENT_COMPLETION_CONTRACT.md`: child-session lifecycle evidence contract and stuck-wait diagnostic boundary.
- `HOOKS_MCP_PARITY.md`: observed Codex/RAWR hook surface, proven core guardrails, missing lifecycle hook events, and parked MCP boundary.
- `HOOKS_GUARDRAIL_PLAN.md`: proof record for `PreToolUse` source-bypass and `Stop` validation guardrails without overclaiming managed hook projection.
- `NATIVE_CODEX_SURFACE_REVIEW.md`: deep paired review of `codex-rawr exec`, app-server, Codex SDK, and OpenAI SDK alternatives for the child lifecycle issue, including the app-server cold-resume smoke result.
- `FLOWS.md`: runtime, step loading, source capture, resume, failure, and final plugin proof flows.
- `TESTING_PLAN.md`: component gates, dry-run gates, live gates, and final Codex plugin-system proof.
- `evidence.md`: committed proof summaries for service runtime and Codex-RAWR execution claims; legacy projection evidence is historical only.
- `HIGHER_ORDER_RUNTIME_PROOF_PLAN.md`: first post-packet runtime proof plan for role-agent fan-out, resume, multi-source capture, and final provenance validation.
- `FULL_PARITY_CLOSURE_PLAN.md`: full-tier closure plan and current result for the repaired Codex-RAWR Inngest proof.
- `REVIEW_LEDGER.md`: active review findings and phase-exit status.
- `DRA_RUNBOOK.md`: Discover -> Review -> Act workflow and agent-loop contract.

## Phase Rule

Before starting a new design or implementation loop, update this packet if the loop changes integration topology, parity claims, or test gates. Then review `REVIEW_LEDGER.md` and close or explicitly defer any blocking finding.

## Current Claim Boundary

The repaired full-tier Inngest proof is green: all 16 V8 steps, 20 role-agent packet jobs, 16 official source captures, critic/patch/polish/readability gates, backend sync/lint/export, and `validate --backend real` passed.

Active Hyperresearch Codex parity is clean for the service plus packet-orchestration path under explicit child-resume recovery: after parent resume, the coordinator explicitly resumes known child ids before wait/close. If explicit child resume cannot cleanly complete an attempt, the attempt remains non-clean and the same logical packet job may complete through a fallback replacement attempt whose packet output, artifact writes, source URLs, claim trace, patch log, and final validation all pass. Bare parent resume automatic descendant rehydration remains unclaimed.

Automatic descendant rehydration is not part of this parity claim. The
diagnostics show same-process children work, bare parent resume is insufficient,
and app-server explicit `resume_agent` evidence cleanly recovers known child
ids. Core hook guardrails are fixture-proven in this service. Curated hook
content and generic provider projection remain separately owned; managed hook
projection, lifecycle hook parity, MCP, and production Inngest readiness remain
separate unless explicitly promoted.

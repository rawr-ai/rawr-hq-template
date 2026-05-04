# Draft Stack Drain And Preservation Plan

Status: draft recommendation captured after the 2026-05-03 semantic reassessment. This is not the final drain runbook.

## Current Recommendation

Do not start the Graphite drain yet. The stack is understandable, but the upper work is not preservation-clean.

First, keep all research conclusions visible on the top stack branch, then rescue the workstream runtime bundle remediation, then drain the stack by lane.

## Current Branch Read

| Lane | Current Read | Recommendation |
|---|---|---|
| Research consolidation | Two `research/*` worktrees contain real untracked research outputs. | Preserve curated outputs here before deleting worktrees or branches. |
| Workstream runtime bundle remediation | Useful but dirty. It moves from workstream report to workstream record, adds steward/hook guidance, and adds a Runtime Lab overlay. | Rescue and split/clean before commit. Do not blind-commit generated local Hyperresearch/Claude files. |
| Hyperresearch/Inngest | Cohesive Hyperresearch Codex proof branch at the top of the current stack. | Drain as Hyperresearch proof/service work, not as runtime architecture authority. Extract Inngest lessons into Phase Four planning separately. |
| Agent sync | Core three-branch chain is coherent; semantics branch is related but structurally off-lane. | Keep the linear chain, then port or restack the semantics branch deliberately. |
| Phase Four container setup | Bounded preparation, not Phase Four execution. | Keep as runtime capstone after lower runtime stack is green; reconcile stale workstream-report language with remediation first. |
| Semantica | Separate sibling family off `codex/runtime-realization-synthesis-lock`. | Drain separately after shared base. Do not restack onto runtime or Hyperresearch. |

## Preservation Step

The first move is this consolidation bundle:

- `rawr-spec-landscape/`
- `runtime-canon-arch-align/`
- `hyperresearch-inngest-proof/`

Do not delete the original research worktrees until this bundle is reviewed and committed.

After review, the two research branches should not be submitted as Graphite branches. They should be retired after any final report or spec-edit branches are created from the consolidated material.

## Recommended Drain Sequence

1. **Preserve research outputs**
   - Verify this bundle includes the final reports, queries, source notes, comparison notes, compact audit files, and Inngest proof essentials.
   - Commit the consolidation on the top branch.

2. **Rescue workstream runtime bundle remediation**
   - Accept the forward-only `workstream record` model.
   - Keep historical report/program artifacts as provenance.
   - Clean hook contracts: decide whether record health is manual, a hook, or removed.
   - Move/soften prose-term drift checks out of blocking hooks if they overreach.
   - Exclude `.claude/skills/**`, `.hyperresearch/**`, and `CLAUDE.md`.
   - Split generic workstream infrastructure from Runtime Lab overlay if needed.

3. **Retire temporary research worktrees**
   - Only after the consolidation commit is verified.
   - Remove `research/rawr-spec-landscape` and `research/runtime-canon-arch-align` worktrees/branches deliberately.

4. **Drain shared base**
   - Drain `main` through `codex/runtime-realization-synthesis-lock`.
   - Validate with `bun run sync:check`, `bun run architecture:gates:permanent`, and `git diff --check`.

5. **Drain Semantica separately**
   - Keep it scoped to evidence tooling.
   - Validate with `bun run semantica:quality`.
   - Keep generated `.semantica/**` output ignored and unstaged.

6. **Drain runtime base**
   - Drain published runtime branches through `codex/runtime-research-program-closeout`.
   - Then submit and drain the local-only runtime tail through `codex/runtime-lab-plane-reorg`.
   - Validate with `bun run runtime-realization:type-env`, manifest JSON checks, and runtime-lab diff checks.

7. **Reconcile upper runtime/workstream/agent branches**
   - Decide final ordering between `codex/phase-four-container-adjustments` and the record-based remediation so stale report language does not return.
   - Drain agent-sync as its own lane after the semantics branch is ported/restacked.
   - Drain Hyperresearch as its own proof/service lane after its parent is clean.

8. **Final cleanup**
   - Confirm no Graphite-untracked branches remain except intentional non-stack research branches.
   - Confirm attached worktrees are clean or intentionally active.
   - Confirm Phase Four is still unopened until the stack is clean green.

## Decisions To Make Before Implementation

- Whether `workstream record` fully replaces `workstream report` for all future active guidance.
- Whether the dirty remediation should be split into two branches or committed as one cleaned correction.
- Where the final distilled research report should live after this consolidation.
- Whether `codex/agent-config-sync-parity-semantics` is ported into `agent-codex-agent-sync-parity-closure` or restacked as a fourth branch.
- Whether Hyperresearch proof evidence bulk remains as-is or is compacted before drain.
- Whether Phase Four container setup should be restacked above record remediation or amended after remediation lands.

## Guardrails

- Do not promote research reports into architecture authority without a spec-edit branch.
- Do not treat Hyperresearch/Inngest proof evidence as Runtime Realization Lab production proof.
- Do not treat generated Semantica or Hyperresearch output as canonical source truth.
- Do not run broad Graphite operations from a dirty checkout.
- Do not delete research worktrees until this consolidation is committed and reviewed.

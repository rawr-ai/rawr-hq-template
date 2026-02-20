# Agent D: Domain Boundaries and Authority Model Assessment

## Executive Assessment
The spec packet defines a strong single-owner boundary model (host composition vs plugin boundary contracts vs package domain logic vs shared infrastructure ports).  
The main autonomy risks are not in the policy language; they are in lifecycle/discovery tooling drift: legacy metadata still drives workspace plugin classification, API/workflows roots are excluded from plugin discovery, and equivalent logic is duplicated across two files with no single implementation owner.

## Domain Boundary and Authority Model

### Canonical target boundaries (well-defined on paper)
1. **Host composition authority** owns concrete adapter assembly, mount ordering, and one runtime-owned Inngest bundle.
2. **Boundary plugin authority** owns caller-facing API/workflow contracts and boundary routers.
3. **Capability package authority** owns transport-neutral domain logic and internal clients.
4. **Shared infrastructure package authority** owns reusable ports/contracts/helpers (not concrete adapter bootstrapping).

### Overlap and autonomy blockers (observed)
1. **Legacy metadata authority overlap (explicit blocker):** policy says runtime identity is `rawr.kind` + `rawr.capability`, but workspace plugin utilities still parse/use `templateRole`, `channel`, and `publishTier`, including operational filtering by `templateRole`.
2. **Workflow/API visibility gap (explicit blocker):** policy defines `plugins/api/*` and `plugins/workflows/*` as first-class runtime roots, but workspace plugin directory discovery scans only `plugins/cli`, `plugins/agents`, and `plugins/web`.
3. **Implementation ownership overlap (explicit blocker):** the workspace plugin utility exists as byte-identical copies in `packages/hq` and `plugins/cli/plugins`, creating dual-authority maintenance and drift risk.
4. **Template vs personal ownership tension (coordination blocker):** ORPC/workflow plugin boundaries are canonical in template architecture docs, while AGENTS split rules route operational plugin authoring for `plugins/api/**` and `plugins/workflows/**` to personal HQ first; without an explicit governance handshake, boundary changes can stall between upstream policy and downstream execution.

## Import-Direction Integrity Assessment
1. The import-direction contract is clear and deterministic in policy (shared infra -> capability packages -> plugins -> host).
2. The evaluated implementation files do not themselves violate plugin-to-plugin import rules.
3. Integrity is currently a **policy guarantee with weak local enforcement evidence** in the assessed files: the utilities do not validate `rawr.kind`/`rawr.capability`, do not enumerate all declared plugin roots, and therefore cannot fully support boundary integrity checks for API/workflow surfaces.

## Team-Autonomy Implications
1. **Intended autonomy:** host team, boundary plugin teams, and capability package teams can work in parallel with explicit seams.
2. **Current autonomy drag:** lifecycle/discovery tooling does not model API/workflows surfaces, so teams owning those boundaries are partially outside default operational tooling loops.
3. **Coordination tax:** duplicated utility ownership forces synchronized edits across two code paths for boundary/lifecycle behavior changes.
4. **Operational ambiguity risk:** mixed runtime metadata semantics (new in policy, legacy in tooling) increases cross-team interpretation disputes.

## Skills Introspected
1. `solution-design` emphasized framing/incentives/reversibility checks used to test whether observed mismatches are structural vs incidental.  
Evidence: `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:49`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:83`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:95`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:127`
2. `system-design` supplied boundary-choice and second-order/incentive diagnostics for autonomy impact analysis.  
Evidence: `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:58`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:81`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:117`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:191`
3. `domain-design` provided the single-authority, ambiguity-minimization, and seam-placement criteria used for overlap detection.  
Evidence: `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:41`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:95`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:101`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:134`
4. `team-design` provided singular accountability and coordination-overhead criteria for team-autonomy implications.  
Evidence: `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:101`, `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:103`, `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:121`, `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:139`

## Evidence Map
1. **Canonical split and ownership policy (host vs plugin vs package):**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:45`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:50`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:87`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:235`
2. **Runtime metadata contract and legacy exclusion:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:54`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:109`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:140`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:251`
3. **Split-vs-collapse enforcement and anti-dual-path rules:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/03-split-vs-collapse.md:19`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/03-split-vs-collapse.md:22`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/03-split-vs-collapse.md:67`
4. **Host composition ownership and deterministic mount order:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md:20`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md:25`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md:31`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md:275`
5. **Workflow/API boundary ownership and injected-port seam:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:24`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:37`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:39`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:49`
6. **Import-direction contract and layer guarantees:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:19`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:25`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:46`
7. **System/plugin root and metadata target contracts:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/SYSTEM.md:7`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/SYSTEM.md:76`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/SYSTEM.md:85`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/SYSTEM.md:89`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:21`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:31`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:37`
8. **Template vs personal ownership split signal:**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/AGENTS_SPLIT.md:60`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/AGENTS_SPLIT.md:63`
9. **Observed implementation drift (legacy metadata + limited roots):**  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:10`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:81`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:110`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:150`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:10`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:81`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:110`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:150`
10. **Duplicate-authority confirmation:**  
byte-identical check executed between the two utility files during assessment.

## Assumptions
1. The listed architecture packet docs represent normative target-state authority for this assessment.
2. The two workspace plugin utility files are part of active lifecycle/discovery behavior and not dead code.
3. This pass evaluates only the requested anchors and the two specified implementation files, not full repo runtime wiring.

## Risks
1. **High:** Runtime-policy/tooling divergence causes inconsistent operational decisions (manifest/runtime semantics vs legacy metadata semantics).
2. **High:** API/workflow plugin surfaces may remain invisible to default workspace plugin lifecycle tooling, reducing enforcement/autonomy for ORPC+Inngest boundary owners.
3. **Medium-High:** Duplicate utility ownership increases drift probability and creates two-team coordination gates for one behavior surface.
4. **Medium:** Import-direction policy may be assumed enforced while enforcement coverage is partial or delayed in operational tooling.
5. **Medium:** Template-vs-personal split can create governance latency for boundary changes unless escalation/promote criteria are explicit.

## Unresolved Questions
1. Which module is the canonical owner for workspace plugin discovery/lifecycle logic: `packages/hq` or `plugins/cli/plugins`?
2. Is workspace plugin discovery intentionally limited to `cli/agents/web`, or should it include `api/workflows/mcp` per target architecture contracts?
3. Should lifecycle/status tooling now hard-require `rawr.kind` + `rawr.capability` and ignore legacy metadata fields entirely?
4. Where are `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard` currently enforced in CI, and are API/workflow surfaces in scope for those checks?
5. What is the explicit decision-rights handshake between template architecture authority and personal-repo operational ownership for `plugins/api/**` and `plugins/workflows/**` changes?

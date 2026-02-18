# SESSION_019c587a — Full-Scope Docs Archive Sweep Matrix (YAML)

---
report:
  worktree: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal
  branch: codex/pure-package-e2e-convergence-orchestration
  mode: analysis-only
  protected_context:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md
  scope:
    docs_system_root: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system
    docs_projects_root: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects
    docs_system_files_reviewed: 10
    docs_projects_files_reviewed: 184
    docs_projects_directories_reviewed: 10
    total_files_reviewed: 194

matrix_entries:
  docs_system:
    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
      current_role: historical proposal/context doc
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 16:51:04 -0500
        context: self-labeled proposal history/context
      conflict_type: policy-violating
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
      reason: non-canonical history currently lives under docs/system
      risk_if_moved: Low
      dependencies_blockers: []

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md
      current_role: old-cycle locked recommendation baseline
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-17 00:49:25 -0500
        context: overlaps with newer canonical family in flat-runtime-session-review
      conflict_type: superseded
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md
      reason: causes canonical-source collision noted by loop-closure governance docs
      risk_if_moved: High
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/SYSTEM.md references old packet family
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md requests explicit authority declaration first

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md
      current_role: active plugin architecture/system contract
      canonical_now: Y
      session_relevance: Medium
      staleness_signal:
        mtime: 2026-02-13 16:50:15 -0500
        context: still referenced across gateway/process/agent docs
      conflict_type: none
      recommended_action: keep
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md
      reason: still canonical for runtime plugin contract surface
      risk_if_moved: High
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/AGENTS.md links this file
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/PLAN.md links this file
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/AGENTS.md links this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md
      current_role: old packet axis policy leaf
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 16:58:44 -0500
        context: duplicated by newer packetized axis docs in flat-runtime-session-review/orpc-ingest-spec-packet
      conflict_type: duplicate
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md
      reason: old axis family duplicates current session-owned axis family
      risk_if_moved: Medium
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md still links this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md
      current_role: old packet axis policy leaf
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 16:58:57 -0500
        context: duplicated by newer session packet architecture/lifecycle docs
      conflict_type: duplicate
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md
      reason: parallel policy lineage in wrong canonical tier
      risk_if_moved: Medium
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md still links this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md
      current_role: old packet example leaf
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-17 00:49:56 -0500
        context: recently edited but still belongs to old packet family
      conflict_type: duplicate
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md
      reason: retain lineage but remove from canonical system tier
      risk_if_moved: Medium
      dependencies_blockers:
        - merge most-recent deltas into /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples first

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
      current_role: old packet axis policy leaf
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 17:00:15 -0500
        context: testing/lifecycle policy now represented in session packet docs
      conflict_type: duplicate
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
      reason: old-family duplicate of current convergence packet
      risk_if_moved: Medium
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md links this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
      current_role: old packet axis policy leaf
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 17:00:27 -0500
        context: simplification/removal guidance now captured in session packet lineage
      conflict_type: duplicate
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
      reason: parallel guidance source in wrong tier
      risk_if_moved: Medium
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md links this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md
      current_role: old packet decision register
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 16:51:38 -0500
        context: competing decision register exists in session packet family with active open/locked states
      conflict_type: superseded
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md
      reason: dual decision ledgers create policy ambiguity
      risk_if_moved: Medium
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md references this file
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md references this file

    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md
      current_role: old packet entrypoint and axis index
      canonical_now: N
      session_relevance: High
      staleness_signal:
        mtime: 2026-02-13 16:58:31 -0500
        context: authority collision with session packet entrypoint /orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md
      conflict_type: superseded
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md
      reason: main old-family anchor still linked from gateway/process docs
      risk_if_moved: High
      dependencies_blockers:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/SYSTEM.md links this file
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md links this file
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/process/PLUGIN_E2E_WORKFLOW.md links this file

  project_level_candidates:
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      classification: session-relevant-supporting
      files_total: 66
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-coordination-canvas-v1/
      reason: large historical scratch+plan corpus; still useful as ORPC migration lineage but no active execution signal
      risk_if_moved: Medium
      dependencies_blockers:
        - extract and preserve 1-2 cross-reference docs into active session index before archiving

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
      classification: archive-candidate
      files_total: 14
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-readiness/
      reason: final-report style closure docs indicate completed initiative
      risk_if_moved: Low
      dependencies_blockers: []

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
      classification: archive-candidate
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/architecture-stabilization/
      reason: contains baseline/reconciliation/final disposition only
      risk_if_moved: Low
      dependencies_blockers: []

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
      classification: archive-candidate
      files_total: 4
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/finalization/
      reason: final-state snapshots are historical closure artifacts
      risk_if_moved: Low
      dependencies_blockers: []

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
      classification: active-now
      files_total: 71
      latest_mtime: 2026-02-17 15:21:46 -0500
      recommended_action: keep
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/
      reason: current active convergence workspace with freshest edits
      risk_if_moved: High
      dependencies_blockers:
        - protected context file must stay accessible: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
      classification: archive-candidate
      files_total: 2
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/hq-core-extraction/
      reason: scratch-only, no active/final integration artifacts
      risk_if_moved: Low
      dependencies_blockers: []

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
      classification: archive-candidate
      files_total: 4
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: move-to-project-archive
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/hq-foundation-salvage/
      reason: plan/scratch bundle overlaps with promotion/transition project family
      risk_if_moved: Medium
      dependencies_blockers:
        - cluster-level consolidation decision with plugin-lifecycle-promotion and template-core-transition

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
      classification: ambiguous-needs-owner-decision
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: deprecate-note
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion/
      reason: overlaps with transition/salvage project set; unclear canonical umbrella owner
      risk_if_moved: Medium
      dependencies_blockers:
        - owner decision on merge-under strategy for promotion/transition cluster

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
      classification: session-relevant-supporting
      files_total: 13
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: keep
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split/
      reason: still useful as supporting baseline for template-vs-personal separation context
      risk_if_moved: Medium
      dependencies_blockers:
        - verify no active runbook links rely on project path before archiving

    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
      classification: ambiguous-needs-owner-decision
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500
      recommended_action: deprecate-note
      target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition/
      reason: overlaps conceptually with plugin-lifecycle-promotion and hq-foundation-salvage
      risk_if_moved: Medium
      dependencies_blockers:
        - settle conflict-cluster disposition (merge-under vs keep-separate-with-rename)

safe_to_archive_now:
  docs_system:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
  docs_projects:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction

archive_after_merge:
  docs_system:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md
  docs_projects:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage

keep_active:
  docs_system:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md
  docs_projects:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
  protected_context:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md

ambiguous_requires_decision:
  - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
    reason: overlapping transition/promotion scope with multiple sibling projects
    recommended_next_step: owner decision on merge-under destination before archive
  - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
    reason: similar scope wording and artifacts as promotion/salvage project family
    recommended_next_step: decide whether to merge into a single transition archive node or keep with explicit rename

conflict_clusters:
  - cluster_id: cluster_orpc_lineage_overlap
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
    overlap: ORPC migration + multi-agent orchestration lineage
    recommended_disposition: archive-one
    action_detail:
      archive_one: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      keep_active: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
      archive_target: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-coordination-canvas-v1/

  - cluster_id: cluster_transition_promotion_overlap
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
    overlap: template-core extraction/salvage/promotion/transition theme collision
    recommended_disposition: merge-under
    action_detail:
      merge_under: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/
      notes:
        - keep one retained summary index at /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition/
        - move sibling scratch-heavy projects under the merge-under archive root

  - cluster_id: cluster_closure_docs_overlap
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
    overlap: both represent architecture closure/final-state checkpoints
    recommended_disposition: keep-separate-with-rename
    action_detail:
      rename_suggestion:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization -> /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/architecture-stabilization-phase/
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization -> /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/finalization-phase/

projects_inventory_by_disposition:
  active-now:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
  session-relevant-supporting:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
  archive-candidate:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
  ambiguous-needs-owner-decision:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition

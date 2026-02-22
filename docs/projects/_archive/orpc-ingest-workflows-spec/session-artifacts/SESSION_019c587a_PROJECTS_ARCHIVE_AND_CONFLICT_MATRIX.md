# SESSION_019c587a — Projects Archive and Conflict Matrix (YAML)

report:
  worktree: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal
  branch: codex/pure-package-e2e-convergence-orchestration
  mode: analysis-only
  inventory_scope: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects
  projects_directories_reviewed: 10
  projects_files_reviewed: 184
  protected_context:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md

archive_path_convention_recommendations:
  base: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/<project-name>/
  examples:
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-readiness/
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/architecture-stabilization/
    - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/
  guidance:
    - preserve original filenames under archive root for traceability
    - for merged clusters, create one merge-under root and keep source-project subfolders
    - keep protected context files outside archive while session is active

projects_inventory:
  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
    classification: session-relevant-supporting
    files_total: 66
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - high scratch/plan density indicates historical execution notebook
      - ORPC migration and remediation docs still provide lineage context
    recommended_disposition: archive-one
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-coordination-canvas-v1/
    rationale: keep as supporting lineage only; primary active convergence now sits in flat-runtime-session-review
    blockers:
      - extract a short pointer index into active session docs before archive

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
    classification: archive-candidate
    files_total: 14
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - contains final report and validation report
      - no recent activity signal
    recommended_disposition: archive-one
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-readiness/
    rationale: initiative appears complete and historical
    blockers: []

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
    classification: archive-candidate
    files_total: 3
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - baseline snapshot + reconciliation matrix + final disposition pattern
    recommended_disposition: keep-separate-with-rename
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/architecture-stabilization-phase/
    rationale: distinct phase artifact, but should be named as historical phase under archive
    blockers: []

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
    classification: archive-candidate
    files_total: 4
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - final-state templates and consolidated final state
    recommended_disposition: keep-separate-with-rename
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/finalization-phase/
    rationale: historical closure pack; should remain separate from stabilization phase but clearly archived
    blockers: []

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
    classification: active-now
    files_total: 71
    latest_mtime: 2026-02-17 15:21:46 -0500
    signals:
      - freshest edits in scope
      - contains canonical packet lineage and active convergence artifacts
    recommended_disposition: keep-separate-with-rename
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/
    rationale: keep as active project root while current convergence remains open
    blockers:
      - protected context file cannot be slated for deletion/archive at this stage

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
    classification: archive-candidate
    files_total: 2
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - scratch-only project with no closure report
      - no recent edits
    recommended_disposition: merge-under
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/hq-core-extraction/
    rationale: better grouped under broader transition/promotion archive family
    blockers:
      - align with owner decision for transition/promotion cluster

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
    classification: archive-candidate
    files_total: 4
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - salvage + phase-plan scratch structure
      - thematic overlap with transition/promotion projects
    recommended_disposition: merge-under
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/hq-foundation-salvage/
    rationale: consolidate overlapping transition-era artifacts
    blockers:
      - cluster-level owner decision with plugin-lifecycle-promotion and template-core-transition

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
    classification: ambiguous-needs-owner-decision
    files_total: 3
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - promotion matrix overlaps with template-core-transition themes
      - no explicit closure artifact to pick canonical sibling
    recommended_disposition: defer-with-rationale
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion/
    rationale: needs owner choice on whether this or template-core-transition is parent narrative
    blockers:
      - explicit owner decision required

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
    classification: session-relevant-supporting
    files_total: 13
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - final report + cleanup audit lineage for template/personal boundary
      - still contextually useful for current architecture governance
    recommended_disposition: keep-separate-with-rename
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split/
    rationale: keep available as supporting context while flat-runtime session is active
    blockers:
      - verify no active docs link break risk before eventual archive

  - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
    classification: ambiguous-needs-owner-decision
    files_total: 3
    latest_mtime: 2026-02-13 14:02:13 -0500
    signals:
      - promotion matrix + transition scratch mirror plugin-lifecycle-promotion intent
      - lacks explicit closure document
    recommended_disposition: defer-with-rationale
    target_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition/
    rationale: likely merge-under anchor, but ownership decision still required
    blockers:
      - select single parent narrative for transition/promotion cluster

safe_to_archive_now:
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization

archive_after_merge:
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage

keep_active:
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md

ambiguous_requires_decision:
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition

conflict_clusters:
  - cluster_id: cluster_01_orpc_lineage
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
    overlap: ORPC/agent orchestration migration narratives overlap
    recommended_disposition: archive-one
    concrete_action:
      archive_one: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      keep_active: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
      archive_target: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/agent-coordination-canvas-v1/

  - cluster_id: cluster_02_transition_promotion
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
    overlap: extraction/salvage/promotion/transition scope collision
    recommended_disposition: merge-under
    concrete_action:
      merge_under: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/
      post_merge_structure:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/hq-core-extraction/
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/hq-foundation-salvage/
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/template-core-transition/plugin-lifecycle-promotion/
      note: keep a brief index pointer in active tree only if owner requests

  - cluster_id: cluster_03_closure_phase_docs
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
    overlap: both represent phase-end closure artifacts with similar final-state framing
    recommended_disposition: keep-separate-with-rename
    concrete_action:
      rename_targets:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/architecture-stabilization-phase/
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/finalization-phase/
      rationale: preserve distinct chronology while removing naming ambiguity

  - cluster_id: cluster_04_repo_boundary_vs_transition
    members:
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
      - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
    overlap: both touch template/personal boundary changes but with different execution lenses
    recommended_disposition: defer-with-rationale
    concrete_action:
      defer_reason: repo-split remains supporting context; template-core-transition ownership is unresolved
      decision_needed_from_owner: whether template-core-transition should be merged into repo-split archive lineage or transition/promotion cluster

projects_inventory_by_disposition:
  active-now:
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review
      files_total: 71
      latest_mtime: 2026-02-17 15:21:46 -0500

  session-relevant-supporting:
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-coordination-canvas-v1
      files_total: 66
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/repo-split
      files_total: 13
      latest_mtime: 2026-02-13 14:02:13 -0500

  archive-candidate:
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/agent-readiness
      files_total: 14
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/architecture-stabilization
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/finalization
      files_total: 4
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-core-extraction
      files_total: 2
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/hq-foundation-salvage
      files_total: 4
      latest_mtime: 2026-02-13 14:02:13 -0500

  ambiguous-needs-owner-decision:
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/plugin-lifecycle-promotion
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500
    - project_path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/template-core-transition
      files_total: 3
      latest_mtime: 2026-02-13 14:02:13 -0500

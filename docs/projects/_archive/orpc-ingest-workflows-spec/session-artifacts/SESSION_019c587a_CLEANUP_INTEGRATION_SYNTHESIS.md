# SESSION_019c587a — Cleanup + Integration Synthesis

## Role
Coordinator synthesis for two analysis-only agents:
1. Archive sweep of `/docs/system`.
2. Original packet -> authoritative ORPC/Inngest packet alignment map.

This file is execution-prep only (no filesystem mutation performed in this phase).

## Source Artifacts
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_DOCS_ARCHIVE_SWEEP_MATRIX.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PROJECTS_ARCHIVE_AND_CONFLICT_MATRIX.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX.md`
- Context bridge (protected, no deletion):
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md`

## Outcome Snapshot
```yaml
archive_sweep:
  total_files_reviewed: 194
  docs_system_files_classified: 10
  docs_projects_files_reviewed: 184
  docs_projects_directories_reviewed: 10
  safe_to_move_now: 1
  needs_merge_first: 8
  must_remain_canonical: 1
  project_dispositions:
    active_now: 1
    session_relevant_supporting: 2
    archive_candidate: 5
    ambiguous_needs_owner_decision: 2
  project_conflict_clusters: 4

integration_map:
  total_rows: 107
  keep_unique: 42
  replace: 23
  merge_align: 39
  retire: 3
```

## Final Candidate List — `docs/projects` Project Roots
```yaml
docs_projects_disposition:
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
```

## Final Candidate List — `docs/system` Keep vs Move
```yaml
docs_system_disposition:
  keep_canonical:
    - path: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md
      reason: Active canonical plugin/runtime contract anchor.

  safe_to_move_now:
    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
      reason: Proposal history file; explicitly non-canonical by status.

  needs_merge_first:
    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md
      blocker: Authority handoff and pointer updates first.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md
      blocker: Canonical entrypoint repoint required.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md
      blocker: Decision authority consolidation/cross-link first.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md
      blocker: Preserve unique non-overlapping content before move.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md
      blocker: Preserve unique lifecycle governance before move.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md
      blocker: Merge old-family deltas into authoritative E2E references first.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
      blocker: Retain unique testing/rollout/process controls before move.

    - from: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
      to: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
      blocker: Preserve unique metadata/legacy-removal governance concerns.
```

## Final Original-Packet Keep/Replace/Align List

### Disposition totals (authoritative map)
```yaml
dispositions:
  keep_unique: 42
  replace: 23
  merge_align: 39
  retire: 3
```

### Keep-unique focus (must not be lost)
```yaml
keep_unique_focus_areas:
  - metadata_and_legacy_semantics:
      files:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md
      examples:
        - templateRole/channel runtime-semantics removal and publish posture governance

  - rollout_testing_ci_governance:
      files:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md
      examples:
        - rollout policy, phased sequencing, CI policy checks, sync lifecycle implications

  - broader_platform_governance_taxonomy:
      files:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md
      examples:
        - non-ORPC/Inngest ecosystem topology and steward guidance
```

### Replace focus (overlap where latest packet wins)
```yaml
replace_focus_areas:
  - ORPC_internal_calling_defaults
  - composition_authority_and_host_wiring_overlapping_sections
  - old_e2e_normative_sections_replaced_by_authoritative_E2E_01_to_E2E_04
  - duplicated_old_packet_decision_clauses_conflicting_with_current_packet_lock

authoritative_sources_for_replacements:
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_*.md
  - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_*.md
```

### Merge-align focus (keep section, normalize wording/contracts)
```yaml
merge_align_focus_areas:
  - keep broader doc sections but rewrite overlap language to authoritative axis terms
  - preserve process/governance sections while replacing subsystem mechanics
  - align acceptance/invariant wording with packet-wide rules
```

## Ready-to-Execute Mutation Order (Next Phase)
```yaml
mutation_order:
  - step_1_authority_lock:
      actions:
        - declare authoritative ORPC/Inngest packet in one canonical gateway page
        - add explicit deprecation banner in old-family system packet/proposal docs
      outputs:
        - canonicality note + cross-links only (no archive moves yet)

  - step_2_preserve_uniques:
      actions:
        - extract/merge keep-unique concerns from old family into retained canonical governance destinations
        - capture migration notes for testing/rollout/legacy metadata concerns
      outputs:
        - no-loss checklist signed against 42 keep-unique rows

  - step_3_replace_overlap:
      actions:
        - replace overlap sections in old docs with concise pointer blocks to authoritative packet axes
        - remove duplicate normative prose where latest packet already governs
      outputs:
        - overlap-clean old-family docs

  - step_4_archive_moves:
      actions:
        - move safe-to-move-now file first
        - move needs-merge-first files after step_2 and step_3 checks pass
      targets:
        - /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/**

  - step_5_link_integrity_validation:
      actions:
        - verify docs/SYSTEM and process docs point only to canonical current docs
        - verify no orphan anchors remain
      pass_criteria:
        - no canonical-source collision between docs/system and session packet family
```

## Immediate Actionability Checklist
```yaml
ready_for_execution_pass: true
preconditions_met:
  - archive_matrix_complete
  - integration_alignment_matrix_complete
  - loop_closure_bridge_present_and_protected
remaining_before_code_delta_phase:
  - run mutation pass above
  - lock unresolved decisions from authoritative packet decision register
```

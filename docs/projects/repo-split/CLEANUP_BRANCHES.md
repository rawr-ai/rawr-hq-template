# Template Branch Cleanup Log

## Scope

Repository: `rawr-ai/rawr-hq-template`  
Policy: Aggressive deletion of merged/superseded stale branches, keep non-merged branches.

## Deletion Candidate Method

Candidates were selected from `origin/*` where:
- branch is not `main`
- branch is not `HEAD`
- `git merge-base --is-ancestor origin/<branch> origin/main` is true

## Deleted Remote Branches
- `02-05-chore_journal_cap_snippet_limits`
- `02-05-docs_phase2_fill_agent_scratchpads`
- `02-05-docs_phase2_update_plan_decisions`
- `02-05-docs_security_add_hardening_plan`
- `02-05-feat_control_plane_add_config`
- `02-05-feat_journal_add_semantic_search_option`
- `02-05-test_cli_add_workflow_harden_e2e`
- `codex/feat-reflect-skill-packet`
- `codex/rawr-hq-base`
- `codex/rawr-s1-cli-plugin-channels`
- `codex/rawr-s2-plugin-policy-scaffold`
- `codex/rawr-s3-template-governance-docs`
- `codex/rawr-s4-template-identity-archive`
- `codex/rawr-s5-session-tools`
- `graphite-base/21`
- `graphite-base/22`

## Deletion Results

All listed candidate branches were deleted successfully via GitHub API.

## Remaining Remote Branches (Non-Merged)
- `02-05-fix_server_load_dist_src_server_entrypoints`
- `02-05-feat_factory_add_command_workflow_plugin_generators`
- `02-05-feat_mfe_add_demo_plugin_web_mounting`
- `02-05-feat_security_add_posture_packet`
- `02-05-feat_workflow_add_demo-mfe_forge-command_workflows`
- `02-05-feat_workflow_add_harden_workflow`
- `agent-B-rawr-cli`
- `agent-D-rawr-server`
- `agent-E-rawr-web`
- `codex/docs-phase2-factory`
- `codex/feat-cli-global-bin`
- `codex/feat-dev-up`
- `codex/feat-journal-reflect`
- `codex/feat-routine-runner`
- `codex/feat-state-enablement`
- `codex/fix-routine-check-output`

## Counts

- Remote branch heads before cleanup: 33
- Remote branch heads after cleanup: 17
- Deleted: 16
- Remaining non-merged non-main branches: 16
- As-of template `main`: `87fc60c`

## Graphite Tracking Cleanup

- Removed stale local tracked branches corresponding to deleted stack branches.
- Current `gt ls` in template repo is normalized to `main` only.

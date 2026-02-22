# Agent D Plan (Stack Drift Guard)

## Role
- Guard against stack drift during repo split execution.
- Provide stack snapshot, completeness sign-off, and repeatable re-check procedure.
- Non-mutating only.

## Inputs
- Implementation plan: docs/projects/repo-split/IMPLEMENTATION_PLAN.md
- Stack view: `gt ls` and commit log from `main` to top-of-stack

## Protocols
### New-Branch Awareness (Drift Handling Rule)
If a new branch appears on top of the stack during execution:
1. Pause at safe checkpoint.
2. Refresh stack snapshot and update plan.
3. Include branch in landing scope.
4. Resume only after Agent D sign-off.

## Pre-Final Checkpoint Snapshot (2026-02-05)
Context: Template repo renamed and baseline landed.

### PR Chain / Stack Order (from `gt ls`)
- codex/feat-reflect-skill-packet
- codex/rawr-s5-session-tools
- codex/rawr-s4-template-identity-archive
- codex/rawr-s3-template-governance-docs
- codex/rawr-s2-plugin-policy-scaffold
- codex/rawr-s1-cli-plugin-channels
- codex/rawr-hq-base
- 02-05-feat_control_plane_add_config
- 02-05-test_cli_add_workflow_harden_e2e
- 02-05-docs_phase2_fill_agent_scratchpads
- 02-05-feat_journal_add_semantic_search_option
- 02-05-docs_security_add_hardening_plan
- 02-05-docs_phase2_update_plan_decisions
- 02-05-fix_server_load_dist_src_server_entrypoints
- 02-05-chore_journal_cap_snippet_limits
- main (current)

### Commit List (main..top, oldest -> newest)
- (none) main..HEAD is empty; top-of-stack is aligned with main.

## Sign-Off (Pre-Final Completeness)
- Status: No missed atop branches for the landed baseline in the template repo.
- Evidence: `git log --oneline --reverse main..HEAD` returned no commits.
- Condition: Re-run snapshot if any new branches appear or stack order changes.

## Old Stacked PRs (#22-#33)
- Current state: branches remain listed in `gt ls` but are superseded by the landed `main` baseline (no diff against main).
- Action: No additional landing required for pre-final; cleanup only if orchestrator requests.

## Repeatable Re-Check Procedure
### Pre-Merge (landing full stack to main)
1. `gt ls` to confirm stack order and detect new branches.
2. `git log --oneline --reverse main..HEAD` to capture commit chain.
3. Update this file if new branches or commits appear.
4. Re-issue Agent D sign-off.

### Pre-Rename (template repo rename)
1. Re-run `gt ls` and `git log --oneline --reverse main..HEAD`.
2. Confirm stack is fully landed to main (no commits in main..HEAD).
3. Record a new sign-off in this file.

### Pre-Final (post-split verification)
1. Verify no new branches are atop main in template and personal repos.
2. Capture final stack snapshot (should be main only).
3. Confirm sign-off and record final SHA if required by orchestrator.

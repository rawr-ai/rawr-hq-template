# Agent A Plan (Stack Landing Readiness + Template Hardening Prep)

Owner: Agent A  
Status: In Progress (brief complete; awaiting orchestrator landing execution)  
Scope boundary: non-mutating readiness work only (unless explicitly requested otherwise)

## Canonical alignment
- Source of truth: `docs/projects/repo-split/IMPLEMENTATION_PLAN.md`
- Focus phase(s): Phase 1 readiness evidence and Phase 6 gate prep inputs

## Tasks
- [x] Initialize Agent A plan/scratch artifacts.
- [x] Snapshot open stack from PR `#20` to current top.
- [x] Produce exact commit landing chain (`main..top`).
- [x] Verify workspace plugin command surface has no legacy shim files.
- [x] Provide actionable findings + exact landing validation commands.
- [x] Keep this plan and `update_plan` status synced.

## Stack-awareness technical brief

### Current landing target
- Baseline `main`: `b4202b2ce7d19bdd447618f60e581d9bd0d1b631`
- Current stack top: `codex/feat-reflect-skill-packet` @ `864fc558a76a60ff8a03f29336edabb03e8708d7`
- Net commits to land (`main..top`): `22`

### Open PR chain (`#20 -> #34`)
- `#20` `02-05-chore_journal_cap_snippet_limits` -> `main` (`87fe4e93f403bb8f45bc8c3ea442dd0116475b47`) [draft]
- `#21` `02-05-fix_server_load_dist_src_server_entrypoints` -> `02-05-chore_journal_cap_snippet_limits` (`58eb77fe1caad358033b50fc567df00231bebd9e`) [draft]
- `#22` `02-05-docs_phase2_update_plan_decisions` -> `02-05-fix_server_load_dist_src_server_entrypoints` (`3532cf013080a00867b8ff66b408dc6e595bf578`) [draft]
- `#23` `02-05-docs_security_add_hardening_plan` -> `02-05-docs_phase2_update_plan_decisions` (`80df3adc5ed060ac825691e7f3a6c87d647b99a3`) [draft]
- `#24` `02-05-feat_journal_add_semantic_search_option` -> `02-05-docs_security_add_hardening_plan` (`da113ea1088b8aef586f91ba5970c1b8bc2e1bbb`) [draft]
- `#25` `02-05-docs_phase2_fill_agent_scratchpads` -> `02-05-feat_journal_add_semantic_search_option` (`7a752d6ca1c12120be7306f43e7d7ead6bdfff29`) [draft]
- `#26` `02-05-test_cli_add_workflow_harden_e2e` -> `02-05-docs_phase2_fill_agent_scratchpads` (`33356bebf26b08f9fc502eee47d7c3dcf0f23e03`) [draft]
- `#27` `02-05-feat_control_plane_add_config` -> `02-05-test_cli_add_workflow_harden_e2e` (`ba46056bab7936cf4a8f583993571fa8ebc1fc76`) [draft]
- `#28` `codex/rawr-hq-base` -> `02-05-feat_control_plane_add_config` (`da343ab66ebce74d818673056fa430d55f73f0ff`) [draft]
- `#29` `codex/rawr-s1-cli-plugin-channels` -> `codex/rawr-hq-base` (`c92a52279a84968f8cb86e767007d2845c4ef50e`) [draft]
- `#30` `codex/rawr-s2-plugin-policy-scaffold` -> `codex/rawr-s1-cli-plugin-channels` (`35c25df838be5a8ca327b771a3081e7fa9865b86`) [draft]
- `#31` `codex/rawr-s3-template-governance-docs` -> `codex/rawr-s2-plugin-policy-scaffold` (`9bf27799243379f8643e1aef59f39ec5395aebbf`) [draft]
- `#32` `codex/rawr-s4-template-identity-archive` -> `codex/rawr-s3-template-governance-docs` (`28797d487bf34bdea39f71a0b62f13e1dc678e9c`) [draft]
- `#33` `codex/rawr-s5-session-tools` -> `codex/rawr-s4-template-identity-archive` (`1bc3a3bb5d12473977a6a553af0afd76a861632d`) [draft]
- `#34` `codex/feat-reflect-skill-packet` -> `codex/rawr-s5-session-tools` (`864fc558a76a60ff8a03f29336edabb03e8708d7`) [draft]

### Exact commit chain to be landed (`git rev-list --reverse main..codex/feat-reflect-skill-packet`)
1. `87fe4e93f403bb8f45bc8c3ea442dd0116475b47` chore(journal): cap snippet limits
2. `58eb77fe1caad358033b50fc567df00231bebd9e` fix(server): load dist/src server entrypoints
3. `3532cf013080a00867b8ff66b408dc6e595bf578` docs(phase2): update plan + decisions
4. `80df3adc5ed060ac825691e7f3a6c87d647b99a3` docs(security): add hardening plan
5. `da113ea1088b8aef586f91ba5970c1b8bc2e1bbb` feat(journal): add semantic search option
6. `96fd839aa0ead20997ee418371e9346874403c59` docs(phase2): fill agent scratchpads
7. `609f2617dc3278236646749e50073bb3481c2141` docs(phase2): fill agent scratchpads
8. `7a752d6ca1c12120be7306f43e7d7ead6bdfff29` docs(phase2): document semantic search
9. `2d3ed3b25bbcfbfbbbe193c31a7e887f747340eb` test(cli): add workflow harden e2e
10. `33356bebf26b08f9fc502eee47d7c3dcf0f23e03` chore(repo): keep e2e PR focused
11. `c6358971585453c4ffc68996da26c865ffd449ed` feat(control-plane): add rawr.config + config commands
12. `7e0d3d4e9f28c262efc8087de3b26ba27b9d0c6a` docs(process): add hardened agent loops and align security model
13. `ba46056bab7936cf4a8f583993571fa8ebc1fc76` Revert "docs(process): add hardened agent loops and align security model"
14. `da343ab66ebce74d818673056fa430d55f73f0ff` docs(process): add hardened agent loops and align security model
15. `c92a52279a84968f8cb86e767007d2845c4ef50e` feat(cli): split plugin channels and remove workspace plugin shims
16. `35c25df838be5a8ca327b771a3081e7fa9865b86` feat(control-plane): add plugin channel policy and publishable plugin scaffolds
17. `9bf27799243379f8643e1aef59f39ec5395aebbf` docs(template): add governance docs and plugin channel architecture
18. `28797d487bf34bdea39f71a0b62f13e1dc678e9c` chore(template): archive transient docs and normalize template identity
19. `39a31708e1a4a2beeed41246df8411449245a82f` feat(sessions): add session-tools package and plugin commands
20. `1c3401169c6e7f62006aa4eded7efe04b65af45d` fix(sessions): default to low safe session limits
21. `1bc3a3bb5d12473977a6a553af0afd76a861632d` fix(sessions): preserve newest ordering with safe limits
22. `864fc558a76a60ff8a03f29336edabb03e8708d7` docs(reflect): add canonical reflect skill packet + sync TODO

## Shim-surface verification
- Command files under `apps/cli/src/commands/**` include only `hq/plugins/{list,enable,disable,status}` for workspace runtime plugin operations.
- No files found under legacy path pattern `apps/cli/src/commands/plugins/**`.
- Remaining `rawr plugins enable` references are documentation-only drift in `plugins/AGENTS.md` (not command implementation).

## Actionable findings
1. All PRs in chain `#20..#34` are still draft; landing requires undraft/approval policy execution.
2. `plugins/AGENTS.md` still documents legacy workspace activation command (`rawr plugins enable <id>`) instead of `rawr plugins web enable <id>`.

## Landing validation command set (non-mutating)
```bash
# 1) Refresh Graphite metadata safely in parallel-agent context.
gt sync --no-restack

# 2) Confirm stack order from main -> top.
gt ls
gh pr list --state open --limit 100 --json number,title,headRefName,baseRefName,isDraft,url | jq 'sort_by(.number)'

# 3) Verify PR adjacency invariant (each PR base equals previous PR head).
for n in $(gh pr list --state open --limit 100 --json number --jq 'sort_by(.number)[] | .number'); do
  gh pr view "$n" --json number,headRefName,baseRefName --jq '"#\(.number) \(.baseRefName) <- \(.headRefName)"'
done

# 4) Verify exact commit payload from main to current top branch.
git rev-list --count main..codex/feat-reflect-skill-packet
git rev-list --reverse --oneline main..codex/feat-reflect-skill-packet

# 5) Verify no legacy workspace command shim files are present.
find apps/cli/src/commands -maxdepth 3 -type f | sort
rg --files apps/cli/src/commands | rg '^apps/cli/src/commands/plugins/' || true
rg -n "rawr plugins enable|rawr plugins disable|rawr plugins status|rawr plugins web" apps/cli plugins docs -g'*.ts' -g'*.md'

# 6) Run stack-landing confidence checks before merge.
bun run test
bun run typecheck
```

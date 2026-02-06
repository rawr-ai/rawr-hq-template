# Final State Report (Template)

## Summary
- Repo: `rawr-ai/rawr-hq-template`
- Branch: `main`
- Status: clean
- Graphite trunk: `main`

## Branch State
```bash
## main...origin/main
 M docs/projects/finalization/FINAL_STATE_TEMPLATE.md
---
* main                                      e6acfa3 [origin/main] docs(finalization): add template and consolidated end-state reports (#38)
  remotes/origin/HEAD                       -> origin/main
  remotes/origin/codex/finalization-reports 519d0b7 docs(finalization): add template and consolidated end-state reports
  remotes/origin/main                       e6acfa3 docs(finalization): add template and consolidated end-state reports (#38)
```

## Worktree State
```bash
/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template  e6acfa3 [main]
```

## Remote Branch Inventory
```bash
origin e6acfa3
origin/codex/finalization-reports 519d0b7
origin/main e6acfa3
```

## Graphite State
```bash
main
◉  main
{
  "main": {
    "trunk": true
  }
}
```

## Test Results
- `bun run test`: PASS (57/57 tests)
- `routine-snapshot` repeated N=10: PASS

## Plugin Inventory and Role Classification
```text
plugins/hello/package.json | @rawr/plugin-hello | role=fixture | channel=A | tier=blocked
plugins/mfe-demo/package.json | @rawr/plugin-mfe-demo | role=example | channel=B | tier=blocked
plugins/session-tools/package.json | @rawr/plugin-session-tools | role=example | channel=A | tier=blocked
```

## Split Conformance Verdict
- Template contains fixture/example plugin packages only.
- No operational/personal plugin package present in template.
- Verdict: split is correctly enforced in template.

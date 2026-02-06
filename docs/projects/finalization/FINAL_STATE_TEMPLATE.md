# Final State Report (Template)

## Summary
- Repo: `rawr-ai/rawr-hq-template`
- Branch: `main`
- Status: clean
- Graphite trunk: `main`

## Branch State
```bash
## main...origin/main
?? docs/projects/finalization/FINAL_STATE_CONSOLIDATED.md
?? docs/projects/finalization/FINAL_STATE_TEMPLATE.md
---
* main                a2d1d15 [origin/main] test(cli): harden routine and reflect test reliability (#37)
  remotes/origin/HEAD -> origin/main
  remotes/origin/main a2d1d15 test(cli): harden routine and reflect test reliability (#37)
```

## Worktree State
```bash
/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template  a2d1d15 [main]
```

## Remote Branch Inventory
```bash
origin a2d1d15
origin/main a2d1d15
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

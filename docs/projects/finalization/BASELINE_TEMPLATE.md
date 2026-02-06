## git status -sb
## codex/finishup-graphite-stack-repair
 M AGENTS.md
 M AGENTS_SPLIT.md
 M CONTRIBUTING.md
 M README.md
 M apps/cli/src/commands/factory/plugin/new.ts
 M apps/cli/src/commands/hq/plugins/enable.ts
 M apps/cli/src/commands/hq/plugins/list.ts
 M apps/cli/src/commands/hq/plugins/status.ts
 M apps/cli/src/commands/tools/export.ts
 M apps/cli/src/lib/workspace-plugins.ts
 M apps/cli/test/factory.test.ts
 M apps/cli/test/stubs.test.ts
 M docs/SYSTEM.md
 M docs/process/HQ_USAGE.md
 M docs/process/MAINTENANCE_CADENCE.md
 M docs/process/PLUGIN_E2E_WORKFLOW.md
 M docs/process/UPSTREAM_SYNC_RUNBOOK.md
 M docs/system/PLUGINS.md
 M plugins/AGENTS.md
 M plugins/hello/package.json
 M plugins/mfe-demo/package.json
 M plugins/session-tools/package.json
 M scripts/AGENTS.md
 M scripts/dev/auto-refresh-main.sh
?? docs/process/CROSS_REPO_WORKFLOWS.md
?? docs/projects/architecture-stabilization/
?? docs/projects/finalization/
?? packages/session-tools/AGENTS.md
?? scripts/dev/activate-global-rawr.sh
?? scripts/dev/check-remotes.sh
?? scripts/githooks/pre-push

## gt ls
◉  codex/finishup-graphite-stack-repair
◯  main

## gt state
{
  "main": {
    "trunk": true
  },
  "codex/finishup-graphite-stack-repair": {
    "trunk": false,
    "needs_restack": false,
    "parents": [
      {
        "ref": "main",
        "sha": "21e28414f0fe98f5f1b43234df0b683f1c90ed42"
      }
    ]
  }
}

## git branch -a -vv
* codex/finishup-graphite-stack-repair d067d22 chore(graphite): finalize finish-up integration ownership docs
  main                                 21e2841 [origin/main] fix(cli): remove dr.global alias typo
  remotes/origin/HEAD                  -> origin/main
  remotes/origin/main                  21e2841 fix(cli): remove dr.global alias typo

## git worktree list
/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template  d067d22 [codex/finishup-graphite-stack-repair]
/private/tmp/rawr-main-verify                               334ade3 (detached HEAD)

## git rev-parse
HEAD d067d22ff7894f76b5965d8c3757c0f08284c62e
main 21e28414f0fe98f5f1b43234df0b683f1c90ed42
origin/main 21e28414f0fe98f5f1b43234df0b683f1c90ed42

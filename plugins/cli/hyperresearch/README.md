# @rawr/plugin-hyperresearch

CLI projection for the `@rawr/hyperresearch-codex` service package.

Commands:

- `rawr hyperresearch codex-slice --query <query> --vault <path> --steps <path>`
- `rawr hyperresearch codex start --query <query> --vault <path> --steps <path>`
- `rawr hyperresearch codex advance --ledger <path> --agent-mode packets|synthesize`
- `rawr hyperresearch codex inspect --ledger <path>`
- `rawr hyperresearch codex validate --ledger <path> --backend fixture|real`
- `rawr hyperresearch codex run-fixture --query <query> --vault <path> --steps <path> --tier light|full`

This topic is the template-owned operator/testing surface. `codex-slice` is the legacy synthetic control-plane smoke; the V8 parity path is `codex start/advance/inspect/validate/run-fixture`. Codex skill, hook, MCP, and agent runtime material is currently synced from downstream RAWR HQ.

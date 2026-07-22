# @rawr/plugin-hyperresearch

CLI projection for the `@rawr/hyperresearch-codex` service package.

Commands:

- `rawr hyperresearch codex-slice --query <query> --vault <path> --steps <path>`
- `rawr hyperresearch codex start --query <query> --vault <path> --steps <path>`
- `rawr hyperresearch codex advance --ledger <path> --agent-mode packets|synthesize`
- `rawr hyperresearch codex inspect --ledger <path>`
- `rawr hyperresearch codex validate --ledger <path> --backend fixture|real`
- `rawr hyperresearch codex run-fixture --query <query> --vault <path> --steps <path> --tier light|full`

This topic is the Template-owned operator/testing surface. `codex-slice` is the
legacy synthetic control-plane smoke; the V8 parity path is
`codex start/advance/inspect/validate/run-fixture`. It does not load skills,
hooks, MCP configuration, or agent material from a personal checkout. Curated
agent-plugin content belongs to its own repository and may participate only
through an explicit versioned data or immutable-artifact interface.

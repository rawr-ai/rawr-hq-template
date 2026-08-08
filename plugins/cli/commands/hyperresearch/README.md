# @habitat-ai/rawr-plugin-hyperresearch

CLI projection for the `@habitat-ai/rawr-hyperresearch-codex` service package.

Commands:

- `rawr hyperresearch codex start --query <query> --vault <path> --steps <path>`
- `rawr hyperresearch codex advance --ledger <path> --agent-mode packets|synthesize`
- `rawr hyperresearch codex inspect --ledger <path>`
- `rawr hyperresearch codex validate --ledger <path> --backend fixture|real`

This topic is the Template-owned operator/testing surface for the V8 parity
path. It does not load skills, hooks, MCP configuration, or agent material from
a personal checkout. Curated agent-plugin content belongs to its own repository
and may participate only through an explicit versioned data or
immutable-artifact interface.

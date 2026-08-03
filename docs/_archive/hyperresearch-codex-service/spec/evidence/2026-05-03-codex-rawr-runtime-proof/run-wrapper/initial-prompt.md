Use the installed hyperresearch-codex skill/workflow.

This is phase 1 of the higher-order runtime proof. Do not edit repository files.

Goal for this turn only:
1. Read services/hyperresearch-codex/spec/HIGHER_ORDER_RUNTIME_PROOF_PLAN.md.
2. Start a fresh Hyperresearch Codex V8 run with the exact query below, tier light, backend real.
3. Advance exactly until the first awaiting_agents packet gate.
4. Do not spawn packet agents in this turn. Stop once awaiting_agents is reached.
5. Write command JSON outputs under: /tmp/hr-codex-runtime-proof-Zsld23/commands/
6. Final response must include ledger path, vault root, current status, pending packet paths, and your session/thread id if visible.

Query:
What are the practical compatibility implications of Python's packaging metadata standards for modern Python project installers? Focus on how pyproject.toml, core metadata, and dependency groups affect installer behavior, and cite only Python Packaging Authority or official Python documentation sources.

Use:
- vault root: /tmp/hyperresearch-codex-runtime-vault-rSLoGr
- steps root: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity/services/hyperresearch-codex/references/v8-steps
- CLI command root: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity
- backend: real
- tier: light

Commands must use this surface:
- bun run --cwd apps/cli rawr hyperresearch codex start --query ... --vault ... --steps ... --tier light --backend real --json
- bun run --cwd apps/cli rawr hyperresearch codex advance --ledger ... --agent-mode packets --backend real --json

Remember: do not use hyperresearch research.

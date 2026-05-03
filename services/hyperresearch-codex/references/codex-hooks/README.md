# Hyperresearch Codex Hook Candidates

These hook scripts are candidate guardrail material copied from the fixture proof shape. They are reference-only until RAWR agent-sync supports hook material as a managed install kind with dry-run, sync, update, drift, and removal evidence.

Current candidate scope:

- `PreToolUse` source-bypass guard for obvious generic shell fetch/search commands.
- `Stop` validation guard for missing, incomplete, or red Hyperresearch ledgers.

The authoritative Hyperresearch loop remains the service ledger, packet outputs, source capture, claim trace, patch log, backend CLI audit trail, and final `validate` result. These hooks do not replace those gates.


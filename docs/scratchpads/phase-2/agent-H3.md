# Agent H3 scratchpad — Hardening plan: plugin permissions model

## Notes / principles

- MCP-style mental model: plugins should declare capabilities (even if v0 cannot fully enforce).
- Minimum useful capability buckets for RAWR HQ:
  - filesystem read/write
  - network outbound
  - process execution
  - server route registration
  - web mount entrypoint
- Separate “declared permissions” from “observed heuristics”:
  - declaration provides intent; heuristics provide weak signals; neither is a sandbox.
- Forced enablement must be explicit and auditable:
  - require `--yes` + reason; record in an append-only log.

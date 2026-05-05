# Hyperresearch V8 References

These files are copied from the locally installed `hyperresearch` Python package for Codex integration testing.

- Source package: `hyperresearch 0.8.5`
- Upstream project metadata: `https://github.com/jordan-gibbs/hyperresearch`
- License: see `upstream/HYPERRESEARCH_LICENSE`

The service loads step files from `v8-steps/` by path and SHA-256 during V8 runs. Agent files in `v8-agents/` are source references for Codex custom-agent and packet projection; the service does not execute Claude agent frontmatter directly.

These references are not the distributable Hyperresearch plugin source. Runtime
plugin content installed into Codex or Claude lives downstream in
`/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/agents/hyperresearch/`;
update installed skill, agent, hook, and workflow behavior there while keeping
the template service and CLI here.

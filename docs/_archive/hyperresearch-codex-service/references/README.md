# Hyperresearch V8 References

These files are copied from the locally installed `hyperresearch` Python package for Codex integration testing.

- Source package: `hyperresearch 0.8.5`
- Upstream project metadata: `https://github.com/jordan-gibbs/hyperresearch`
- License: see `upstream/HYPERRESEARCH_LICENSE`

The service loads step files from `v8-steps/` by path and SHA-256 during V8
runs. Agent files in `v8-agents/` are Template-owned test/reference inputs for
Codex custom-agent and packet projection; the service does not execute Claude
agent frontmatter directly.

These references are not distributable curated agent-plugin content and do not
identify a personal checkout. Personal content remains in its owning
repository and can participate only through a governed immutable artifact that
binds to an exact Template-owned interface version.

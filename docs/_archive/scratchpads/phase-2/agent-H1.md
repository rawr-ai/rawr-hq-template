# Agent H1 scratchpad — Hardening plan: dependency & supply chain

## Notes / principles

- Treat dependency install scripts as an explicit trust boundary:
  - keep `bunfig.toml` `trustedDependencies` minimal and audited.
- Prefer deterministic dependency state:
  - lockfile diffs are first-class artifacts for review; avoid “floating” installs.
- Supply chain checks should be repeatable and local-first:
  - `bun audit` + “untrusted scripts” checks + secrets scan.
- Gate high-risk actions:
  - “enable plugin” and “install plugin deps” should run scans first and record provenance.

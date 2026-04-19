# ChatGPT Corpus Host Contract Remediation

- Plan copied verbatim to `PLAN_SCRATCH.md` before implementation.
- Goal: move `workspaceStore` to a package-local port seam and expose it only through a dedicated non-root export.
- Constraints:
  - keep root/client shell hard
  - no behavior changes to init/consolidate flows
  - no concrete adapter code inside the service package

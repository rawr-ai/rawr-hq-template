# Agent TS-Impl Plan

1. Capture baseline failing suite and classify failures.
2. Align stale assertions with current CLI behavior (mirroring shared `rawr-hq` expectations).
3. Exclude Playwright visual test from root Vitest runner.
4. Introduce fast/heavy Vitest config split.
5. Update root scripts for fast default gate and heavy optional phases.
6. Harden heavy CLI tests only where needed (timeouts/buffers/isolation).
7. Update runbooks and README for new testing lifecycle.
8. Validate with fast x3 + heavy CLI + heavy visual + all-in gate.

---
name: rawr-hq-plugin-creation
description: End-to-end workflow for creating a plugin in RAWR HQ across both command surfaces. Use when migrating existing scripts/plugins or designing net-new plugins, and guide from requirements through implementation, tests, docs, local wiring, optional publishing, and day-2 usage without mixing Channel A and Channel B commands.
---

# RAWR HQ Plugin Creation (End To End)

## Purpose

Use this skill when the user wants to build a plugin in RAWR HQ and needs full-path support from idea or migration source through usable CLI/runtime behavior.

This skill supports both origins:
- migrate existing script/plugin,
- create net-new plugin.

This skill supports both channels:
- Channel A: oclif command plugin (`rawr plugins ...`),
- Channel B: workspace runtime plugin (`rawr hq plugins ...`).

## Hard invariants

- Never mix command surfaces.
- Decide repo destination first using routing docs.
- Treat runtime enablement as explicit gated activation.
- Ensure tests and docs before claiming done.

## End-to-end workflow

1. Route the work to the right repo (template vs personal).
2. Choose channel based on behavior destination.
3. Choose origin branch: migration or net-new.
4. Capture requirements and non-goals.
5. Produce concrete implementation plan.
6. Implement plugin package structure and contracts.
7. Build, test, and verify command/runtime discovery.
8. Add user-facing docs and failure-mode guidance.
9. Wire locally for use.
10. If requested, prepare publish-ready posture and validate install flow.

## Decision checkpoints

- Checkpoint A: Channel selected (A or B).
- Checkpoint B: Origin selected (migration or net-new).
- Checkpoint C: Requirements accepted.
- Checkpoint D: Verification gates passed.

## References

| Topic | File |
| --- | --- |
| Discovery and requirements | `references/discovery-and-requirements.md` |
| Channel A implementation | `references/channel-a-cli-plugin.md` |
| Channel B implementation | `references/channel-b-runtime-plugin.md` |
| Migration playbook | `references/migration-playbook.md` |
| Publishing and wiring | `references/publishing-and-wiring.md` |
| Verification and failure modes | `references/verification-and-failure-modes.md` |
| Reusable project template | `assets/plugin-project-template.md` |

## Summary

This skill is the canonical RAWR HQ plugin build flow: choose channel and origin early, implement using channel-specific contracts, verify thoroughly, and deliver a plugin users can invoke confidently.

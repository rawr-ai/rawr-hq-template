# Verification And Failure Modes

## Verification checklist

1. Skill frontmatter and structure valid.
2. Channel A and B paths both documented with non-mixed commands.
3. Migration and net-new journeys both supported.
4. Build and tests pass for touched plugin package.
5. Local wiring/enablement verified for chosen channel.
6. Docs explain usage and limitations.

## Common failure modes

1. Wrong repo destination (template vs personal).
2. Command-surface mix-up (`rawr plugins` vs `rawr plugins web`).
3. Channel A command discovery mismatch due to oclif manifest/build path drift.
4. Channel A install path error when `file://` form is required.
5. Channel B unknown plugin id due to id/dir mismatch.
6. Channel B enablement blocked by security gate policy.
7. Runtime exports missing or unstable, preventing server/web load.

## Remediation pattern

- Re-run routing decision.
- Reassert chosen channel explicitly.
- Validate manifests against runbook contract.
- Rebuild and verify state/discovery commands.

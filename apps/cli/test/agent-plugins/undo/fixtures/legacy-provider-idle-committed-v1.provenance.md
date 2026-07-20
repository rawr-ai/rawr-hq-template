# Legacy Provider Idle Capsule V1 Provenance

`legacy-provider-idle-committed-v1.json` is a raw persistence fixture, not a
controller authority, migration ledger, or accepted provider record.

## Landed Source

- Template source commit: `4abda90ade2da263b9933b5eb8880cefe461bcd7`
  (`refactor(service): close lifecycle binding surface`), landed as an ancestor
  of Template main merge `4dcf206b4c043e2028545e1cf777c72019373572`.
- Provider codec:
  `apps/cli/src/lib/agent-plugins/service-runtime/providers/owner-protocol/index.ts`
  (`sha256:ab873dd76ab96c3e244647b30fc030ab811959d4bfc958d136f8a84646034368`).
- Provider capsule projection:
  `apps/cli/src/lib/agent-plugins/service-runtime/providers/provider-capsule.ts`
  (`sha256:e296e49975b9ef4a415462882f71c0c7bbc79156af05dbf845bd57e3ce898e5a`).
- Canonical persistence primitives:
  `apps/cli/src/lib/agent-plugins/undo/canonical.ts`
  (`sha256:ab4287f18b006a4913b2b8cdd14b174d8a2f24b46b9a41fefa933ef6ee610fc9`)
  and `apps/cli/src/lib/agent-plugins/undo/state.ts`
  (`sha256:0ca53f2d8374a43ffe4258d1e0b297c9a56d6b6bca782ee5dd1ee48d3e99bd22`).

The deterministic input is one settled `AdmitTargetIdentity` action for Codex
home `/fixture/provider-home`, content authority `personal-rawr-hq`, absent
receipt authority, and generation `cg1_` followed by 64 `1` characters.

## Recapture

Use a disposable detached checkout of the landed source commit. In an untracked
scratch program, drive its provider capsule writer through one settled
`AdmitTargetIdentity` action with the deterministic input above, then read the
resulting `capsule-state-v1.json` as raw bytes. Remove the disposable checkout
after comparing its bytes and digest with this fixture. No encoder or provider
action constructor is retained in the current tree because those semantics are
retired.

Verify the captured artifact from the current repository root with:

```sh
cmp "$CAPTURED_CAPSULE" \
  apps/cli/test/agent-plugins/undo/fixtures/legacy-provider-idle-committed-v1.json
shasum -a 256 "$CAPTURED_CAPSULE"
```

The expected raw-byte SHA-256 is
`363916da3fef00eb3298d430db5b7aa065c9564682242a863cb6810e2abce9ac`.
The test consumes that pin only over the fixture's raw bytes.

Related proof: [[apps/cli/test/agent-plugins/service-runtime/production-read-only.test]]
and [[apps/cli/src/lib/agent-plugins/undo/legacy-provider-idle]].

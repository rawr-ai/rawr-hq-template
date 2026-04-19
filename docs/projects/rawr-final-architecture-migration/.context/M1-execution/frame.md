# M1 Remaining Frame

Milestone 1 is now in its final three-slice runway.

`M1-U00` through `M1-U05` are treated as done in the milestone packet, and the residual HQ Ops service-shape repair from the `M1-U02`/`M1-U03` area was closed by commit `cee43327` on `agent-FARGO-M1-U02-followup-hq-ops-service-shape`.

The remaining job is not another semantic cleanup sweep. It is the executable-authority closeout chain:

1. `M1-U06` makes `apps/hq` the real canonical app shell.
2. `M1-U07` removes or quarantines old host-composition authority.
3. `M1-U08` freezes the plateau with proofs, durable docs, and the formal Phase 2 entry packet.

The key invariant is sequencing:

- do not neutralize old host authority before the new app shell is proven
- do not freeze proofs/docs before the plateau is actually real
- do not reopen earlier slices casually; if earlier work blocks `M1-U06` through `M1-U08`, record that as explicit blocker fallout

The main live files to keep in view are:

- [apps/hq/src/manifest.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/hq/src/manifest.ts)
- [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts)
- [apps/server/src/host-composition.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-composition.ts)
- [apps/server/src/host-seam.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-seam.ts)
- [apps/server/src/testing-host.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/testing-host.ts)

Context is still in good shape for continuing without a handoff.

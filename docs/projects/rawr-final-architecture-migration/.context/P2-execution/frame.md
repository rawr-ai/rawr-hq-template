# P2 Runtime Frame

Phase 2 is where the repo stops being merely arranged correctly and starts booting correctly through canonical seams.

The shell is already real:

- `apps/hq/rawr.hq.ts` is the manifest authority
- `apps/hq/server.ts`, `apps/hq/async.ts`, and `apps/hq/dev.ts` are the app-owned entrypoints
- the live plugin topology is already canonical

That means the immediate job is not more semantic cleanup. The immediate job is runtime realization:

- replace `apps/hq/legacy-cutover.ts`
- install the narrow bootgraph/compiler/runtime path the shell is supposed to drive
- prove one server slice and one async slice through that path

The invariant for the phase is simple:

- do not reopen Phase 1 authority decisions while making the runtime real

If runtime work starts behaving strangely around HQ Ops, inspect the carried-forward service-internal divergence early instead of assuming the new substrate is solely at fault.

# Process Runtime Version 2

This complete successor retains the version-1 private package-less owner and
closed TypeScript source/proof grammar. It adds the adapter import boundary;
it does not inherit or modify the prior version.

Keep adapter contracts in `src/surface-adapter.ts` and lowering helpers in
`src/adapters/**`. Lower only compiled surfaces, match executable references
through the existing registry, and delegate non-oRPC invocation through the
process execution runtime. Preserve the official oRPC bridge rather than
wrapping it in another runner.

Adapters do not import raw Effect, acquire providers, construct a runtime,
execute during lowering or mount hosts. Grit owns the bounded import relation;
native behavior tests own cold lowering and invocation-time delegation. The
source rule intentionally does not ban execution calls in deferred payloads.

Run native instance structure/source checks and the owner behavior/type tests.
Retain SDK packed-definition closure and isolated cache proof when changing
build inputs. Native host integration remains separately qualified work.

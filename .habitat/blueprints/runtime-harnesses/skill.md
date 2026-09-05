# Generic Harness Owner

This package-less owner defines cold generic native-companion contracts. It depends directly on definition, compiler, and process-runtime; the compiler edge supports rejection proofs, not executing plans.

Mount consumes already-lowered payloads, bounded process access, exact definition-owned launch identity, and read-only required-resource evidence. A native owner settles partial cleanup before rejecting mount. Its handle shares one stop promise, including rejection only after native work and cleanup settle. Optional readiness and liveness remain distinct and never synthesize passing evidence.

Do not add provider acquisition, cross-owner stop orchestration, StartedHarness, observation read models, a native host implementation, or a public live helper. Private validation and owner-local stop helpers are not SDK exports. Literal source imports are parser-checked; TypeScript and real behavioral proofs carry contracts the source rule cannot establish. The source rule does not ban raw Effect or deferred callbacks.

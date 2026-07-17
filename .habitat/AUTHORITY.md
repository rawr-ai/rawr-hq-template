# Authority Boundary

RAWR HQ-Template owns the constraints in this directory. The external Habitat
binary owns only read-only evaluation mechanics. The lifecycle changeset owns
the execution record, while the accepted architecture and lifecycle design own
product behavior.

This tree narrows three structural axes:

1. Curated lifecycle behavior has one oRPC service with six domain modules,
   one uniform module shell, and closed model categories where domain matter
   is already populated.
2. Curated and external plugin commands occupy distinct closed namespaces.
3. Service code depends on resource contracts rather than concrete providers or
   controller implementation, and CLI code consumes only public service
   exports.

The rules do not govern application composition, provider behavior, repository
promotion mechanics, or content-repository ancestry. Extending one of those
areas requires its own authority rather than an expansion of this tree.

See [[README|the packet index]],
[[openspec/changes/retire-mixed-plugin-lifecycle/README|the C5 execution record]],
and [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec|the canonical system overview]].

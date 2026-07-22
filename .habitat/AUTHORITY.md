# Authority Boundary

RAWR HQ-Template owns the constraints in this directory. The external Habitat
binary owns only read-only evaluation mechanics. The lifecycle changeset owns
the execution record, while the accepted architecture and lifecycle design own
product behavior.

This tree narrows three structural axes:

1. Curated lifecycle behavior has one oRPC service with five domain modules,
   one uniform module shell, and closed model categories where domain matter
   is already populated.
2. Curated and external plugin commands occupy distinct closed namespaces.
3. Service code depends on resource contracts rather than concrete providers or
   controller implementation. The reachable CLI runtime projection is closed
   around declared bindings, release construction, native-provider testing and
   convergence, and current-main selection. Concrete provider construction
   remains outside the semantic service, where filesystem or process mechanics
   cannot accumulate.

The rules do not govern application composition, provider behavior, repository
promotion mechanics, or content-repository ancestry. Extending one of those
areas requires its own authority rather than an expansion of this tree.

See [[README|the packet index]],
[[openspec/changes/archive/2026-07-18-retire-mixed-plugin-lifecycle/README|the archived C5 execution record]],
[[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec|the canonical system overview]],
and [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#11. Service runtime boundary contract|the runtime service boundary]].

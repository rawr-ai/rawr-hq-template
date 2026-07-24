# Service

`service` is the reusable contract-first oRPC kind shared by standalone
services and API-plugin service interiors.

One topology packet and nine independent source packets own the closed service
kind. The six shared source packets own positive generic-anchor presence, a
small set of first-hop native composition facts, context boundaries, the
canonical module import surface, the single exported contract, canonical
TypeBox adaptation at every operation input/output, bounded private contract
support, and private public-error constructor lineage. Embedded API-plugin
`base.ts` remains its required boundary/type anchor but does not export the
standalone runtime `base`; its implementer begins at `impl.ts`. Named runtime
oRPC imports may share a declaration with type-only specifiers.

Private schema composition, local error maps, fragments, and helpers remain
valid only while they are syntactically reachable from the one contract anchor;
imported or dynamic error-map authority and exported parallel schema, type,
envelope, or helper authority remain invalid. Three RAWR extensions keep
private import aliases owner-local and boundary declarations platform-neutral.
Root contract/router composition is left to TypeScript rather than a finite
Grit object-shape catalog. Each packet states its own syntax ceiling; none
simulates path resolution, inferred types, expression purity, or runtime
behavior.

Empty baselines keep current product disagreements visible. Habitat structure
owns topology, Grit owns the declared source relations, and behavior tests
remain with the behavior they prove.

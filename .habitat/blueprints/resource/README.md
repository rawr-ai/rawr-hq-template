# Resource

`resource` is the provider-neutral contract for one external or runtime
capability. Its enforced packet closes the owning workspace project around that
contract, its build boundary, and its provider family. Product policy, provider
selection, and concrete vendor mechanics have no destination in the resource
root.

Providers realize the contract. An application selects a provider and its
lifetime. Runtime acquisition scopes, releases, and binds the ready resource
into a service's declared context. The resource does not know which provider
was selected and does not become a service merely because a service consumes
it.

`resource@1` preserves the released whole-project acquisition and original
law and structure bytes. `resource@2` is a complete immutable successor with
the same law and structure; its Grit rule acquires only `contract.ts` and
`providers/**/*.ts` beneath the admitted `project` root. Each version resolves
only its own declared assets and neither inherits from nor traverses the other.
The law rejects explicit global `Error` and same-source `Error` subclasses in
production Effect failure channels while admitting resource- or provider-owned
tagged failures. TypeScript owns implementation assignability and inferred
channels; native Effect diagnostics own catch construction and failure
composition.

The law is package-native and product-neutral. Consumer paths and plugin, app,
Nx, or tool overlays do not cross the resource boundary.

See [[skill|Resource Capability Frame]], [[../provider/README|Provider]], and
[[../../AUTHORITY|the repository-local authority boundary]].

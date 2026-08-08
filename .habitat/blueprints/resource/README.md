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

`resource@1` also owns the provider-neutral Effect failure law. Its Grit rule
acquires the admitted resource instance's `project` root, rejects explicit
global `Error` and same-source `Error` subclasses in production Effect failure
channels, and admits resource- or provider-owned tagged failures. TypeScript
owns implementation assignability and inferred channels; native Effect
diagnostics own catch construction and failure composition.

The law is package-native and product-neutral. Consumer paths and plugin, app,
Nx, or tool overlays do not cross the resource boundary.

See [[skill|Resource Capability Frame]], [[../provider/README|Provider]], and
[[../../AUTHORITY|the repository-local authority boundary]].

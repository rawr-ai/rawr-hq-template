# Resource

`resource` is the provider-neutral contract for one external or runtime
capability. Its enforced packet closes the RAWR workspace package around that
contract, its build boundary, and its provider family. Product policy, provider
selection, and concrete vendor mechanics have no destination in the resource
root.

Providers realize the contract. An application selects a provider and its
lifetime. Runtime acquisition scopes, releases, and binds the ready resource
into a service's declared context. The resource does not know which provider
was selected and does not become a service merely because a service consumes
it.

See [[skill|Resource Capability Frame]], [[../provider/README|Provider]], and
[[../../AUTHORITY|the repository-local authority boundary]].

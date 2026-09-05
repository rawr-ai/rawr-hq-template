# Native Filesystem Provider

Capture pinned native NodeServices once in scoped provider acquisition. Return
only filesystem and path. Stateless capability release is explicitly a no-op;
native operation scopes own file handles. Never run a terminal or create an
additional ManagedRuntime here. Runtime authoring imports public SDK subpaths;
the application distribution must leave that SDK external.

# Private Process Runtime

This owner binds already-provisioned resources and complete service exports to
declared consumers and coordinates process-local execution. It does not acquire
providers, create another managed runtime, expose raw handles to consumers, or
mount native harnesses. Native oRPC and its official Effect bridge own procedure
execution; process runtime owns binding, admission and settlement tracking.

The complete closed project has one `src/index.ts` entry and owner-local
lowercase-kebab TypeScript helper and proof interiors. It has no package or
nested owner. Nx owns actual direct dependency edges, TypeScript owns projection
types, and behavioral tests prove consumer access and lifetime boundaries.

# Resource Definition Interior

The resource root owns a provider-neutral capability contract and may add
lowercase-kebab TypeScript definition/helper files beside required `contract.ts`.
Runtime identity belongs here; concrete realization remains in the provider
family. Application selection and lifecycle execution do not enter this root.

This complete version preserves the required resource project shell and the
existing Effect error-authority rule. The positive structure admits files, not
arbitrary helper directories. TypeScript owns their inference; Nx owns actual
dependency edges. Existing version selections retain their immutable law.

# oRPC Client Router (`@rawr/orpc-client`)

## Scope

- Applies to the caller-specific oRPC link constructors in
  `packages/orpc-client/**`.

## Boundaries

- Owns construction of first-party, CLI, and trusted-service `RPCLink`
  instances with their declared caller headers.
- Must not authorize a request, own credentials, implement procedures, or
  reinterpret a service contract.
- Caller-supplied headers are merged after the constructor defaults and may
  replace them. Hosts must authenticate the resulting request rather than
  treating these convenience constructors as identity authority.

## Flow

- A caller selects the constructor matching its surface and supplies the
  endpoint URL plus optional headers.
- The package creates an oRPC fetch link; the host independently authenticates
  and routes each request.

## Routing

- [Packages router](../AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)

## Validation

- `bunx nx run @rawr/orpc-client:lint`
- `bunx nx run @rawr/orpc-client:typecheck`
- `bunx nx run @rawr/orpc-client:build`

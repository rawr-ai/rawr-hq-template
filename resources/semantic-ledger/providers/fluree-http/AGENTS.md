# Semantic Ledger Fluree HTTP Provider Router

## Purpose

- Satisfy the semantic-ledger capability against a running Fluree server over
  its HTTP API.

## Scope

- Applies to the Fluree adapter in this provider directory. Verified against
  `fluree/server` v4.1.4.

## Boundaries

- This provider owns transport, request shaping, and failure classification. It
  owns no work-stream meaning.
- Fluree ships as a Rust binary with no first-party JS client, so HTTP is the
  integration surface rather than a vendor SDK.

## Behavior

- Writes go out as JSON-LD `@graph` inserts; reads go out as SPARQL because its
  response envelope is self-describing. Failures are classified into the one
  contract failure shape rather than leaking vendor errors.

## Concepts

- A **ledger id** is `name:branch`, so `ws:main` and `ws:feature` are two
  branches of one ledger. **Time travel** is a suffix on the ledger reference —
  `ws:main@t:1` — and a bare `t` field at query top level is silently ignored.
- Verified substrate behaviour, and the traps that produced each finding, live
  in [README.md](./README.md). It is the reference this adapter is built from.

## Flow

- The host constructs the port with a base URL; each call maps to one HTTP
  request and returns contract-shaped values.

## Interfaces

- `createFlureeHttpSemanticLedgerPort` returns a `SemanticLedgerPort`.

## Routing

- [Fluree substrate reference](./README.md)
- [Semantic ledger resource](../../AGENTS.md)
- [Memory provider](../memory/AGENTS.md)

## Validation

- Run `bunx nx run provider-semantic-ledger-fluree-http:typecheck`.
- Start a server with `podman run -d -p 8090:8090 docker.io/fluree/server:latest`
  before running provider integration behavior.

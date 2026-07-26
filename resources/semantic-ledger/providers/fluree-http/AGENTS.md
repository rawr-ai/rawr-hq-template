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

- Reads and writes both go out as SPARQL, so one term renderer escapes every
  value that reaches the server. A proposal is `INSERT … WHERE …`, its
  precondition being the `WHERE` the substrate evaluates atomically with the
  insert. The alternative JSON-LD write body discards a misspelled `where` key
  silently and applies unconditionally, which is the wrong surface to put a
  precondition on.
- Both outcomes return 200, so the receipt is derived rather than read off:
  `commit.hash` against the identity every flake-less transaction reports is the
  discriminator. Failures are classified into the one contract failure shape
  rather than leaking vendor errors.

## Concepts

- A **ledger id** is `name:branch`, so `ws:main` and `ws:feature` are two
  branches of one ledger. **Time travel** is a suffix on the ledger reference —
  `ws:main@t:1` — readable and not writable, and a bare `t` field at query top
  level is silently ignored.
- The **flake-less commit identity** is a sentinel, not a commit. It is derived
  from its parts and checked against the server rather than pasted in, so a
  build whose content tag moves fails loudly instead of reporting every write as
  applied. It is read inside this provider and discarded there.
- An **idempotency key** caches an outcome, refusals included, so it answers for
  one attempt rather than one intent. It is spent by any definite response and is
  reused only to retry a request whose answer was never seen.
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
- Run `bunx nx run @rawr/workstream-frame:test` for conformance against a live
  server. It is the only pass that establishes exclusion rather than semantics,
  because it races genuinely simultaneous requests; with no server reachable it
  reports a skip, so a green run without one has proved nothing about Fluree.

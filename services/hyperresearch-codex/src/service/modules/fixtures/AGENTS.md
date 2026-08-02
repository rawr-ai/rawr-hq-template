# Hyperresearch Synthetic Fixtures Module Router

## Purpose

- Exercise a bounded synthetic research slice against the same ledger,
  artifact, and integrity model used by Hyperresearch runs.

## Scope

- Applies to synthetic fixture execution in this module directory.

## Boundaries

- Fixtures is deterministic test capability, not an alternate production run
  authority or a source of accepted research evidence.
- CLI, time, hashing, path, and file mechanics remain host-supplied; fixture
  steps stay separate from the V8 run definition.

## Behavior

- The module initializes or resumes a fixture ledger, loads fresh synthetic
  step definitions, executes a bounded number of steps, records artifacts and
  failures, and returns integrity findings.

## Concepts

- A **synthetic slice** is a small controlled research route. A **fixture
  ledger** records its durable step state; **fresh step hashes** prove the
  loaded definition matches the executed work.

## Flow

- A caller supplies query, tier, roots, and optional resume bounds; the module
  creates or validates the ledger, advances synthetic steps, checks artifacts,
  and returns the updated ledger and findings.

## Interfaces

- `runSyntheticSlice` is the caller operation. The service's IO and CLI
  resources provide execution mechanics; ledger and integrity results are the
  outward fixture interface.

## Routing

- [Hyperresearch Codex service router](../../../../AGENTS.md)
- [Durable V8 runs module](../runs/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-hyperresearch-codex:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-hyperresearch-codex:test` for fresh-step execution,
  resume, incomplete runs, backend failures, and artifact integrity.

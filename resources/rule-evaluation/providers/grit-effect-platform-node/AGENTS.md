# Grit Effect Platform Node Provider Router

## Purpose

- Realize rule evaluation with invocation-scoped Grit catalogs and native
  check processes through Effect Platform Node.

## Scope

- Applies to
  `resources/rule-evaluation/providers/grit-effect-platform-node/**`.

## Boundaries

- Accept only ordered already-resolved programs and one shared exact subject
  set.
- Own temporary Grit catalog mechanics, native stream draining, timeout,
  Grit-wire validation, finding mapping, and cleanup.
- Do not select programs, catalog policy, baselines, lanes, severity,
  applicability, retries, fixes, or evidence state.
- Use Effect Platform Node directly; do not introduce filesystem, command, or
  platform wrappers.

## Behavior

- Realize an ordered batch as one temporary single-pattern catalog and one
  native Grit check per program. Execute those checks sequentially against the
  unchanged subject set, attribute findings through provider-owned pattern
  identities, return results in caller order, then remove each catalog on every
  exit.
- Run at most one native process per evaluation request at a time with
  `RAYON_NUM_THREADS=2`. Output and timeout bounds apply independently to each
  program. Timeout, failure, and interruption cancel the active process group
  before scoped catalog cleanup.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-rule-evaluation-grit-effect-platform-node:typecheck`
  and
  `bunx nx run provider-rule-evaluation-grit-effect-platform-node:test`.

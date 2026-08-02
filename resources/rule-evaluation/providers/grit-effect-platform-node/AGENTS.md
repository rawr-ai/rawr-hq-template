# Grit Effect Platform Node Provider Router

## Purpose

- Realize rule evaluation with one invocation-scoped Grit catalog and one
  native check process through Effect Platform Node.

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

- Allocate one temporary multi-pattern catalog and execute one Grit check for
  the whole request. Attribute findings through provider-owned pattern
  identities, return results in caller order, then remove the catalog on every
  exit.
- Run the native process with `RAYON_NUM_THREADS=2`. Output capacity scales by
  program count up to an absolute batch cap; the configured timeout is one
  shared deadline for the native batch. Timeout, failure, and interruption
  cancel the process group before scoped catalog cleanup.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-rule-evaluation-grit-effect-platform-node:typecheck`
  and
  `bunx nx run provider-rule-evaluation-grit-effect-platform-node:test`.

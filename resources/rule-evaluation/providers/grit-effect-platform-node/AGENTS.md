# Grit Effect Platform Node Provider Router

## Purpose

- Realize rule evaluation with one invocation-scoped Grit catalog and one
  native check process through Effect Platform Node.

## Scope

- Applies to
  `resources/rule-evaluation/providers/grit-effect-platform-node/**`.

## Boundaries

- Accept only an already-resolved program and caller-selected subject paths.
- Own temporary Grit catalog mechanics, native stream draining, timeout,
  Grit-wire validation, finding mapping, and cleanup.
- Do not select programs, catalog policy, baselines, lanes, severity,
  applicability, retries, fixes, or evidence state.
- Use Effect Platform Node directly; do not introduce filesystem, command, or
  platform wrappers.

## Behavior

- Allocate one temporary catalog, execute one Grit check, validate its native
  report, map findings, then remove the catalog on every exit.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-rule-evaluation-grit-effect-platform-node:typecheck`
  and
  `bunx nx run provider-rule-evaluation-grit-effect-platform-node:test`.

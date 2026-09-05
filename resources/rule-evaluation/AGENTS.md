# Rule Evaluation Resource Router

## Purpose

- Give semantic owners one provider-neutral way to execute ordered,
  already-resolved evaluation programs against one exact caller-selected
  subject set.

## Scope

- Applies to `resources/rule-evaluation/**` until a provider-local router
  narrows the scope.
- This resource owns only evaluation requests, findings, results, and typed
  mechanical failures.

## Boundaries

- Catalog construction, program selection, baselines, lanes, severity,
  applicability, and lifecycle policy belong to consuming services.
- Provider selection and lifetime belong to application composition.
- Concrete evaluator processes, temporary catalogs, and wire formats stay in
  nested providers.
- `runtime.ts` and the provider's `runtime.ts` are ordinary private package
  faces authored through public SDK subpaths. The composing distribution keeps
  that SDK external; no private definition or second witness realm is embedded.

## Behavior

- A caller supplies one or more invocation-identified resolved programs and at
  least one subject path. A provider executes the exact-subject batch and
  returns one attributed result per program in request order, or one typed
  mechanical failure for the whole batch.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Grit Effect Platform Node provider](providers/grit-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint`,
  `bunx nx run @habitat-ai/resource-rule-evaluation:typecheck`, and
  `bunx nx run provider-rule-evaluation-grit-effect-platform-node:test`.

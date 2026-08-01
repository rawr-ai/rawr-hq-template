# Rule Evaluation Resource Router

## Purpose

- Give semantic owners one provider-neutral way to execute an already-resolved
  evaluation program against caller-selected subjects.

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

## Behavior

- A caller supplies one resolved program and at least one subject path; a
  provider executes one evaluation and returns findings or a typed mechanical
  failure.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Grit Effect Platform Node provider](providers/grit-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint`,
  `bunx nx run @habitat-ai/resource-rule-evaluation:typecheck`, and
  `bunx nx run provider-rule-evaluation-grit-effect-platform-node:test`.

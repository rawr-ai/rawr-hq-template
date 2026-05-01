# TypeScript Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | TypeScript type checking, discriminated unions, literal inference, and generator typing |
| Current lab evidence | Type/negative fixtures and structural gates |
| System impact | Authoring contracts, descriptor refs, portable artifact shape, forbidden pattern rejection |
| Proof ceiling | TypeScript proof is not runtime behavior or Parent-Repo Migration proof |

## Current Vendor Facts

- Local compiler: TypeScript `5.9.3`.
- Discriminated descriptor refs rely on TypeScript's normal
  discriminated-union narrowing.
- Manifest and artifact fixtures use `satisfies` to validate object shape while
  preserving literal inference.
- Generator checks rely on the installed `Generator<TYield, TReturn, TNext>`
  definition, where `TYield` is the yielded value type.

## Evidence Pointers

- `accepted.descriptor-ref.discriminated`
- `accepted.effect-only-authoring`
- `accepted.portable-artifacts.refs-only`
- `fixtures/inline-negative/**`
- `fixtures/fail/*.fail.ts`

## Not Proven

TypeScript checks prove authoring and artifact shape. They do not prove runtime
behavior, vendor semantics, production host lifecycle, or Parent-Repo Migration
authorization.

## Future Official-Docs Requirement

Compiler/grammar assumptions should stay tied to installed TypeScript behavior.
If future work depends on a new TypeScript grammar rule, generator typing rule,
module-resolution behavior, or control-flow narrowing edge, run a focused
TypeScript docs/source pass before treating the assumption as normative.

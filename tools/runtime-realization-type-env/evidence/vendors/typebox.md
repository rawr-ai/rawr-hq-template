# TypeBox Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | TypeBox schema values adapted into RAWR `RuntimeSchema<T>` |
| Current lab evidence | Vendor shape and runtime validation proof |
| System impact | Runtime config validation, provider config redaction, diagnostics |
| Proof ceiling | Raw TypeBox schemas are not RAWR runtime schemas until adapted |

## Current Vendor Facts

- Installed package: `typebox` `1.0.81`.
- The boundary probe uses `Type.Object(...)`, `Static`, `Value.Check`,
  `Value.Errors`, and `Compile(...).Check(...)`.
- Raw TypeBox schemas are vendor schema values. They become RAWR
  `RuntimeSchema<T>` only through an explicit RAWR adapter.

## Evidence Pointers

- `vendor.boundary.typebox-runtime-schema`
- `audit.p2.runtime-profile-config-redaction`
- `src/vendor/boundaries/typebox.ts`
- `test/vendor/boundary-shapes.test.ts`

## Not Proven

TypeBox evidence does not decide final redaction metadata, production
config-source binding/precedence, persisted diagnostic payload policy, or
production config/secret-store integration.

## Future Official-Docs Requirement

Any future TypeBox work that models schema grammar, compiler behavior, error
shape, transform/coercion policy, or validation performance must run a
dedicated official-doc/source pass before becoming normative integration
guidance.

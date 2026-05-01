# Vendor Evidence Maps

This directory groups evidence by vendor concept. Each file explains what RAWR
relies on, what the lab has actually proven, what system area it affects, and
what is explicitly not proven.

Canonical-looking imports in the lab are often local aliases or RAWR facades,
not direct vendor package imports. Treat vendor constructibility as evidence
only after a RAWR-owned adapter, wrapper, or runtime path consumes the vendor
behavior through a named gate.

## Routing Map

| Question | Open |
| --- | --- |
| What does this vendor provide or constrain? | The vendor file below |
| How does the vendor affect RAWR runtime subsystems? | `../systems/README.md` |
| What happened during a phase? | `../../phases/<phase>/workstreams/` or `../../phases/<phase>/handoffs/` |
| What proof category was earned? | `../proof-manifest.json` |

## Vendor Map

| Vendor concept | Open | Primary impact |
| --- | --- | --- |
| TypeScript | `typescript.md` | Type/shape proof, discriminated refs, fixture inference |
| Effect | `effect.md` | Runtime substrate, authoring facade, provider/runtime execution |
| oRPC | `orpc.md` | Server boundary, contract/handler shape, Fetch request passage |
| Elysia | `elysia.md` | Contained app/request host and local listener lifecycle |
| TypeBox | `typebox.md` | RuntimeSchema adapter validation |
| Inngest | `inngest.md` | Async function/step boundary and durable-semantics residual |
| HyperDX / OTLP | `hyperdx-otlp.md` | Telemetry export shape and product-observability residual |
| Semantica | `semantica.md` | Evidence discovery only, never proof authority |

## Use Rules

- Vendor evidence is not RAWR runtime passage by itself.
- Vendor constructibility is not Lab-Production Proof.
- A vendor note can support proof only when a RAWR-owned adapter, wrapper, or
  runtime path consumes the vendor behavior and a named gate would fail on
  regression.
- Future vendor work that models idioms, grammar, lifecycle, or product
  behavior requires a dedicated official-doc pass before integration claims are
  promoted.

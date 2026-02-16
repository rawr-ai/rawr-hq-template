# SESSION_019c587a - Agent F Step 1 Plan

## Objective (Step 1 Only)
Lock semantics and terminology spine in the canonical package approach doc so the three surfaces are unambiguous and trigger API is not conflated with Inngest ingress.

## In Scope
1. Canonical intro semantics explicitly define exactly three distinct surfaces:
   - domain internal package surface,
   - external boundary API surface,
   - Inngest execution ingress surface.
2. Explicit `/api/workflows` vs `/api/inngest` definitions.
3. Remove ambiguous "events API vs workflows API" wording where present.

## Out of Scope
1. Later-step policy rewrites.
2. Structural refactors outside Step 1 terminology/semantics lock.
3. Any code or route implementation changes.

## Planned Edits
1. Tighten `Locked Defaults` wording to separate trigger API from ingress semantics.
2. Clarify boundary surface language so `/api/workflows/*` is explicitly API trigger surface.
3. Ensure path semantics state:
   - `/api/workflows/*` = caller-triggered workflow API.
   - `/api/inngest` = Inngest execution ingress only.
4. Replace residual ambiguous "events/workflows" language with canonical terminology.

## Step 1 Gate
No section in the canonical doc should describe trigger API and Inngest ingress as the same surface or interchangeable naming.

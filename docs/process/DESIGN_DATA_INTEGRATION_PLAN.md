# Design Data Integration Plan

Status: retired source plan.

This document used to describe an implementation stack for a removed workflow UI surface. It is no longer active execution policy, branch choreography, route guidance, API guidance, or test guidance.

Current guidance:

1. Treat design-provider imports as bounded component or token ingests, not full application rewrites.
2. Keep runtime behavior owned by repository code and tests.
3. Preserve supported async runtime hooks through `dev:workflows`, `dev:inngest`, `/api/inngest`, and `/api/workflows/*`.
4. Use `docs/process/DESIGN_INTEGRATION_GOALS.md` for provider-agnostic design integration principles.
5. Use `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` for active local runtime operation.

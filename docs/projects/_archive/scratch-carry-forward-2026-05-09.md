# Scratch Carry-Forward Notes

These notes compress the useful parts of ignored `.scratch/` material that was
deleted during the Workstream B closeout cleanup. The original scratch files
were local working notes, not active authority.

## Documentation Authority Sweeps

- Classify the confusion risk before deciding how to handle old docs.
- Old docs are risky when they can masquerade as current authority.
- Prior review artifacts and evidence ledgers are proof material; do not promote
  them into architecture truth without a current authority decision.

## Projection Boundary Ratchets

- Avoid projection-local `create*Boundary` helpers.
- Avoid plugin-local service-client mirror types.
- Do not call `createClient(...)` directly outside service factories or
  approved binders.
- Do not use construction-time `provided:` outside the canonical helper layer.
- Production binding modules should use the canonical `bindService(...)` path.

## Proof And Gate Cleanup

- Keep the validation flow explicit: canon, graph, proof, ratchet.
- Treat Nx as the structural control plane for workspace gates.
- Keep proof-layer evidence separate from runtime architecture claims.
- Do not let stale phase aggregate gates drive active validation after their
  underlying proof target has moved.

## Service Shape

- Keep contract IO schemas inline in `contract.ts` unless they are intentionally
  reusable entities.
- Put reusable entity schemas in an intentional `entities.ts`.
- Procedure handlers own flow; shared helpers should not obscure the service
  boundary.

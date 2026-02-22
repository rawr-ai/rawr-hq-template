# SESSION_019c587a_AGENT_RESHAPE_REVIEW_B_SCRATCHPAD

## Locked Invariants (Do Not Drift)
1. Split surfaces stay locked: caller-facing workflow/API routes remain separate from runtime ingress (`/api/workflows/<capability>/*` vs `/api/inngest`).
2. Caller transport lock:
   - First-party default: `/rpc` + `RPCLink`
   - External: `/api/orpc/*` and `/api/workflows/<capability>/*` + published OpenAPI clients
   - Runtime: signed `/api/inngest` only
3. Boundary ownership lock: workflow/API boundary contracts are plugin-owned; packages remain transport-neutral and do not own workflow trigger/status boundary I/O.
4. Schema posture lock: TypeBox-first contract/procedure schemas; inline `.input/.output` default; extracted schemas are exception-only using paired `{ input, output }`.
5. Host bootstrap/order lock (D-008): baseline traces middleware initializes first; one runtime-owned Inngest bundle per process; explicit mount order preserved.
6. Anti-dual-path lock: no parallel first-party trigger authoring path for same behavior.

## No-Drift Rules (Execution Discipline)
1. Do not change decision IDs or semantic meaning of existing IDs.
2. Do not drop implementation-legible snippets during merge/dedup; preserve code-fence parity.
3. Do not scope link migration to packet-only docs; update active cross-doc references too.
4. Do not use wildcard archival moves without a frozen file manifest.
5. Do not resolve open policy questions implicitly during editorial reshape.
6. Do not claim canonical finality without declaring docs-scope/placement semantics explicitly.

## Unresolved Gates (Must Be Resolved/Checked)
1. Decision-ID gate: path-strategy move must not reuse existing `D-012`.
2. Cross-reference gate: no unresolved references to old packet/posture paths in active docs after rename/move.
3. Snippet-preservation gate: pre/post code-fence inventory + explicit delta map required.
4. Scope gate: confirm whether target is initiative-canonical in `docs/projects/*` or promoted canonical in `docs/system/*`.
5. Archive gate: execute only explicit source-file manifest; no pattern-based sweeps.
6. Open-question gate: classify Q-01..Q-06 as blocking vs non-blocking with owner and required phase.

## Reshape Blockers (Current)
### BLOCKER
1. Decision collision risk: proposal routes AXIS_08 path strategy to “new D-012” while `D-012` already exists for inline-I/O policy.
2. Migration safety gap: cross-reference cleanup omits active external docs (`docs/SYSTEM.md`, `docs/system/PLUGINS.md`, `docs/process/PLUGIN_E2E_WORKFLOW.md`).
3. Preservation gap: “no content loss” is asserted without deterministic snippet-parity validation despite planned line reductions in E2E docs.

### MAJOR
1. Canonicality ambiguity: long-term canonical intent under `docs/projects/*` without explicit docs-architecture scope decision.
2. Non-deterministic archival rules: wildcard `SESSION_*` moves can archive unintended files in concurrent sessions.
3. Missing decision gating: open questions listed but not tied to execution stop/go checkpoints.

## Status
- Review posture: **NO-GO until blockers are closed.**

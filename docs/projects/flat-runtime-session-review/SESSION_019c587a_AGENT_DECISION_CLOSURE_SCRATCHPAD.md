Observations
- Open decisions D-005 through D-010 documented; D-004 locked already.
- Axis docs enforce split semantics, TypeBox schema ownership, inline schema defaults, context separation, and middleware/routing guardrails.
- Code currently exposes /rpc and /api/orpc, but not /api/workflows for workflow triggers; /api/inngest mount exists and registry via createCoordinationInngestFunction.
- packages/coordination-inngest provides queueing + Inngest functions with timeline/status recording; host/adapter context ensures status logging.
- Lack of /api/workflows mount and host context for workflows informs D-005 & D-006 & D-007; dedupe/instrumentation observations inform D-008/009/010.
Decision Notes
- D-005 (workflow trigger routes): run code indicates aggregator registers only /rpc, /api/orpc; canonical doc wants /api/workflows mount; bridging will require new host wiring.
- D-006 (workflow contract ownership): docs show both plugin-owned (plugins/workflows/contract) and package-owned (packages/invoicing/workflows/contract). Need decide default.
- D-007 (browser-first workflow client): doc suggests microfrontend calls /api/workflows; need to lock pattern for first-party clients + generated artifacts (OpenAPI-based). existing code or docs? need tie to Axis 01/08.
- D-008 (extended traces init order): E2E example mentions risk; need to cite documentation or code referencing middleware initialization order (maybe no actual code yet). Need propose canonical import order in host or root module to ensure instrumentation enabling.
- D-009 (dedupe marker policy): docs caution built-in dedupe limited; need to decide whether to require context marker for heavy middleware. In code, packages/invoicing middleware already sets middlewareState; but general policy? Document referencing Axis 06 and E2E 04. Need recommended direction.
- D-010 (Inngest finished hook guardrail): require explicit guard? need code referencing usage? currently no finished hook used; but need spec referencing risk. We'll recommend guard for idempotent side effects and align with doc.
Action Items
- Form final recommendations referencing axis docs/E2E and code paths.
- Determine lock order (likely D-006, D-005, D-007 then D-008, D-009, D-010). Provide rationale.
- Identify necessary doc/policy updates (Axis 07 host hooking, D-004 etc) post-lock.
Updates
- Enriched each open decision with concrete file-structure/code illustrations for both recommended and alternative paths, ensuring refs tie to real axes/code.
- Noted the host-level `/api/workflows` wiring detail for D-005 and the package-level contract re-export approach for D-006.
- Documented the browser client packaging proposal (D-007), extended traces bootstrap snippet (D-008), middleware dedupe flag example (D-009), and finished-hook guardrail usage notes (D-010).
Clarity pass
- Rewrote D-005 through D-010 sections into narrative form (goal/problem/impact/recommendation) before presenting technical appendices, keeping recommendations unchanged.
- Each section now ends with practical implications and validation guidance to help non-author readers understand developer impact and guardrails.
Boundary notes
- Added explicit “What Changes”/“What Stays the Same” subsections for D-005..D-010 so readers know the scope of each change.
- Included a concise system shape block under D-005 showing the new workflow handler sitting beside the existing `/rpc` and `/api/orpc` mounts.
Non-obviousness notes
- Added “Why This Is Non-Obvious (or Obvious)” mini subsections for D-005..D-010 to call out the specific ambiguity/conflict keeping each decision live.

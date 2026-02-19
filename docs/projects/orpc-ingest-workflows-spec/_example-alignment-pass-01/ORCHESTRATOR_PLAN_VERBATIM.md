# Example Alignment + Golden Example Conformance Pass

## Summary
We will run a fresh 5-agent default team to realign every example (`e2e-01` to `e2e-04`) so each one is fully consistent with canonical policy, preserves detail/code specificity, and is safe for implementation-planning agents to trust.

The authority model we’ll enforce from your guidance:
1. Canonical policy authority stays in `ARCHITECTURE.md`, `DECISIONS.md`, and `axes/*.md`.
2. Examples must be 100% conformant to canonical policy.
3. Examples can provide normative extension only for details not yet in canonical docs.
4. If an example reveals a critical gap, we promote that gap into canonical docs first, then keep the example aligned.
5. `e2e-04` becomes the golden full-picture example (adaptable pattern, not brittle one-off).

## Scope
1. Target repo/worktree:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
2. Target docs:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/**`
3. Out of scope:
runtime/code implementation changes.

## Agent Team (fresh; close all existing first)
1. Agent E1: owns `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-01-basic-package-api.md`
2. Agent E2: owns `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-02-api-workflows-composed.md`
3. Agent E3: owns `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-03-microfrontend-integration.md`
4. Agent E4: owns `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md` and is responsible for golden-example quality.
5. Agent C (consistency): final document-by-document cross-packet consistency pass after E1-E4 complete.

## Mandatory grounding protocol (all agents + orchestrator)
1. Read and introspect skills:
`information-design`, `orpc`, `inngest`, `docs-architecture`, `decision-logging`.
2. Read authoritative spec corpus:
`README.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CANONICAL_EXPANSION_NAV.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`, all files in `axes/`.
3. Read all four examples before editing any one example.
4. Write plan verbatim and maintain scratchpad before edits:
`.../_example-alignment-pass-01/AGENT_<ID>_PLAN_VERBATIM.md`
`.../_example-alignment-pass-01/AGENT_<ID>_SCRATCHPAD.md`
5. Draft-first workflow:
scratchpad rewrite first, then apply changes to owned doc.
6. Four-pass self-check before handoff:
policy conformance, contradiction scan, detail/snippet preservation, information-design clarity pass.

## Orchestrator artifacts
1. Create:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/ORCHESTRATOR_PLAN_VERBATIM.md`
2. Create:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/ORCHESTRATOR_SCRATCHPAD.md`
3. Create conformance matrix:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/EXAMPLE_TO_SPEC_CONFORMANCE_MATRIX.yaml`

## Execution sequence
1. Phase 0: close all existing agents; spawn fresh default E1/E2/E3/E4/C.
2. Phase 1: E1-E4 run in parallel and produce:
- updated example file
- per-example conformance map in scratchpad
- detail preservation ledger listing retained/updated/removed snippets and replacements.
3. Phase 2: Gap-promotion gate:
- If E1-E4 find critical example-only policy, Agent C first patches canonical docs (`ARCHITECTURE.md`/`DECISIONS.md`/relevant axis), then examples are aligned to that patch.
4. Phase 3: Agent C final long consistency pass across all canonical docs + examples and applies safe fixes.
5. Phase 4: Orchestrator final sweep and publish final report:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/FINAL_EXAMPLE_ALIGNMENT_REPORT.md`

## Per-example acceptance criteria
1. E2E-01:
must stay minimal baseline package+API flow; no workflow/runtime leakage.
2. E2E-02:
must accurately show API+workflow composition and manifest-driven wiring with explicit context injection seams.
3. E2E-03:
must stay authoritative for MFE client usage patterns (`/rpc` first-party default, OpenAPI exception path explicit).
4. E2E-04:
must be the golden end-to-end wiring example, adaptable and comprehensive, with no contradiction to D-005..D-015.
5. All examples:
no dropped critical code details; no behavior shown that canonical docs forbid.

## Consistency-check agent gates (strict)
1. No contradiction between examples and `ARCHITECTURE.md` caller/auth matrix.
2. No example implying package-owned workflow boundary contracts.
3. No example showing caller traffic to `/api/inngest`.
4. Host adapter ownership and injection rules align with D-014.
5. D-013 metadata rules not violated in examples.
6. D-015 testing harness semantics reflected correctly where examples discuss testing.
7. If canonical gaps are found, they are promoted before examples rely on them.
8. Each example includes a “Conformance Anchors” section mapping major example segments to authoritative doc sections.

## Important changes/additions to public APIs/interfaces/types
1. No runtime API/type changes.
2. Documentation interface changes:
- each example gets explicit conformance anchors,
- `e2e-04` is designated golden example for full-path reference,
- canonical docs may receive minimal additive clarifications only when required to close proven example/spec gaps.

## Test cases and scenarios
1. Example-policy parity test:
each example line of behavior maps to canonical anchors.
2. Route semantics test:
no first-party/external caller examples using `/api/inngest`.
3. Ownership test:
workflow/API boundary ownership remains plugin-owned in all examples.
4. Injection ownership test:
host selects/binds adapters; plugins/packages consume injected ports.
5. Detail preservation test:
before/after snippet ledger shows no critical information loss.
6. Golden example test:
`e2e-04` can be used as full implementation-oriented reference without conflicting with canonical policy.
7. Cross-doc contradiction test:
README authority split, ARCHITECTURE invariants, DECISIONS locks, axes, and examples all agree.

## Assumptions and defaults
1. There is no `E2E_10` artifact in the active packet; this pass targets `e2e-01`..`e2e-04`.
2. Examples remain reference docs, but with strict conformance and explicit anchor mapping.
3. Critical information is never left example-only; if critical and missing in canonical policy, we add it to canonical docs first.
4. All agents are default agents (not worker agents).
5. Scratch/plan artifacts from this pass are archived into the existing archive tree after completion.

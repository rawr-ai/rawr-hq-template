> **Preserved evidence, not current authority.** Prior reference proposal; retained evidence, not current implementation authorization.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#prior-reference) and [current assessment](../../assessment.md).

# Habitat Reference Application and Provider Proof

Status: recommended scope, independently reviewed with Astra Max; not implemented.
Implementation is gated by the [boundary assessment](habitat-boundary-assessment.md).
Date: 2026-09-06

## Frame

The released Habitat 0.6 runtime is the starting point, not a claim that every
intended provider integration or future platform capability is complete. This
workstream qualifies a real consumer application and its downstream results.
It supplements the closed runtime workstream without rewriting its evidence.
The boundary assessment now owns the prerequisite repair and unfinished-design
inventory. This document owns the consumer/provider qualification story; it is
not a second specification for those repairs.

The outcome is one understandable, persistent application that people can run,
inspect in the actual vendor tools, and use as an authoring reference. Civ7,
Magic, and Rawr product development remain independent.

Hard commitments:

- Consume published Habitat packages through the native consumer workflow.
- Keep application domain ownership outside the substrate repository.
- Verify persisted business results and vendor readback, not only transmission.
- Preserve one telemetry lifecycle owner and explicit product-event semantics.
- Add only the reusable platform capabilities this complete story demonstrates.

The main alternative, several disposable fixtures, proves isolated contracts but
does not provide the coherent authoring and inspection experience requested.
Using Civ7 or Magic instead would couple qualification to unrelated product
decisions. A separate reference consumer is the preferred boundary.

Reframe if the story requires unrelated platform expansion, vendor emulation,
private workspace imports, or application-level copies of generic substrate
machinery. Those findings are design inputs, not reasons to disguise the gap.

## Application

Working concept: a batch-import workbench. Submit a bounded CSV inventory batch,
inspect validation, process it asynchronously, and browse the resulting catalog.
Use synthetic data, one mature CSV parser, and one persistence backend.

Two service owners make the composition meaningful:

- Catalog owns records, unique keys, validation, and idempotent writes.
- Imports owns batch payloads, admission, progress, errors, and result summaries.
  It calls the catalog service rather than writing its tables.

A compact web interface and API support submission and inspection. The CLI
submits through the API and also exercises a direct service-backed read command.
The browser calls the API; do not imply that current web host routes have direct
service binding. Inngest executes the background work through the same domain
capabilities. Shared storage does not imply shared table authority.

An accepted durable batch must not become stranded or falsely complete across
the failure windows the application claims to tolerate. Choose the smallest
domain-owned admission/recovery design that proves that guarantee, including
the persistence/publication boundary. An outbox is a candidate, not a required
Habitat abstraction. Use domain idempotency; do not claim cross-system
exactly-once execution or mistake an admitted event ID for completed work.

## Provider Roles

| Provider | What the reference proves |
| --- | --- |
| Inngest local development server | Real workflow history, failed-step retry, worker restart, and completed business results |
| OpenTelemetry and HyperDX/ClickHouse | Correlated traces and logs actually stored, queried, and discoverable in the UI |
| EVLog | Structured operation records at explicit invocation/attempt boundaries, with domain enrichment and redaction |
| PostHog | Deliberate product events, with stable synthetic identity and batch correlation, verified by readback |
| Native CLI host | Service-backed behavior, correlated invocation telemetry, and short-lived process flush |

EVLog is not a second telemetry bootstrap. Qualify integration into the existing
OTel log pipeline rather than introducing duplicate exporters or shutdown owners.
PostHog product events are not a wholesale copy of operational logs. Its events
must distinguish user submission, processing attempts, and business completion.
The persisted business state is authoritative, not an analytics acknowledgment.
Define logical completion identity, duplicate-delivery treatment, and telemetry
outage behavior; do not promise exactly-once analytics from a retryable callback.

Current EVLog documentation supports both OTLP logs and an explicit PostHog
events mode. Evaluate reuse against the native PostHog SDK before choosing the
adapter; do not invent a bridge or assume logs equal product analytics.

Sources: [EVLog OTLP](https://www.evlog.dev/integrate/adapters/cloud/otlp),
[EVLog PostHog](https://www.evlog.dev/integrate/adapters/cloud/posthog),
[PostHog Node SDK](https://posthog.com/docs/libraries/node),
[PostHog queries](https://posthog.com/docs/api/queries).

## Execution Boundaries

Before treating this app as a recommended authoring example, close the
[boundary assessment's consumer contracts](habitat-boundary-assessment.md#the-next-workstream):
request-client continuation, native Promise cancellation interop, function-first
async composition and capability typing, direct authoring,
native-client interoperability, and protocol/exposure semantics. Verify the
blueprint/niche distinction against actual Habitat and Civ7 usage. Runtime
qualification alone does not close these questions. This is a bounded
authoring/composition gate, not authorization to apply an outdated specification
wholesale or to implement every future platform capability.

The [async ownership decision](habitat-async-function-design.md) supersedes the
earlier registered-step input repair. This application must teach native
function-local steps and lexical result composition, not a Habitat step registry.
Inngest owns durable dataflow; Habitat supplies selected local capabilities.
Qualify finite local operation settlement without treating a logical durable run
or a timed-out opaque Promise as a completed physical resource operation.

Confirmed on 2026-09-06: the public CLI builder still requires
`defineCliTopicPlugin.factory()({...})`; the self-hosted foundation topic uses it,
and `plugin_cli_topic_v1_boundary.md` enforces that syntax. Section 5 of
`Documents/Projects/RAWR/_inbox/RAWR_SDK_Ergonomics_Change_Doc.md` explicitly proposes
direct lane builders instead. The realignment record contains an initial
disposition, not evidence that this simplification shipped. Reconcile the public
API, examples, type inference, and policy together before making them the pattern
that new consumers copy. Preserve coldness, optioned instances, native vendor
semantics, and runtime ownership; those do not inherently require `.factory()`
in ordinary authoring.

The targeted provenance review found no explicit adoption, rejection, or live
deferral of removing `.factory()`. The initial assessment was added in
`c677d43d2`, while canonical factory examples predate it (`f920232ef`). Affected
tasks were completed, but the investigation instruction remained prospective in
the archived execution queue and did not appear in the live deferred handoff.
Treat this as an unfinished authoring disposition, not a proven decision to keep
the ceremony. The proposal's obsolete execution-spine and handler restrictions
remain superseded; that does not dispose of its independent ergonomics changes.

The composition review found a different, explicit boundary. Habitat's
`.habitat/AUTHORITY-ONTOLOGY.md` preserves blueprints as architectural kinds,
instances as concrete admitted matter, and niches as governed communities of
instances. However, `niche.toml`, derived niche membership, and authority
capability activation are reserved, not implemented in protocol 1. Civ7 retains
richer niche governance material, but its machine-readable niche layer is also
transitional; it is not an already-complete API to copy.

For this reference, catalog and imports are two instances of the same service
blueprint, not two domain-named blueprint kinds. Verify both against the released
generic law and demonstrate a qualified application overlay that cannot replace
that law. Service modules remain interiors, not automatically new blueprints.
An overlay is not proof of first-class niche admission. That admission protocol
is a separate authority-model capability and is not silently added to this
application workstream. Describe the result as runtime, authoring, and provider
qualification, not completion of every Habitat governance capability.

1. Reactivate deferred capability D5 in a new workstream. Establish the smallest
   reusable persistence and observation/provider contracts required by this app.
   Recheck current exports: illustrative architecture names are not shipped APIs.
   Qualify native exception redaction before exporting data. Inspect existing
   local infrastructure without modifying held telemetry work in progress.
2. Implement one complete persisted import story in an independent consumer.
   Keep schemas and recovery rules in their domain owners. Put genuinely reusable
   provider capabilities in Habitat, not permanent demo-local substitutes.
   Define accepted, processing, completed and failed/recoverable states and the
   owner of terminal-failure recovery. Native `onFailure` currently has no managed
   service bridge: qualify an appropriate failure-event consumer or another
   bounded supported path instead of disguising that limitation in a fixture.
3. Exercise real Inngest and ClickStack, and an authorized PostHog development
   project. Query records using a unique run/batch identity and inspect vendor
   pages. Missing hosted access is an explicit qualification gap, never a pass.
4. Verify failure, retry, restart, admission recovery, telemetry outage behavior,
   redaction, and shutdown flush. Release any generic Habitat fixes and rerun the
   independent consumer against the actual published versions.
5. Provide automated qualification and optional interactive inspection modes.
   Clean up only owned processes. Keep reproducible commands and a compact receipt
   of business results and vendor queries; do not require always-on infrastructure.

## Done Means

- The same batch and catalog results are accessible through CLI, API, and browser.
- Restarting application processes preserves business state.
- A failed async attempt recovers without duplicate catalog effects.
- An interrupted admission recovers without a permanently stranded batch.
- Built web assets work without depending on the source checkout.
- Actual Inngest history and HyperDX/ClickHouse records demonstrate the run.
- Actual PostHog readback demonstrates the intended product events.
- EVLog record cardinality, correlation, redaction, and flush are verified.
- The consumer uses public registry packages without private-source shortcuts.
- Both repeatable test execution and deliberate dashboard inspection are usable.

Offline, container-free contract tests remain the normal fast testing layer.
Live provider qualification adds a different guarantee; it does not replace them.

## Outside This Workstream

No Civ7/Magic migration, Fluree semantic-ledger work, desktop/native-agent hosts,
authentication or billing platform, multi-tenancy, AI dependency, second database,
session replay, feature flags, production-cloud certification, or general-purpose
workflow control plane. Cancellation/replay UI is excluded unless its native
control semantics receive separate qualification.

## Anchors and Review

Repository authority: `openspec/specs/repository-separation/spec.md`,
`docs/system/HABITAT_ARCHITECTURE.md`, and
`docs/projects/habitat-runtime-realignment/{IMPLEMENTATION.md,deferred-capabilities.md}`
in `rawr-hq-template`. The earlier release remains recorded in
`habitat-runtime-release.md` alongside this document.

Independent review: `reference_scope_astra`, requested model `gpt-6-astra`,
reasoning effort `max`, completed without a reported model-availability failure.
The review identified service-table ownership, admission recovery, actual host
surface limits, and reusable provider placement as load-bearing constraints.

Follow-up read-only reviews: `reference_scope_astra` compared Habitat/Civ7
authority semantics; `authoring_disposition_audit` (Astra High) traced the SDK
proposal through current records and targeted history. These exposed the
unfinished authoring disposition and the separately documented niche deferral.

Skills used: framing-design and posthog; independent review used system-design,
architecture, and nx-workspace. Follow-up review used api-design and
ontology-design.

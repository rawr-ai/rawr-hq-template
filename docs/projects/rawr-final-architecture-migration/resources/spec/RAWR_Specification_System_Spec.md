# RAWR Specification System

Status: Normative project-scoped companion specification for RAWR final architecture migration.

Authority scope: Cross-specification governance for RAWR architecture specifications.

This specification defines the corpus-level rules that govern how RAWR architecture specifications relate to one another. It owns the hub/companion model, authority ownership discipline, attachment protocol, reserved-boundary rules, deferral-vs-gap discipline, supersession and stale-copy handling, and the rules that prevent one document from silently redefining another document's ontology or mechanics.

It does not own platform ontology, runtime realization mechanics, service/domain semantics, implementation code, or the internal mechanics of any future companion specification.

## 1. Status and Authority

This document is the companion authority for RAWR specification-system governance inside the final architecture migration project. It lives under `docs/projects/rawr-final-architecture-migration/resources/spec/` because `docs/DOCS.md` defines that directory as the home for project-scoped normative specs and guardrails.

Future platform, runtime, deployment, observability, harness, agent, desktop, and other architecture companion specifications should use it as the reference sheet for how to attach, delegate authority, preserve boundaries, and classify current/provenance/stale material.

General authority model:

1. The current owner for the smallest claim wins.
2. A hub wins for hub ontology, vocabulary, laws, boundary names, and attachment points.
3. A companion wins for mechanics and deeper detail inside its declared attachment boundary.
4. This spec-system companion wins only for cross-specification governance rules.
5. Harvest, research, scratch, generated, archived, quarantined, and stale sources do not decide current authority unless an owner explicitly promotes or revalidates them.

The source ladder used to produce this document is workstream-specific and is recorded in `spec-system-source-note.md`. Future specifications must not inherit `_inbox/latest`, this workstream's plan docs, or this worktree's branch state as standing corpus authority.

Epistemic markers are authority markers. Words such as `reserved`, `candidate`, `expected`, `may`, `may not be final`, `not always`, `flexible`, and `deferred` must survive synthesis unless a current authority explicitly settles them. Do not polish uncertainty into false authority.

## 2. Purpose and Scope

This specification exists so the final Platform Architecture Specification can remain the platform hub without carrying the whole specification-governance system inline.

In scope:

- how hub and companion specifications relate;
- how architectural truth gets an owner;
- how companion specifications attach to a hub boundary;
- how a companion deepens a boundary without redefining another owner's truth;
- how reserved decisions differ from gaps;
- how stale, superseded, harvested, and current specification copies are classified;
- how platform/runtime boundaries and runtime noun placement are reviewed.

Out of scope:

- superseding `docs/DOCS.md` or repo documentation architecture;
- defining process docs, generic workstream methodology, or Habitat workstream mechanics;
- writing the final Platform Architecture Specification;
- rewriting the Runtime Realization System specification;
- deciding every future companion specification;
- implementation migration;
- repo-wide stale-copy cleanup;
- runtime mechanics, type shapes, lifecycle internals, registry mechanics, provider lowering mechanics, diagnostic inventories, or enforcement implementation.

## 3. Definitions

**Specification corpus** means the set of RAWR architecture specifications, companion subsystem specifications, harvested provenance documents, stale copies, archives, and quarantine inputs that future agents may encounter while changing architecture specifications. Workstream packets, process docs, and review reports may inform the corpus, but they are coordination/evidence surfaces unless explicitly promoted by an owner.

**Hub specification** means a specification that owns system-level ontology, vocabulary, laws, phase names, boundary names, handoffs, and attachment points for a domain. In the current final-architecture migration, the Platform Architecture Specification is the platform hub.

**Companion specification** means a specification that attaches to a named hub boundary and owns deeper subsystem detail inside that boundary. A companion may deepen what the hub names; it must not silently redefine hub ontology or another companion's mechanics.

**Authority owner** means the single document or specification surface that decides a specific architectural truth. More detail does not create authority.

**Attachment boundary** means the named hub boundary at which a companion specification attaches. A boundary can be a lifecycle phase, role/surface boundary, runtime interface, external interface, harness/native seam, operational placement seam, or another hub-declared attachment point.

**Integration vocabulary** means names and laws needed for cross-spec coordination: phase names, boundary names, role/surface taxonomy, handoff names, and externally consumed interface names.

**Mechanics** means internal behavior, type shapes, sub-sequencing, implementation contracts, artifact fields, validation algorithms, runtime internals, adapter details, provider lowering, registry matching, diagnostic inventories, and enforcement implementation.

**Reserved boundary** means a named boundary whose owner, integration hook, input/output contract, enforcement or diagnostic hook, and lock trigger are known, while deeper design remains intentionally not final.

**Deferral** means an explicit decision to leave work for a later owner/future DRA with enough context and a trigger to resume.

**Gap** means missing design work. A silence without owner, seam, contract, hook, and trigger is a gap, not a deferral.

**Harvested provenance** means useful wording, framing, or candidate rules from a non-authoritative source. Harvested material must be adopted, adapted, rejected, or deferred before it affects current authority.

**Stale copy** means a document that may still call itself canonical or current but is not current authority under the active authority ladder.

**Supersession** means a later authority has replaced, subordinated, or fenced an older authority.

**Runtime noun** means a named runtime-realization component, interface, lifecycle phase, access object, diagnostic object, registry, provider plan, runtime artifact, or harness contract.

## 4. Specification Corpus Model

The RAWR specification corpus uses a hub/companion model.

The hub names the shared architecture surface. Companions attach to named boundaries and deepen them. Provenance can explain why a rule exists, but provenance does not become authority by being older, more detailed, more polished, or easier to find.

Every specification surface must be classifiable as one of:

- **current authority**: may decide the truth it owns;
- **current companion authority**: may decide deeper detail inside its declared attachment boundary;
- **harvested provenance**: may supply language or candidate rules after classification;
- **reserved/deferred**: intentionally not final, with owner and trigger;
- **stale/superseded**: may explain history but must not guide implementation unless revalidated;
- **scratch/research/evidence**: can inform findings but cannot decide authority by itself.

Every current or candidate canonical specification must declare:

- status;
- scope;
- authority owner;
- what it owns;
- what it does not own;
- parent or companion relationship, if any;
- what it supersedes, harvests, subordinates, or leaves as provenance.

Indexes, ledgers, reports, diagnostics, catalogs, semantic graphs, generated summaries, and review dashboards are read models unless explicitly promoted by the owning spec. They can explain or expose evidence; they do not compose authority by themselves.

Core corpus rules:

1. Every architectural truth must have one authority owner.
2. A document does not gain authority by being more detailed.
3. A document does not gain authority by calling itself canonical if a newer current authority supersedes it.
4. A companion spec may deepen a named boundary but must not silently redefine hub ontology or another spec's mechanics.
5. Authority transfer must be explicit and must update the affected owners in concert.
6. Examples clarify rules; they must not introduce new authority beyond the rule they illustrate.

## 5. Hub Specification Rules

A hub specification owns:

- stable ontology;
- durable vocabulary;
- architecture laws;
- role, surface, phase, and boundary names;
- handoff contracts at the level needed for companion attachment;
- attachment points and companion registry entries;
- names-versus-mechanics rules for its domain.

A hub attachment registry, or equivalent attachment surface, should record:

- boundary name;
- hub section or owned hub anchor;
- mechanics owner;
- naming owner;
- named interface contract types, if any;
- companion specifications that attach there.

A hub specification must not:

- copy a companion's internal mechanics;
- duplicate runtime type shapes or implementation contracts;
- promote integration-facing runtime nouns into top-level ontology;
- use companion details to bypass the companion's authority;
- treat unowned detail as settled architecture;
- hide open questions inside polished prose.

When a hub references a companion-owned area, it should name the boundary and the owning companion. It may state the law or integration vocabulary the hub owns. It must route mechanics to the companion owner.

If a hub changes a phase name, boundary name, role/surface taxonomy, ownership law, or producer/consumer handoff that a companion consumes, the affected companion must be reviewed. If a companion changes only mechanics within its owned boundary, the hub does not need to change unless the boundary vocabulary or handoff contract changes.

## 6. Companion Specification Rules

A companion specification owns deeper subsystem detail only inside its declared attachment boundary.

A companion specification must declare:

- parent hub;
- attachment boundary;
- owned subsystem concern;
- forbidden concerns;
- authority owner;
- what it deepens;
- what it may not redefine;
- upstream authority references;
- reserved boundaries, if any;
- supersession or provenance relationship to older documents.

A companion specification may:

- deepen a hub boundary;
- define internal mechanics for its owned subsystem;
- define reserved details inside its owned boundary;
- own examples that clarify its own rules;
- introduce subsystem-specific review gates where they do not conflict with hub rules.

A companion specification must not:

- redefine hub ontology unless the hub explicitly transfers authority;
- redefine another companion's mechanics unless authority transfer is explicit;
- duplicate mechanics from another owner as if they were local truth;
- introduce a new role, surface, harness, provider class, control-plane touchpoint, durable authority, or runtime owner without updating the hub boundary registry or equivalent attachment surface;
- use "fixes" language on mechanics it does not own.

Informative example: a deployment companion may deepen deployment placement rules and consume platform external interfaces. It must not redefine runtime compiler validation, provider lowering, `RuntimeCatalog` mechanics, or platform ontology. This example illustrates the deepening rule; it does not introduce a deployment companion authority by itself.

## 7. Authority Ownership and Delegation

Authority is singular at the level of a claim. Each rule, noun, lifecycle phase, interface, type shape, or decision must have one owner.

Authority delegation must name:

- delegating owner;
- receiving owner;
- delegated concern;
- boundary of delegation;
- retained concerns;
- update requirement if either side changes.

The most detailed document does not automatically win. A runtime companion can be more detailed than the platform hub and still not own platform ontology. A platform hub can name a runtime integration boundary and still not own runtime mechanics. A stale document can contain useful wording and still lose authority to current specs.

Authority-plane models are reading maps, not ontology. They can help readers see which kind of authority a noun exercises, but they must not create new truth objects or ownership layers by themselves.

When two current authorities appear to claim the same truth:

1. Identify the smallest claim in conflict.
2. Identify which specification owns that claim under this document.
3. Treat the non-owner's statement as boundary wording, provenance, or conflict evidence.
4. Repair or defer the conflict explicitly; do not resolve it by smoothing prose.

## 8. Attachment Protocol

A new or revised companion specification must include an attachment declaration equivalent to this:

```text
Parent hub:
Parent hub path:
Attachment boundary:
Hub section / registry row:
Owning spec section:
Naming owner:
Mechanics owner:
Conflict-resolution owner:
Owned subsystem concern:
Forbidden concerns:
Authority owner:
What this companion deepens:
What this companion must not redefine:
Runtime-shaped claims, if any:
Reserved boundaries:
Supersedes / harvests / subordinates:
Review gates:
```

Attachment rules:

1. The companion must name a hub boundary, not an internal alias.
2. The companion must state its owned concern and forbidden concerns.
3. The companion must identify the current authority owner for every borrowed noun or mechanic.
4. Runtime-shaped claims must route through the runtime realization boundary unless the platform hub explicitly owns the system-level law.
5. Integration-facing names may live in hub vocabulary. Names consumed only inside mechanics live in the owning companion.
6. Reserved details must name seam, owner, input/output contract, enforcement or diagnostic hook, and trigger for later locking.
7. The companion must classify older related documents as current authority, harvested provenance, stale/superseded, archived/quarantined, or deferred cleanup.

If a companion includes diagrams, generated examples, schema excerpts, contract tables, or illustrative code, it must label their exactness. The label can be lightweight, but it must say which parts are normative and which parts are illustrative. A useful pattern is:

```text
Layer:
Exactness:
```

Use this metadata to prevent examples, diagrams, and generated views from becoming accidental authority.

## 9. Reserved Boundaries, Deferrals, and Gaps

Reserved boundaries are named architecture surfaces with locked owners and integration hooks. They are not omissions.

A reserved boundary must name:

```text
seam
owner
input/output contract
enforcement or diagnostic hook
trigger condition for locking
```

Before the lock trigger fires, only the named integration hook, input/output contract, diagnostics, and enforcement rule may land. Speculative mechanics must not be added under the cover of "reserved".

A deferral is valid only when it names:

- what is deferred;
- why it is outside current scope;
- owner or future DRA;
- authority home;
- evidence needed;
- unblock condition;
- re-entry trigger.

A silence without those elements is a gap. A gap is a review finding, not a future-looking marker.

Flexible is not the same as unowned. Flexible areas may vary without reopening architecture, but they still need owner, boundary, and constraints.

## 10. Supersession, Harvesting, and Stale Copies

Every specification or specification-like source must have an authority state before future agents rely on it:

- `current authority`
- `current companion authority`
- `harvested provenance`
- `stale/superseded`
- `archived/quarantined provenance`
- `deferred cleanup`

Superseded or stale documents that still self-identify as canonical must be updated, renamed as superseded, moved to an archive/quarantine location, or explicitly subordinated before migration-planning agents rely on indexed docs.

Harvesting is not promotion. A harvest source must be processed as:

- `adopt`: current authority confirms the rule and destination owner;
- `adapt`: useful language survives but authority or scope changes;
- `reject`: wording or rule conflicts with current authority;
- `defer`: valid but outside current scope, with owner and trigger.

When a harvested source is especially polished or more recent-looking than current authority, record its authority state explicitly. The risk is not bad wording; the risk is useful wording carrying hidden authority changes.

Stale-source containment is a corpus readiness gate. It is not a new architecture decision by itself. The DRA must not reopen architecture merely because a stale copy exists; the DRA must classify, subordinate, archive, quarantine, or defer cleanup with a trigger.

## 11. Platform/Runtime Boundary Rules

The Platform Architecture Specification owns platform ontology, laws, vocabulary, boundaries, handoffs, and companion attachment points.

The Runtime Realization System specification owns runtime mechanics: phase implementation, sub-sequencing, artifact type shapes, substrate internals, registry matching, provider lowering, process runtime internals, adapter contracts, harness implementation contracts, diagnostic inventories, and runtime enforcement mechanisms.

The platform spec may own compact system-level laws such as execution ownership and integration handoffs. The runtime spec may reproduce those laws as context, but the platform law remains authoritative when the runtime spec says so.

The runtime spec may define mechanics for runtime-owned areas. It must not redefine service domain authority, projection meaning, app identity, deployment placement, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors unless a current owning spec explicitly delegates that concern.

The spec-system companion owns neither side's mechanics. It owns the routing rules that keep each side from silently absorbing the other's authority.

## 12. Runtime Noun Placement Rules

Runtime nouns may appear in platform or hub prose only when they are integration-facing boundary references needed to define ownership, handoff, or attachment.

Allowed as boundary references:

- runtime lifecycle phase names;
- runtime-owned component names when they name a producer/consumer boundary;
- externally consumed platform interfaces;
- diagnostics or telemetry nouns when they define observation boundaries;
- named runtime laws that the platform hub owns as integration vocabulary.

Not allowed as hub ontology:

- treating runtime components as top-level platform kinds;
- copying runtime type shapes;
- copying registry, provider lowering, bootgraph, adapter, harness, diagnostic inventory, or execution policy mechanics;
- using a named runtime mechanism to imply hub ownership of that mechanism;
- using platform prose to settle runtime implementation detail.

Names-versus-mechanics rule: naming a runtime mechanism in a hub spec does not transfer ownership of its mechanics to the hub.

If a future platform spec needs a runtime noun, it must classify the noun as:

- `boundary reference`: allowed in platform prose;
- `external interface`: allowed if the platform exposes it to companion specs or tooling;
- `runtime-owned mechanic`: route to runtime spec;
- `forbidden ontology promotion`: remove or reframe.

## 13. Review Gates and Failure Modes

Before accepting a new or revised architecture specification, run these gates:

- **Owner gate:** every rule has a clear owner.
- **Attachment gate:** every companion names parent hub, boundary, owned concern, and forbidden concerns.
- **Boundary gate:** platform ontology, runtime mechanics, and corpus governance are separated.
- **Reserved gate:** reserved and deferred items name owner, contract/hook, and trigger; silence is flagged as a gap.
- **Stale-source gate:** current, harvested, stale, archived, and deferred sources are classified.
- **Runtime noun gate:** every runtime noun is boundary reference, external interface, runtime-owned mechanic, or forbidden ontology promotion.
- **Example gate:** examples clarify existing rules and introduce no new authority.
- **Cold-read gate:** a future agent can apply the rules without the prompt or session transcript.
- **Exactness gate:** diagrams, examples, generated excerpts, schemas, and contract tables say which parts are normative and which parts are illustrative.
- **Read-model gate:** indexes, reports, diagnostics, ledgers, semantic graphs, and generated summaries are not treated as authority unless promoted by an owner.

Common failure modes:

- **False authority:** polished prose turns candidate or reserved language into settled law.
- **Detail wins by accident:** a detailed companion appears to outrank the owner.
- **Runtime noun promotion:** a runtime mechanic becomes platform ontology because it was useful to name.
- **Reserved-as-gap:** a reserved boundary lacks owner, hook, contract, or trigger.
- **Gap-as-deferral:** missing design is labeled deferred without enough continuation context.
- **Stale canonical claim:** an older document still says canonical and future agents follow it.
- **Example leakage:** an example introduces a new rule or mechanic the rule itself did not authorize.

## 14. Open Questions or Reserved Decisions

These items are intentionally not settled by this specification:

- The exact final list of runtime nouns allowed in the final Platform Architecture Specification. This belongs to the platform spec finalization pass, using the runtime noun placement rules above.
- Whether the platform spec should add an explicit sentence banning Effect-prefixed semantic kinds such as `EffectService` and `EffectPlugin`, and where that sentence belongs if adopted.
- Where the Platform Architecture Specification and project indexes should link this companion once platform finalization consumes it.
- Platform/deployment external-interface lock points beyond the current boundary rules.
- OpenShell governance/vendor details beyond harness/native-interior status and already named reserved-boundary handling.
- Repo-wide stale-copy cleanup. This spec defines classification and follow-up triggers; it does not perform cleanup.

If any of these become blockers in a downstream workstream, create a decision packet with source evidence, authority owner, proposed default, and lock trigger. Do not hide the question inside polished specification prose.

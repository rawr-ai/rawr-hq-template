# RAWR Specification System

Reference metadata:

- Canonical path: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- Normative role: project-scoped companion specification for RAWR architecture-specification governance.
- Authority scope: cross-specification governance for RAWR architecture specifications.
- Non-ownership: this specification does not own platform ontology, runtime mechanics, service/domain semantics, implementation code, process methodology, or the internal mechanics of any future companion specification.

This metadata helps a reader locate and rely on the document. It is not what makes the document a specification. A specification is an owned normative claim set with a declared scope. Status, provenance, cleanup state, and exactness labels are reference metadata used to manage authority around specifications and supporting evidence.

## 1. What This Spec Is For

This specification tells future RAWR spec authors, reviewers, and directly responsible agents how architecture specifications relate to one another without authority drift.

Use it when you need to:

- decide whether a document should be a hub specification, companion specification, decision packet, provenance packet, review report, read model, or process artifact;
- attach a companion specification to a hub without redefining hub ontology;
- decide which document owns a claim when two sources overlap;
- classify harvested, stale, superseded, archived, quarantined, generated, or scratch material before using it;
- preserve reserved decisions and deferrals without hiding missing design work;
- review high-risk boundary leakage, including the current platform/runtime boundary.

The through line is:

1. Identify the kind of document or surface you are touching.
2. Identify the smallest claim that needs authority.
3. Find the owner for that claim.
4. Attach, delegate, harvest, reserve, or defer explicitly.
5. Run the acceptance gates that apply to that document type.

This specification keeps the Platform Architecture Specification narrow. The platform hub should own platform ontology, vocabulary, laws, and attachment points; it should not carry the whole corpus-governance system inline.

## 2. What This Spec Does Not Do

This specification must not be used to turn specifications into status objects.

Specifications contain owned normative claims. Authority-management metadata exists around them so agents can know whether a source is current, stale, harvested, illustrative, generated, or deferred. Inline headers may mirror that metadata, but the header is not the authority source by itself.

This specification also does not:

- supersede `docs/DOCS.md` or repo documentation architecture;
- define generic Habitat workstream mechanics or process-document methodology;
- write the final Platform Architecture Specification;
- rewrite the Runtime Realization System specification;
- decide every future companion specification;
- implement code migration;
- perform repo-wide stale-copy cleanup;
- define runtime type shapes, lifecycle internals, registry mechanics, provider lowering, diagnostic inventories, or enforcement implementation.

## 3. Specification Shapes

Not every architecture-related artifact is a specification, and not every specification is a companion. Pick the smallest shape that fits the work.

| Shape | What it is | Required authority handling | Must not do |
| --- | --- | --- | --- |
| Hub specification | Owns system-level ontology, vocabulary, laws, boundary names, handoffs, and attachment points for a domain. | Declare owned scope, non-owned scope, attachment points, and affected companion owners. | Copy companion mechanics or treat unowned detail as settled. |
| Companion specification | Attaches to a named parent boundary and owns deeper detail inside that boundary. | Declare parent, attachment boundary, owned concern, forbidden concerns, upstream owners, and review gates. | Redefine hub ontology or another companion's mechanics without explicit transfer. |
| Decision packet | Settles or proposes a specific unresolved decision. | Name the claim, owner, evidence, proposed default, disposition, and lock trigger. | Pretend to be a broad specification. |
| Harvest/provenance packet | Processes useful language or rules from non-authoritative material. | Mark each item as adopt, adapt, reject, or defer with destination owner. | Promote source material merely because it is polished, newer-looking, or easier to find. |
| Review report | Records findings against a spec or packet. | Name evidence, severity, disposition, repair demand, and owner/future DRA. | Become architecture truth without owner acceptance. |
| Read model or generated artifact | Exposes evidence, diagnostics, indexes, graphs, summaries, or derived views. | Label exactness and provenance; route authority to the owning spec or packet. | Compose authority by aggregation or presentation. |
| Process or workstream record | Preserves execution state, decisions, gates, and handoff context. | Link to authority surfaces; keep workstream state separate from spec truth. | Become a spec merely because it contains useful decisions. |

Minimum metadata depends on shape. A companion needs an attachment declaration. A review report does not. A read model needs exactness/provenance labels. A hub needs ontology and attachment ownership. Do not force every artifact through the companion template.

Build path by shape:

| Shape | Choose this when | Minimum fields or sections | Required gates | Common overreach |
| --- | --- | --- | --- | --- |
| Hub specification | The document owns shared vocabulary, laws, and attachment points. | Scope, owned ontology, non-owned concerns, laws, boundaries, attachment surface, open decisions. | Base gates, hub-only gates, evidence/read-model gates where examples or generated material appear. | Copying companion mechanics into hub authority. |
| Companion specification | The document deepens a named parent boundary. | Attachment declaration, owned concern, forbidden concerns, authority owner, borrowed nouns/mechanics, reserved boundaries, review gates. | Base gates, companion-only gates, relevant application-profile gates. | Redefining parent ontology or another companion's mechanics. |
| Decision packet | One claim or open decision needs a lock point. | Claim, authority owner, evidence, proposed default, disposition, lock trigger. | Base gates, metadata gate, stale-source gate. | Expanding into a broad spec without owning that scope. |
| Harvest/provenance packet | Useful source material needs adopt/adapt/reject/defer handling. | Source, candidate rule, current owner, disposition, destination, trigger for deferred items. | Base gates, stale-source gate, evidence/read-model gates. | Letting polished source wording become authority by inertia. |
| Review report | A spec or packet needs findings and repair demands. | Evidence, finding, severity, owner/future DRA, disposition, repair or waiver/defer trigger. | Base gates, evidence/read-model gates. | Treating findings as accepted architecture before DRA disposition. |
| Read model or generated artifact | A derived view helps readers inspect evidence. | Provenance, exactness, source set, generated/illustrative limits, owning spec or packet. | Exactness gate, read-model gate, stale-source gate if sources vary. | Presenting aggregation as authority. |

## 4. Authority Metadata Axes

Authority metadata is external reference information about a surface. It helps agents decide whether and how to rely on a document, but it does not make the document a specification.

Use separate axes instead of one overloaded status label:

| Axis | Values | Meaning |
| --- | --- | --- |
| Document shape | hub spec, companion spec, decision packet, harvest packet, review report, read model, process record, scratch/provenance | What kind of surface this is. |
| Authority role | current owner, companion owner, delegated owner, non-authority reference | Whether the surface can decide a claim. |
| Source disposition | adopted, adapted, rejected, deferred, stale/superseded, archived/quarantined | How a source or claim was processed. |
| Cleanup state | active, fenced, archived, quarantined, cleanup deferred | What should happen to the physical or indexed source. |
| Exactness | normative, illustrative, generated/read-model, example-only | Which parts can be relied on as spec truth. |

When reliance affects authority, promotion, cleanup, or normative claims, the reviewing agent must classify the source using these axes in the owning spec, authority index, review packet, promotion packet, or workstream record. Inline labels are useful mirrors, but they are not sufficient when they conflict with current owner decisions.

## 5. Core Authority Model

General authority rules:

1. The current owner for the smallest claim wins.
2. A hub wins for hub ontology, vocabulary, laws, boundary names, and attachment points.
3. A companion wins for mechanics and deeper detail inside its declared attachment boundary.
4. This spec-system companion wins only for cross-specification governance rules.
5. Harvest, research, scratch, generated, archived, quarantined, and stale sources do not decide current authority unless an owner explicitly promotes or revalidates them.

Every architectural truth must have one authority owner at the level of the claim. More detail does not create authority. Calling a document canonical does not create authority if a current owner supersedes or fences it.

Authority transfer must be explicit and must update the affected owners in concert. A transfer must name:

- delegating owner;
- receiving owner;
- delegated concern;
- boundary of delegation;
- retained concerns;
- update requirement if either side changes.

When two current authorities appear to claim the same truth:

1. Identify the smallest claim in conflict.
2. Identify which specification owns that claim under this document.
3. Treat the non-owner's statement as boundary wording, provenance, or conflict evidence.
4. Repair, waive, or defer the conflict explicitly.
5. Do not resolve it by smoothing prose until the ownership question is settled.

Epistemic markers are authority markers. Words such as `reserved`, `candidate`, `expected`, `may`, `may not be final`, `not always`, `flexible`, and `deferred` must survive synthesis unless a current authority explicitly settles them. Do not polish uncertainty into false authority.

The source ladder used to produce this document is workstream-specific and is recorded in `spec-system-source-note.md`. Future specifications must not inherit `_inbox/latest`, that workstream's plan docs, or that worktree's branch state as standing corpus authority.

## 6. Hub And Companion Model

The hub/companion model is the default shape for architecture areas where one document owns shared vocabulary and another document owns deeper subsystem detail.

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
- naming owner;
- mechanics owner;
- named interface contract types, if any;
- companion specifications that attach there.

A hub specification must not:

- copy a companion's internal mechanics;
- duplicate subsystem type shapes or implementation contracts;
- promote integration-facing subsystem nouns into top-level hub ontology;
- use companion details to bypass companion authority;
- treat unowned detail as settled architecture;
- hide open questions inside polished prose.

A companion specification owns deeper subsystem detail only inside its declared attachment boundary.

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
- introduce a new role, surface, harness, provider class, control-plane touchpoint, durable authority, subsystem owner, or equivalent cross-boundary owner without updating the hub attachment surface;
- use "fixes" language on mechanics it does not own.

When a hub references a companion-owned area, it should name the boundary and the owning companion. It may state the law or integration vocabulary the hub owns. It must route mechanics to the companion owner.

If a hub changes a phase name, boundary name, role/surface taxonomy, ownership law, or producer/consumer handoff that a companion consumes, the affected companion must be reviewed. If a companion changes only mechanics within its owned boundary, the hub does not need to change unless boundary vocabulary or handoff contracts change.

## 7. Companion Attachment Protocol

Use this protocol only for companion specifications or surfaces that are explicitly attaching to a parent authority. Do not require it for ordinary review reports, harvest packets, process records, or read models.

A companion specification must include an attachment declaration equivalent to this:

```text
Parent authority or hub:
Parent authority path:
Attachment boundary:
Hub section / registry row:
Owning companion section:
Authority owner:
Naming owner:
Mechanics owner:
Conflict-resolution owner:
Owned subsystem concern:
Forbidden concerns:
What this companion deepens:
What this companion must not redefine:
Borrowed nouns or mechanics:
Reserved boundaries:
Supersedes / harvests / subordinates:
Review gates:
```

Attachment rules:

1. The companion must name a parent authority boundary, not an internal alias.
2. The companion must state its owned concern and forbidden concerns.
3. The companion must identify the current authority owner for every borrowed noun or mechanic.
4. Domain-shaped claims must route through the owning domain specification unless the hub explicitly owns the system-level law.
5. Integration-facing names may live in hub vocabulary. Names consumed only inside mechanics live in the owning companion.
6. Reserved details must name boundary/seam, owner, input/output contract, enforcement or diagnostic hook, and trigger for later locking.
7. Older related documents must be classified before reliance as current authority, harvested provenance, stale/superseded, archived/quarantined, or deferred cleanup.

## 8. Non-Authority Material And Exactness

Examples, diagrams, generated excerpts, schemas, contract tables, indexes, reports, diagnostics, ledgers, semantic graphs, and generated summaries can clarify a specification. They must not create authority by presentation.

Use exactness metadata when a surface could be mistaken for normative truth:

```text
Layer:
Exactness:
```

The label may be lightweight, but it must say which parts are normative and which parts are illustrative, generated, derived, or example-only.

Read models are evidence surfaces unless explicitly promoted by an owner. They can explain or expose evidence; they do not compose authority by themselves.

Authority-plane models are reading maps, not ontology. They can help readers see which kind of authority a noun exercises, but they must not create new truth objects or ownership layers by themselves.

Examples clarify rules. They must not introduce new owners, nouns, mechanics, or obligations beyond the rule they illustrate.

Example: a generated semantic graph may show that two specifications mention the same noun. The graph can help a reviewer find a possible overlap, but it does not decide which specification owns the noun. The reviewer must route that ownership question through the owning spec, review packet, or decision packet.

## 9. Reserved Boundaries, Deferrals, And Gaps

Reserved boundaries are named architecture surfaces with known owners and integration hooks. They are not omissions.

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

## 10. Harvesting, Supersession, And Stale Copies

Harvesting is not promotion. A harvest source must be processed as:

- `adopt`: current authority confirms the rule and destination owner;
- `adapt`: useful language survives but authority or scope changes;
- `reject`: wording or rule conflicts with current authority;
- `defer`: valid but outside current scope, with owner and trigger.

When a harvested source is polished, current-looking, or easier to find than current authority, record its authority state explicitly. The risk is not bad wording; the risk is useful wording carrying hidden authority changes.

Before reliance, stale or superseded copies must be classified in the current authority index, owning spec, review packet, promotion packet, or workstream record. Where practical, update, rename, archive, quarantine, or explicitly subordinate stale copies that still self-identify as canonical. If physical cleanup is not practical, create a `deferred cleanup` record with owner or future DRA, authority home, and re-entry trigger.

Stale-source containment is a corpus readiness gate. It is not a new architecture decision by itself. A DRA must not reopen architecture merely because a stale copy exists; the DRA must classify, subordinate, archive, quarantine, or defer cleanup with a trigger.

## 11. Acceptance Checklist

Run the base gates for every new or revised architecture specification.

When a gate fails, the review output must name the failed gate, exact claim or surface, current owner or future DRA, required repair action, and disposition: `repair`, `waive`, or `defer`.

Base gates:

- **Reader task gate:** the document says who should use it and for what decision or action.
- **Shape gate:** the document shape is declared or obvious: hub, companion, decision packet, harvest packet, review report, read model, process record, or provenance.
- **Owner gate:** every normative rule has a clear owner.
- **Boundary gate:** the document says what it owns and what it does not own.
- **Metadata gate:** authority role, source disposition, cleanup state, and exactness are recorded where reliance depends on them.
- **Stale-source gate:** current, harvested, stale, archived, and deferred sources are classified before reliance.
- **Example gate:** examples clarify existing rules and introduce no new authority.
- **Cold-read gate:** a future agent can apply the rules without the prompt or session transcript.

Hub-only gates:

- **Ontology gate:** hub vocabulary and ontology are stable and not imported from a companion by accident.
- **Attachment-surface gate:** companion attachment points and mechanics owners are named where companions exist.
- **Handoff gate:** producer/consumer or boundary handoffs are stated at hub level without copying mechanics.

Companion-only gates:

- **Attachment gate:** the companion names parent authority, boundary, owned concern, and forbidden concerns.
- **Delegation gate:** borrowed nouns or mechanics name their current owners.
- **Deepening gate:** companion detail deepens the boundary without redefining parent ontology.

Evidence/read-model gates:

- **Exactness gate:** diagrams, examples, generated excerpts, schemas, and contract tables say which parts are normative and which parts are illustrative.
- **Read-model gate:** indexes, reports, diagnostics, ledgers, semantic graphs, and generated summaries are not treated as authority unless promoted by an owner.

Application-profile gates:

- Run domain-specific gates only when the profile applies. For this migration, platform/runtime noun placement is a high-risk profile gate, not a universal rule for every RAWR architecture spec.

## 12. Common Failure Modes And Repairs

| Failure mode | Symptom | Repair |
| --- | --- | --- |
| False authority | Polished prose turns candidate, expected, reserved, or deferred language into settled law. | Restore the epistemic marker or record the owner decision that settled it. |
| Detail wins by accident | A detailed companion appears to outrank the hub or another owner. | Identify the smallest claim and route authority to the owner. |
| Status-object drift | Specs start carrying lifecycle/cleanup state as if that state defines the spec. | Separate normative claims from authority metadata; move state to an owner, index, review packet, or workstream record. |
| Shape overreach | A review report, read model, or process record is treated like a specification. | Classify the surface and promote only owner-accepted claims. |
| Attachment overreach | Every document is forced into the companion attachment template. | Apply the template only to companion specs or explicit attachment surfaces. |
| Reserved-as-gap | A reserved boundary lacks owner, hook, contract, or trigger. | Add the missing fields or mark it as a gap. |
| Gap-as-deferral | Missing design is labeled deferred without enough continuation context. | Add owner, authority home, evidence needed, unblock condition, and trigger. |
| Stale canonical claim | An older document still says canonical and future agents follow it. | Classify it before reliance and, where practical, archive, quarantine, rename, or subordinate it. |
| Example leakage | An example introduces a new rule or mechanic the rule itself did not authorize. | Label the example informative or remove the new rule/mechanic. |
| Domain noun promotion | A subsystem-owned noun becomes hub ontology because it was useful to name. | Reframe as a boundary reference or route mechanics to the owning spec. |

## 13. Application Profile: Platform/Runtime Boundary

This profile applies to the current final architecture migration because platform and runtime specifications are known to overlap. It is a high-risk application of the general authority model, not the whole purpose of this specification.

Generic profile rule: domain-specific nouns may appear outside their owner only as boundary references needed for ownership, handoff, attachment, or external interface clarity. Naming a mechanism does not transfer ownership of its mechanics.

For the current platform/runtime pair:

- The Platform Architecture Specification owns platform ontology, laws, vocabulary, boundaries, handoffs, and companion attachment points.
- The Runtime Realization System specification owns runtime mechanics: phase implementation, sub-sequencing, artifact type shapes, substrate internals, registry matching, provider lowering, process runtime internals, adapter contracts, harness implementation contracts, diagnostic inventories, and runtime enforcement mechanisms.
- The platform spec may own compact system-level laws such as execution ownership and integration handoffs.
- The runtime spec may reproduce platform laws as context when it clearly preserves platform authority.
- The runtime spec may define mechanics for runtime-owned areas. It must not redefine service domain authority, projection meaning, app identity, deployment placement, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors unless a current owning spec explicitly delegates that concern.
- The spec-system companion owns neither side's mechanics. It owns the routing rules that keep each side from silently absorbing the other's authority.

Runtime nouns may appear in platform or hub prose only when they are integration-facing boundary references needed to define ownership, handoff, or attachment.

Allowed as boundary references in this profile:

- runtime lifecycle phase names;
- runtime-owned component names when they name a producer/consumer boundary;
- externally consumed platform interfaces;
- diagnostics or telemetry nouns when they define observation boundaries;
- named runtime laws that the platform hub owns as integration vocabulary.

Not allowed as platform ontology:

- treating runtime components as top-level platform kinds;
- copying runtime type shapes;
- copying registry, provider lowering, bootgraph, adapter, harness, diagnostic inventory, or execution policy mechanics;
- using a named runtime mechanism to imply platform ownership of that mechanism;
- using platform prose to settle runtime implementation detail.

If a future platform spec needs a runtime noun, classify it as:

- `boundary reference`: allowed in platform prose;
- `external interface`: allowed if the platform exposes it to companion specs or tooling;
- `runtime-owned mechanic`: route to runtime spec;
- `forbidden ontology promotion`: remove or reframe.

## 14. Current Reserved Decision Inventory

These items are intentionally not settled by this specification. This is a reserved decision inventory, not a full deferral ledger. If an item becomes work rather than context, create a deferral or decision packet with owner or future DRA, authority home, evidence needed, unblock condition, and re-entry trigger.

Platform finalization:

- The exact final list of runtime nouns allowed in the final Platform Architecture Specification.
- Whether the platform spec should add an explicit sentence banning Effect-prefixed semantic kinds such as `EffectService` and `EffectPlugin`, and where that sentence belongs if adopted.
- Where the Platform Architecture Specification and project indexes should link this companion once platform finalization consumes it.

Owning companion or future DRA:

- Platform/deployment external-interface lock points beyond the current boundary rules.
- OpenShell governance/vendor details beyond harness/native-interior status and already named reserved-boundary handling.
- Repo-wide stale-copy cleanup. This spec defines classification and follow-up triggers; it does not perform cleanup.

If any of these become blockers in a downstream workstream, create a decision packet with source evidence, authority owner, proposed default, and lock trigger. Do not hide the question inside polished specification prose.

## 15. Glossary

**Specification** means an owned normative claim set with a declared scope.

**Reference metadata** means authority-management information around a surface: document shape, authority role, source disposition, cleanup state, and exactness. It helps agents decide reliance; it is not the spec's essence.

**Specification corpus** means the set of RAWR architecture specifications, companion subsystem specifications, decision packets, harvested provenance documents, stale copies, archives, quarantine inputs, read models, and evidence surfaces that future agents may encounter while changing architecture specifications.

**Hub specification** means a specification that owns system-level ontology, vocabulary, laws, phase names, boundary names, handoffs, and attachment points for a domain.

**Companion specification** means a specification that attaches to a named parent boundary and owns deeper subsystem detail inside that boundary.

**Authority owner** means the single document or specification surface that decides a specific architectural truth.

**Attachment boundary** means the named parent boundary at which a companion specification attaches. A boundary can be a lifecycle phase, role/surface boundary, runtime interface, external interface, harness/native boundary, operational placement boundary, or another hub-declared attachment point.

**Integration vocabulary** means names and laws needed for cross-spec coordination: phase names, boundary names, role/surface taxonomy, handoff names, and externally consumed interface names.

**Mechanics** means internal behavior, type shapes, sub-sequencing, implementation contracts, artifact fields, validation algorithms, runtime internals, adapter details, provider lowering, registry matching, diagnostic inventories, and enforcement implementation.

**Reserved boundary** means a named boundary whose owner, integration hook, input/output contract, enforcement or diagnostic hook, and lock trigger are known, while deeper design remains intentionally not final.

**Deferral** means an explicit decision to leave work for a later owner or future DRA with enough context and a trigger to resume.

**Gap** means missing design work. A silence without owner, seam, contract, hook, and trigger is a gap, not a deferral.

**Harvested provenance** means useful wording, framing, or candidate rules from a non-authoritative source. Harvested material must be adopted, adapted, rejected, or deferred before it affects current authority.

**Stale copy** means a document that may still call itself canonical or current but is not current authority under the active authority decision.

**Supersession** means a later authority has replaced, subordinated, or fenced an older authority.

**Runtime noun** means a named runtime-realization component, interface, lifecycle phase, access object, diagnostic object, registry, provider plan, runtime artifact, or harness contract.

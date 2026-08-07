# RAWR Specification System Specification

This document is normative for RAWR architecture specification composition.

Canonical scope: the rules that make RAWR specifications clear, durable, composable, and authority-safe across workstreams.

This specification does not define a particular product architecture, runtime architecture, migration plan, implementation workflow, review process, or workstream inventory.

## 1. Purpose

The RAWR specification system exists to help agents write specifications that can be trusted after the current workstream is gone.

A RAWR specification is a normative claim set with a declared scope, a clear reader, stable concepts, explicit authority boundaries, and enough structure for future agents to extend or review it without reconstructing the original conversation.

This document answers one question:

> What must be true of a RAWR specification so future agents can write, compose, extend, and review specs without repeated correction?

It is for:

- agents drafting hub specifications;
- agents drafting companion specifications;
- agents drafting addenda or decision-bearing spec updates;
- reviewers checking whether a spec is coherent, scoped, and durable;
- future directly responsible agents deciding where a claim belongs.

It is not for:

- step-by-step execution of a workstream;
- tracking current unresolved decisions;
- recording source hashes, review findings, or temporary inventories;
- deciding domain-specific architecture content.

Operational authoring guidance MAY exist in a separate informative companion. Such guidance can explain how to apply this specification, but it MUST NOT silently add normative requirements.

## 2. Reader And Use Model

This document is shaped for expert future agents who know RAWR conventions broadly but do not have the current thread, hidden chat context, or workstream-specific rationale.

The reader uses it to make four decisions:

1. What kind of specification am I writing?
2. What claim does this specification own?
3. How should the document be structured so the claim remains clear and extensible?
4. What must the document avoid so it does not create false authority, temporal lock-in, or hidden ambiguity?

The document is both a reference and a writing standard. It is not a checklist. A checklist can be derived from it, but the normative source is the composition model and rules below.

## 3. Core Authority Model

Every normative claim MUST have one authority owner at the level of the claim.

The owner is the specification, addendum, or explicit authority surface that decides the claim. More detail does not create ownership. Newer wording does not create ownership. A generated view does not create ownership. A workstream record does not create ownership unless an owning specification explicitly promotes the claim.

A specification MAY rely on another specification by reference. When it does, it MUST preserve the other specification's ownership boundary.

A specification MUST NOT silently redefine:

- another specification's ontology;
- another specification's mechanics;
- another specification's public vocabulary;
- another specification's extension point;
- the meaning of a term whose authority belongs elsewhere.

If two current authorities appear to claim the same thing, the resolving agent MUST identify the smallest disputed claim before deciding ownership. The repair MUST preserve the owner boundary or explicitly transfer authority.

Authority transfer MUST name:

- the previous owner;
- the new owner;
- the delegated or transferred concern;
- the retained concerns;
- the change that downstream specifications must make.

## 4. Specification Forms

RAWR specifications use three primary forms.

### 4.1 Hub Specification

A hub specification owns a shared conceptual surface. It defines stable vocabulary, system laws, major boundaries, extension points, and the terms other specifications use to attach.

A hub specification MUST:

- define the domain it governs;
- define the durable concepts and vocabulary it owns;
- state which concerns it does not own;
- define extension points for companion specifications or addenda;
- keep examples and implementation detail subordinate to the concepts they illustrate.

A hub specification MUST NOT absorb companion mechanics merely because a companion needs hub vocabulary.

### 4.2 Companion Specification

A companion specification attaches to an explicit hub boundary and deepens one concern inside that boundary.

A companion specification MUST:

- name the hub or parent authority it attaches to;
- name the boundary or extension point it deepens;
- state the concern it owns;
- state the concerns it must not redefine;
- identify borrowed terms and their owners;
- preserve the hub's public vocabulary unless authority is explicitly transferred.

A companion specification MAY define internal mechanics, examples, diagrams, and specialized constraints for its owned concern.

A companion specification MUST NOT become a second hub by accumulating unrelated concerns.

### 4.3 Addendum

An addendum modifies, clarifies, or extends an existing specification without replacing it.

An addendum MUST:

- name the target specification;
- state whether it amends, clarifies, extends, reserves, or supersedes a claim;
- quote or link the affected section when practical;
- state the new normative claim;
- state whether the addendum is temporary, transitional, or intended to be merged.

An addendum MUST NOT create a parallel specification that leaves readers unsure which claim wins.

## 5. Required Composition

Every normative RAWR specification MUST contain enough structure for a future agent to understand what the document owns and how to use it.

A specification MUST define:

- **Purpose:** why the specification exists.
- **Audience:** who is expected to use it.
- **Scope:** what the specification owns.
- **Non-scope:** what it does not own.
- **Terms:** the concepts required to read it correctly.
- **Authority boundary:** what claim family this document decides.
- **Composition model:** how its parts fit together.
- **Extension model:** where companion specs, addenda, or future updates may attach.
- **Examples or references, when useful:** they must clarify a rule or concept and remain subordinate to the normative claim.

These elements do not have to use those exact headings. Required elements do have to be present; conditional examples or references apply only when they help clarify the specification.

The composition model is required because high-quality specs do not merely list rules. They explain what the system is made of, how the parts relate, and which parts are allowed to vary.

## 6. Writing Rules

A specification MUST use normative language deliberately.

- Use `MUST` for requirements.
- Use `MUST NOT` for prohibitions.
- Use `SHOULD` for strong defaults with known exceptions.
- Use `MAY` for allowed variation.
- Use `RESERVED` only for a named boundary whose owner and lock trigger are known.

A specification MUST introduce concepts before relying on labels. Labels may change; concepts are the durable authority.

A specification SHOULD prefer stable role names and concept names over temporal names, branch names, current workstream names, or fragile file names. When a concrete path or document name is needed, the spec SHOULD pair it with the role it plays.

A specification MUST preserve epistemic markers such as `candidate`, `expected`, `may`, `not final`, `reserved`, and `deferred` unless the owning authority explicitly settles the claim.

A specification MUST NOT:

- overfit normative rules to the current workstream;
- invent a negative rule for a context that would not otherwise arise;
- turn current cleanup concerns into permanent specification law;
- make examples do normative work that the rule text does not do;
- use a warning to create the very context the warning says to avoid;
- lock durable concepts to temporary names;
- collapse implementation detail into public ontology;
- hide unresolved design work behind polished prose.

### 6.1 Context-As-Negative-Rule

A negative rule is valid only when it protects against a plausible failure mode that exists independently of the rule.

A specification MUST NOT say "do not do X" merely because an earlier draft introduced X, because the current workstream happens to be struggling with X, or because X is a tempting patch for this one situation. If the concept would not otherwise be in a future agent's working set, naming it as a prohibition can spread the wrong context.

When a prohibition is necessary, write it at the right level of abstraction:

- Prefer "Do not promote implementation detail into public ontology."
- Avoid "Do not promote this current subsystem's detail into this current hub" unless the document is specifically scoped to that subsystem.

## 7. Document Composition Invariants

These invariants apply to every normative RAWR specification.

### 7.1 One Main Point

A specification MUST have one primary purpose. Supporting sections may clarify, extend, or constrain that purpose, but they MUST NOT create multiple competing centers of authority.

If a document needs to govern unrelated purposes, split it into a hub specification plus companions, addenda, or informative guidance.

### 7.2 Layer Integrity

A specification MUST keep conceptual layers distinct unless it explicitly defines how they collapse.

Common layers include:

- public ontology;
- internal mechanics;
- examples;
- generated or derived representations;
- operational workflows;
- temporal workstream state.

A specification MUST NOT collapse layers without showing the support structure.

If a simplified example hides layers for readability, the specification MUST define those layers elsewhere in the same document or in an owned companion, and the simplified example MUST map back to the explicit representation.

This is the "no unexplained magic" rule: a reader may see a simple face of the system, but the specification must reveal what supports that simplicity.

### 7.3 Authority Before Detail

A specification MUST establish who owns a concept before elaborating details that depend on that concept.

Detail without ownership creates false authority. Ownership without enough detail creates unusable abstraction. A good specification supplies both, in that order.

### 7.4 Stable Concepts Before Current Names

A specification MUST define durable concepts in a way that survives renames, branch changes, migration phases, and implementation refactors.

Concrete names are allowed when they are part of the public contract. Otherwise, names SHOULD be treated as examples, aliases, or current spellings.

### 7.5 Examples Are Subordinate

Examples MUST clarify a rule, model, or invariant. They MUST NOT introduce new requirements, hidden actors, hidden state, or hidden mechanics.

If an example omits important support layers, it MUST say what it omits or link to the section that defines those layers.

### 7.6 Open Decisions Are Explicit

Unsettled design work MUST be marked as open, reserved, or deferred with enough information for a future owner to resume.

Open decisions MUST NOT be hidden inside reassuring prose. A reader should be able to tell what is settled, what is reserved, and what remains unknown.

## 8. Scope Separation

Normative specifications, informative companions, operational guides, review reports, generated views, and workstream records have different jobs.

A normative specification defines durable requirements.

An informative companion explains how to apply those requirements.

An operational guide explains how to perform work in a time-bound setting.

A review report records findings and dispositions.

A generated view or semantic graph exposes derived evidence.

A workstream record preserves execution state and handoff context.

These artifacts MAY reference one another. They MUST NOT silently trade roles.

The normative specification MUST NOT contain:

- current workstream decision inventories;
- temporary source-freeze details;
- branch-specific plans;
- execution checklists;
- review-loop mechanics;
- migration-specific cleanup lists;
- domain-specific inclusion or exclusion decisions outside its owned domain.

If such content is useful, put it in an informative companion, workstream record, decision packet, or owning domain specification.

## 9. Extensions, Addenda, And Change

A RAWR specification system MUST support change without making every change a rewrite.

Use a companion specification when a concern needs durable depth inside a named boundary.

Use an addendum when a small set of claims needs to amend, clarify, reserve, or supersede an existing specification.

Use an informative companion when agents need authoring guidance, examples, review checklists, or operational application notes that should not become normative law.

Use a workstream record when the content is temporal execution state.

When extending a specification, the extending artifact MUST state:

- what it attaches to;
- what it owns;
- what it does not own;
- what it changes;
- what remains authoritative in the parent;
- whether the extension is permanent, transitional, or informative.

## 10. Anti-Patterns

The following patterns are specification failures.

| Anti-pattern | Why it fails | Repair |
| --- | --- | --- |
| Rule ledger | Lists many rules without a conceptual model or through line. | Define purpose, composition model, and relation between rules. |
| Current-workstream overfit | Turns temporary context into general law. | Move temporal content to workstream records or decision packets. |
| Context-as-negative-rule | Warns against a thing the spec itself introduced. | Remove the context or rewrite at the durable abstraction level. |
| Fragile-name lock-in | Makes temporary labels or file names carry durable meaning. | Define the concept and treat current names as examples unless public. |
| Hidden magic | Shows a simplified outcome without defining supporting layers. | Define the layers and map the simplified view to them. |
| Example authority | Lets an example introduce rules not stated elsewhere. | Move the rule into normative prose or remove it from the example. |
| Status-object drift | Makes lifecycle, cleanup, or review state part of what the spec is. | Keep status metadata external or clearly subordinate to the normative claim set. |
| Mixed artifact roles | Combines normative rules, operational checklist, review findings, and temporal inventory in one authority document. | Split by artifact role and link across artifacts. |
| Polished uncertainty | Converts `candidate`, `reserved`, or `deferred` language into settled law by smoothing prose. | Restore markers or record the settling authority decision. |
| Layer collapse | Blends ontology, mechanics, workflow, examples, and generated views without declaring the boundary. | Separate layers or define the collapse explicitly. |

## 11. Exactness And Representations

Specifications often need examples, snippets, diagrams, tables, or generated views. These representations are useful only when their exactness is clear.

Any representation that could be mistaken for normative detail MUST state what is normative and what is illustrative.

A simplified representation MUST identify:

- the concept or rule it illustrates;
- the support layers it omits;
- where the explicit representation lives;
- whether names and fields are exact, illustrative, or current spelling.

Generated and derived representations MUST identify their source and MUST NOT become authority by aggregation.

## 12. Quality Bar

A RAWR specification is ready only when a cold future agent can answer:

1. What does this specification own?
2. What does it not own?
3. Which concepts are durable?
4. Which names are public contract and which are current spelling?
5. Where do companions or addenda attach?
6. What examples are illustrative rather than normative?
7. What is open, reserved, or deferred?
8. What would count as overreach?
9. What must a future update preserve?

If the document cannot answer those questions without the original workstream context, it is not a finished specification.

## 13. Glossary

**Specification** means an owned normative claim set with a declared scope.

**Hub specification** means a specification that owns shared ontology, vocabulary, laws, and extension points for a domain.

**Companion specification** means a specification that attaches to a named boundary and deepens one concern inside that boundary.

**Addendum** means an explicit amendment, clarification, reservation, or supersession of a claim in an existing specification.

**Informative companion** means a non-normative document that explains how to apply a normative specification.

**Normative claim** means a statement that defines what must, must not, should, or may be true.

**Authority owner** means the artifact that decides a normative claim.

**Public ontology** means the durable concepts and categories that other specifications may rely on.

**Mechanics** means internal behavior, implementation detail, transformation logic, lifecycle sequencing, field shapes, or other detail below the public ontology boundary.

**Extension point** means a named boundary where a companion, addendum, or future spec may attach.

**Reserved** means intentionally not finalized, with a known owner, boundary, and trigger for resolution.

**Deferred** means intentionally moved out of current scope, with enough context for a future owner to resume.

**Gap** means missing design work that has not been validly reserved or deferred.

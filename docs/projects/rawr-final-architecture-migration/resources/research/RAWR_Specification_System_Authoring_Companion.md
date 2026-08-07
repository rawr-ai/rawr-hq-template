# RAWR Specification System Authoring Companion

This document is informative. It is an authoring companion for applying `RAWR_Specification_System_Spec.md`.

It does not add requirements. If this document conflicts with the normative specification, the normative specification wins.

The normative requirements live only in `RAWR_Specification_System_Spec.md`, especially its required composition rules and form-specific `MUST` statements. Shapes below are prompts and common starting points, not additional minimum requirements.

## Purpose

Use this companion when you are about to draft or review a RAWR specification and need an operational path from the normative rules to a concrete document.

## Authoring Flow

1. Choose the artifact role:
   - hub specification;
   - companion specification;
   - addendum;
   - informative companion;
   - decision packet;
   - workstream record;
   - review report;
   - generated or derived view.
2. Write one sentence that names the document's main point.
3. Name what the document owns.
4. Name what it does not own.
5. Define the durable concepts before relying on current labels.
6. Sketch the composition model before listing rules.
7. Add examples only after the rules they illustrate are clear.
8. Mark any simplified examples that hide support layers.
9. Move operational steps, temporal inventories, and workstream state out of the normative document.

## Shape Prompts

### Hub Specification

Ask:

- What shared ontology does this hub own?
- Which terms must companions reuse?
- Where can companions attach?
- What should remain outside the hub?
- Which examples are illustrative only?

Common starting shape:

- purpose;
- scope and non-scope;
- durable concepts;
- system laws or invariants;
- extension points;
- companion/addendum rules;
- examples with exactness labels, when useful;
- open or reserved decisions, when present.

### Companion Specification

Ask:

- Which hub boundary does this deepen?
- What concern does this companion own?
- What must it not redefine?
- Which terms are borrowed from the hub?
- Which internal mechanics are allowed here?

Common starting shape:

- parent authority;
- attachment boundary;
- owned concern;
- forbidden concerns;
- borrowed terms and owners;
- internal model;
- examples or representations, when useful;
- reserved or deferred decisions, when present.

### Addendum

Ask:

- Which claim is being amended, clarified, reserved, or superseded?
- What is the new claim?
- Is the addendum temporary, transitional, or intended to be merged?
- What must a reader preserve from the parent spec?

Common starting shape:

- target specification;
- affected claim or section;
- addendum type;
- new normative claim;
- authority owner;
- merge or expiration condition.

## Review Prompts

Use these prompts as review aids, not as additional normative requirements:

- Can I state the document's main point in one sentence?
- Can I identify what the spec owns and what it does not own?
- Are concepts introduced before current labels?
- Does every example point back to an explicit rule or concept?
- Does any warning introduce context that would not otherwise exist?
- Does the document contain operational instructions that should move here?
- Does it contain a temporal inventory that belongs in a workstream record or decision packet?
- Does any simplified representation hide layers without mapping to the explicit model?

## Relocation Guide

Move content out of a normative specification when:

- it explains how to execute the current workstream;
- it lists current unresolved decisions;
- it records review findings or dispositions;
- it depends on branch names, temporary file names, or current migration phases;
- it is useful as a checklist but not a durable rule;
- it warns about a context that only exists because the draft introduced it.

Possible destinations:

- informative companion: reusable authoring guidance;
- workstream record: temporal execution state;
- decision packet: one unresolved decision;
- review report: findings and dispositions;
- owning domain specification: domain-specific architecture content.

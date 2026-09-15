# Habitat Design Philosophy

This document is **canonical for Habitat's governing design intent** and
**normative for evaluating design choices**. It is not an API specification,
an implementation-status report, or a substitute for behavioral proof.

The [architecture](HABITAT_ARCHITECTURE.md) owns exact kinds, relationships,
ownership, and integration boundaries. The
[runtime specification](HABITAT_RUNTIME_REALIZATION.md) owns exact realization
mechanics. This philosophy explains the intent through which those contracts
should be evaluated and evolved; it does not silently repeal their provisions.
When a provision conflicts with this intent, identify the specific conflict
and resolve it through an explicit contract change, not an invented hybrid.

## Purpose

Habitat makes software easier for people and agents to classify, compose,
construct, and evolve. It gives components recognizable meanings and ownership
boundaries, makes their composition explicit, and supplies useful authoring,
generation, enforcement, and runtime integration.

Habitat is not a replacement implementation of its integrated platforms. Their
engineering and native composition models are assets to use, not behavior to
recreate under a new vocabulary. Habitat adds value above and between them
without claiming the semantic meaning of a downstream product.

## Native Semantics, Meaningful Habitat Boundaries

**Vendors retain their semantics and familiar vocabulary inside Habitat
kinds.** Native constructs should remain recognizable to an author who knows
the vendor. An integration should preserve that knowledge rather than require
learning a parallel Habitat language for the same operation.

**Habitat has its own signature at consequential boundaries.** Component
ownership, capability selection, application composition, planning, provisioning,
and lifecycle integration are meaningful places for Habitat concepts. Authors
should be able to tell which contract and execution regime they are using.
Uniform appearance is not a reason to erase useful differences between native
hosts or kinds.

**Abstractions must earn their place.** A wrapper, facade, curated import, or
declaration is justified when it materially improves authoring or represents a
real composition, planning, capability, or runtime boundary. Merely renaming a
native operation or making every vendor look alike is not sufficient.
Pass-through or direct native use may be the better interface. A useful wrapper
should preserve the relevant native types and behavior rather than assume
responsibility for every vendor edge case.

This is neither a blanket ban on wrappers nor a demand that every vendor API be
available in every context. A deliberately restricted capability can be useful;
its boundary and reason must be explicit. Private integration machinery need
not become ordinary application-authoring ceremony.

## Ownership In Practice

- **Inngest owns durable workflow mechanics.** Functions retain native local
  steps, ordinary control flow, lexical results, and native failure handling.
  Inngest owns durable identities, replay, serialization, retries, and waits.
  Habitat integrates selected capabilities and process lifecycle; it should not
  rebuild those mechanics or require a parallel step language solely for
  uniformity. Whether a particular integration already meets this intent is a
  separate implementation question.
- **Effect owns local Effect composition and execution semantics.** Its native
  vocabulary, types, scopes, and resource behavior should remain recognizable.
  Habitat can plan ownership and integrate process boundaries without inventing
  another Effect algebra, execution engine, or renamed convenience language.
  The required boundary artifact, if any, must be distinguished from the native
  program it contains.
- **Habitat owns reusable software composition, not product meaning.** Services
  retain domain behavior; resources declare capabilities; providers implement
  them; plugins project capabilities; apps select composition. Exact contracts
  remain in the architecture rather than being duplicated here.

These examples express the principle. They do not prescribe all integration
APIs or certify a released implementation.

## Blueprints Make The Supported Path Legible

Blueprints can codify the selected vendor-native structure and source patterns
appropriate to a Habitat kind. This lets agents construct supported code
without repeatedly rediscovering the same constraints, and without requiring
an SDK wrapper around every native operation.

Law should protect meaningful ownership, structure, and adjacent source
relationships. It should not freeze incidental private organization, enumerate
every possible hostile syntax, or become a second model of an entire vendor
API. The supported patterns and their vendor assumptions must be explicit and
maintained as those contracts evolve.

Use each evaluator for the question it can actually answer: structure for
topology, source rules for bounded source relationships, TypeScript for types,
Nx for project and scheduling truth, and behavioral tests for execution,
lifetime, failure, and outcomes. The exact division is defined in
[Habitat authority](../../.habitat/AUTHORITY.md#evaluator-law).

Passing static law is not proof of native runtime correctness. Equally,
documenting a guardrail is not proof that it is active in an author's current
worktree. Generation, source feedback, and runtime qualification are different
parts of the experience; none should stand in for the others.

## The Authoring Experience Is A Design Input

Prefer interfaces whose ordinary use is high-level and naturally inferred.
Repeated private-type extraction, annotation repair, wrapper composition, or
manual registration can be evidence that the public boundary is wrong, not
just documentation that the author needs more training. Meaningful explicit
choices should remain explicit; zero-information ceremony should be challenged.

Judge an abstraction against a concrete authoring journey and its native
alternative. Ask what it makes simpler, what authority it represents, which
native guarantees it preserves, and what new compatibility obligations it
creates. Sometimes the best improvement is removing a layer.

## Human Intent Governs The Frame

A frame selects what matters, what is outside the problem, and what would
justify changing direction. Its value is in the decisions it enables and the
wrong turns it prevents, not in the amount of documentation it produces.

Human-authored intent must remain distinguishable from an agent's proposal,
an accepted contract, and evidence that an implementation works. Code, generated
specifications, and tests that agree with one another do not independently
validate the design choice from which they were all derived.

Keep the frame stable enough to guide autonomous work and revisable when
evidence or explicit owner direction changes it. Preserve why a choice was
made and why an alternative was excluded. Do not convert provisional choices
into permanent constraints merely because a handoff lost their qualifications.

## Provenance And Evolution

This initial consolidation records the owner's explicit clarification and
agreement on 2026-09-15. It captures the high-level intent established in that
exchange, not a completed reconstruction of the earlier Civilization 7, Magic
Migration, and Habitat/Rawr collaboration history.

The [SDK recovery assessment](../projects/habitat-sdk-recovery/assessment.md)
separately records current findings and uncertainties. The later historical
investigation may refine both this philosophy and that assessment. Recovery of
the collaborative method and development of its reusable skill remain separate
work, to be completed before SDK repairs begin; this document is not that skill.

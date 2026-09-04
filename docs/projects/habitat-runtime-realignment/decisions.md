# Decisions - Habitat Runtime Realignment

Status: decisions accepted by the delegated DRA; canonical, policy and execution
routing reconciled and independently reviewed. See verification and admission
state in [WORKSTREAM.md](WORKSTREAM.md).

This register owns decisions made during the September 4 realignment. Enduring
runtime rules are promoted to their canonical owner, not retained here as a
second specification. Provisional choices are explicitly labeled.

## D-01 - Preparation Is The Authorized Outcome

**Question:** Does takeover mean immediately resume the old autonomous queue?

**Options:** continue the first unchecked task; or first reconstruct and
realign the frame, authority and executable preparation.

**Chosen:** complete the realignment first.

**Rationale:** the owner explicitly requested fundamental realignment before
actually resuming implementation. The recovery assessment exposed conflicting
scope and admission rules, not just an interrupted schedule.

**Downstream effect:** no live runtime work, external fork, consumer migration,
release or restart of another task is authorized by implication. The final
handoff must make implementation ready without claiming it happened.

## D-02 - One Integrator, Independent Evidence

**Question:** How should agents coordinate on a cross-cutting authority change?

**Options:** parallel writers with independent semantic authority; or bounded
readers and one integrating editor, followed by independent composed review.

**Chosen:** the DRA owns scope, decisions, edits and closure. Three capable
readers separately examine authority provenance, artifact impact and runtime
semantics, returning cited findings to the DRA. Later implementation delegation
is allowed only with disjoint file ownership and settled contracts.

**Rationale:** independent examination reduces confirmation bias; concurrent
editing of intertwined canon and sequence would increase disagreement. Each
reader's output must change or test a DRA decision to earn its coordination
cost. A missing reader can be replaced from its bounded brief and evidence.

**Downstream effect:** all semantic conflicts converge at the DRA. No agent
claim becomes law by being copied into a spec. Review tests the integrated
result against owner intent and concrete consumers, not only document syntax.

## D-03 - Three Standpoints Constrain The Output

**Question:** What must the realignment enable for its distinct readers?

**Options:** optimize only for the editor's current context; or hold the same
evidence against future implementer, owner and adversarial reviewer standpoints.

**Chosen:** require all three uses, without treating them as equal authorities.

- Future implementer: must find one current target and the first testable
  action without reading superseded receipts. This standpoint cannot decide
  product intent; it establishes cold-start and routing checks.
- Owner: must see the semantic before/after and changed commitments, including
  anything no longer on the critical path. This governs scope; it does not
  require approval of private helper organization.
- Reviewer: must trace every removed gate to a preserved invariant or explicit
  disposition and distinguish source behavior from future acceptance. This
  supplies an evidence constraint, not authority to expand scope indefinitely.

**Rationale:** a document can satisfy one of these readers while failing the
other two. Their differences are retained in separate verification criteria.

**Downstream effect:** frame diff, obligation accounting, current routing and
behavioral acceptance are required. A polished recap is insufficient.

## D-04 - Break The Self-Reinforcing Constraint Loop

**Question:** Which process relationship must change, beyond local wording?

**Options:** preserve every inherited stop condition; or preserve semantic
guarantees while testing whether the constraint serves them.

**Chosen:** use outcome and boundary evidence to justify constraints.

**Rationale:** the observed reinforcing loop is decision -> more exact rules
and tests -> green conformance -> stronger confidence in the same decision.
The balancing loop must be consumer counterexamples and independent review ->
explicit frame diff -> corrected authority and acceptance. Generated rules are
not independent evidence of their own fitness.

| Intervention | Second-Order Risk | Required Countermeasure |
| --- | --- | --- |
| Separate ledger delivery | Its promises disappear or an unqualified provider is released | Preserve its requirements and explicit future trigger; exclude it honestly from the core release |
| Relax internal layout | Owner/import/public boundaries erode | Keep those semantic boundaries executable; relax only incidental layout |
| Select process-local coverage | Broken whole-app declarations hide until deployment | Preserve whole-app structural inspection and explicit selected-closure startup checks |
| Reconcile current documents | Historical proof is rewritten as if always current | Preserve receipts and baseline provenance; name superseded semantics and new code gaps |

**Downstream effect:** no new organizational commitment or weakening of a
correctness guarantee may hide inside a sequencing edit. A high-severity review
finding reopens the affected decision, not the entire program by default.

## D-05 - Type Inputs Before Promoting Them

**Question:** What can the existing material establish?

**Options:** flatten all specifications, receipts and code into current law;
or distinguish authority, evidence, coordination and historical context.

**Chosen:** canonical documents define semantics; OpenSpec defines named
changes and execution; code/tests establish behavior; dated receipts establish
historical proof only; consumer code establishes needs and behavioral oracles.

**Rationale:** the existing inputs mix accepted, implemented, released,
unverified and blocked states. The DRA must extract those distinctions rather
than inherit a checked task as proof of the full product.

**Downstream effect:** every inherited obligation gets a disposition; old
receipts are preserved; known code/spec differences become named repair work;
no runtime acceptance is inferred from this preparation's documentation checks.

## D-06 - Clean Successors, Intact History

**Question:** Amend the mixed documents again, or remove the competing authority?
**Chosen:** preserve complete originals in quarantine with baseline blob proof,
then publish clean active successors at the familiar paths. Keep the active
OpenSpec identity and all unchanged deltas/JSON receipts; do not archive or sync
an unfinished runtime into canonical OpenSpec.
**Rationale:** another supersession paragraph would preserve the failure mode.
The repository's quarantine-first workflow makes topology the boundary.
**Consequence:** active semantics and current execution can be read without
reconstructing historical exceptions. All 115 inherited obligations remain
individually accounted, including unchecked and deferred work.

## D-07 - Ownership Law Without Incidental Layout Ceilings

**Question:** Rewrite selected unpublished law, open its scope, or add successors?
**Chosen:** complete runtime-definition@3, runtime-derivation@3,
runtime-compiler@2 and runtime-bootgraph@2 definitions with positively closed
owner-local TypeScript source/test grammar. Preserve every earlier closure.
**Rationale:** the ontology makes version identity immutable regardless of
publication; a real successor is cheaper and clearer than an exception to it.
**Consequence:** helpers and test support may be decomposed while project anchors,
private assembly, allowed file kinds, package-less ownership and dependency
boundaries stay enforced. Installed tests must demonstrate both flexibility
and refusal. This changes policy, not the runtime's behavior or release version.

## D-08 - Complete Service Meaning Includes Named Construction

**Question:** Can a declaration/contract pair and an unordered child-id set
support real service composition?
**Chosen:** a service-owned complete cold export joins declaration, canonical
contract and typed synchronous construction at the public boundary after the
native implementation exists. Exact references cross into process runtime
alongside complete named recipes. Parent identity includes named child assignments.
**Rationale:** swapping left/right instances can change behavior while leaving
the child-id set unchanged. An app registry would duplicate service ownership;
putting a router import in the upstream declaration would introduce a cycle.
**Consequence:** explicit instances are legitimate composition, equal complete
requests reuse, divergent requests refuse, invocation remains per-call, and
constructors acquire nothing. Native Promise clients are not automatically the
managed Effect-facing callable. Task 0.1 fixes cold plumbing; 8.2 proves live binding.

## D-09 - Selected Closure Controls Startup Satisfiability

**Question:** Must starting one process validate every role's providers/config?
**Chosen:** normalize selected roots and transitive dependencies before coverage.
Reusable profiles may contain inert provider supersets. Preserve immediate
declaration validation and separately useful whole-app inspection.
**Rationale:** the admitted Magic oracle separates API and async configuration
authority; current whole-app coverage violates that legitimate need.
**Consequence:** only selected provider/service values are preflighted, but every
required source explicitly authored in the selected profile remains required.
First-hit decode failure still refuses. Cold tasks prove selection/ref policy;
task 7.2 proves actual source materialization and zero-acquisition refusal.

## D-10 - One Semantic Normalizer

**Question:** Should compilation reproduce binding semantics to distrust derivation?
**Chosen:** compile one cohesive derivation-owned selected handoff, retaining
actual ingress, id/reference, slot-completeness, role/lifetime, graph and lowering
checks. Public data-only graph inspection remains; it is not executable authority.
**Rationale:** independently pairable graph/entrypoint input creates two normalizers
and leaves complete executable references underspecified. Late reuse after
recursive traversal also makes equal layered DAGs path-exponential.
**Consequence:** task 0.1 removes semantic duplication and proves request/edge-scale
work with operation counts, including divergent requests. No authenticity registry,
new public compiler API or machine-specific millisecond promise is required.
The trailing-high-surrogate bug is a focused regression in that same cold story.

## D-11 - Reduce The Private Hostile-Object Promise

**Question:** Does a library-produced in-memory bootgraph need a hostile Proxy protocol?
**Chosen:** no. Keep shape, identity/relation, deterministic order, reverse lifetime,
immutability, non-mutation and zero declared executable-call guarantees.
Retire exhaustive zero-trap/prototype-canary and prescribed introspection law.
**Rationale:** trusted executable authoring is not sandboxed by object scanning.
This was implemented to the previous spec; it is a deliberate contract reduction,
not a discovered security vulnerability or evidence of fabricated test results.
**Consequence:** task 0.2 simplifies that code/tests. External files, paths,
manifests, serialized data and configuration retain their real input validation.

## D-12 - Separate Ledger Dependency, Preserve Its Promise

**Question:** Is unrestricted ledger merge a prerequisite for generic provisioning?
**Chosen:** preserve provider-neutral ledger and temporal-inquiry intent in
independent D-1/D-2 capability records; reopen vendor choice and keep their
qualification/implementation uncompleted. Later Rawr adoption/retirement is D-3.
**Rationale:** the canonical runtime depends on resource/provider plans, not a
database brand. The old 6.3e direction is agent-recorded history, not explicit
owner authorization to maintain an external distribution.
**Consequence:** no silent weakening of ancestry-correct merge or recovery,
no restored rejected stash, and no external fork by inference. A ledger-dependent
consumer still waits for a qualified released ledger; others do not.
Persisted observability and deployment tooling remain initiative outcomes
outside this runtime release, not forgotten promises or newly implemented features.

## D-13 - Release And Adoption Are Different Evidence

**Question:** Does green source or source version 0.5.15 establish a shipped runtime?
**Chosen:** keep implemented, verified, installed-candidate, released and
consumer-accepted states distinct. Preserve exact-main SDK/CLI publication gates
without a permanent two-release ceiling.
**Rationale:** released 0.5.15 contains foundation/service law; current runtime
faces on main are unreleased. Civ7's old missing-service-law gate is stale, but
its migration/V8 acceptance remains. Magic staging is not Habitat adoption.
**Consequence:** no release, consumer edits, hosted deployment or old-task restart
in this preparation. Each consumer receives only the handoff its actual needed
capability and acceptance warrant.

## D-14 - Verify The Changed Boundary, Not Only The Default Graph

**Question:** Which checks establish this preparation is usable?
**Chosen:** explicit source/snapshot parity, obligation accounting, link/routing
and OpenSpec validation, successor positive/negative installed-policy proof,
cumulative separation acceptance, relevant owner tests/builds, full repository
check, independent composed review and required remote CI.
**Rationale:** the optional product-separation target failed at its stale
24-project/SDK-edge oracle despite broad checks being green. Updating the oracle
preserves the real boundary instead of deleting the assertion.
**Consequence:** record actual results below in the workstream verification,
including failures corrected during preparation. None establishes the new
runtime behavior before tasks 0.1 onward execute.

## D-15 - Account For Authoring Separately From Native Hosts

**Question:** Did publishing only accepted faces accidentally drop canonical
agent, desktop and web-local executable promises?
**Chosen:** task 10.1 owns functioning agent/desktop authoring, executable and
schema faces with real descriptor-to-process Effect execution acceptance;
tasks 14.1/14.2 own web-local executable authoring distinct from route loading.
Native agent/OpenShell and desktop integration is explicit D-4 target work,
with selected-host qualification, security and native lifecycle acceptance.
**Rationale:** these are distinct capabilities. The inherited plan required the
authoring faces but assigned no native agent/desktop implementation story.
An empty export is not delivery, and a process-level fixture is not host proof.
**Consequence:** no authoring promise disappears at release audit; core runtime
does not acquire unsupported native hosts merely to expose cold authoring.
The full substrate still has D-4 work after its first qualified runtime release.

## D-16 - Assign Integration Proof To Its Real Owner

**Question:** Can substrate task 7.3 prove native-stop-before-disposal before
mounting exists?
**Chosen:** retain real Effect finalizer/disposal/rollback proof in 7.3; require
cross-owner stop ordering at 10.6 and the subsequent real native-host acceptances.
**Rationale:** a manually sequenced fake stop proves test orchestration, not the
runtime invariant. Pulling mounting into substrate would break the owner graph.
**Consequence:** no behavior is waived; its testable dependency is truthful.

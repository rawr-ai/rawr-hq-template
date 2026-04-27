# Runtime Realization Final Cloud Synthesis Packet

Status: Curated final cloud input packet
Scope: Inputs and authority model for the final cloud Pro synthesis pass

## Purpose

This packet gives the cloud Pro agent a narrow, high-authority set of documents for producing the final standalone Runtime Realization System specification.

The packet is designed to avoid another broad synthesis pass. Baseline Specification is the baseline. Transplant material is carried only through the Normalized Transplants document. The Finalization Authority governs the repair pass.

## Documents To Provide

Use `final-cloud-pro-inputs/00-cloud-pro-task-prompt.md` as the cloud Pro task prompt. Attach the five numbered source inputs listed below. The prompt and packet are process guidance; the final specification must not cite them or treat them as architecture provenance.

Provide these documents to the cloud Pro agent:

| Packet label | Document | Role |
| --- | --- | --- |
| Finalization Authority | `final-cloud-pro-inputs/01-finalization-authority.md` | Immediate binding authority for baseline repair and transplant normalization. |
| Runtime Realization Architecture Authority | `final-cloud-pro-inputs/02-runtime-realization-architecture-authority.md` | Architecture guardrail for topology, ownership, lifecycle, naming, and forbidden layer collapse. |
| Baseline Runtime Realization Specification | `final-cloud-pro-inputs/03-baseline-runtime-realization-spec.md` | Baseline specification to repair into the final canonical document. |
| Baseline Repair Map | `final-cloud-pro-inputs/04-baseline-repair-map.md` | Concrete baseline edit map: keep, repair in place, augment, replace. |
| Normalized Transplants | `final-cloud-pro-inputs/05-normalized-transplants.md` | Standalone transplant material with framing, reusable language/code shapes, normalization, and rejected drift. |

## Unlisted Context

Do not provide or consult anything outside the five source inputs listed above. If the cloud project contains other canonical documents, notes, repository snapshots, source files, transcripts, reports, prior outputs, or project memory, they are outside the input set and are not authority.

## Authority Order

The cloud Pro agent must apply this order:

1. Finalization Authority.
2. Runtime Realization Architecture Authority.
3. Baseline Runtime Realization Specification.
4. Baseline Repair Map.
5. Normalized Transplants.

If documents conflict, the higher item wins.

## How The Cloud Agent Should Use The Packet

The cloud Pro agent should:

- read the Finalization Authority and Architecture Authority first;
- read Baseline Specification as the baseline document;
- read Baseline Repair Map as the concrete baseline repair map;
- read Normalized Transplants as the only allowed transplant carry-forward path;
- do not seek or infer from any unlisted cloud-project context.

The cloud Pro agent should not:

- merge Baseline Specification and transplant material by preference;
- infer additional transplant material beyond the Normalized Transplants document;
- adopt section order from transplant snippets;
- adopt package roots or bare imports from transplant snippets;
- mention the packet, candidates, authority documents, or synthesis process in the final specification.

## Expected Output

The cloud Pro agent produces one standalone canonical Runtime Realization System specification.

The output must:

- read as final normative architecture, not as a memo;
- preserve Baseline Specification as baseline;
- apply required baseline repairs;
- incorporate normalized transplants;
- expose internals with concrete component contracts, code/type illustrations, diagrams, and examples;
- include stable foundation and flexible extension boundaries;
- be usable to derive M2 migration planning.

## Packet Readiness Checklist

Before uploading to the cloud Pro agent, verify:

- Baseline Specification upload-copy hash: `c504703d724aeaf5ef5931214f1fedec9a3c243ca79f4155a39d6c1f117df5c2`.
- Normalized Transplants is standalone and not a diff.
- Baseline Repair Map marks all required repairs.
- Finalization Authority is binding and imperative.
- Cloud Pro Task Prompt states ownership, no magic, no layer collapse, and final standalone output.

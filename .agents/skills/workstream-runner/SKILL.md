---
name: workstream-runner
description: Use when launching, running, reviewing, closing, or handing off a workstream. This skill gives the DRA the operational workflow for framing the workstream, managing agent teams and waves, preserving proof boundaries, and closing with a zero-context next packet.
---

# Workstream Runner

Use this skill when you are the DRA for a workstream. A workstream is a coordination object: it holds the objective, authority order, operating lanes, proof ledger, review loops, closure state, and next handoff.

## Operating Invariants

- The DRA owns synthesis, scope, canonicality, and final calls.
- Agents help with bounded lanes; they do not replace DRA judgment.
- Canonicalize coordination mechanics, not subject matter.
- Keep the workstream report as a durable record, not live kanban.
- Treat old transcripts, scratchpads, and summaries as evidence candidates, not authority.
- Separate proven facts, observations, inferences, assumptions, waivers, and deferred work.

## Launch

Start by creating the workstream frame before implementing.

1. Check repo and branch state. In Graphite repos, inspect `git status --short --branch`, `gt status --short`, and the active stack before changing files.
2. Define the objective in one concrete sentence.
3. Define the containment boundary: in scope, out of scope, non-goals, and what must not silently expand.
4. Define the done condition: the artifacts, behavior, checks, or decisions that make the workstream complete.
5. Build the opening packet:
   - Authority inputs: sources that can decide the workstream.
   - Coordination inputs: plans, reports, session summaries, branch state, and team state.
   - Evidence inputs: files, commands, logs, tests, transcript slices, or docs that can support claims.
   - Stale or excluded inputs: material that must not be promoted without revalidation.
   - Control inputs: repo instructions, security rules, user constraints, stop conditions, and approval boundaries.
6. Write the authority order. When sources conflict, this order decides what wins.
7. Name selected skills and companion agents. Use only the roles that reduce workstream meta-work.
8. State stop conditions: conflict, missing authority, unsafe repo state, failed gates, or scope ambiguity that the DRA cannot resolve from sources.

## Plan

Turn the frame into a small operating plan.

1. Write the output contract: final artifacts, acceptance criteria, required evidence, and closure record.
2. Split work into lanes or waves only where parallel work helps.
3. Give each agent lane a narrow workstream-specific responsibility, input set, forbidden actions, and required output.
4. Keep subject-specific steps parameterized. Do not make one workstream's domain vocabulary generic.
5. Define review loops before implementation begins:
   - leaf reviews check bounded lane output;
   - parent reviews check composition, proof boundaries, and closure readiness.
6. Define scratch policy: where temporary notes can live, who owns cleanup, and what can be promoted.

## Operate

Run the workstream by maintaining the coordination object.

1. Keep the current objective, boundary, output contract, and stop conditions visible.
2. Update the durable report only at phase changes, decisions, accepted findings, proof changes, gates, and closure. Do not turn it into a task feed.
3. Use agents for bounded mechanical lanes:
   - opening mechanics: `workstream-opening-steward`;
   - proof/evidence mechanics: `workstream-proof-ledger-auditor`;
   - closure mechanics: `workstream-closure-steward`.
4. When using larger teams or waves, make each wave produce a decision packet: evidence, finding, recommended disposition, and repair demand. The DRA decides.
5. Track drift immediately:
   - scope drift;
   - authority drift;
   - proof drift;
   - stale scratch or transcript promotion;
   - review findings with no disposition;
   - agents left running after their lane is done.

## Review

Every review loop must have an axis, evidence base, and disposition.

Use `workstream-review-loops` when designing review lanes or handling findings.

Minimum recurring review axes:
- Information shape: can a fresh DRA understand the current state quickly?
- Canonicality: did stable mechanics get separated from high-variance subject matter?
- Proof ledger: are claims backed, bounded, waived, or deferred honestly?
- Integration state: do outputs, gates, repo state, and Graphite state line up?
- Closure readiness: can the next packet stand without transcript archaeology?

## Close

Close only when the mechanical record is complete.

1. Confirm the output contract is satisfied or explicitly revised.
2. Record final outputs and paths.
3. Record verification: commands run, results, skipped checks, and waivers.
4. Disposition every review finding: accepted, rejected, invalidated, waived, or deferred.
5. Record deferred inventory with context, owner or next DRA, and trigger.
6. Clean scratch and stale agent state or record why it remains.
7. Record repo and Graphite state, including unrelated dirty files left untouched.
8. Write a zero-context next packet:
   - current branch/stack;
   - what changed;
   - what is done;
   - what is not done;
   - what to inspect first;
   - exact next action.

## Quality Gates

Before final response, run these checks:
- Skim test: headings and first sentences explain how to continue.
- Noise test: remove extraction/meta-process content that does not help operate the workstream.
- Canonicality test: subject-specific material is parameterized or excluded.
- Proof test: claims match evidence strength.
- Closure test: outputs, gates, dispositions, repo state, and next packet exist.

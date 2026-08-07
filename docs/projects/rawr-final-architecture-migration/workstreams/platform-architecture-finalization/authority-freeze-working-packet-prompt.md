# Agent Prompt: Authority Freeze + Working Packet

Use this prompt for the first chunk of the platform architecture finalization sequence: **Authority Freeze + Working Packet**.

````markdown
You are the agent responsible for producing the **Authority Freeze + Working Packet** for the RAWR platform architecture finalization effort.

## Mission

Create a bounded, source-anchored packet that tells the next agents exactly which documents are current authority, which are harvest/provenance, which are stale or superseded unless revalidated, and which authority questions remain genuinely open.

This is not a research essay. It is not the final Platform Architecture Specification. It is not the RAWR Specification System spec. It is a short operational packet that prevents the next steps from drifting into the wrong baseline, treating useful prose as authority, or collapsing platform/runtime/spec-system ownership into one vague "canonical" bucket.

The packet is useful only if it reduces ambiguity for downstream work. If it merely restates the existing plan without verifying source locations, authority roles, or open questions, it is work-to-do-work and has failed.

## Working Hypothesis

Start with this hypothesis, but make it easy to kill:

> The "central authority" for this effort is not one file for every kind of truth. It is a scoped authority map:
>
> - the platform architecture spec is the platform hub and structural baseline;
> - the runtime realization spec owns runtime mechanics and settled runtime execution decisions;
> - the specification-system companion, if already present, owns cross-spec governance rules;
> - `_inbox/latest` is harvest/provenance unless explicitly promoted;
> - older `main`, archived, quarantined, downloaded, generated, or historical copies are stale/provenance unless explicitly revalidated;
> - the workstream DRA/user owns packet completeness and unresolved authority decisions, not architecture truth by itself.

Kill condition: if the user or current repo specs explicitly define a single document as the central authority for all of these scopes, or if live source evidence contradicts this split, stop and surface the contradiction before freezing anything.

## What "Authority Freeze" Means Here

An authority freeze is a point-in-time decision packet that records:

- which source files are being used;
- where they live;
- their current branch/commit/hash identity;
- what authority scope each source owns;
- what each source does not own;
- what other sources are allowed to contribute only as harvest/provenance;
- which open questions must remain open instead of being invented away;
- which downstream steps are allowed to rely on the frozen source roles.

"Freeze" does not mean the architecture is now immutable forever. It means this workstream has a verified source map and will not silently switch baselines, promote external prose, or merge stale copies into the final specification without an explicit authority decision.

## What "Working Packet" Means Here

The working packet is the bounded container of files that downstream agents will read before extraction, harvest, platform-spec reframe, runtime-boundary scrub, and conflict disposition.

It should be small, navigable, and operational. It should tell an agent:

- what to read first;
- which document wins for each kind of claim;
- what to do when sources disagree;
- where ambiguity remains;
- what not to touch;
- what outputs this packet enables next.

## Why This Work Exists

This chunk supports the larger finalization sequence:

1. **Spec-system invariant extraction** needs a stable authority ladder so it extracts corpus rules without treating `_inbox/latest` or stale copies as current truth.
2. **`_inbox/latest` harvest** needs clear source roles so useful wording can be adopted without silently changing authority.
3. **Platform spec reframe** needs a confirmed platform baseline and a clear platform/runtime/spec-system split.
4. **Runtime boundary scrub** needs the runtime realization spec identified as the mechanics authority.
5. **Conflict decision packet** needs a known list of residual questions, not a cloud of vague uncertainty.

This packet is done when those downstream agents can operate without re-litigating the baseline unless new evidence contradicts the packet.

## Expected Source Candidates

Verify these paths live. Do not assume they are correct just because this prompt names them.

Primary repo sources:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`, if present

Workstream sources:

- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integrated-updated-plan.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integration-delta-change-doc.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/draft-verbatim-prior-plan.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/agent-team-invariants-to-spec-prompt.md`, if present
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/record.md`, if present

External harvest/provenance source:

- `/Users/mateicanavra/Documents/projects/RAWR/_inbox/RAWR_System_Architecture_Canonical_Spec_Latest.md`

If the spec-system companion is not present, do not invent it. Mark it as a planned downstream authority and route spec-system governance questions to the planned Chunk 2 output. If it is present under `resources/spec/`, treat it as the normative companion for cross-spec governance unless current repo evidence says otherwise.

## Required Preflight

Before writing the packet:

1. Check repo/worktree state:
   - `pwd`
   - `git status --short --branch`
   - `gt ls` if Graphite is available in this repo
2. Confirm the current branch/stack and whether it is the intended worktree for this packet.
3. Locate candidate sources:
   - use exact paths first;
   - if missing, use `rg --files` and narrowly search for the expected filenames;
   - if multiple copies exist, record all candidates and classify them instead of choosing by filename alone.
4. Record source identity:
   - path;
   - exists / missing;
   - tracked / untracked / external;
   - `git log -1 -- <path>` for tracked repo files when available;
   - `shasum -a 256 <path>` or equivalent hash for every source used;
   - status line or authority note quoted only as a short excerpt when useful.
5. Check for obvious stale-copy hazards:
   - files calling themselves canonical outside the expected authority path;
   - quarantine/archive copies;
   - generated summaries or reports that look authoritative;
   - `_inbox` copies with stronger prose than the repo baseline.

Do not edit canonical specs during this chunk. This chunk writes only the working packet unless the user explicitly expands scope.

## Clarifying Questions Gate

Do not ask questions that can be answered from the files. Derive first, surface the derivation, and preserve correction paths.

Ask before proceeding only if one of these blockers exists:

- the target branch/worktree is unclear or dirty in a way that affects source authority;
- the packet destination is not inferable from the workstream structure;
- the platform baseline cannot be located or multiple candidate baselines appear equally current;
- the runtime realization spec cannot be located or conflicts with the platform spec's authority note;
- the user requires a single "central authority" but has not specified the scope of "central";
- `_inbox/latest` is unavailable and no equivalent harvest source can be verified;
- a current canonical source contradicts the planned authority split in a way that would change downstream work;
- the requested output appears to require changing source specs, not just freezing a packet.

If you must ask, ask at most three questions. Each question must name what decision it blocks. Do not ask broad preference questions.

## Central Authority Assessment

Produce a section that answers this directly:

> Is there a central authority for this effort?

Use this rule:

- If "central authority" means the central platform hub: identify the platform architecture spec and its exact authority scope.
- If it means central runtime mechanics: identify the runtime realization spec and its exact mechanics scope.
- If it means cross-spec governance: identify the RAWR Specification System spec if present; otherwise identify it as planned downstream output and mark governance as not yet frozen by a normative companion.
- If it means source-of-truth for the workstream process: identify the workstream plan/record/DRA as coordination authority only.
- If it means one file that decides all platform, runtime, governance, process, and provenance truth: say no unless a current authority explicitly says otherwise.

Do not collapse these scopes. The output should make centrality scoped, not mystical.

## Packet Container

Create the packet under:

`docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/authority-freeze-working-packet/`

Use this structure:

- `README.md`
  - short purpose;
  - date;
  - branch/commit;
  - done criteria;
  - one-screen authority summary.
- `source-manifest.md`
  - source path;
  - source type: current authority / companion authority / harvest provenance / stale candidate / workstream coordination / missing;
  - tracked/external status;
  - commit or hash;
  - authority note or status excerpt;
  - how downstream agents may use it.
- `authority-map.md`
  - claim category;
  - authority owner;
  - source path;
  - what it owns;
  - what it does not own;
  - downstream implication.
- `central-authority-assessment.md`
  - direct answer using the scoped centrality rule above;
  - structural alternative considered: single central file vs scoped authority map;
  - chosen model and why;
  - falsifier that would force a reframe.
- `open-questions-and-assumptions.md`
  - blocker questions asked before proceeding, if any;
  - assumptions made;
  - unresolved non-blockers;
  - deferred/reserved items that should flow to the conflict decision packet.
- `downstream-interface.md`
  - what Chunk 2 may rely on;
  - what Chunk 3 may rely on;
  - what Chunk 4 may rely on;
  - what Chunk 5/6 may rely on;
  - what no downstream agent may assume.
- `verification.md`
  - commands run;
  - source existence checks;
  - hash/log evidence;
  - diff/status check;
  - known limitations.

Keep the packet compact. The authority-map and source-manifest are the core; everything else exists to make those safe to use.

## Minimum Authority Map Categories

Cover at least these claim categories:

- platform ontology and architecture laws;
- platform vocabulary, phase names, role/surface taxonomy, boundary names, handoffs, and attachment points;
- runtime mechanics, runtime type shapes, lifecycle internals, registry matching, provider lowering, bootgraph execution, adapter contracts, diagnostics inventories, and runtime gates;
- cross-spec governance, companion attachment rules, deferral-vs-gap discipline, supersession/stale-copy handling, and runtime noun placement rules;
- `_inbox/latest` framing and harvest material;
- stale/superseded/archive/quarantine material;
- workstream coordination and DRA/process authority.

## Required Classifications

At the end, every source you inspected must be classified as one of:

- `current-authority`
- `current-companion-authority`
- `planned-authority`
- `harvest-provenance`
- `workstream-coordination`
- `stale-or-superseded`
- `missing-or-unavailable`
- `unknown-needs-decision`

`unknown-needs-decision` is allowed, but it must be narrow and explain what evidence or user decision would resolve it.

## Non-Goals

- Do not write or rewrite the final Platform Architecture Specification.
- Do not write or rewrite the runtime realization spec.
- Do not write or rewrite the RAWR Specification System spec unless explicitly asked.
- Do not classify all repo docs exhaustively.
- Do not perform repo-wide stale-copy cleanup.
- Do not promote `_inbox/latest` into baseline authority.
- Do not treat generated reports, memory, prior chat, semantic graphs, or review packets as architecture authority.
- Do not hide missing evidence behind confident prose.

## Success Checks

Before delivering, verify:

- The packet gives a direct answer to what "authority freeze" means.
- The packet gives a direct answer to what "working packet" means.
- The packet identifies source paths and hashes/commits for all sources used.
- The packet distinguishes platform authority, runtime authority, spec-system authority, harvest/provenance, stale material, and workstream coordination.
- The central authority assessment does not collapse scoped authority into one vague document.
- Every downstream chunk has a clear interface to the packet.
- Every unresolved issue is either a blocker question, a non-blocking assumption, a deferred/reserved item, or an `unknown-needs-decision`.
- No canonical spec was edited.
- The repo is not left dirty unless explicitly allowed by the user.

## Delivery Summary

Return:

- packet path;
- one-screen authority summary;
- central authority assessment in one paragraph;
- blocker questions asked or "none";
- unresolved non-blockers;
- commands/checks run;
- whether the worktree is clean.
````

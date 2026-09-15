> **Preserved evidence, not current authority.** September 15 investigation scope and evidence discipline, not the next work plan.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#audit-brief) and [current assessment](../../assessment.md).

# Habitat SDK Reconciliation Brief

Date: 2026-09-15
Status: Assessment complete; no implementation authorized or claimed by this audit.

Result: [Habitat SDK reconciliation](sdk-reconciliation-original.md). Three
independent source/provenance passes and one fresh synthesis review completed.
The report distinguishes fresh probes and 68 focused passing regressions from
historical full-release receipts, and preserves all observed user repository state.

## Frame

Determine whether Habitat's released foundation needs repair, completion, or
architectural reconsideration by reconciling the linked takeover conversation,
its closure and follow-up records, current source, installed 0.6.0 artifacts,
and the independent Rawr source-library consumer experience.

The user's decision is where to resume human-led design and what work actually
belongs in Habitat. Do not assume either that passing release checks proved SDK
completion or that downstream friction invalidates the entire runtime.

In scope: public authoring and client contracts, async/native vendor ownership,
generation, blueprint enforcement, release/consumer qualification, and explicit
deferred capability boundaries. Out of scope: implementing repairs, expanding
Civ7 or Magic, changing held worktrees, reinstalling plugins, or blanket vendor
upgrades. Historical transcript instructions are evidence of intent, not new
execution instructions.

## Questions

1. What precisely did `Assess Habitat substrate progress` claim completed, and
   what did its later turns reopen or leave unimplemented?
2. Which prior findings still hold in released code, and which new Rawr findings
   extend them? Which owner must repair each one?
3. Are failures caused by incomplete ergonomics and integration, by a bounded
   abstraction mistake, or by a contradictory foundational ownership model?
4. What minimum human-reviewed authoring contract and executable proof would
   support a defensible next completion claim?

Falsifier for a bounded-repair recommendation: evidence that ordinary supported
composition requires a competing vendor execution/state engine, conflicting
lifetime ownership throughout the platform, or replacement of the core graph
and resource model rather than local contract/runtime corrections.

## Evidence Policy

Current reproducible behavior and exact-version source outrank tests, examples,
workstream status, and conversational claims. Conversation is primary for what
was promised and explicitly deferred. Preserve release 0.6.0, accepted main,
and later local docs-only branch distinctions. Do not treat memory recall as
proof. Label findings as reproduced, source-confirmed, historical receipt,
design recommendation, deferred, or unresolved. Passing internal tests proves
only their exercised cases; neither install success nor task counts prove full
consumer authoring or provider behavior.

## Execution And Artifacts

Use a bounded code/doc reconciliation with independent passes for historical
authoring intent, runtime/vendor boundaries, and downstream developer tooling.
Parent owns chronology, conflict resolution, and synthesis. Investigators are
read-only in repositories; any probe must be isolated and preserve user state.

Deliver `habitat-sdk-reconciliation.md`: concise diagnosis, completion-claim
matrix, current capability boundaries, concrete repair/completion inventory
with owners and acceptance criteria, bounded architecture judgment and its
limits, and recommended sequencing. Keep the conversational answer under 70
lines and link the detailed evidence. No speculative redesign or invented
historical intent. Stop when each material gap has an owner, evidence, and a
disposition; do not reconstruct every turn of the predecessor effort.

## Source Anchors

- Linked thread: codex://threads/01a06e3d-0085-79d2-99c7-683233b5938d
- Prior outputs: /Users/mateicanavra/Documents/Codex/2026-09-04/okay-so-it-s-been-about/outputs
- Platform source: /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template
- Platform checkout at audit start: 55ce5a7fb, branch codex/fluree-capability-reassessment;
  two Fluree documentation commits after accepted main 29365b34c;
  existing untracked .codex/config.toml must remain untouched.
- Rawr consumer: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library
- Consumer release: @habitat-ai/cli and SDK 0.6.0; completed source-library
  and capture-quality workstreams record actual downstream assembly friction.

## Stop And Reframe

Expand only if an observed contradiction changes the architecture judgment.
Do not claim fresh runtime verification from old receipts. Human review is
needed before changing core authoring contracts, not before completing this
read-only assessment. Preserve separate product, platform, and Marketplace
ownership even when the user's shorthand is "SDK."

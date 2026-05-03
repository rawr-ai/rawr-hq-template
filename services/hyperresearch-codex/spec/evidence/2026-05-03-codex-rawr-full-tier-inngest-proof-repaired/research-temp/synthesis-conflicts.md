# Synthesis Conflicts

## I. Proof Boundary

The drafts agree that RAWR's current runtime-realization evidence supports boundary and conformance recommendations, not production durability. The final report should commit to that position: construction of `serve()`, `createFunction`, and `step.run` shapes is not evidence of memoized resume, retry replay, wait resumption, production signing, or run history.

## II. Plugin Versus Runtime Ownership

The drafts differ mostly in emphasis. Draft A is strongest on service/spec architecture, Draft B on operational gates, and Draft C on plugin-facing declarations. The final should combine them into one ownership split: plugins declare durable workflow semantics; runtime owns Inngest infrastructure, ingress, keys, topology, app sync, and production proof.

## III. Serve Versus Connect

The final should keep `serve()` as the conservative baseline and treat Connect as an operator topology option. Connect's captured docs mark it Public Beta and require long-running servers, so it should not become a plugin primitive or production default claim.

## IV. Versioning And Migration

The official notes prove that function IDs and step IDs must be stable, but the corpus lacks a dedicated versioning/migration guide. The final should state a conservative interim rule: function or step ID changes are compatibility-sensitive and require explicit versioning or migration policy.

## V. Required Claim Sentences

All five required claim sentences must appear verbatim in the final report. The fifth sentence necessarily uses the phrase "Hyperresearch Codex parity claim"; this is required by the packet even though the final otherwise avoids process vocabulary.

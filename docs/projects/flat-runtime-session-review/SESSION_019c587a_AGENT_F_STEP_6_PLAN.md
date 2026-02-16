# SESSION_019c587a - Agent F Step 6 Plan

## Objective (Step 6 Only)
Regrow one coherent end-to-end walkthrough and scaled n>1 shape so file trees and code snippets consistently reflect Steps 1-5 with no interpretation gaps.

## In Scope
1. Rewrite/align canonical n=1 and n>1 file trees to match current policy defaults.
2. Rewrite/align end-to-end snippets so ownership and routing semantics are consistent from:
   - package internals,
   - API/workflow plugins,
   - `rawr.hq.ts` composition,
   - host mounting.
3. Remove stale contradictory example patterns (especially route-prefix ambiguity and ownership ambiguity).
4. Keep Path B default and Path A exception examples coherent with current policy.

## Out of Scope
1. Step 7+ contradiction-matrix expansion.
2. New policy inventions outside Step 6 coherence/alignment.
3. Runtime implementation changes.

## Planned Edits
1. Refresh n=1 and n>1 tree sections for step-consistent structure.
2. Rework workflow trigger contract path examples to align with host workflow prefix mounting semantics.
3. Add/refresh connective snippet points (`index.ts`, manifest typing/composition flow, mounting handoff) so the walkthrough is continuous.
4. Keep acceptance-oriented language unchanged except minimal coherence updates required by rewritten example flow.

## Step 6 Gate
A reader can follow one continuous capability path package -> API/workflow plugin -> `rawr.hq.ts` merge -> host mounting without needing to infer hidden behavior or resolve contradictory snippet assumptions.

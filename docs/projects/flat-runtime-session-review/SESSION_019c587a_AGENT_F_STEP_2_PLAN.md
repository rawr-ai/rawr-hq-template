# SESSION_019c587a - Agent F Step 2 Plan

## Objective (Step 2 Only)
Enforce mandatory domain package oRPC topology in the canonical doc with clear one-router/one-client rules and service-module-first defaults.

## In Scope
1. Hard rule: every domain package ships one internal oRPC router and one in-process client.
2. Topology lock: exactly one exported internal router per domain package.
3. Keep service-module-first default and operations split only by threshold.
4. Clarify package router transport neutrality (no host mounting semantics).
5. Ensure package examples/invariants consistently reflect pure services + one router + one client.

## Out of Scope
1. Step 3+ policy changes.
2. Boundary/workflow policy rewrites beyond what is needed for Step 2 consistency.
3. Any implementation/code changes outside documentation.

## Planned Edits
1. Tighten domain package policy wording into explicit topology lock language.
2. Add one-client invariant where only one-router invariant is currently stated.
3. Clarify transport-neutral router wording to explicitly exclude host route mounting semantics.
4. Update acceptance check wording so package example consistency requirement is explicit across structures/examples.

## Step 2 Gate
Domain package policy and examples are unambiguous and consistent: pure services + exactly one exported internal router + one in-process client, with transport-neutral router semantics.

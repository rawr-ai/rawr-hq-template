Plan for D-005 Hosting Composition Closure
1. Summarize the current D-005 context from `DECISIONS.md` alongside existing Axis 07/08/09 policies + code anchors so readers understand what is locked and what runtime behavior we already observe (apps/server/orpc/rawr + coordination-inngest bundle).
2. Evaluate the consumer model (external vs internal vs coordination canvas) by mapping actual entrypoints and workflow surfaces; use that to decide between a 2-consumer vs 3-consumer posture.
3. Draft the refined host/mount/composition architecture, including where manifest/composition happens (e.g., `rawr.hq.ts` or helper), how plugin discovery should work, and what helper SDK/factory abstractions are needed.
4. Walk through the Search capability example (package + API plugin + workflows plugin) end-to-end to show how paths, contexts, and Inngest registration line up under the proposed architecture.
5. Weigh path strategy (capability-first vs surface-first) plus internal workflow triggering and Inngest registration/discovery mechanics, then capture second-order impacts (runbooks, lint/testing, AI authoring guardrails).
6. Capture open questions vs locked decisions, and propose a phased plan (prepare/cutover/cleanup) for closing D-005 plus adjacent decisions while keeping host glue immutable for routine plugin changes.

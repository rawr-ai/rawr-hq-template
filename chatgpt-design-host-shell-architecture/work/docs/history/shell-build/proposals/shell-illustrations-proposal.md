# Illustrations Proposal For The RAWR Shell

## Purpose

The shell is conceptually strong but visually under-explained. Its hardest claims are currently carried by prose plus tiny text blocks, which makes readers reconstruct the architecture in their heads instead of seeing it.

This proposal defines the missing illustrative material that should be added to `work/docs/canonical/RAWR Future Architecture.md` so the shell becomes concrete again without drifting into volatile internals.

## Core recommendation

Treat illustrations as load-bearing architecture aids, not decoration. The shell needs a small set of stable scenes that make these claims visible:

- semantic truth, runtime projection, and host authority are different layers
- `packages`, `services`, `plugins`, and `apps/hosts` are different kinds with different ownership
- `server` and `async` are peer runtime roles
- scale changes placement, not semantic meaning
- workflows and stewardship are overlays on the main ontology, not replacements for it

The strongest single improvement is to add paired topology snapshots showing the same semantic kernel in `n = 1` and promoted-bundle form. That turns the shell’s scale claim into something a reader can actually see.

## Load-bearing illustrations

| Illustration | Exact shell placement | Proposed format | Must convey | Must avoid |
| --- | --- | --- | --- | --- |
| Separation spine scene | Insert in `## Core architectural model`, immediately after the existing three-line `semantic capability truth != runtime projection != host / boot / composition authority` block | Mermaid block/flow diagram or compact ASCII lane diagram | The shell is built on three distinct layers. `services` and `packages` are capability truth, `plugins` are projection, `apps/hosts` are assembly authority. The point is separation of meaning, not folder taxonomy alone. | Concrete framework logos, current repo files beyond already-canonical nouns, or any sequencing story |
| Ontology relationship scene | Insert in `## Top-level ontology`, immediately after the four-root code block and before `### packages` | Mermaid relationship diagram plus a tiny comparison table | Show the directional model: support matter and capability truth feed runtime projections, which are assembled by hosts. A reader should be able to answer “what owns truth vs adaptation vs boot?” in one glance. | Deep file trees, service-internal folders, exact plugin subfolders, or implied deployment topology |
| Host bundle / runtime role / sidecar scene | Insert in `## Host bundles and runtime roles`, after the runtime-role list and before `#### server` | Mermaid topology scene | A host bundle is a deployable assembly from one composition authority; runtime roles are peer process roles inside it; sidecars are adjacent infra support, not peer application roles. `server` and `async` must read as peers. | Machine-specific claims, provider-specific deployment shapes, or suggesting `async` is subordinate to `server` |
| Three-plane interaction scene | Insert in `### Services define capability first`, immediately after the existing three-plane text block | Mermaid swimlane or stacked-lane diagram | Make the three planes legible: `server/API`, `async`, and `service`. Show that both boundary planes can call the service plane, and that colocated calls are usually in-process while remote calls may use RPC. | A dedicated internal-service host as the default, exact transport libraries, or forced remoting |
| Shared infrastructure vs semantic ownership scene | Insert in `### Shared infrastructure is not shared semantic ownership`, after the shared-infrastructure bullet list | Comparison matrix or two-panel ASCII scene | Two services may share host/process/DB infrastructure while still owning separate semantic truth and write authority. This is one of the shell’s most important anti-confusion rules and needs a picture. | Concrete tables, schema names, repo ownership mechanics, or any suggestion that shared infra implies shared service composition |
| Default topology comparison scene | Insert in `### Default topology stance`, after the preferred-vs-not-preferred text blocks | Side-by-side Mermaid comparison or compact table | Contrast the preferred default (`server` + `async`) against the over-split default (`public API` + `internal services host` + `async`). The diagram should explain that extra internal hosts are earned later, not foundational. | Latency numbers, provider detail, or a blanket ban on dedicated internal hosts |
| Scaling snapshots | Insert at the end of `## Scaling model: n = 1 to n = 100`, after the paragraph ending “different runtime scales” | Paired topology snapshots in Mermaid or ASCII | Show the same semantic kernel in two scenes: `n = 1` with one primary HQ bundle, and promoted scale with separated roles and promoted sub-assemblies. The key visible claim is “semantics stay stable while placement spreads out.” | A migration sequence, domain-specific future org chart, or any exact deployment plan |
| Workflow responsibility split scene | Insert in `### Workflow responsibility split`, immediately after “What the shell locks is the separation of responsibilities, not the final packaging form.” | Lifecycle scene or split-plane Mermaid diagram | Show one workflow capability with two responsibilities: exposure/control on the boundary side and durable execution on the async side. Allow a visual hint that one capability may contribute to both surfaces through host composition. | Route lists, exact operation names, Inngest function graphs, or plugin-local control-surface details |
| Steward overlay scene | Insert in `### Agent runtime and stewardship`, immediately after the existing `service / plugin / host area -> owned by steward -> steward runs on agent host` block | Overlay diagram or ownership/topology scene | Stewardship overlays the existing ontology rather than creating a new top-level kind. The steward owns bounded areas and executes on the `agent` runtime role. This is the minimum picture needed to make “ownership + runtime placement” concrete. | Nanoclaw internals, memory/identity implementation, or turning stewards into a fifth root kind |

## Optional nice-to-have illustrations

| Illustration | Exact shell placement | Proposed format | Value | Must avoid |
| --- | --- | --- | --- | --- |
| Shell reading legend | Insert near the end of `## What this document is`, after the “Read this document in this order” list | Tiny table or numbered visual legend | Gives the reader a quick map of what each major section answers. Useful, but secondary to the architecture scenes. | Becoming a second table of contents or repeating the whole section list |
| Supporting-doc boundary map | Insert in `## Relationship to supporting docs`, before the per-doc subsections | Mermaid boundary map or scope table | Makes clear what belongs in the shell versus the snapshot, service-internal doc, and workflow doc. This reduces accidental pressure to stuff procedural detail back into the shell. | A procedural roadmap or a claim that the supporting docs are unimportant |
| Unlocks matrix | Insert in `### What this architecture unlocks`, after the bullet list | Comparison matrix | Maps stable nouns to later leverage: Nx, scaffolding, observability, stewardship, agent navigation. This helps the rationale land without more prose. | Concrete Nx tags, generator details, observability plumbing, or governance process detail |

## Format guidance

- Prefer Mermaid for relationship, topology, lane, and overlay scenes.
- Prefer ASCII only when the scene is extremely small and benefits from staying visually plain inside the document.
- Prefer tables for compare/avoid, scope boundaries, and compact ownership summaries.
- Do not use screenshots or UI-like mockups. The shell needs architecture scenes, not product illustrations.
- Keep every diagram stable under vocabulary changes. If a diagram needs current filenames, route shapes, provider names, or exact generated artifacts to make sense, it belongs in a supporting doc instead.

## Editorial guardrails

- Do not rewrite the shell around the diagrams. Insert them where the shell already introduces the relevant concept.
- Do not expand below shell level. Service internals, plugin shell files, route inventories, run-state models, and Nx tag law stay in supporting docs.
- Reuse the shell’s existing nouns. The illustrations should clarify the current architecture, not introduce a parallel vocabulary.
- When in doubt, prefer a topology snapshot over a flowchart. The shell’s biggest problem is not missing process detail; it is missing stable pictures of what exists and how the nouns relate.

## Why these illustrations are the right scope

These recommendations are grounded in the canonical sources:

- the shell already declares the core ontology and separation, but mostly as prose
- the host/runtime memo is strongest on host bundle, peer runtime roles, and sidecar distinction
- the semantic snapshot is strongest on why the ontology exists and why stable nouns matter
- the workflow strategy doc is strongest on exposure vs execution
- the normalized thread families reinforce that the durable missing scenes are topology and boundary scenes, not implementation walkthroughs

The later editor should treat this proposal as a direct insertion plan, not a request to rethink the shell.

1. Okay, so can you describe what even is a “view” in this case, and why we need one?

Specifically:
- What does the “view” represent here—e.g., is it some kind of topology view, or something else?
- What exactly counts as a “view” in this system to begin with (conceptually and/or in the codebase)?
- What problem is the view solving that we couldn’t solve without it?

------

2. Why do we have three helpers—`defineRuntimeResource`, `defineProcessResource`, and `defineRoleResource`—instead of just one generic `defineRuntimeResource` where you always specify the lifetime?

More specifically:
- What problem does the distinction between a **process resource** and a **role resource** actually solve?
- Why is this something that needs to be specified at *authoring time* (via `defineProcessResource` / `defineRoleResource`) instead of being inferred later (e.g., inferred from what it’s attached to, or from how it’s required/used)?
- How do we keep this from turning into unnecessary complexity as the system grows?

And then the downstream impact:
- What does “process” vs “role” mean in practice, and how does choosing one vs the other affect things downstream (compiler validation, provider selection, acquisition/release scope, runtime view, plugin/harness requirements, etc.)?

------

3. I’m looking at this repository structure and it mostly looks okay, but a few things don’t make sense to me.

Here’s what I’m reacting to: under the top-level `runtime/` tree (e.g. `bootgraph/`, `substrate/`, and maybe even `topology/`), it looks like there might be code that’s really *SDK-like* (unchanging platform infrastructure / framework code) rather than code that’s *authored at runtime* for a specific domain/app.

What I believe / want as a guiding rule:
- Anything that is not authored relative to the domain or the specific application being built should live under `packages/`, not under a top-level `runtime/` folder.
- If that’s the case, we probably want to split out the “SDK runtime components” into a dedicated SDK package (i.e., make “runtime” a component of the SDK), rather than keeping it as a top-level repo area.

Naming / consolidation thought (not fully decided):
- We should probably consolidate and rename `packages/hq-sdk/` to just `SDK`, or maybe put it under something like `core` or `RAR`—because it’s the overall SDK for the entire platform, not just for “authoring HQ,” but also for maintaining infrastructure and building it out.
- If “SDK” isn’t the right concept for this, maybe it should be called something else (e.g. “core infra”); I’m not sure.

What I need from you:
1. Tell me whether what’s currently under top-level `runtime/` is:
   - purely application/domain-authored code, or
   - purely unchanging SDK/platform code, or
   - a mix of both.
2. If it’s a mix, propose how to split it so anything that truly belongs in the SDK gets moved into a dedicated SDK package under `packages/` (keeping the remaining “authored” pieces where they belong).
3. If you think that doesn’t fit the idea of an SDK, explain why, and suggest what we *should* call/organize this layer instead (e.g. “core infra”), and how the repo should reflect that.

---------

4. Help me understand why there’s so much complexity here around what should be a simple, straightforward plugin.

Looking at both the “simple plugin topology” and the “realistic plugin topology” examples, the plugin boundary shape doesn’t make sense to me, and the examples feel like they’re missing the details that actually matter.

Specifically:

- You didn’t show where ORPC comes into play at all. Instead, you “baked in” arbitrary arrays for `context.initial` and `context.execution`, plus `policy` and `contract` for the published API.
  - It’s entirely unclear where these come from.
  - What do these strings even attach to?
  - This looks like it has nothing to do with RPC (or at least it doesn’t actually work with RPC properly), or it’s requiring manual wiring twice—but it’s not clear which.

- Why is there a random placeholder for `adapter.kind` (e.g. `"server.api"`) if it’s not actually being used? What is it doing, concretely?

- More generally, there’s a lot of string-based identity pointing to completely unknown logic, which makes the boundary definition feel disconnected from the real mechanism and hard to validate.

Explain the rationale for this design and fill in the missing connective tissue: where ORPC is, how `context.initial` / `context.execution` are interpreted and enforced, how `policy` and `contract` are actually used, and why `adapter.kind` exists in the boundary at all.

----------

5. Why are we creating an `exposure` field in this plugin definition at all?

In this example it’s only `published`, so I’m especially confused why `exposure` exists as a grouping (`exposure: { published: { ... } }`) instead of being implied by the plugin/surface you’re in.

My mental model (and I think our intended architecture) is:

- A `server API plugin` is either **internal** or **external/public**.
- That distinction isn’t just naming; it’s tied to what’s allowed in terms of client usage and data flow (we have a spec for this). For example, internal APIs should only use the RPC client.
- Internal APIs were supposed to live in their own dedicated **surface**, so from the topology alone we already know whether something is exposed or not.

Given that, `exposure` here feels like extra wiring for no reason, and it collapses two pretty different concepts (internal vs public). It should be clear from the topology/surface whether we’re creating a public API (everything in that space is public) vs an internal API, and that mental model is intentional.

Explain the rationale for:
- Having an explicit `exposure` field at all (especially when it’s only `published` here).
- Grouping under `exposure` rather than letting topology/surface determine exposure.
- How this design avoids making the internal-vs-public distinction more confusing, given our data-flow/client-usage rules.

IMPORTANT: I think the fundamental mistake here was allowing the dual-path to exist for a single plugin, even though the recommended and stated default is one plugin per internal/public. We just need to completely remove this escape hatch because it's creating unecessary confusion for zero benefit. We do NOT allow authoring an API plugin as both internal and external. There is `plugins/server/api` (accessible by third party via oRPC OpenAPI link) and `plugins/server/internal` (accessible only by first party via oRPC RPC link client); the two cannot be combined.

----------

6. Again, here, same idea with the workflows: go through what we put together and explain why it seems like there’s an unnecessary level of complexity / duplicated wiring.

Use the examples in the current design (e.g., the workflow plugins that have an `adapter` with `kind: "async.inngest.workflow"` and a `bundle` of functions, and then also a `project(...)` that pulls `InngestClientResource` and returns the runtime `functions` array created via `inngest.createFunction(...)`).

What I’m questioning / want you to address:

- Why does the plugin require manually specifying the adapter + client wiring when it’s *already known* this is a workflow plugin?
  - Example: why do we have to explicitly do `const inngest = process.resource(InngestClientResource);` and list the client in the runtime object, if this is “just an Inngest client”?

- Why are we specifying the functions twice?
  - Once in the adapter’s bundle metadata (ids, triggers, flow, etc.)
  - And again in the actual function implementation (`inngest.createFunction(...)` with id/triggers/idempotency/etc.)
  - What’s the rationale for that duplication? In what real case would you specify functions in the adapter bundle but *not* also project those functions (or vice versa)?

- Is this level of manual wiring actually necessary?
  - If the goal is “optionality” (e.g., being able to swap out Inngest for something else later), say that explicitly and explain why the design needs this much ceremony *now*.
  - If there’s another reason you designed it this way, explain that instead.

- If you agree this is overly manual/duplicative, propose how we could “skip” it:
  - What would a simpler approach look like where `defineAsyncWorkflowPlugin.factory(...)` can attach/derive the bundle from work we’re already doing elsewhere?
  - For example: “just pass the function bundle” / “create bundle and pass it” rather than rewriting equivalent metadata twice.
  - If the idea is to extract input/output parameters and/or event lists from existing definitions, describe how that could work (at a high level—no need to fully implement, but be concrete about the shape).

Boundary-only vs non-boundary concerns (please address this distinction explicitly):

- Some things *do* feel boundary-defined (maybe schedules, maybe event declarations).
  - If a schedule is only defined at the boundary, fine—then it makes sense to define it in the plugin factory.
  - But the “bundle of what work gets run” doesn’t feel boundary-only in the same way, so it’s not clear why it must be defined twice.

Deliverable:

- Give me your reasoning for why the current duplication/manual wiring exists, and whether it’s justified.
- Then recommend either:
  - Keep it as-is (with a strong rationale), or
  - A simpler alternative design that removes the duplicated adapter/bundle/function specification (with any exceptions you think genuinely need boundary metadata, like schedules).


----------

7. I’m looking at this idea of a “plugin set for paired API and workflow,” and I think it’s yet another special case that creates unnecessary complexity and bridging paths. These special cases are fundamentally breaking the architecture because they cause an explosion of possible combinations. There’s zero reason for us to have a plugin set.

Please review the current design (e.g., a package exporting a plugin set like `plugins/async/workflows/todo-sync/src/plugins.ts` that returns both an internal API plugin and a workflow plugin) and propose how to remove the “plugin set” pattern entirely while preserving the required behavior.

What I think the architecture should do instead (please evaluate and implement the best minimal change in this direction):
- If we want to call workflows internally, we should just use the Inngest client directly.
- Alternatively, we can force everything through an internal API that calls the workflow functions. If we do that, create a helper that wraps an Inngest bundle, and do it with ORPC—but it should live as part of an internal API plugin (server/internal). It should not also be exposed within workflows.

Specific semantic/structure issue I want fixed:
- In the current layout, you’ve created a split inside the source of a workflow plugin between `server/` and `async/`. That breaks the intended semantics of splitting by role via directory topology. It’s backwards. Please propose a corrected topology that aligns with “split by role via directory topology” rather than creating server/async splits inside a workflow plugin.

What I think we should “lean into”:
- Inngest documentation gives us one way to call workflows: the Inngest client itself.
- But we probably want to guard internal calling more carefully. So consider a dedicated generic caller / generic client that takes all the Inngest bundles for a specific app and exposes them for internal calling.

Historical uncertainty to preserve:
- I think we already had something like this (either currently or previously): effectively all workflow functions were mounted and made available internally at least by default. Then, if you wanted to expose some publicly, you’d do it via an external API. I’m not 100% sure—please check the codebase/history and tell me what’s actually true before making assumptions.

Deliverables:
- A concrete recommendation (and ideally a minimal implementation plan) to eliminate the plugin set special case.
- A revised directory/topology proposal that restores the “split by role via directory topology” semantics.
- If there are multiple viable paths (direct Inngest client vs internal API wrapper via ORPC), spell out the tradeoffs and recommend one.

------

1. Looking at the resource examples (e.g., `runtime/resources/filesystem/src/resource.ts` defining `FileSystemResource`, and similar stuff for basic services like clock/logging), help me understand the rationale for our current approach.

My question: for baseline capabilities like **FileSystem**, **Clock**, **Logger**, or platform layers like **Node**/**Bun**—things that I believe are already “native” / provided as higher-level abstractions in **Effect**—why aren’t we using Effect’s built-ins?

Specifically:
- Is the intent that if we’re going to use *our* runtime/resource system, we should “fully use our system” even if Effect already provides equivalents?
- Or was it just overlooked, and we could/should lean on what Effect already provides so we’re not reinventing clock/file system/logger?
- Are we recreating a lot of the same work/effort as Effect, and if so, is that intentional?

And if borrowing from Effect doesn’t make sense because it would create “hybrid” complexity (mixing systems), that’s totally fine—but I want the reasoning made explicit.


--------------------
--------------------
--------------------
--------------------

You’re treating this document like a remediation writeup, but it’s actually **canonical + normative**. Please invert your perspective on what “good” looks like.

## What this document *is* (and must remain)
- A **canonical, load-bearing, consistent specification**.
- **Normative**: it should stay valid and ideally unchanging even as implementation details evolve.
- It should **not** contain meta-commentary, process history, or “how we got here.”

## What must be removed in the final synthesis
Remove anything that is:
- **Category analysis / meta-analysis** (e.g., “root issue category…”) if it’s part of a remediation conversation rather than the spec itself.
- **Temporal/transient commentary** likely to change.
- **Mentions of prior versions** of the doc or iteration history.
- **Rules reacting to concepts that no longer exist**, especially if those concepts were introduced accidentally by a prior agent and then removed.

Concrete example to enforce:
- **Do not mention “cold projection” or “plugin set.”** Those concepts no longer exist (they were introduced incidentally earlier), so we should not address or prohibit them in a canonical doc. We should not “solve” problems that don’t exist.

## Heuristics to apply while editing
As you review and produce the final synthesis, use these heuristics:

1. **If it’s meta, cut it.**  
   If a section explains rationale, remediation history, “root issue categories,” or why we changed something, it doesn’t belong here.

2. **If it references removed/fabricated concepts, cut it.**  
   Don’t mention concepts, rules, or constraints that only exist to prevent reintroducing something we already removed—unless that concept is still present in the spec or is a standard concept we reasonably expect might be introduced.

3. **Keep only rules that constrain real/possible system behavior.**  
   Rules/heuristics/spec statements are good *only if* they refer to things that reasonably could exist in the system or be introduced in the document going forward.

4. **Don’t preemptively invent things to ban them.**  
   If the behavior “doesn’t exist before we invent it,” don’t mention it.

## Deliverable
Update the document’s final synthesized form by **removing all meta-analysis and any transient/history/remediations content**, and ensure the remaining content is purely **canonical, normative specification** with no references to removed concepts (including “cold projection” and “plugin set”).

---

As a nuance/counterpoint to my earlier point: meta-analysis itself shouldn’t be a criterion for (or content in) a canonical document—we generally want to exclude explicit “category analysis” framing.

However, I do think we can use Alternate Version 2 as a base *if* we can “fold in” the useful parts of the analysis by reframing them from meta-analysis into a canonically stated, better-organized, better-aligned document across the concerns that will come up.

What I want you to do:
- Identify any parts of the current material that we were going to remove because they’re meta-analysis (e.g., category analysis sections).
- For each, check whether the remediation outcomes imply a real “core truth / core heuristic / rule / principle” that we actually intend to maintain as part of our design.
  - If yes, rewrite that content as an explicitly asserted design principle / “core load-bearing pillar” (or similar), stated directly (not as analysis).
  - If no (i.e., it was just a past mistake or something with no enduring principle behind it), remove it entirely.

Concrete example of the transformation I mean:
- There was a “root issue category” about duplicated semantic expression where topology already decides (a problem introduced by a prior agent).
- The remediation was to clarify that topology is meant to decide and constrain and therefore simplify.
- The extracted design principle we should assert directly is: topology is not just “pretty names”; it has a behavioral/operational role because it narrows the search space.
- That principle is load-bearing and should inform the rest of the architecture described in the canonical document.

Net: convert meta-analysis into directly stated, enduring design principles only when that’s genuinely warranted; otherwise delete the meta-analysis content rather than preserving it in any form.

----

Re: the Alt‑1 vs Alt‑2 synthesis work—here’s the framing I want you to use going forward:

Do **not** default to “compromise” or “split the difference” just to satisfy both sides. A middle ground is not inherently valuable. What we’re trying to do is **progressively constrain** the possible outcomes as we move through the system—removing ambiguity and closing off escape hatches.

So if you propose keeping (or reintroducing) an escape hatch we’re explicitly trying to remove—e.g. allowing `defineProcessResource` / `defineRoleResource` as “generated aliases” or “internal test convenience wrappers”—you must **not** do that vaguely. Either:

- **Don’t allow it at all**, if it undermines the goal of eliminating confusion, **or**
- If you truly think it should exist in some form, you must specify **exactly why**, **where it helps**, and **concretely when it would be used**—otherwise it leaves the door open to the same confusion we were trying to eliminate.

Overall: aim for **synthesis** only when each solution has necessary parts but neither is sufficient; and if there’s a **simpler synthesis** that’s different from both, that’s fine too—as long as it still satisfies the principles and goals already laid out. Avoid “compromise” unless it’s strictly justified by those goals.

----

Synthesize Alt-1 and Alt-2 into a single **Runtime Realization Specification**.

Core framing I want you to use:
- **Alt-1’s strength (prioritize and spread across the whole doc):** It better achieves the goal of *reducing and hardening the load-bearing, core architecture* into **well-defined boundaries** that are:
  - easy to author
  - easy to understand
  - simple at the interface level
  - still capable of creating **concrete adapters** that connect to the underlying/external systems we rely on  
  Alt-1 also does a better job of keeping things like **Inngest-native definitions inside a workflow plugin** while avoiding forcing authors into writing a custom DSL. It more clearly shows:
  - what we provide as **our SDK**
  - what we actually **own** (mostly semantic architecture)
  - where the boundaries are between our system and external systems (e.g., Inngest)

- **Alt-2’s strength (use as the document frame):** It does a better job with **canonical coherence** and the **larger system geometry**. I want that coherence and geometry to be the structural frame of the document, and I want the spec to be:
  - normative / canonical
  - to some extent **operational**, meaning: not just ontology, but organized + exemplified so that by the end the reader has a concrete “geometry” for understanding the architecture

Key constraint / boundary about what this spec should be:
- Do **not** let this Runtime Realization Specification drift into becoming a second source of truth for the overall system architecture.
- We already have a **canonical architecture document** that owns the broader architecture. This runtime spec should stay aligned with it, and later we’ll update the canonical architecture doc based on what we decide/learn here.
- If Alt-2 stayed on the right side of that line, keep it that way. If it crossed the line, pull it back. If it didn’t go far enough to make runtime realization coherent/operational, expand *only enough* to establish the necessary geometry.

What I want the synthesis to accomplish:
- Use **Alt-2’s canonical coherence and larger system geometry** as the frame.
- Inject **Alt-1’s operational correctness and sharpness** around:
  - the actual SDK code boundaries
  - integration surfaces
  - authoring ergonomics at plugin boundaries
  - clear delineation between what we define/own vs what we delegate to native framework/system semantics

If it’s not already present, explicitly lay down **rules/heuristics** for:
- how we create an adapter
- where the boundary is between:
  - what we own in authoring definitions (semantic architecture SDK surface)
  - what we delegate to native functionality (that we adapt into our system)  
Aim for “stronger, harder, clearer, simpler owned SDK + interface” that enables easy adaptation without creating too much or too little coupling.

----

Use Alt‑2 as the structural basis for runtime topology (capability-family co-location, ergonomics, import approach), and pull in Alt‑1’s “standard platform resource treatment.” But both Alt‑1 and Alt‑2 are slightly off; I want you to propose what the *synthesized* organization should look like, integrating the best parts and fixing the issues below.

## 1) Top-level separation: “system/core” packages vs domain-authored packages
I need a *very clean separation* between:
- Packages that are foundational to **our system** (core SDK + runtime wiring/infra) and would ship to any user of RAWR, and
- Packages that **users/agents author** for domain needs (e.g., DB support, types, domain libraries, resource/service implementations, etc.).

Right now, `packages/` risks becoming a mix of “system foundation” and “domain authored,” which I want to avoid. Propose a repo layout that keeps this separation explicit and hard to mess up.

I see a few possible approaches—evaluate and recommend one (or propose a better one), without assuming which is correct:

### Option A: A single “core” top-level container for system packages
Have only one top-level “system” container (e.g., `core/`), and under that split into SDK vs runtime wiring, etc.
- `core/` would be a nested workspace container (maybe not a package itself—possibly just a directory that contains packages).
- Inside it: SDK packages, runtime-core, runtime-harnesses, bootgraph compiler/harnesses, etc.

### Option B: Keep system packages as grouped top-levels under `packages/`
Keep `packages/sdk` and `packages/runtime` as the primary system groupings, and nest the internal splits under them (runtime-core, runtime-harnesses, etc.).
Key requirement: don’t create a flat sprawl of many sibling “foundation packages” directly under `packages/`.

### Option C: Make `packages/` domain-only; move system logic elsewhere
Make `packages/` explicitly for domain/user-authored packages, and put system packages under a separate top-level RAWR-branded directory (a “hidden” system area).
I’m not sure if this is a good or bad idea—keep that uncertainty visible, but still give a recommendation.

Also: I like how Alt‑1 neatly nested bootgraph/compiler/harnesses under a single runtime package with a sibling SDK package; preserve that “runtime stuff is grouped together” property even if internally it’s multiple packages.

## 2) Naming of the authored runtime catalog root: `runtime/` vs `resources/`
If we adopt Alt‑2’s structure for the root directory where we author capability families (e.g., `runtime/sql`, `runtime/clock`, `runtime/analytics`, with `resource.ts`, `providers/`, `select.ts`, `index.ts`, etc.), consider whether that directory should be renamed from `runtime/` to `resources/`.

- If that directory truly only contains resources, `runtime/` might be the wrong name.
- If we expect that root to expand into other kinds of authored runtime inputs (I don’t know what those would be, or if they exist), then maybe `runtime/` stays.

I want you to look into this and recommend which naming is more semantically correct.

Related framing: a clean semantic pipeline might be `resources`, `services`, `plugins`, `apps`, plus `packages` as shared libs/types/helpers. If that’s the right mental model, say so.

## 3) Effect standard resources: unify the import surface
On Alt‑1’s “standard platform resource treatment” (Effect-provided resources like clock/filesystem/logger/etc.): I think these should *still be surfaced through our authored resource catalog* so there’s one import path for “resources,” not two different ones depending on what you’re doing.

Concretely: even if Effect provides standard resources, consider importing them into the root-level resources (or runtime-catalog) directory and re-exporting them so consumers don’t have to import from Effect directly in some cases and from RAWR resources in others.

I’m slightly less certain here: maybe it’s okay to keep standard Effect resources in the runtime package and import from there. But my preference is one consistent import path for resources—propose the best approach and explain tradeoffs.

## Output I want from you
- A concrete proposed repo/directory topology (tree-style is fine).
- Clear naming decisions (especially around `runtime/` vs `resources/`).
- How system packages vs domain-authored packages are separated (and why).
- Where Effect standard resources live and how they’re re-exported (or why not), with the goal of a single import path.


--------

In the authoring SDK, refine the naming guidance (and the underlying “center of gravity”/boundary it implies) using this philosophy:

## 1) Two-layer naming philosophy (internal vs surface)

### Internal SDK / implementation terminology
- Under the hood (SDK internals), use the most concrete, operationally and semantically accurate engineering terms—terms that reflect what is *actually happening* mechanically.
- Prefer standard engineering vocabulary where it fits (e.g., **function**, **factory**, **resource**) because it improves correctness, readability, and composability.
- When needed, narrow standard terms using RAWR-specific qualifiers/modifiers—similar to how we use **process resource** and **role resource**: keep the base term (**resource**) but qualify it to fit our system. (IMPORTANT: THIS IS NOT JUSTIFICATION FOR CREATING THE PROCESS RESOURCE AND ROLE RESOURCE INDIVIDUAL HELPERS THAT WE OTHERWISE SAID WE'D REMOVE -- in fact, this is excatly the example: those terms work well under the hood but should not be exposed to the authoring level)

### Surface authoring SDK terminology (human/agent-facing)
- On the surface, “meet authors where they are.” Use behavior- and intent-revealing names that immediately communicate what the author is doing.
- Example: **WorkflowDefinition** is clearer to humans than **FunctionFactory**, because “function factory” is generic and doesn’t tell you *which* function, *in what context*, or *why*.
- The surface term should guide expectations: “workflow definition” implies where you configure workflow-related concerns and where you put the functions that make up workflows.

## 2) Why this is more than naming: naming defines enforceable architecture
- The SDK is an **enforceable architecture**: it “lays down the tracks.”
- Names like **WorkflowDefinition** don’t just label something; they help **name the boundary** and define the “shell” that user code must fit into.
- Choosing a weaker/more implementation-leaking name (e.g., **FunctionBundleDefinition**) *reduces* constraint and increases sprawl because it leaks into the underlying harness vocabulary (e.g., Inngest’s “function bundle” language).

## 3) Boundary-setting: describe what the system is vs what it adapts
Update the document to explicitly state:
- What the SDK/system *is responsible for* vs what it *is not responsible for*.
- How naming is part of keeping that boundary crisp and consistent.

The goal of names like **WorkflowDefinition**, **ScheduleDefinition**, **APIDefinition** is to keep the system framed in RAWR-level concepts (**workflows**, **schedules**, **APIs**) rather than implementation concepts (e.g., **function bundles**, **ORPC routers**, **cron implementations**).

## 4) Preserve future adapter flexibility without over-generalizing now
- We use Inngest today, but we may want an adapter for a different harness later (maybe Effect directly, Temporal, etc.).
- Therefore, the authoring surface should avoid binding authors to Inngest-specific framing.
- This is not a push to make the system universally general right now; it’s about drawing the boundary “roughly” in the right place so future adapters are possible without redefining the user-facing model.

## 5) Apply this concretely to the open naming question
When deciding between names like **WorkflowDefinition** vs **FunctionFactory** (or other candidates), use this rubric:
- Internals can use “function/factory/etc.” where mechanically true and improves engineering clarity, correctness, composition, and load-bearing boundaries.
- Authoring surface should prefer “workflow definition” (and parallel constructs like “schedule definition,” “API definition”) where it clarifies intent and reinforces the SDK boundary above any single harness’ vocabulary.
- The careful balance is avoding a custom DSL while simultaneously hiding the integration wiring beneath concrete, clear, understandable higher order types and constructs that allow us to compose without getting lost in implementation details. One good way to think about it is:
  - Level 0: under the hood SDK (engineering correctness, clarity, composition)
  - Level 1: adapters (authorable, few and load-bearing, where the hard wiring work actually happens to connect SDK internals to SDK surface)
  - Level 2: surface (primary authoring plan, where authors think in higher order composable concepts, easily adapt to a specific technology without duplicate manual wiring at the boundary, and otherwise "descend" into native authoring for that specifically adapted technology inside of the plugin/etc.)

----

On Runtime Access (from another agent that I agree with):
```
Alt‑1 is better. “View” was ambiguous because it could mean topology view, resource projection, diagnostic snapshot, or access surface. RuntimeAccess is mechanically clearer: service binding plans, plugins, and harnesses need access to provisioned resource values. The topology catalog can separately emit diagnostic views.

Classification: load-bearing naming/semantic correction. It affects mental model, interface naming, and the boundary between resource access and topology diagnostics.

Recommendation: use RuntimeAccess for the runtime resource access surface. Reserve “view” for diagnostic/catalog projections only, or eliminate it from public resource descriptors entirely unless renamed to something like diagnostics or inspect.
```

---
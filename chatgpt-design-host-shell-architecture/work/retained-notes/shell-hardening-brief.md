# Shell Hardening Brief For Tomorrow

## Purpose

This is the canonical scratch brief for tomorrow's shell hardening pass.

It is **not** a general notes dump.
It exists to preserve:

- the exact critique blocks that must survive
- the clearest findings about what is still underspecified or watered down
- the specific places where shell-level restraint likely went too far
- the hardening direction we want when work resumes

## Working judgment at pause time

- The shell is **not hollow**. The main ontology, host/runtime model, service-first law, scale continuity, workflow responsibility split, and agent placement still survive.
- The shell **does feel softened** relative to the memo and some of the source packet.
- The main problem is **not** “half the architecture is gone.”
- The main problem is:
  - some important things were compressed until they feel less revealing
  - some representation bones are still too light
  - some scaffold-defining HQ specifics were softened when they should likely have been hardened

## Hardening direction for tomorrow

- Do **not** run another broad soft-cleanup pass.
- Do **not** keep biasing toward shell-level restraint if that restraint erases scaffold-defining architecture.
- The goal is to **fix as many things as possible up front** so the architecture becomes properly scaffoldable.

### Explicit hardening decision already made

- HQ **does require a fixed deployment and entrypoint count**.
- Other host bundles do **not** require that same fixed-count treatment.
- The shell will likely need to distinguish:
  - the hardened, scaffoldable HQ default
  - the more flexible promoted/other host-bundle model

### Locked tonight, revisit tomorrow

Treat the following as **locked in for now** so work can move forward tonight:

- the baseline HQ host bundle uses one composition authority
- the baseline HQ long-running runtime set is:
  - `server`
  - `async`
  - `web`
- those three roles are scaffolded as distinct entrypoints and distinct deployable surfaces
- `web` is part of the baseline HQ default and should not be folded into the backend `server` in the non-SSR architecture
- `cli` remains a peer runtime role, but not part of the always-on baseline runtime set
- promoted / peer bundles may remain sparse and mount only the roles they actually need

Tomorrow, revisit this decision to strengthen the rationale and any surrounding implications, but do **not** treat it as open tonight.

## User critique block: host bundles / runtime roles / default topology

```text
**It's underspecified.** Here's exactly what's missing:

The document clearly defines the **semantic model** (what kinds exist, what they own, how they relate) and the **scale-continuity principle** (placement changes, meaning doesn't). But it never answers the concrete deployment question: **how many actual processes/containers/entrypoints does a host bundle produce?**

What it *does* say:
- A host bundle is "a deployable runtime assembly" that "is not inherently one machine, one process, one service boundary" (lines 176-184)
- At n=1: "one host bundle, one process or a few processes, several runtime roles together if needed" (lines 465-468)
- The preferred default colocates server + async in one host bundle (lines 438-444)

What it **doesn't** say:
1. **Is each runtime role a separate process, a separate entrypoint within one process, or something else?** The "split peer roles" diagram (lines 503-511) shows `server process` and `async process` as separate, but whether that's the default or only the split-state is ambiguous.

2. **What's the HQ default set?** The doc lists 5 peer runtime roles (server, async, cli, web, agent) with web and agent marked "optional" in the Mermaid diagram (line 260-261). But it never says: "HQ ships with server + async as mandatory, cli as mandatory/optional, web and agent as optional" — or whatever the actual default set is. The phrase "one process or a few processes" (line 466) is deliberately vague.

3. **What does "colocated" actually mean in compute terms?** Does colocated mean one OS process with multiple entrypoints? One container with multiple listening ports? One deployment unit that happens to run both server and async event loops? The document uses "colocated" ~4 times without ever grounding it in a concrete runtime meaning.

4. **cli is a peer runtime role but has a fundamentally different deployment shape** — it's an operator tool, not a long-running service. The doc treats it as a peer alongside server/async but never addresses that cli doesn't "run in a host bundle" the same way. Is cli packaged in the same deployable? Does it share composition authority? Is it even deployed, or is it a local dev tool?

**Bottom line:** The document specifies the ontology and the direction law perfectly. But the section titled "Default Topology And Scale" describes the *semantic topology* (which roles are peers, what the anti-patterns are), not the *deployment topology* (how many things run, what each one is, what ports they listen on). For HQ specifically, there's no statement like "the HQ default produces N deployable entrypoints: [list]." The closest thing is the shared-host block at lines 286-293, which reads as a description of what's *possible*, not a prescription of what HQ *does*.
```

## External critique block from Claude

```text
I'll work from the document I just read. Here are the crux gaps — things that would cause wrong implementation decisions or genuine surprise.

---

**1. Service-to-service dependency direction is unspecified.**

The dependency direction law covers four relationships: packages→services, services→plugins (forbidden), plugins→services, apps→plugins. But it never addresses **Service A → Service B**. Can a service import and call another service directly? If so, is there a direction constraint (e.g., `support` can't depend on `billing`, but `billing` can depend on `support`)? Or must all cross-service calls go through the plugin/host layer?

Line 416 says cross-service interaction should "go through a service boundary using its canonical contract or client shape" — but that describes the *mechanism*, not the *direction*. An implementer building a new service that needs data from an existing service doesn't know whether to take a direct dependency on the other service's contract, or whether that creates an illegal coupling.

**2. What "promotion" actually means for the scale story.**

The n=many diagram (lines 513-524) shows `apps/support` appearing alongside `apps/hq`, each with its own `rawr.hq.ts`. But the document never says:
- Does the promoted bundle get its own services, or does it share services with HQ?
- If it has its own services, what's the ownership boundary? Is it a full fork, or does it import from the same service packages?
- Does promotion require a new composition authority, or can it reuse HQ's?
- What's the relationship between two composition authorities that mount plugins projecting the same service?

This matters because the entire scale-continuity claim rests on "semantic truth stays stable while runtime placement becomes more distributed." But if promotion means *duplicating* service truth into a new bundle, then semantic truth didn't stay stable — it forked. If promotion means *sharing* service truth across bundles, then you need cross-bundle dependency rules the doc doesn't have.

**3. Can a plugin mount into multiple runtime roles?**

The directory structure groups plugins under one role (`plugins/server/api/...`, `plugins/async/...`). But the workflow section (lines 541-546) explicitly says "one capability may contribute to both [server and async] through host composition." So where does that plugin live in the tree? Under `plugins/server/`? Under `plugins/async/`? Split into two plugins?

The doc acknowledges this is open ("dual-surface workflow plugin, paired execution and API plugins, or another composed form remains in the pressure-test frontier"), but this isn't a minor detail — it's the first thing anyone implementing a workflow hits. The directory convention and the workflow responsibility split are in tension, and the doc names the tension without resolving it enough to act on.

**4. The concrete nature of a "service contract."**

Services own "stable boundary contracts" (line 85). Plugins depend on "service contracts, service clients" (line 372). Cross-service calls use "canonical contract or client shape" (line 416). But the document never says what form a contract takes. Is it a TypeScript interface? A schema file? A runtime-registered API? An exported function signature?

This matters because the contract form determines how the dependency direction law is actually enforced. If contracts are just TypeScript imports, then "plugins depend on service contracts" means plugins import from service packages — and the enforcement is just an Nx import rule. If contracts are something more formal (schema, generated clients), the enforcement mechanism is entirely different. An implementer can't build the first service without knowing this.

---

**Things I considered but don't think are crux-level:**

- **"Context lanes" and "assembly seams"** (lines 86-88) are undefined here, but the doc explicitly defers service internals to supporting docs. Not a crux for *this* document.
- **Composition authority mechanics** (what rawr.hq.ts actually does) — important for implementation but probably intentionally deferred. The architecture doc establishes its *role*, not its *implementation*.
- **cli's deployment shape** being fundamentally different from server/async — I flagged this in my previous answer, but it's more of a topology clarity issue than something that would cause wrong decisions.
```

## My findings to preserve

### 1. The shell is mostly intact, but still under-felt

The shell still carries the main architecture:

- ontology
- host/runtime model
- service-first boundary law
- dependency direction
- shared infrastructure vs semantic ownership
- scale continuity
- workflow responsibility split
- agent runtime placement

So the shell is **not** a hollow shell.

### 2. The biggest remaining weakness is realization, not ontology

The main confusion now is not “what kinds exist?”

It is:

- what HQ concretely produces
- what a runtime role operationally means
- how workflows are scaffolded
- where the shell should stop being cautious and start being prescriptive for HQ

### 3. Areas I would still flag as underspecified or drift-prone

- **HQ runtime realization is still not fully locked in the shell**
  - the memo is clearer about single-process, multi-process-same-machine, and multi-machine forms
  - the shell softened this into “one process or a few processes”
  - if HQ needs fixed scaffoldable entrypoints/deployables, the shell must say so explicitly

- **`colocated` is overloaded**
  - topology sense: mounted in one host bundle / shared HQ assembly
  - call-semantics sense: share a process, so default to in-process
  - the shell should stop using bare `colocated` where compute meaning matters

- **`cli` is still semantically present but operationally unresolved**
  - the shell now says it is a peer role with a different realization shape
  - that is better
  - but it still does not fully answer how HQ scaffolding should treat it

- **Workflow architecture is still more compressed than the strategy doc**
  - the shell now carries execution vs exposure plus a shared binding/composition layer
  - but the strategy doc is still stronger on:
    - public workflow surface
    - durable execution bundle
    - descriptor-driven host composition
    - stable public contract surviving runtime refactors

- **`Nx` / `oRPC` / `Inngest` is present but still weaker than the memo**
  - the shell now distinguishes them
  - the memo is still sharper about the anti-smear failure modes:
    - do not use Inngest as sync RPC
    - do not use oRPC to fake durable execution
    - do not expect Nx to define runtime semantics

- **Plugin topology still carries two messages at once**
  - current direction: runtime-role first, surface-type second
  - simultaneous caution: subordinate taxonomy is still open
  - this may be exactly the right epistemic stance, but it still leaves implementers unsure what is scaffold law vs illustrative direction

- **Plugin-service composition frontier is named but not actionable enough**
  - visible, but still too abstract to guide a first implementation

### 4. Memo vs shell drift I would explicitly revisit

- The memo says `Capability truth: packages/* and services/*`
- The shell says `services` define capability truth and `packages` are support matter

That is a real vocabulary drift.

- The memo is more explicit about HQ runtime realization modes:
  - single-process
  - multi-process same-machine
  - multi-machine / multi-service

That is exactly the kind of concrete, seam-preserving explanation that seems to have been watered down in the shell.

- The memo is stronger on:
  - async meaning
  - long-running/background work modes
  - Inngest default role
  - public API host vs dedicated internal services host
  - plugin second-level split examples

The shell is cleaner, but less revealing.

## Important interpretive note for tomorrow

The memo's host-bundle explanation may already be strong enough to answer part of the current confusion.

It is concrete in a way that preserves strong seams:

- one host bundle
- single-process mode
- multi-process same-machine mode
- multi-machine / multi-service mode

That may mean the right move is **not** to invent new deployment theory tomorrow.
It may mean we should restore the already-good concrete explanation back into the shell in a more canonical form.

If that reading is right, then the failure was not that this was never solved.
The failure was that we softened a previously clear seam into a more ambiguous shell description.

## What looks actually open vs what looks previously solved but over-softened

### Likely previously solved enough to harden

- HQ host-bundle realization modes
- `server` / `async` default primacy
- `cli` as peer runtime role with different realization shape
- Inngest as default durable async substrate
- stronger `Nx` / `oRPC` / `Inngest` anti-smear split

### Additional strong-seam explanations likely worth restoring

These are the kinds of explanations that were valuable because they made the architecture concrete and enforceable without requiring low-level implementation detail.

- **Host-bundle realization modes**
  - single-process mode
  - multi-process same-machine mode
  - multi-machine / multi-service mode
  - This is likely one of the clearest examples of something that was already concrete enough and then got softened.

- **What `async` actually means**
  - the distinction is not merely “returns later” or “uses Inngest”
  - the sharper architectural test is whether caller latency tracks trigger latency or total work latency
  - this is a strong boundary that prevents fake-async confusion

- **The `Nx` / `oRPC` / `Inngest` anti-smear model**
  - `Nx` = graph / governance / enforcement
  - `oRPC` = request-response / callable boundary surface
  - `Inngest` = durable execution boundary
  - the especially useful part is the negative guardrails:
    - do not use Inngest as sync RPC
    - do not use oRPC to fake durable execution
    - do not expect Nx to define runtime semantics

- **Why the dedicated internal services host is not the default**
  - extra latency
  - more failure modes
  - more deploy/config surface
  - harder debugging
  - worse local/dev ergonomics
  - premature distributed complexity
  - This is useful not because the architecture needs more argument everywhere, but because this rationale protects the default topology from being weakened.

- **Long-running/background work modes**
  - request-triggered
  - schedule-triggered
  - event/consumer-triggered
  - resident daemon loop
  - These are useful because they classify async work cleanly without drifting into workflow internals.

- **Workflow plugin vs API plugin split**
  - the shell now carries the responsibility split
  - what may still need to come back is the stronger statement of what each side owns

- **Descriptor-driven workflow host composition**
  - if workflow scaffolding is meant to be real, host composition likely needs to be more explicit than the shell currently makes it

- **Async second-level contribution shapes**
  - examples like `workflows / internal / schedules / consumers`
  - the value is not the exact names alone, but the fact that the second-level split is based on real composition behavior

- **Promotion semantics**
  - the scale story is strong at the principle level
  - it may still need stronger explanation of what runtime promotion means without forking semantic truth

- **Service-to-service direction / service contract shape**
  - this may not have been fully solved previously
  - but if any earlier materials were clearer here, that clarity should be pulled back up rather than left implicit

### Still actually open

- service-to-service dependency direction and allowed shape
- what promotion means for service ownership across promoted bundles
- whether/how one plugin mounts into multiple runtime roles without taxonomy confusion
- the concrete form of a “service contract”
- the exact threshold law for when plugin composition becomes composed service truth

## Tomorrow's canonical investigation targets

1. Revisit and strengthen the newly locked HQ baseline runtime-set decision if needed, but treat it as canon unless strong contrary evidence appears.
2. Determine whether the memo's host-bundle modes already solve the host realization question and should be promoted into the shell more strongly.
3. Decide whether service-to-service dependency direction belongs in the shell or a supporting doc, and state it explicitly either way.
4. Clarify promotion semantics:
   - what is shared
   - what is promoted
   - what new composition authority means
5. Clarify plugin multi-role contribution versus runtime-role-first plugin topology.
6. Clarify what counts as a service contract at shell level, or explicitly route that question below shell level.
7. Revisit where the shell should be stricter than previous restraint allowed because scaffoldability now matters more than abstract flexibility.

## Additional hardening candidates to evaluate explicitly

These are not yet separate decisions. They are candidates for reintroduction because they may be exactly the kind of “strong seams and boundaries” that got lost:

1. Restore the memo-style host-bundle realization explanation in canonical form.
2. Restore the sharper “what async actually means” test.
3. Strengthen the anti-smear guardrails for `Nx` / `oRPC` / `Inngest`.
4. Restore the rationale for why the dedicated internal services host is not the default.
5. Restore a compact classification of async/background work modes.
6. Strengthen workflow/API ownership and workflow host-composition explanation if scaffolding depends on it.
7. Decide whether async second-level contribution shapes should become shell-visible guidance or remain below shell level.

## Editing rule for the next pass

Do not “resolve” tomorrow's issues by adding vague filler.

If a point should be hardened, harden it.
If it is still genuinely open, say that explicitly.
If the memo already solved it cleanly, do not re-soften it in the name of shell restraint.

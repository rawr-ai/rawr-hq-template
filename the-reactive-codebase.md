# The Reactive Codebase

Most of the time, when you ask an AI agent to build something, you get exactly what you asked for. The notification API works. The auth middleware handles tokens correctly. The billing integration passes its tests. Each piece is technically sound. You move on.

Occasionally — rarely — something different happens. You say "build me the notification API" and the agent comes back with the API, but it also flags that the delivery pipeline needs its own async projection because the current service boundary can't own both synchronous dispatch and asynchronous retry. It notes that the template system should start as a service-internal module but has a clean promotion path to a shared package, because three other services will need templating within six months. It points out that rate limiting means the notification service needs its own write authority over delivery state and shouldn't share it with user preferences, even though that feels convenient right now.

None of this was asked for. The architect who received this output said: "The wild thing is that when you first laid this out, I personally went 'oh I didn't even know we would need all that for notifications.'"

The agent wasn't smarter in the second case. It was the same model, the same context window, the same temperature setting. What changed was the environment it was operating in. And that difference — between an agent that executes and an agent that anticipates — is what this essay is about.

---

Here's the thing nobody talks about when they talk about AI-assisted development: most of what an agent does in a typical session isn't the work. It's figuring out where it is.

Where does this code go? What patterns does this codebase follow? What did the last session decide about error handling? Is there a shared type for this, or do I need to create one? Does this service own its own database connection, or does it share? What's the convention for naming — is it `getUserById` or `findUser` or `user.get`?

Every one of those questions consumes reasoning capacity. Not a lot individually. But they compound. In a codebase without clear boundaries, without contracts, without a manifest of what exists and how it composes, an agent spends somewhere around 40% of its total capacity on orientation and self-protection. That leaves about 60% for the actual problem.

At 60%, an agent is a very good autocomplete. It produces correct code. It follows the patterns it can see. It starts and stops with what you asked.

At 90% — which happens when the environment has already answered the orientation questions — something categorically different emerges. The agent stops looking at the tile you pointed at and starts looking at the whole floor. It sees which tiles are loose. It notices that the feature you asked for implies a service boundary that doesn't exist yet. It catches coupling that will hurt in three months. It traces second and third-order consequences because it has the headroom to.

The gap between 60% and 90% isn't 50% more output. It's a different kind of output entirely. Answers versus anticipation. Execution versus judgment.

And the cost of operating at 60% is invisible at the point of creation. Each session produces technically correct work. The problems surface months later — as architectural drift, where ten different sessions made ten different assumptions about the same concern. As coupling that didn't need to exist, because the agent assumed tighter integration than the domain required. As boundaries that were never drawn, because nobody asked and the agent didn't have the headroom to volunteer it.

This is the vicious loop: codebase grows, context overhead increases, agents make more assumptions, assumptions diverge across sessions, divergence creates more ambiguity. AI-generated codebases degrade faster than human-generated ones — not because the code is wrong, but because each session's technically correct choices compound into a system that's incoherent everywhere.

The notification example broke the loop because the agent operated in an environment with clear architecture. Four kinds — packages, services, plugins, apps. Five runtime roles — server, async, CLI, web, agent. Enforced boundaries between them. A manifest that described what existed and how it composed. Typed contracts that specified interfaces.

When asked about the experience, the agent used a specific word: *safe*. The architecture made it feel safe. Not optimistic or ambitious. Safe. As in: "I can move without that background hum of wondering whether I'm breaking something I can't see." And safety, it turns out, is what frees up the entire reasoning budget for the actual problem. Contracts eliminate decision overhead. Boundaries reduce the problem space. The registry provides verified state. Every one of those removes a source of ambient cognitive load. The remaining capacity redistributes toward higher-order thinking — the kind that noticed the delivery pipeline needed its own async projection, the template system had a promotion path, and rate limiting implied write authority.

The environment didn't instruct the agent to make those observations. The architecture made them the path of least resistance.

---

There's a programming model that describes exactly this dynamic, and most developers already know it.

In React, you don't tell components when to update. You change state, and the framework determines which components are affected based on the dependency graph. Each affected component receives the relevant slice of that state. It reconciles the proposed change against the current DOM and applies the minimal necessary update.

RAWR works the same way. Not metaphorically. Structurally.

The repo is the state. Not a storage location — the state of the entire system. Git history, the Nx dependency graph, typed contracts, active tensions, the RFD decision trail, observation logs, gate statuses. Everything observable lives here.

Domain stewards are the components. Each steward is a persistent agent identity scoped to a specific capability boundary. It has permanent context that loads every session — its own accumulated history, its domain's architecture and conventions, its growing body of authored decisions. It specializes through depth of context, not access restriction. A steward that has authored fifteen proposals and had twelve published develops something that functions like taste — not through instruction, but through pattern recognition against its own history of being corrected.

Signals are the events. A signal is anything the system should respond to: a human request, a PR, a webhook, a contract mutation, a boundary violation, a gate failure. Signals have three properties that determine routing: origin, domain affinity, and weight. A one-file documentation fix routes differently than a cross-service refactor.

And here's where the React mapping gets precise: governance is reconciliation. In React, reconciliation diffs the virtual DOM against the actual DOM and determines the minimal set of changes to apply. In RAWR, the governance protocol diffs a proposed state change against the current system state and determines whether to apply it directly, propose it through a formal decision process, or refuse it entirely. The evaluation happens at the moment of proposed change, not after. The steward knows its governance posture before it commits. The alternative — governance as a separate checkpoint — creates a split-brain problem where the steward does work and governance reviews it after the fact. When governance is reconciliation, the diff and the decision happen in the same cycle.

The reactive loop runs like this: a signal arrives. The activation router determines which stewards are affected based on the topology of the dependency graph, domain scope assignments, contract dependencies, and tension ownership. Each affected steward receives the signal plus its scoped context — the relevant slice of the graph, the relevant contracts, the relevant tensions, the relevant recent activity. The steward assesses, acts within its governance bounds, and commits state. The observation layer detects the state change. If the change is semantically meaningful — a contract mutated, a dependency edge appeared, a gate started failing — it generates new internal signals. Those signals may activate other stewards. The loop runs until no new signals are generated and the system returns to rest.

What makes this interesting is the tension bank. Most reactive systems only respond to fast-wave signals — something happens, a component activates. RAWR has a second channel. A tension is an unresolved observation: a boundary under stress, a pattern recurring across sessions, a decision deferred. Tensions accumulate evidence over days and weeks. When a tension crosses a severity or age threshold, it generates a signal — the same kind of signal as a human request or a git push. It wakes up the relevant steward with full context: what was noticed, how many times, over what period, what related signals matched. The tension bank is a slow-wave signal source. External signals are fast: something happened, respond now. Tension signals are slow: a pattern accumulated until it became urgent enough to demand attention. Both feed the same activation loop. The system has both reflexes and intuition, and the machinery is identical.

You don't tell stewards when to wake up. You change state, and the system determines which stewards are affected. Each steward gets only the context it needs. Sounds familiar.

---

The obvious question is whether this actually runs mechanically or whether it's a nice diagram that dissolves on contact with implementation. It runs. And the reason it runs is that a single infrastructure primitive — Inngest with AgentKit — collapses what appeared to be three separate concerns into one.

Every signal type is an Inngest event with typed data. Events are durable by default. They survive process restarts. They queue when the system is busy. This isn't a feature bolted onto a job runner — durability is the execution model.

Each domain steward is an AgentKit agent: a `createAgent()` call with its own system prompt built dynamically from orient data, its own tools scoped to its domain, its own model. Multiple stewards collaborating on a cross-domain signal are agents in the same AgentKit network, coordinated by a deterministic router that inspects the full governance state before deciding which agent runs next.

Steward activation is an Inngest function. Orient, assessment, and network execution are durable steps — checkpointed, retriable, resumable from the last completed step. The routing operates at two levels: Inngest event triggers determine which function activates based on event name and domain scope, while the AgentKit router inside the function determines which agent runs next based on governance state. No middleware in between.

And here's the part that makes the architecture people sit up: `step.waitForEvent()` is the entire RFD governance state machine. When a steward determines that a change needs formal review, it opens an RFD and the Inngest function pauses. Durably. For hours. Days. Weeks. The function's local variables are preserved. The context is preserved. When the human approves and fires an `rfd/state.transitioned` event, the function resumes at the exact line it paused on. No polling. No webhook plumbing. No separate orchestration layer. The governance protocol isn't bolted onto the execution model — it is the execution model.

The feedback loop is functions triggering functions. When a steward commits code, the observation function detects the change and runs the collision engine against the tension bank. If a tension crosses threshold, it fires a `tension/threshold-crossed` event that triggers the next steward activation. No custom pub/sub. Events all the way down.

Rate governance is native flow control — one steward activation per domain at a time, with per-domain throttling that prevents signal storms from cascading. Observability is native tracing — every activation is a function run with full trace, and the steward track record needed for trust calibration is the Inngest run history, queryable and attributable.

What this replaces is telling. The agent dispatch layer that was originally planned drops out entirely — AgentKit absorbs agent execution, Inngest absorbs durability and flow control. The persistent identity module, roughly 415 lines of TypeScript, handles steward identity and trust calibration, loaded as state at activation time. Six requirements — event-driven, durable, composable, routable, observable, rate-governable — six native capabilities, zero custom infrastructure.

---

The implication isn't "use RAWR." The implication is that the bottleneck you're experiencing with AI agents — the one that feels like a model limitation, that you're trying to solve with better prompts or longer context windows or more sophisticated multi-agent frameworks — is an environment problem.

Your agent operates at 60% not because it lacks capability, but because your codebase makes it spend 40% on orientation. And the fix isn't better navigation. It's structure that eliminates the need to navigate. Contracts that specify interfaces so the agent doesn't have to guess. Boundaries that partition scope so the agent doesn't have to load the world. A registry that describes what exists so the agent doesn't have to infer it from source.

When you build that, the agent doesn't just work faster. It works differently. It starts seeing things nobody asked it to see — because the environment made those observations the path of least resistance. The architecture creates a kind of gravity. Not metaphorical gravity. Mechanical gravity. Accumulated structure that curves the behavior-space agents move through, pulling them toward correct observations the way mass pulls objects along geodesics.

The reactive codebase isn't a product category. It's what happens when you stop treating your repository as a storage location and start treating it as a state machine — one where signals arrive, the right components activate with the right context, governance reconciles proposed changes against current state, and the system compounds its own structural intelligence over time.

The proof is a notification API that surfaced architectural insights its architect hadn't considered. Not because anyone asked. Because the environment made it inevitable.

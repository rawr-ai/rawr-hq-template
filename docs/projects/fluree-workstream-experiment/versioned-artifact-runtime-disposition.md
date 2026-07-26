# Versioned Artifact Runtime — disposition against the work-stream frame

Normative analysis. Decides, concept by concept, what the Versioned Artifact
Runtime (VAR) specification contributes to `workstream-frame`, what the Fluree
substrate already supplies, and what is deliberately declined.

This document has authority over the service and CLI surface. Where it
contradicts earlier decisions in
[the workstream record](workstreams/fluree-workstream-experiment.md), this
document wins and the record is annotated.

---

## 1. Scope boundary

VAR describes a **runtime**: it executes steps, schedules activations, reuses
computations, supervises fibers, and authorizes external effects.

`workstream-frame` is **not** a runtime. It is the *record* a work stream moves
through — the operations and queries that must be possible, so that some other
thing (an agent, a human, a future harness) can do the moving.

The machinery for running a work stream automatically is explicitly out of
scope. This is not a deferral for convenience; it is the boundary that decides
most of what follows.

VAR itself draws this line in its own terms:

> Effect supplies the execution model, service boundaries, concurrency,
> interruption, resource safety, and testability. The artifact runtime supplies
> version semantics, dependency tracking, recomputation, iteration, promotion,
> and provenance.

**Finding F9 — VAR splits cleanly along the line we already care about.** Its
*record half* (versions, provenance, snapshots, revisions, seals, lifecycle,
observability) is our subject matter. Its *execution half* (activations,
computation keys, reuse, stages, fibers, external action execution) is the
harness. The split is not a compromise — the two halves are separable in the
source document, and almost every concept lands unambiguously on one side.

---

## 2. Verified substrate capability map

Every row below was probed against the live server, not read from
documentation. `fluree/server:latest`, version reported `4.1.4`.

| Capability | Verdict | Evidence |
|---|---|---|
| Append-only ledger, monotonic `t` | **VERIFIED** | every write returns `t+1`; no update-in-place surface |
| Time travel `@t:N` | **VERIFIED** | read at `t=1` excluded facts written at `t=2` |
| Time travel `@iso:` / `@recorded:` | **VERIFIED** | rejected an out-of-range instant with the earliest commit time |
| Time travel `@commit:` | **VERIFIED** | validates a commit-hash prefix of ≥6 chars |
| Branch | **VERIFIED** | `POST /v1/fluree/branch {ledger, branch, source?}` → `{ledger_id, branch, source, t}` |
| Merge | **VERIFIED** | `POST /v1/fluree/merge {ledger, source, target?}` → `{fast_forward, new_head_t, commits_copied, conflict_count}` |
| Branch **isolation** | **VERIFIED** | writes to `iso:cand` were invisible on `iso:main` until merge |
| Merge **promotion** | **VERIFIED** | after merge, `commits_copied: 1`, `conflict_count: 0`, main saw the candidate fact |
| SHACL at transaction time | **VERIFIED** | `sh:minCount` violation rejected the write with a violation report |
| SPARQL 1.1 breadth | **VERIFIED** | property paths, `OPTIONAL`, `FILTER`, `COUNT`, `VALUES`, `MINUS`, `ORDER`/`LIMIT`, subqueries all returned correct results |
| RDFS / OWL entailment | **VERIFIED SUPPORTED** | `reasoning: "rdfs"` entailed a `subClassOf` type; `reasoning: "owl2rl"` entailed an `inverseOf` triple; the same queries without the key returned empty. Query-time overlay, opt-in |
| SHACL on-demand validation | **VERIFIED** | `GET /validate/{ledger}` returns a conformance report |
| Merge preview | **VERIFIED** | `GET /merge-preview/{ledger}?source=` returns ancestor, ahead/behind, `fast_forward`, `conflicts`, `mergeable` — *before* merging |
| Branch listing | **VERIFIED** | `GET /branch/{ledger}` lists every branch with its `source` |
| Drop a single branch | **VERIFIED PRESENT** | `POST /drop-branch` exists |
| Rebase | **VERIFIED PRESENT** | `POST /rebase` exists |
| Revert | **VERIFIED PRESENT** | `POST /revert` + `GET /revert-preview` — refused a genesis commit with a specific error |
| Commit log | **VERIFIED** | `GET /log/{ledger}` returns `t`, commit id, time, assert/retract counts, message |
| Inline full-text `fulltext()` | **DOCUMENTED, unprobed** | JSON-LD only; SPARQL form is explicitly "planned" |
| BM25 graph source | **DOCUMENTED — no HTTP creation path** | index creation is Rust-API-only in v4.1.4 |
| Vector HNSW index | **NOT IN THIS BUILD** | the `vector` cargo feature is not in the default set this image is built from |
| Inline vector similarity | **DOCUMENTED, unprobed** | `cosineSimilarity` / `dotProduct` / `euclideanDistance` need no feature flag and work in SPARQL |

Two traps are now confirmed as a *pattern*, not incidents:

- a bare `t` at SPARQL top level is silently ignored (found earlier);
- `opts.reasoner` is silently accepted and has no effect (found here).

**Finding F10 — this server accepts unknown keys silently.** Any capability
claimed on the basis of "the request succeeded" is unproven. Only a request
whose *result differs* proves a feature. Every capability in the table above
that says VERIFIED was proven by a differing result or a specific error, never
by a 200.

**Finding F11 — an empty result is not a negative, and this document briefly
treated it as one.** F10 says a silent accept proves nothing. The symmetric
error is to read *my probe returned nothing* as *the feature is absent*, and an
earlier draft of this table did exactly that for reasoning. For a shipped
enterprise product on a stable major version, "I configured it wrong" is the
far likelier explanation than "the vendor ships a dead option key" — reasoning
in particular may require an ontology to be declared, a vocabulary loaded, or a
server setting enabled, none of which a naive insert-and-query would exercise.

Absence is only established by a first-party source saying so.

**F11 was immediately vindicated, and the cost of the error was high.** Dedicated
research into the official documentation and the v4.1.4 source overturned the
reasoning verdict outright:

- Reasoning is activated by a **top-level `reasoning` key on the query**. There
  is no `opts.reasoner`. The key I sent was not a dead vendor option — it was
  not a key at all, and the server's tolerance of unknown fields disguised my
  own malformed request as a missing feature.
- Nine further capabilities were found that naive probing had missed entirely,
  most because ledger-scoped routes take a **greedy path tail** — `/validate`
  404s while `/validate/{ledger}` serves. Probing bare operation names could
  never have found them.

The generalisation worth keeping: **this server's API is well documented; my
sampling of it was not.** The correct order is documentation and source first,
probes second to confirm — not probes first and inference to fill the gaps.
Every "absent" claim in the earlier draft came from the second order.

Two capability rows above remain marked from documentation only and are
labelled as such. They are not load-bearing for any decision in this document.

---

## 3. Concept disposition

| VAR concept | Disposition | Reason |
|---|---|---|
| Append-only ledger is truth | **Superseded** | Fluree *is* this. Already our substrate. |
| Artifact version immutability | **Superseded** | Append-only substrate; no update path exists to violate it. |
| Causally coherent snapshot | **Superseded** | See §4.1. A read at `t` on a branch is coherent by construction. |
| `at` / `history` selectors | **Superseded** | `@t:` / `@iso:` / `@commit:` time travel. |
| Checkpoint (durable resumption) | **Superseded** | Every transaction is a commit. The ledger *is* the checkpoint. |
| Replay determinism | **Superseded** | Re-reading at `t` reconstructs the world exactly. |
| Input rejected (schema/contract) | **Superseded** | SHACL at transaction time (verified). |
| Candidate / committed revision | **Superseded** — via branches | See §4.2. This is the largest single finding. |
| Promotion (atomic) | **Superseded** — via merge | `conflict_count` is the validation signal. |
| Superseded revision | **Superseded** — via drop | An unmerged branch is precisely a superseded candidate. |
| **Seal / finality** | **PORT** | D9. Not a substrate concern; it is a lifecycle assertion. |
| **Convergence vs exhaustion** | **PORT** | D8. Our `atEquilibrium` currently violates VAR invariant 22. |
| **Provenance of a transition** | **PORT** | D10. Cheap here, uniquely cheap on this substrate, and absent today. |
| **Exact-input recording** | **PORT (adapted)** | D7. Clearance must name *which* boundary, not an index. |
| Logical time `{epoch, iterationPath}` | **Decline** | See §4.3. Collapses to `(branch, t)`. |
| Oscillation detection | **Decline** | See §4.4. The frame is monotone; it cannot oscillate. |
| Progress frontier | **Decline** | Degenerates to `(branch, t)` + settlement state. |
| Activation / computation key / reuse | **Decline** | Execution half. We do not execute steps. |
| Stage / step / Effect runtime | **Decline** | Execution half — the harness, explicitly out of scope. |
| Selectors `each` / `latest` | **Decline** | Durable cursors and supersession of *running work*. Harness. |
| External action intent / receipt | **Decline** | Harness. Recorded in §7 as the attach point. |
| Retry policy | **Decline** | Nothing is executed, so nothing can be retried. |

---

## 4. The four judgments that carry weight

### 4.1 Snapshots are unnecessary because we have a total order

VAR needs snapshot machinery because it has many independent artifact lineages
advancing at different rates, so `terrain@epoch-6 + climate@epoch-5` may or may
not be a coherent combination, and *something* must decide.

We do not have that problem. One ledger, one branch, one monotonic `t`. Every
fact is totally ordered against every other fact. A read at `t=N` is therefore
coherent **by construction** — there is no way to assemble an incoherent view,
because there is only one view per `t`.

The snapshot concept is not simplified away here. It is *already implemented*,
by the substrate, as the total order.

### 4.2 Fluree branches are VAR revisions — verified, not hoped

This is the finding that most changes the design.

| VAR | Fluree v4.1.4 | Verified |
|---|---|---|
| candidate revision | a branch | branch created, inherits `t` |
| candidate isolation | branch isolation | main did not observe candidate writes |
| promotion (atomic) | merge | `commits_copied: 1`, main then saw the fact |
| validation signal | `conflict_count` | returned on every merge |
| superseded | unmerged / dropped branch | `drop` endpoint exists |
| committed revision | `main` | — |

VAR §10 — the entire candidate-recomputation-and-promotion chapter — is
delivered by the database. We model **vocabulary**, not mechanism.

One scoping consequence, and it is the *correct* reading rather than a
convenience. VAR defines a snapshot as selecting a version of **every artifact
relevant to an evaluation** — not one artifact. A whole-ledger branch is
therefore a *more* faithful revision than a per-stream branch would be. The
ledger is the work stream; the branch is the revision; streams inside it are
frames. No change to `scope.ledgerName` is required.

**D11 — adopt branches as revisions.** The service gains a `revisions` module:
`fork`, `promote`, `abandon`, `list`. Every existing operation takes an
optional revision and defaults to the committed one.

This is what makes the user's own mental model executable: *"blockers and
defects become input — they get revised **under law** rather than patched."* If
the law itself must change, you fork, reshape, re-push, observe what falls out,
and promote only if the result is coherent. That is VAR §2's central behaviour,
expressed in work-stream terms, on a substrate that already supports it.

### 4.3 Logical time collapses to `(branch, t)`

VAR needs `{epoch, iterationPath}` because nested iteration and multiple epochs
create *incomparable* open times, so no scalar position can order them.

Our only source of incomparability is branching — and branches are **named**.
So the pair `(branch, t)` totally orders within a revision and names the
revision when comparing across. A nested iteration path buys nothing here
because our iteration does not nest: an item peels off a child, and a child
does not traverse a frame of its own.

Declining this is contingent on that last clause. If peel-offs ever traverse
their own frames, `iterationPath` returns as a live question. Recorded in §7.

### 4.4 The frame is monotone, therefore it cannot oscillate

VAR devotes real machinery to oscillation (`A → B → A → B`), state-hash
detection, and period reporting. We need none of it, and the reason is a
property worth stating explicitly rather than assuming:

- tags are only ever **added** to an item, never removed;
- an item's position is the count of boundaries it has cleared, and clearances
  are only ever **appended**;
- therefore every item's state advances monotonically through a finite lattice.

That also supplies VAR's *rank* function — the thing it says is the strongest
form of iteration bound:

```
rank(stream) = Σ over items of (boundaries.length − position)
```

Every successful push strictly decreases the rank; nothing can increase it.
With `n` items and `b` boundaries the loop terminates in at most `n × b`
productive pushes. That is a real termination bound, derived rather than
imposed, and it is why the model needs no `maxIterations` and no exhaustion
policy.

What it does **not** supply is a completion law, which is exactly VAR's point
that "limits solve boundedness, not correctness." Bounded is not converged —
hence D8.

---

## 5. Defects VAR revealed in what we already shipped

Reading VAR against our own code surfaced three real problems. These are the
justification for changing a working system.

### D7 — clearance must name the boundary, not an index

`recordCleared(streamId, itemId, index)` writes the *ordinal* of the boundary
cleared, and position is recovered by counting those facts.

That is only sound while the frame never changes shape. The moment revisions
exist (D11), reshaping the frame is a first-class thing to *want* to do — and
inserting a boundary would silently re-point every historical clearance fact at
a different boundary. History would become quietly wrong, which is the one
failure mode an append-only store is supposed to make impossible.

Boundaries get stable identity at `open`. Clearance records that identity.
Position is derived by walking the frame and asking which boundaries this item
has cleared. Position stops being a count and becomes a *query*.

This is VAR invariant 2 — "every version records its exact input versions" —
adapted honestly to our vocabulary.

### D8 — `atEquilibrium` conflates converged with stalled

Today `push` returns `atEquilibrium: true` when nothing moved. Two entirely
different situations produce that value:

- every item cleared every boundary — **converged**;
- items remain, blocked, with unresolved peel-offs nobody has answered —
  **stalled**.

The first is success. The second is a work stream waiting on the outside world.
Reporting them identically is a direct violation of VAR invariant 22: *"No
stopped, exhausted, approximate, or superseded state is reported as exact
completion."*

`atEquilibrium: boolean` is replaced by an explicit settlement state:
`advancing` | `converged` | `stalled`. An agent driving the loop can finally
distinguish "done" from "stuck", which is the single most important question it
will ask.

### D9 — a stream can settle but can never be closed

Settlement is an observation about the last push. Closure is an assertion about
the future. We had only the first, and nothing prevented a settled stream from
being treated as finished.

VAR's seal is exactly this distinction. `streams.close` seals a stream: further
`admit`, `push`, and `resolve` are refused; `inspect` and time travel continue
to work forever. Closure is itself an append-only fact, so *when* a stream was
closed is part of its history.

### D10 — nothing records how an item got where it is

We can answer "why is this item blocked" (position plus tags). We cannot answer
"how did this item get here" — the question a work stream is *for*.

Transitions are currently written as bare literals with no time and no author.
They become first-class nodes carrying their subject, their boundary, their
timestamp, and an optional note:

```
Clearance  → ofItem, ofBoundary, at
Resolution → ofItem, at, note?
```

This is reification done deliberately, and it makes `streams.trace` a single
query rather than a scan over `t`. It also gives the eventual agent trial the
thing it most needs: a resolution that records *why*, not just *that*.

**Note on cost.** This is the one port with a real price — the fact grammar
changes and the store is rewritten around it. It is worth paying because it is
what the substrate is uniquely good at and what a mutable task tracker
fundamentally cannot do.

---

## 6. Invariants adopted

Renumbered into our vocabulary. VAR's originals in brackets.

1. Facts are append-only; nothing is ever mutated or deleted. [1]
2. Every transition records its subject, its boundary, and its time. [2]
3. The ledger decides truth; a command is a request, not a fact. [3]
4. Every read at `t` observes a coherent world. [4]
5. Clearance names the boundary it cleared, never a positional index. [2, adapted]
6. Position is derived, never stored. [—, ours]
7. A candidate revision is invisible on the committed revision until promotion. [9, 10]
8. Promotion is atomic and reports its conflicts. [11]
9. Finality is a seal, never a mutation. [12]
10. Every feedback edge advances the ledger. [14]
11. A settled stream is never reported as a completed stream. [22]
12. A closed stream refuses further work but never stops answering questions. [12, extended]

Invariants 5, 6, 9, 11, 12 are new to this document. The rest were already
honoured and are now written down.

---

## 7. Declined, with the trigger that would reopen it

| Declined | Reopens when |
|---|---|
| Activations, computation keys, reuse | We execute steps. Not before. |
| Stages, Effect runtime, fibers | The harness is built. Explicitly a separate effort. |
| Selectors `each` / `latest` | Something *subscribes* to a stream rather than polling it. |
| External action intents and receipts | An item clearing the frame is allowed to cause an outside effect. This is the natural attach point: irreversible action authorised only from a promoted revision. |
| `iterationPath` in logical time | Peel-offs traverse frames of their own (see §4.3). |
| Oscillation detection | The frame stops being monotone — e.g. if tags could be revoked. |
| Distribution, leases, heartbeats | Multiple writers contend for one revision. |

---

## 8. Scenario results

All seven were **run against the live v4.1.4 server**, not designed on paper.

| # | Scenario | Result | What it showed |
|---|---|---|---|
| 1 | Append-only truth | **PASS** | A read at `t=1` saw 0 items; head at `t=9` saw 3. Nothing was mutated to make both true. |
| 2 | Temporal reconstruction | **PASS** | `@t:1` → 18 facts, `@iso:<now>` → 62, head → 62. All four selectors resolve, and `@iso:` and `@recorded:` address event time and audit time as separate axes. |
| 3 | Derivation edges | **PASS** | 2 peel-offs, each edged to its cause; item `a` carries 6 durable transitions: admitted → cleared → peeled-off → cleared → peeled-off → cleared. |
| 4 | SHACL at transaction time | **PASS** | A titleless item was **rejected at write** with a violation report. The frame's law is enforced by the substrate, not by the service. |
| 5 | RDFS entailment | **PASS** | Without `reasoning`: 0 matches. With `reasoning: "rdfs"`: 1 match. An item tagged `verified` satisfies a boundary requiring `reviewed` with nobody restating it. |
| 6 | BM25 + vector | **PASS** | Inline `fulltext()` is BM25 — stemming, term-frequency weighting, length normalisation — distinguishable from substring matching on three differentials. Vector similarity is exact, with a SIMD `FastPath:vector-topk` lane. The graph-source form of either is unwired upstream and unnecessary at our scale. See §8.1. |
| 7 | Branch/merge isolation | **PASS** | A candidate held an item invisibly to committed truth; preview reported `ahead=1 conflicts=0 mergeable=true`; promotion carried 1 commit. Final revisions: `dead-end=abandoned, main=committed, reshape=promoted`. |

### 8.1 What the substrate supplies

The mechanics — route inventory, addressing, conditional writes, search, reasoning —
are documented with the adapter, in
[`providers/fluree-http/README.md`](../../../resources/semantic-ledger/providers/fluree-http/README.md).
What matters at this level is which of the frame's obligations the substrate
discharges, and on what terms.

**Time addressing is complete.** All four selectors resolve: `@t:` by transaction
number, `@iso:` by event time, `@recorded:` by audit time, `@commit:` by content
digest. Two of these bear directly on the model. `@commit:` addresses a specific
commit rather than a position, which is what makes a revision citable rather than
merely reachable. And `@iso:` and `@recorded:` are distinct axes — *when did this
become true* versus *when did we learn it* — so the record can answer both questions
without our modelling either one.

**Full-text and vector search are available inline.** BM25 with stemming and
length normalisation, and an exact SIMD top-k vector lane, both over the ordinary
query path with no index provisioning. The distributed graph-source form of either
is not wired in this build; the frame does not need it, since inline capacity
exceeds our corpora by orders of magnitude.

**The image is fixed.** 4.1.4 is the current release and no published variant carries
a different feature set, so the capability boundary described here is the boundary
until upstream moves.

### 8.2 Obligations the frame must discharge itself

Four properties the substrate makes available but does not enforce. Each is a
requirement on the service, not an open question.

**Writes that depend on state they read must guard that dependency.** `POST /update`
applies a `where` guard atomically; a read followed by an unguarded write does not.
Under twenty concurrent writers the guarded form applies all twenty and the unguarded
form loses nineteen, returning success for each loss and producing a `t` sequence
that moves backwards. A record that reports a write it discarded is not a faithful
record, so every state transition in the frame is expressed as a guarded write.

**A no-op must be distinguished from a commit by the sentinel, not by `t`.** A
transaction whose guard does not match returns 200 with a well-formed receipt whose
`commit.hash` is a fixed sentinel that appears in no commit log. Comparing `t`
against a previously read value misreports a concurrent writer's commit as one's own
success — it fails precisely in the case that motivates the check.

**Retries carry an `Idempotency-Key`.** The header is honoured per ledger and rejects
a reused key bearing a different body. With a guard preventing stale writes and a key
preventing duplicated ones, a lost response is recoverable without reasoning about
what may have happened.

**Reads that must agree with each other are pinned.** `/multi-query` executes against
one snapshot, but its self-reported `t` is not reliable under contention; an integer
`asOf` pin is. Any multi-read whose parts must be mutually coherent names its
position explicitly.

**Transitions remain reified.** Native entity history is subject-scoped and reports
triple deltas, which cannot express `admitted → cleared → peeled-off` as an event
carrying its own time and reason. The frame's transition vocabulary is therefore
owned by the service, as D10 requires.

### Capability ladder

| # | Capability | Standing |
|---|---|---|
| 1 | Append-only truth | Foundational. Every position is readable and none is mutable |
| 2 | Temporal reconstruction | Available across all four selectors. `@recorded:` gives the frame an audit axis distinct from event time |
| 3 | Derivation edges | Available, and carried by the transition vocabulary D10 establishes |
| 4 | SHACL at transaction time | Available. The frame's law is enforced by the substrate at write, not by the service |
| 5 | OWL/RDFS reasoning | Available. `owl2rl` and `owl-datalog` are faithful under time travel; see D12 |
| 6 | BM25 and vector search | Available inline, at capacity well beyond our corpora. The graph-source form is unwired upstream and unnecessary here |
| 7 | Branch/merge isolation | Available, and a core capability rather than a scenario — see D11 |

### D12 — the frame's law is an ontology, not a list of strings

A boundary requiring the literal tag `reviewed` admits an item only if it carries
that exact string. Declared as a hierarchy, the law states that carrying `verified`
entails carrying `reviewed`:

```
ws:tag/verified  rdfs:subClassOf  ws:tag/reviewed
```

An item that cleared a stricter gate then satisfies a weaker one with nobody
restating the fact. The law stops being a list of magic strings and becomes a
declared hierarchy the substrate reasons over, which is what "revised under law"
means.

**Form.** The axioms are asserted into the ledger and read under `owl2rl` or
`owl-datalog`. Two invariants fix this choice and leave no latitude in it:

- *A read at `t` is faithful to `t`.* Under `rdfs` and `owl2ql` the schema applied at
  a historical position is the union of that position's schema with head's, so a
  historical read entails from axioms that did not yet exist. Only the materialising
  modes confine entailment to the law in force.
- *The record explains itself* (§5, D10). Supplying axioms per query through the
  `ontology` field entails correctly and writes nothing, which means a later reader
  cannot reconstruct which law admitted a given item. That is the same loss D10
  exists to prevent.

Asserting the hierarchy into the ledger also changes SHACL admission for subsequent
writes and widens any policy grant attached to a superclass. This is the intended
consequence rather than a side effect: the hierarchy is a fact with a `t`, and
admission is evaluated under the law in force at the time of writing. Facts already
recorded are untouched, and an on-demand validation report against the current law is
a meaningful statement rather than a corruption.

**Sequencing.** This lands after the agent trial, not before it. The trial measures
whether an append-only frame with a durable derivation record outperforms
conventional task tracking. Tag subsumption does not bear on that comparison and
would introduce a second variable into it. The frame's expressiveness is a refinement
of a model the trial is meant to evaluate as it stands.

**Cost, carried knowingly.** The ledger contract gains an optional reasoning mode on
reads, and the memory provider implements `subClassOf` closure so the contract stays
provider-neutral rather than quietly Fluree-only. That cost is the price of the port
remaining honest about what it promises.

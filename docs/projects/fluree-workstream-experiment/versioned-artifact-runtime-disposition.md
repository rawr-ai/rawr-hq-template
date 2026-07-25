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
| 2 | Temporal reconstruction | **PASS** | `@t:1` → 18 facts, `@iso:<now>` → 62, head → 62. All four selectors verified, including `@commit:` — see below. `@recorded:` turns out to be a distinct audit axis we had not been using. |
| 3 | Derivation edges | **PASS** | 2 peel-offs, each edged to its cause; item `a` carries 6 durable transitions: admitted → cleared → peeled-off → cleared → peeled-off → cleared. |
| 4 | SHACL at transaction time | **PASS** | A titleless item was **rejected at write** with a violation report. The frame's law is enforced by the substrate, not by the service. |
| 5 | RDFS entailment | **PASS** | Without `reasoning`: 0 matches. With `reasoning: "rdfs"`: 1 match. An item tagged `verified` satisfies a boundary requiring `reviewed` with nobody restating it. |
| 6 | BM25 + vector | **PASS for what we need** | Inline `fulltext()` *is* BM25 — Snowball stemming, tf weighting, length normalisation — proven against substring matching on three differentials. Vector similarity is exact, and the planner has a compiled SIMD `FastPath:vector-topk` top-k lane we did not know existed. What is unreachable is the *graph-source* form of both, gated by wiring the vendor documents as a near-term gap. See §8.1. |
| 7 | Branch/merge isolation | **PASS** | A candidate held an item invisibly to committed truth; preview reported `ahead=1 conflicts=0 mergeable=true`; promotion carried 1 commit. Final revisions: `dead-end=abandoned, main=committed, reshape=promoted`. |

### 8.1 The two partials, closed

Both were category (c) — we were calling it wrong — and both are now resolved.
The full substrate reference lives with the adapter, in
[`providers/fluree-http/README.md`](../../../resources/semantic-ledger/providers/fluree-http/README.md);
only the load-bearing conclusions are recorded here.

**`@commit:` — resolved.** The identifier `@commit:` consumes is the commit's raw
SHA-256 **hex digest**, not the base32 CID that `/log`, `/show` and every
transaction receipt return. They are the same 32 bytes in different encodings: a
CID is a fixed 7-byte header (`018180c0011220` — CIDv1, `ContentKind::Commit`,
sha2-256, length 32) followed by the digest. That header base32-encodes to the
constant string `bagaybqabciq`, which is why every commit id in the deployment
looks alike — **the first twelve characters are a type tag, not entropy.** Feeding
the CID to `@commit:` matches nothing at any prefix length because the CID's
leading characters appear nowhere in the hex keyspace. Reindexing was never
relevant.

Three ways to obtain the hex: read `f:address` from the `#txn-meta` graph;
base32-decode the CID and drop 7 bytes; or ask `GET /show/{ledger}?commit=<CID>`,
which returns `t` and lets a caller pin with `@t:` instead. `/show` accepts all
four identifier forms — the only route that does, which is itself the clearest
evidence the gap was localised to one resolver.

Two things fell out that matter more than the original question. `@recorded:`
addresses **audit time** (`f:receivedAt`, when a fact was loaded) where `@iso:`
addresses **event time** (`f:time`, what the change is about); at one instant they
returned 1 row and 3 rows. For a record that must answer *what did we know, when*,
`@recorded:` is the honest axis, and we had not been using it. Separately, the `to`
bound on a history query is **validated and then ignored** — the range is always
`[from, head]`, which would have silently produced wrong answers had we relied on it.

**BM25 and vector — resolved, with a real gate correctly identified.** Inline
`fulltext()` is genuine BM25, not a substring match: it scores *"encrusted"* at 0.0
for the query `rust`, hits *"programming"* for the query `programs` via the Snowball
stem, and ranks a short one-occurrence document above a long three-occurrence one.
Our earlier reading of "unreachable" came from a single signal we misread —
`fulltext()` returns `null` when a property has no index and `0.0` when it is
indexed but does not match, and we had only ever seen one of them.

What is genuinely gated is the *graph-source* form of both, and the gate is now
named: neither the server nor the CLI populates
`ExecutionContext.bm25_search_provider` / `vector_provider`. It fires before name
resolution — a garbage graph-source name produces a byte-identical error to a real
one — and it fires identically in a separate CLI process. The vendor documents it:
the deployment wiring "is not yet exposed end-to-end… Track this as a near-term
gap." BM25 and vector share that gate, but not the same severity: BM25's engine is
demonstrably compiled, so it is purely unexposed wiring, while HNSW additionally
lacks the `vector` cargo feature. Fixing the wiring would unblock BM25 and not HNSW.

**And the image question is settled: no upgrade helps.** 4.1.4 is the newest
published build, `latest`/`4`/`4.1`/`4.1.4` are one digest, and across 72 tags there
is no feature-richer variant — the only non-semver tags are 2023–24 Clojure-era
downgrades. None of the compiled-out features can be enabled by configuration.

### 8.2 What the sweep found in our own code

Reading the substrate properly turned up four defects in what we shipped. None
were visible from inside the service, because the port has no slot for the
capability each one concerns. Recorded here; none are fixed yet.

**D13 — `push` is a read-then-write, and loses updates under concurrency.**
Measured on this server: 20 concurrent updates through a read-then-write loop lost
**19**, every response a 200, and the observed `t` sequence ran *backwards*. The
same workload expressed as a conditional write (`POST /update` with a `where`
guard) applied 20 of 20. The control — the same payload with `where` misspelled —
applied 20 of 20 as well, proving the guard is genuinely evaluated rather than
ignored.

This is latent today because nothing writes concurrently. It stops being latent
the moment more than one agent drives a stream, which is exactly the trial we are
building toward. **This should be settled before the trial, not discovered during
it.**

**D14 — the write receipt is read wrongly.** The provider parses
`{ t, commit.hash }` and records `commit.hash` as a commit id. On a no-op
transaction that field is a **fixed sentinel** —
`bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi` — identical
across ledgers and absent from every commit log. So a no-op currently writes a
non-existent commit id into `LedgerCommit.commit`.

The sentinel is also the *correct* oracle for whether a conditional write applied.
The obvious alternative — comparing `t` against a value read beforehand — gives a
false positive whenever another writer commits in between, which is precisely the
concurrent case it would be there to handle.

**D15 — idempotency is available and unused.** The standard `Idempotency-Key`
header works on this single node, scoped per ledger, and rejects a reused key
carrying a different body with a 409. Retrying a push is currently unsafe in a way
it does not need to be.

**D16 — coherent multi-read is available, and imperfect.** `POST /multi-query`
runs several reads against one pinned snapshot. It is better than what we do now,
but it is not atomic: measured tear rates around 1%, and on a tear it *misreports*
the `t` it claims to have used. An integer `asOf` pin is exact. If we adopt it, pin
explicitly rather than trusting the envelope.

**One thing the sweep confirmed we got right.** D10's reified transition nodes are
the correct model. Native entity history is subject-scoped and reports raw triple
deltas; it cannot express `admitted → cleared → peeled-off` as a thing with its own
time and reason. Keeping our own transition vocabulary was the right call — though
for a different reason than originally argued, since the reified nodes turn out to
be natively reachable too.

### What the ladder became

| # | Scenario | Status |
|---|---|---|
| 1 | Append-only truth | Available; re-run under D7/D10 grammar |
| 2 | Temporal reconstruction | **Verified available** across all four selectors. `@recorded:` is a second, distinct time axis worth adopting |
| 3 | Derivation edges | Available; strengthened by D10 |
| 4 | SHACL at transaction time | **Verified available** — frame law enforced by the substrate |
| 5 | OWL/RDFS reasoning | **Verified available.** `rdfs` and `owl2rl` both entail. See D12 — this is a real model upgrade, not a demo |
| 6 | BM25 / HNSW resonance | **Verified available** in the form we need — real BM25 and an exact SIMD top-k vector lane, both over plain HTTP. Only the graph-source form is gated, by wiring the vendor calls a near-term gap |
| 7 | Branch/merge isolation | **Verified available** — and promoted from a scenario to a core capability by D11 |

### D12 — the frame's law becomes an ontology, not a list of strings

Reasoning being real changes the model, exactly as §8 predicted it would.

Today a boundary requires the literal tag `reviewed`, and an item either
carries that exact string or does not. With RDFS entailment, tags become
classes and the frame can declare that carrying `verified` *entails* carrying
`reviewed`:

```
ws:tag/verified  rdfs:subClassOf  ws:tag/reviewed
```

An item that cleared a stricter gate then satisfies a weaker one without
anybody restating the fact. The law stops being a list of magic strings and
becomes a declared hierarchy the substrate reasons over — which is what the
work-stream model always meant by "revised under law."

**This is no longer a straightforward adoption, and the decision is open.**
Investigating it properly turned up three facts that were not visible when it was
first written, and two of them cut against the obvious implementation.

**1. The cheap reasoning modes are time-travel-unsafe.** Under `rdfs` and `owl2ql`,
the schema applied at a historical `t` is `(schema at t) ∪ (schema at HEAD)`. A
query at `@t:1` returns entailments from axioms **asserted afterwards**.
Deterministic, order-independent, reproduced on fresh ledgers in both query orders.
`owl2rl` and `owl-datalog` are correct.

For this record specifically, that is close to disqualifying. The whole claim of
the frame is that a read at `t` is faithful to what was true at `t`. A law that
reaches backwards in time is precisely the property we built on Fluree to avoid.

**2. Asserting `rdfs:subClassOf` into the ledger has consequences well outside
querying.** With a SHACL shape targeting `ws:Reviewed`, a byte-identical write that
was accepted (200) becomes rejected (400) once `ws:Verified subClassOf ws:Reviewed`
is asserted — with no reasoning key on either write. Data that was legal when
written becomes retroactively non-conformant. The same assertion silently revoked
policy-filtered reads, 1 row to 0. Widening the hierarchy widens every grant and
every constraint attached to the parent, at once, retroactively.

That makes writing the law into the ledger a one-way door with a blast radius —
and a strange one for an append-only record, since the *record* is immutable while
its *admissibility* is not.

**3. There is a third option nobody had considered.** A per-query top-level
`ontology` field supplies axioms for that query alone. Same entailment, arbitrary
depth, nothing written to the ledger — therefore no SHACL admission change, no
policy widening, no storage, and no axiom whose assertion time we would have to
reason about. Verified with a misspelled-key control and against a live SHACL shape
that continues to admit the write.

So the real choice is not "ontology vs. list of strings". It is:

| Option | Entailment | Time-travel faithful | Touches the record | Cost |
|---|---|---|---|---|
| **A.** Keep literal tags | none | n/a | no | zero; the law stays a list of strings |
| **B.** Axioms in the ledger + `rdfs` | yes | **no** — future axioms leak backwards | yes, and retroactively changes SHACL and policy | one-way door |
| **C.** Axioms in the ledger + `owl2rl` | yes | yes | yes, same retroactive coupling | higher fuel; still a one-way door |
| **D.** Per-query `ontology` field | yes | yes — no axiom has an assertion time | **no** | the law lives in the service, not the record |

D looks strongest on every axis except one, and that one may be decisive: the law
stops being *recorded*. A future reader of the ledger could no longer reconstruct
why an item cleared a boundary, because the entailment that let it through was
supplied by the querying process and never written down. For a system whose premise
is that the record answers questions on its own, that is a real loss — arguably
the same loss D10 was fixed to prevent.

There may be a fifth option that keeps both properties: record the law as ordinary
data for provenance, but never assert it as `rdfs:subClassOf`, and feed it to the
`ontology` field at query time. The record then explains itself without the
substrate acting on it. This has not been tested.

**Recommendation: do not adopt B.** Beyond that the decision is genuinely open and
belongs to the user. Whichever way it goes, it lands after D7–D11 are green — a
third simultaneous model change would make a regression impossible to attribute.

The provider-neutrality cost noted originally still applies to A/B/C: the ledger
contract would gain an optional reasoning mode, and the memory provider would need
`subClassOf` closure to keep the port from being quietly Fluree-only. Option D
changes that calculus, since the closure would live in the service for every
provider alike.

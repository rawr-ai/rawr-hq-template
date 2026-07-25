# Fluree — substrate reference

What we have established about Fluree by using it, verified against the running
server rather than inferred. This is the working knowledge behind the adapter in
[`index.ts`](./index.ts); [`AGENTS.md`](./AGENTS.md) routes, this documents.

**Scope.** `fluree/server:latest` = **v4.1.4**, rev `07316fa4405482…`, built
2026-07-23, run under podman as `fluree-ws`. Everything below was observed on that
build. Fluree is under active development and several findings here are explicitly
about things that are *not yet wired* — re-check them after a version bump.

**How to add to this.** Append findings as you establish them, and record the
differential that proves each one — not the conclusion alone. A claim without the
experiment that separates it from its opposite is the thing this document exists to
prevent. If something is unresolved, say so under [Open questions](#open-questions)
rather than rounding it to absent.

---

## 1. The two laws

Everything painful about this API descends from these.

### Law 1 — a 200 proves acceptance, never application

The server **silently ignores unrecognised request keys**. It does not warn, does
not 400, does not echo. Confirmed by control: adding `"totallyBogusKey":{"a":1}` to
a query returns 200 and normal results.

This is not a curiosity. It is how we spent a session believing reasoning was
missing, having sent `opts.reasoner` — a key that does not exist — instead of the
top-level `reasoning`. The 200 read as "feature absent" when it meant "field
discarded".

> **Rule.** Every capability probe needs a *differential*: two requests that must
> return different things if the feature is real. Include a deliberately misspelled
> key as a control. If the misspelling behaves the same as the real key, you have
> learned nothing.

The write path has the same trap. `POST /transact` with a top-level `insert` key
returns `200 {"t":0,"commit":{"hash":""}}` and writes **nothing** — `/transact` is
not a route on this build.

### Law 2 — distinguish "off" from "no match" from "absent"

Three different negatives look alike and mean different things:

| Signal | Means |
|---|---|
| `fulltext()` → `null` | the property has no full-text arena — **feature not active here** |
| `fulltext()` → `0.0` | arena is live, this document has none of the terms — **feature active, no match** |
| `[]` from a query | could be either, plus "you wrote the query wrong" |

Assert on `null`-vs-number, never on empty-vs-non-empty.

`config.toml` deserves its own warning: it silently accepts both **inactive** and
**unknown** sections. The image's own shipped template advertises
`# [server.auth.jwks]` for `oidc`, which is compiled *out*. Supplying a real jwks
section starts cleanly and is indistinguishable from supplying
`[server.auth.totalnonsense]`. **`config.toml` can never be used as a feature probe.**

---

## 2. This build

### Version — 4.1.4 is current, and no other image helps

- GitHub `releases/latest` → `v4.1.4`. Tags `latest`, `4`, `4.1`, `4.1.4` all
  resolve to the same digest (`sha256:e34efd2f…`; the arm64 manifest we run is
  `ef6d159a`).
- 72 tags exist. **No feature-richer variant.** The only non-semver tags
  (`stable`, `llm-internal-beta`, `nexus-public-preview`) are 2023–24 Clojure-era
  191 MB images — downgrades, not alternatives.
- `fluree/search-httpd` and `fluree/search` do not exist (404 on Docker Hub), and
  no such binary ships in the image.

### Compiled features

| On | Off |
|---|---|
| `native`, `shacl`, `credential`, `iceberg`, `aws`, `bolt`, `mcp` | `vector`, `ipfs`, `oidc`, `otel`, `swagger-ui` |

**None of the "off" set can be enabled by configuration** — `--jwks-issuer`,
`--otel-endpoint`, `--swagger-ui`, `--vector-enabled` are all rejected as
*unexpected argument*. `bolt` and `mcp` are compiled but config-gated
(`--bolt-listen-addr`, `--mcp-enabled`).

There is **no feature-discovery endpoint** — `reference/compatibility.md` states
this outright. `/health` returns `{"status":"ok","version":"4.1.4"}`, `/stats`
returns uptime/storage/indexing.

Evidence quality note: crate-list absence proves nothing. `ed25519-dalek` shows
zero registry-path hits, yet `credential` is provably on (a tampered payload gives
*"Verification equation was not satisfied"* — real curve math). Cite runtime
behaviour, never `strings` counts.

### The docs are in the binary

Version-pinned to this exact build, and **authoritative over anything on the web**:

```bash
podman exec fluree-ws /usr/local/bin/fluree docs tree
podman exec fluree-ws /usr/local/bin/fluree docs get indexing-and-search/bm25.md
podman exec fluree-ws /usr/local/bin/fluree docs search "time travel"
podman exec fluree-ws /usr/local/bin/fluree docs examples reasoning
```

221 pages. Read these first. `docs get <page> --anchor <bad>` misreports as
*"no docs page found"* even when the page exists — retry without `--anchor`.

The container has `grep` and `tr` but **not `strings`**. To inspect the binary,
`podman cp` it out first.

---

## 3. Routes

**64 route patterns** — 3 at server root, 61 under `/v1/fluree`. A 65th (`/mcp`)
appears when `FLUREE_MCP_ENABLED` is set. Verified by extracting the axum table
from the binary and confirming every one live.

### Why bare-path probing undercounts by a third

Ledger-scoped routes register as greedy wildcard tails — `/{name}/{*ledger}` — which
require at least one path segment. **Thirteen routes 404 at their bare path while
existing**: `/validate`, `/show`, `/log`, `/export`, `/info`, `/exists`, `/context`,
`/merge-preview`, `/revert-preview`, `/commits`, `/pack`, `/push`, `/import`.

`GET /swagger.json` returns 200 but is a 641-byte stub listing 4 paths. Using it for
discovery undercounts by ~60 routes.

### The existence oracle

`PATCH` is registered nowhere, so it discriminates cleanly:

```bash
curl -s -D - -o /dev/null -X PATCH http://localhost:8090/v1/fluree/<path>
# 405 + `allow:` header  -> route exists, and allow: lists its exact methods
# 404                    -> not registered under this configuration
```

**The oracle has one blind spot.** `/mcp` is *registration*-gated: when disabled it
is absent entirely (bare 404, invisible), and when enabled it answers **401, not
405**, because auth middleware precedes method routing. So a 404 proves "not
registered under this configuration" — never "does not exist in this build".

### Inventory

**Root (3)** — outside the API base

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD | `/health` | `{"status":"ok","version":"4.1.4"}` |
| GET, HEAD | `/.well-known/fluree.json` | discovery: `api_base_url`, `import.modes`, `serving` |
| GET, HEAD | `/swagger.json` | 4-path stub — **not** an inventory |

**Diagnostics (3)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD | `/stats` | uptime, storage type, indexing, cached ledgers, version |
| GET, HEAD | `/whoami` | bearer-token introspection |
| GET, HEAD | `/ledgers` | every ledger + graph source, as a bare JSON array |

**Writes (8)**

| Methods | Path | Purpose |
|---|---|---|
| POST | `/update`, `/update/{*L}` | WHERE/DELETE/INSERT, SPARQL UPDATE, Cypher — **the only conditional-write surface** |
| POST | `/insert`, `/insert/{*L}` | JSON-LD / Turtle / N-Triples |
| POST | `/upsert`, `/upsert/{*L}` | as insert, plus TriG; **dedupes identical re-inserts** |
| POST | `/push/{*L}` | precomputed commit blobs, git-style |
| POST | `/import/{*L}` | restore a `.flpack` into a new ledger |

**Reads (8)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD, POST | `/query`, `/query/{*L}` | JSON-LD Query, SPARQL, Cypher; history via `from`+`to` |
| POST | `/multi-query` | several sub-queries on one **pinned snapshot**. No tail form |
| POST | `/stream/query`, `/stream/query/{*L}` | NDJSON incremental |
| GET, HEAD, POST | `/explain`, `/explain/{*L}` | **plan without executing** |
| GET, HEAD, POST | `/validate/{*L}` | SHACL report on demand |

**Audit (4)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD | `/log/{*L}` | commit summaries, newest-first; `?limit=` clamps at **5000** |
| GET, HEAD | `/show/{*L}` | decode one commit; `?commit=` takes `t:N`, hex, hex-prefix **or** CID |
| GET, HEAD | `/commits/{*L}` | raw blobs — storage-proxy gated, **404 here** |
| POST | `/pack/{*L}` | binary bulk transport — storage-proxy gated, **404 here** |

**Ledger & branch (14)**

| Methods | Path | Purpose |
|---|---|---|
| POST | `/create` | → 201. Accepts only `{ledger}` |
| POST | `/drop` | drops the **whole ledger**; a branch-qualified id is a 400 |
| POST | `/drop-branch` | drops **one** branch; never `main` |
| POST | `/drop-graph` | retracts a named graph **as a new commit** — history preserved |
| POST | `/branch` | create branch, optional `at:` |
| GET, HEAD | `/branch/{*N}` | list live branches |
| POST | `/rebase` | 5 strategies |
| POST | `/merge` | FF or 3-way, 4 strategies |
| GET, HEAD | `/merge-preview/{*N}` | ahead/behind, conflicts, netted changes |
| POST | `/revert` | **undocumented** — compensating commit |
| GET, HEAD | `/revert-preview/{*N}` | **undocumented** — dry run |
| GET, HEAD, PUT | `/context/{*L}` | default JSON-LD context (CAS; may 409) |
| GET, HEAD | `/info/{*L}` | `t`, `commitId`, `indexId`, graph/property stats |
| GET, HEAD | `/exists/{*L}` | nameservice existence check |

**Admin (2)** — `/reindex`, `/export/{*L}` (supports point-in-time `at`).

**Events (3)** — `/events` (SSE; only `?all=true` delivers), `/subscribe` and
`/remote/{path}` are 501 stubs.

**Submissions (1)** — `/submissions/{key}/{*L}`, idempotency-key status lookup.

**Gated off on this server (13)** — 8 storage-proxy / nameservice-sync routes and
5 negotiated-upload routes. They exist in the table but 404 at runtime.

**Iceberg (5)** — `/iceberg/map`, `/iceberg/catalog/{browse,preview}`,
`/iceberg/r2rml/{generate,validate}`. Compiled in; the only graph-source *creation*
surface that exists.

`/revert` and `/revert-preview` are absent from the embedded docs entirely
(`docs search "revert"` → no matches) and have no CLI subcommand. They are real:
`POST /revert` with no body → 400 *"Exactly one of `commit`, `commits`, or `range`
must be provided"*.

---

## 4. Addressing and time

A ledger id is `name:branch`. `ws:main` and `ws:feature` are two branches of one
ledger, addressed as separate ledger ids.

Time travel is a **suffix on the ledger reference** — `ws:main@t:1` — not a field.
A top-level `t` in the query body is silently discarded (Law 1).

### The four selectors

| Selector | Argument | Axis |
|---|---|---|
| `@t:<N>` | integer only — **`@t:latest` fails with 400** despite the docs | transaction number |
| `@iso:<ts>` | ISO-8601 | **event** time (`f:time`) — what the change is *about* |
| `@recorded:<ts>` | ISO-8601 | **audit** time (`f:receivedAt`) — when it was *loaded* |
| `@commit:<hex>` | lowercase hex, anchored prefix, 6–64 chars | exact commit |

`@iso:` and `@recorded:` are genuinely different axes: at one instant an audit-time
query returned 1 row where the event-time query returned 3. For a record that must
answer "what did we know, when", `@recorded:` is the honest axis and we have not
been using it.

An unknown selector 400s and enumerates the valid set — a rare case of the server
being helpful.

### `@commit:` takes hex, not the CID it hands you

This was our longest-standing unknown. `/log`, `/show` and every transaction
response return a base32 CID like `bagaybqabciq…`. `@commit:` **does not accept
it** — it wants the raw SHA-256 hex digest. They are the same 32 bytes in different
encodings:

```
01            CIDv1 version
81 80 C0 01   varint multicodec 0x300001 = ContentKind::Commit
12            multihash 0x12 = sha2-256
20            digest length = 32 bytes
<32 bytes>    the SHA-256 digest   <- @commit: wants this, hex-encoded
```

`018180c0011220` is a constant 7-byte header on every commit CID, and its base32
encoding is literally `bagaybqabciq` — which is why every commit id in this
deployment looks alike. **The first twelve characters are a type tag, not entropy.**
Feeding the CID to `@commit:` matches nothing at any prefix length, because the
CID's leading characters appear nowhere in the hex keyspace. Reindexing was never
relevant.

Three ways to get the hex:

| Path | Source | Conversion |
|---|---|---|
| **1** (preferred) | `f:address` in the `#txn-meta` graph | none — it *is* the hex |
| **2** | `commit.hash` / `commit_id` | base32-decode, drop 7 bytes, hex-encode |
| **3** (simplest) | `GET /show/{L}?commit=<CID>` returns `t` → then use `@t:<N>` | none |

`/show` accepts all four forms — CID, hex, hex-prefix, and `t:N`. It is the only
route that does, and that asymmetry is the clearest proof the gap is localised to
the `@commit:` resolver.

Grammar: `<6` chars → 400; 6–64 → ok; `>64` → *"Commit prefix too long"*. Ambiguous
prefixes **error (500) and list candidates** rather than picking one — on a
10,000-commit ledger, three 6-character prefixes collided (birthday expectation:
2.98).

### History ranges — `to` does not bound

`POST /query` with `from` and `to` performs a history query. **`to` is validated and
then ignored**: on a 90-commit ledger, `from t:10 to t:20` returns t=10…90. The
range is always `[from, head]`.

`query/datasets.md` documents `commit_id`, `iso` and `sha` keys in the `from`
object. All three are **silently ignored**. Only `t` and `at` work.

### Read-after-write

`/info.t` is **not** read-after-write safe — it lags in 11 of 12 fresh-ledger trials
(receipt says `t=1`, `/info` says `t=0`). `/log[0].t` never lagged. Use the receipt
`t` or `/log`, or send the `Fluree-Min-T` header. Waiting on a `t` that never
arrives 408s with `ReadAfterWriteTimeout`.

---

## 5. Writes

`/insert` does **not** auto-create — writing to an uncreated ledger returns
`500 Ledger not found`. Always `POST /create` first.

### Conditional writes are the only safe concurrent path

`POST /update` takes `where` / `delete` / `insert` and applies atomically. If the
guard no longer holds, the whole transaction is a no-op.

```bash
curl -sX POST "$B/update?ledger=ws:main" -H 'Content-Type: application/json' -d '{
 "@context":{"ws":"https://rawr.dev/ns/workstream#"},
 "where":  {"@id":"ws:item/a1","ws:status":"admitted"},
 "delete": {"@id":"ws:item/a1","ws:status":"admitted"},
 "insert": {"@id":"ws:item/a1","ws:status":"cleared"}}'
```

**Measured, on this server:** 20 concurrent atomic increments → 20 applied, `t=2…21`,
counter=20. The same workload as read-then-write → **19 of 20 lost**, every response
a 200, and the observed `t` sequence *goes backwards*. Control: the same payload with
`where` misspelled `wheer` applied 20 of 20 — proving the guard is genuinely
evaluated and not ignored.

### Detecting whether a conditional write applied

Both outcomes return 200 with a well-formed receipt. Two candidate oracles, and only
one is sound:

- ❌ `receipt.t > t_before` — **unsound under concurrency**. Another writer
  committing in between produces a false positive. Demonstrated deterministically.
- ✅ `commit.hash == <no-op sentinel>` — exact. On every no-op, across ledgers and
  no-op shapes, `commit.hash` is the fixed string
  `bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi`. It is stable
  across time and ledger lifetimes, and **appears in no commit log** — it is not a
  commit id at all.

`create` is a third case: `t=0`, `hash=""`.

### Idempotency

The standard **`Idempotency-Key`** HTTP header works, on a single node, without raft:

```
3× increment, same key       -> t=2, t=2, t=2 | counter = 1
3× increment, different keys -> t=2, t=3, t=4 | counter = 3
same key, different body     -> 409 err:db/CommitConflict, second body not applied
same key, different ledger   -> executes (the cache is ledger-scoped)
```

`Fluree-Idempotency-Key`, `opts.idempotencyKey` and friends are **inert** — Law 1
again. Documented under `POST /push` in `api/endpoints.md`, but it applies broadly.

`/upsert` dedupes an identical re-insert (one commit for three writes); `/insert`
does not.

### Commit messages

A top-level `f:message` (with `f` bound to `https://ns.flur.ee/db#`) writes the
commit message and `/log` returns it. A bare top-level `message` writes an
un-namespaced predicate that `/log` ignores.

---

## 6. Reads

### Shared snapshot — real, but not tear-free

`POST /multi-query` runs several sub-queries against one pinned snapshot and reports
`snapshot.ledgers` — the exact `t` each sub-query saw. This is genuinely better than
issuing separate reads.

But it is **not atomic**: measured tear rates of 2/200, 1/60, 1/60 — never zero. On
a tear, `snapshot.ledgers` **misreports `t`** (claimed 111 while a sub-query saw
105). This is a single-ledger envelope, so the documented cross-ledger caveat does
not cover it.

An integer `"asOf": <t>` pin **is** exact. If coherence must be guaranteed, pin
explicitly rather than trusting the envelope.

### Explain

`/explain` returns the physical plan without executing. Useful, with one sharp
caveat — see the vector fast-path warning in §7.

---

## 7. Search

### Full-text is real BM25, and it works

Inline `fulltext()` is not a substring match. It is BM25 with Snowball stemming, term
frequency weighting and document-length normalisation. Three differentials a
substring match cannot produce:

- *"Trust busting … encrusted monopolies"* scores **0.0** for `rust` — substring
  gives a false positive.
- A document containing only *"programming"* is a hit for the query `programs` —
  via the Snowball stem `program`. Substring finds nothing.
- A short document with 1 occurrence **outranks** a long document with 3.

Two ways to enable it:

| Path | Effect on stored data |
|---|---|
| `@fulltext` datatype | replaces the stored datatype with `f:fullText` — visible in exports and to every downstream RDF consumer |
| `f:fullTextDefaults` in the `#config` graph | values stay `xsd:string` / `rdf:langString` |

**Prefer the config path** for anything that leaves the system. Scores are
byte-identical between them.

```bash
# 1. create, 2. config BEFORE data, 3. insert, 4. query
curl -sX POST "$B/update?ledger=mydb:main" -H 'Content-Type: application/sparql-update' \
 --data-binary '
PREFIX f: <https://ns.flur.ee/db#>
PREFIX ex: <http://example.org/>
INSERT DATA {
  GRAPH <urn:fluree:mydb:main#config> {
    <urn:fluree:mydb:main:config:ledger> a f:LedgerConfig ;
      f:fullTextDefaults [ a f:FullTextDefaults ; f:defaultLanguage "en" ;
                           f:property [ a f:FullTextProperty ; f:target ex:body ] ] .
  }}'
```

**The documented JSON-LD config form is broken on this build.** Posted to `/update`
it 400s; posted to `/insert`, the `@graph` placement directive puts only the
top-level subject in the config graph while the nested blank nodes land in the
default graph — producing a silently dead 2-flake config where a live one is 7.
Use SPARQL UPDATE with an explicit `GRAPH` block.

Ordering matters: **config before data** is the clean path. `fluree reindex` does
**not** retro-index values written before the config commit, contradicting two doc
pages. The retrofit that works is: write config → write one value on a configured
property → `fluree index`.

There is a sub-second race after insert while background indexing builds the arena;
poll until scores are non-null rather than asserting once.

`fulltext()` is **JSON-LD-query only** — SPARQL rejects it in every form. Scores are
corpus-relative; use them for ordering within one query, never as absolute
relevance, and never compare them across an index boundary.

### Vector — inline works, and there is a fast path we did not know about

`@vector` datatype plus `dotProduct` / `cosineSimilarity` / `euclideanDistance`,
available in both JSON-LD Query and SPARQL, with exact math (verified against known
angles: `√2/2`, `-1.0`, `0.0`).

Beyond that, the planner selects a compiled **`FastPath:vector-topk`** — a runtime-SIMD,
parallel shard-scan, **exact** top-k lane. Not approximate; every vector is scored,
and scores are bit-identical to the general pipeline. Measured 4.1× faster at
5,000×32 and 7.5× at 10,000×128 against payload-identical controls.

Selecting it is fussier than it looks:

- The query vector **must** arrive through a single-row `values` clause. Inlining it
  as an object argument to `bind` is a parse error — and a *flat* 3-element array
  form returns **HTTP 200 with `[]`**, a silent wrong answer.
- `orderBy DESC(?score)` qualifies. `limit` **alone** disqualifies. Neither
  qualifies.
- SPARQL never reaches it, even for the byte-exact shape.

> ⚠️ **`explain` lies about this.** Under time travel and under policy-enforced
> views, `plan.physical.op` still reports `FastPath:vector-topk` while the query
> actually runs 4–6× slower (fuel 1.05 → 3.01 and → 31.0). Do not assert on
> `plan.physical.op` to check the lane — assert on returned **`fuel`** staying flat
> (~1.0–1.1) and not growing with N. The fast path also bypasses fuel metering
> entirely, so `maxFuel` cannot cap a vector scan.

### What is genuinely gated

The **graph-source** form — `f:graphSource` + `f:searchText` / `f:queryVector` — is
category (b): present but unwired.

```
BM25   -> 400 "BM25 IndexSearch requires ExecutionContext.bm25_search_provider
               or bm25_provider (not configured)"
vector -> 400 "VectorSearch requires ExecutionContext.vector_provider (not configured)"
```

Attacked from five directions, all failing identically: a garbage graph-source name
gives a **byte-identical** error to a plausible one (so the gate fires *before* name
resolution); the CLI `--direct` path — a separate process building its own context,
not the HTTP router — fails the same way while inline `fulltext()` works in that same
process; every plausible provider flag is rejected as unexpected; a hand-written
nameservice record changes nothing; and `config.toml` has no provider key.

The authoritative citation is in the vendor's own docs, `graph-sources/bm25.md`: the
server "has the plumbing to consult a per-graph-source `SearchDeploymentConfig`", but
this wiring "is not yet exposed end-to-end" and the deployment field "is not persisted
to the nameservice config record by today's create flow. **Track this as a near-term
gap.**"

BM25 and vector are blocked by the *same* wiring gap, but they are not the same
severity: BM25's engine is demonstrably compiled (inline scoring proves it), so it is
purely unexposed wiring. Vector additionally lacks the `vector` cargo feature —
`usearch` is a C++ library and the binary links no libstdc++. **Fixing the wiring
would plausibly unblock BM25 but not HNSW.**

---

## 8. Reasoning

Opt-in per query via a **top-level `reasoning`** key. Not `opts.reasoner` — that key
does not exist and is silently discarded.

| Mode | Gives |
|---|---|
| `none` (default) | nothing |
| `rdfs` | arbitrary-depth transitive `subClassOf` — 3-hop verified |
| `owl2ql` | as rdfs, plus QL profile |
| `owl2rl` | full RL materialisation into results |
| `datalog` / `owl-datalog` | rule-driven |

An unknown mode 400s and enumerates the valid set. A misspelled *key* silently does
nothing — always run that control.

Cost is negligible: fuel 1.09 vs 1.03 baseline. Reasoning never advances `t` and
never writes. SPARQL uses `# PRAGMA reasoning: <mode>`, which is honoured on any
line, not just the first.

### Three behaviours that matter more than the mode list

**1. `rdfs` and `owl2ql` are time-travel-unsafe.** The schema used at a historical
`t` is `(schema at t) ∪ (schema at HEAD)`. A query at `@t:1` returns entailments from
axioms **asserted later**. Deterministic, order-independent, reproduced on fresh
ledgers in both query orders. `owl2rl` and `owl-datalog` are correct.

For a record whose entire premise is that a read at `t` is faithful, this is
disqualifying for the cheap modes.

**2. `rdfs`/`owl2ql` are pattern rewriters, not materialisers.** They rewrite the
pattern you asked for. They are invisible to `@type ?t`, to variable-predicate scans,
and to graph-crawl projections (`{"?s":["*"]}` returns identical output under `none`,
`rdfs` and `owl2rl`). `owl2rl` materialises into results and *is* visible to
`@type ?t`.

**3. Asserting `rdfs:subClassOf` into the ledger has side effects far outside
querying.** With a SHACL shape targeting `ws:Reviewed`, a byte-identical write that
was accepted (200) becomes **rejected (400)** once `ws:Verified subClassOf
ws:Reviewed` is asserted — no reasoning key involved on either write. Data that was
legal when written is retroactively non-conformant. Separately, the same assertion
**silently revoked policy-filtered reads** (1 row → 0 rows). Schema assertion is a
one-way door with a blast radius.

### The alternative most likely to be right

A **per-query top-level `ontology`** field supplies axioms for that query alone:

```json
{"reasoning":"rdfs",
 "ontology":{"@context":{...},"@id":"ws:Verified","rdfs:subClassOf":{"@id":"ws:Reviewed"}}}
```

Same entailment, **nothing written to the ledger** — so no SHACL admission change,
no policy widening, no storage, no audit trail to reason about. Verified with a
misspelled-key control, and with a live SHACL shape that continues to admit the write.

### Configuration gotcha

Ledger-wide `f:reasoningDefaults` and cross-ledger `f:schemaSource` **do** work — but
only on the **dataset/array** `from` path (`"from":["ledger:main"]`) and on SPARQL.
The scalar form (`"from":"ledger:main"`) silently discards both. A misconfigured
`f:schemaSource` reasons over the wrong graph on the scalar path while erroring
loudly on the array path.

---

## 9. Branches

Branch and merge operations take a **bare family name** in `ledger`, unlike every
other endpoint, which takes `name:branch`. Passing the qualified form yields
`name:branch:branch` and a nameservice error.

`/drop-branch` **exists** and drops a single branch (refusing `main`). `/drop` removes
the entire family. `/drop-graph` retracts a named graph as a *new commit*, so history
survives.

---

## 10. Trap index

| Trap | Consequence |
|---|---|
| Unknown request keys ignored | a 200 means accepted, never applied |
| `POST /transact` is not a route | 200, `t:0`, writes nothing |
| `insert` does not auto-create | 500 *Ledger not found* |
| `fulltext()` `null` vs `0.0` | not-indexed vs no-match |
| Greedy tails | 13 real routes 404 at their bare path |
| `/swagger.json` | 4-path stub, undercounts by ~60 |
| 404 from the PATCH oracle | means "not registered here", not "absent from build" |
| `@commit:` wants hex | the CID it hands you never matches |
| Commit CIDs share 12 leading chars | that prefix is a type tag, not entropy |
| History `to` | validated, then ignored — range is `[from, head]` |
| `from{sha:}` / `{iso:}` / `{commit_id:}` | documented, all silently ignored |
| `@t:latest` | 400, despite the docs |
| `/info.t` | lags read-after-write 11/12; `/log[0].t` does not |
| Read-then-write | loses 19/20 concurrent updates, silently, with `t` regression |
| `receipt.t > before` | false-positives under concurrency; use the sentinel |
| No-op `commit.hash` | a fixed sentinel that is not a commit id |
| `Fluree-Idempotency-Key` | inert; the working header is `Idempotency-Key` |
| `/multi-query` | tears ~1%, and misreports `t` when it does |
| Documented JSON-LD fulltext config | writes a silently dead config |
| `fluree reindex` | does not retro-index pre-config values |
| `explain` under time travel/policy | reports a fast path it is not taking |
| Flat-array vector literal | 200 with `[]` — silent wrong answer |
| `rdfs`/`owl2ql` + time travel | future axioms leak into historical queries |
| Asserting `subClassOf` | retroactively changes SHACL admission and policy visibility |
| Scalar `from` | discards `f:reasoningDefaults` and `f:schemaSource` |
| `config.toml` | accepts unknown *and* inactive sections — useless as a probe |
| Container has no `strings` | `podman cp` the binary out first |

---

## Open questions

- **Whether the graph-source wiring lands upstream.** Doc says "near-term gap". Watch
  `graph-sources/bm25.md` and the `SearchDeploymentConfig` plumbing on version bumps.
- **HNSW** needs both the wiring *and* the `vector` cargo feature. Only a rebuilt or
  vendor-refreshed image changes this.
- **Why the scalar `from` path drops ledger configuration.** Established empirically;
  the code path is unknown.
- **Whether the head-schema union also affects** `rdfs:subPropertyOf`, `domain`/`range`
  and `owl:inverseOf`. Only `subClassOf` was tested.
- **Role scope.** The 64/65 route count is for the default Transaction role. `peer`,
  raft cluster and Bolt modes may register different sets.
- **What the no-op sentinel hash actually is.** Stable, shared across ledgers, absent
  from every commit log — but its provenance is unexplained.

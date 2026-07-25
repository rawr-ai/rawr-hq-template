# Fluree — substrate reference

How Fluree behaves, which of its capabilities this adapter builds on, and why those
rather than the alternatives. This is the knowledge the adapter in
[`index.ts`](./index.ts) is built from; [`AGENTS.md`](./AGENTS.md) routes, this
explains.

**Scope.** `fluree/server:latest` = **v4.1.4** (`org.opencontainers.image.revision`
`07316fa4405482…`), run under podman. Fluree is under active development and some
behaviour here concerns capabilities that exist but are not yet wired end to end;
those are marked, and are worth re-checking when the image moves.

**Extending this document.** Record the differential that establishes a behaviour,
not the conclusion alone — a claim without the experiment that separates it from its
opposite is exactly what this document exists to prevent. State behaviour in the
present tense as a property of the system. Where a capability is unavailable, name
the mechanism that makes it unavailable.

---

## 1. Two behaviours that govern everything else

### A 200 means accepted, not applied

The server ignores unrecognised request keys silently — no warning, no 400, no echo.
`{"totallyBogusKey":{"a":1}}` added to a query returns 200 and normal results. The
same holds on the write path: `POST /transact` (not a route on this build) returns
`200 {"t":0,"commit":{"hash":""}}` and writes nothing.

A misspelled key is therefore indistinguishable from a correct one by status code
alone, and an unsupported field is indistinguishable from an unset one.

> **Establishing that a capability is active requires a differential** — two requests
> that must return different results if the feature is real — plus a deliberately
> misspelled key as a control. If the misspelling behaves like the real key, the test
> has measured nothing.

### Three distinct negatives

Absence, inactivity and non-matching are separate states that look alike:

| Signal | Meaning |
|---|---|
| `fulltext()` → `null` | the property has no full-text arena — inactive here |
| `fulltext()` → `0.0` | arena is live; this document has none of the query terms |
| `[]` from a query | any of the above, or a malformed query |

Assert on `null`-vs-number, never on empty-vs-non-empty.

`config.toml` accepts unknown **and** inactive sections without complaint. The image's
shipped template advertises `[server.auth.jwks]` for `oidc`, which is not compiled in;
supplying a real jwks section and supplying `[server.auth.totalnonsense]` are
indistinguishable. **`config.toml` cannot be used to determine what a build supports.**

---

## 2. This build

### Version and variants

`4.1.4` is the current release. The tags `latest`, `4`, `4.1` and `4.1.4` all resolve
to one digest. Across the 72 published tags there is no feature-differentiated
variant — the non-semver tags (`stable`, `llm-internal-beta`, `nexus-public-preview`)
are 2023–24 Clojure-era images. `fluree/search-httpd` and `fluree/search` do not
exist, and no such binary ships in the image.

### Compiled features

| Compiled in | Not compiled in |
|---|---|
| `native`, `shacl`, `credential`, `iceberg`, `aws`, `bolt`, `mcp` | `vector`, `ipfs`, `oidc`, `otel`, `swagger-ui` |

The excluded set cannot be enabled by configuration — `--jwks-issuer`,
`--otel-endpoint`, `--swagger-ui` and `--vector-enabled` are rejected as *unexpected
argument*. `bolt` and `mcp` are compiled but gated by configuration
(`--bolt-listen-addr`, `--mcp-enabled`).

There is no feature-discovery endpoint; `reference/compatibility.md` states this
directly. `/health` reports version, `/stats` reports uptime, storage mode and
indexing state.

Feature presence is established by **runtime behaviour**, never by symbol inspection.
`ed25519-dalek` appears nowhere in the binary's crate paths while `credential` is
demonstrably active — a tampered payload yields *"Verification equation was not
satisfied"*, which is real curve arithmetic. Crate-path absence carries no
information.

### The documentation ships inside the binary

Version-pinned to the exact build, and authoritative over anything published
elsewhere:

```bash
podman exec fluree-ws /usr/local/bin/fluree docs tree
podman exec fluree-ws /usr/local/bin/fluree docs get indexing-and-search/bm25.md
podman exec fluree-ws /usr/local/bin/fluree docs search "time travel"
podman exec fluree-ws /usr/local/bin/fluree docs examples reasoning
```

221 pages. `docs get <page> --anchor <bad>` reports *"no docs page found"* even when
the page exists — retry without `--anchor`.

The container provides `grep` and `tr` but not `strings`; `podman cp` the binary out
to inspect it.

---

## 3. Routes

**64 route patterns** — 3 at server root, 61 under `/v1/fluree`. Enabling
`FLUREE_MCP_ENABLED` registers a 65th (`/mcp`).

### Ledger-scoped routes are greedy tails

Ledger-scoped routes register as `/{name}/{*ledger}` and require at least one path
segment. **Thirteen routes return 404 at their bare path while being fully
available**: `/validate`, `/show`, `/log`, `/export`, `/info`, `/exists`, `/context`,
`/merge-preview`, `/revert-preview`, `/commits`, `/pack`, `/push`, `/import`.

`GET /swagger.json` returns 200 but is a 641-byte stub describing 4 paths. It is not
an inventory.

### Determining whether a route exists

`PATCH` is registered nowhere, which makes it a non-destructive oracle:

```bash
curl -s -D - -o /dev/null -X PATCH http://localhost:8090/v1/fluree/<path>
# 405 + `allow:` header  -> route exists; allow: lists its exact methods
# 404                    -> not registered under this configuration
```

The oracle has one boundary. `/mcp` is *registration*-gated: absent entirely when
disabled, and when enabled it answers **401 rather than 405**, because auth middleware
precedes method routing. A 404 therefore establishes "not registered under this
configuration" and not "absent from this build".

### Inventory

**Root (3)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD | `/health` | `{"status":"ok","version":"4.1.4"}` |
| GET, HEAD | `/.well-known/fluree.json` | `api_base_url`, `import.modes`, `serving` |
| GET, HEAD | `/swagger.json` | 4-path stub |

**Diagnostics (3)** — `/stats`, `/whoami`, `/ledgers` (a bare JSON array of every
ledger and graph source).

**Writes (8)**

| Methods | Path | Purpose |
|---|---|---|
| POST | `/update`, `/update/{*L}` | WHERE/DELETE/INSERT, SPARQL UPDATE, Cypher — the conditional-write surface |
| POST | `/insert`, `/insert/{*L}` | JSON-LD / Turtle / N-Triples |
| POST | `/upsert`, `/upsert/{*L}` | as insert, plus TriG; deduplicates identical re-inserts |
| POST | `/push/{*L}` | precomputed commit blobs |
| POST | `/import/{*L}` | restore a `.flpack` into a new ledger |

**Reads (8)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD, POST | `/query`, `/query/{*L}` | JSON-LD Query, SPARQL, Cypher; history via `from`+`to` |
| POST | `/multi-query` | several sub-queries against one pinned snapshot; no tail form |
| POST | `/stream/query`, `/stream/query/{*L}` | NDJSON incremental |
| GET, HEAD, POST | `/explain`, `/explain/{*L}` | plan without executing |
| GET, HEAD, POST | `/validate/{*L}` | SHACL report on demand |

**Audit (4)**

| Methods | Path | Purpose |
|---|---|---|
| GET, HEAD | `/log/{*L}` | commit summaries newest-first; `?limit=` clamps at 5000 |
| GET, HEAD | `/show/{*L}` | decode one commit; `?commit=` accepts `t:N`, hex, hex prefix or CID |
| GET, HEAD | `/commits/{*L}` | raw blobs — storage-proxy gated, 404 unless enabled |
| POST | `/pack/{*L}` | binary bulk transport — storage-proxy gated |

**Ledger and branch (14)**

| Methods | Path | Purpose |
|---|---|---|
| POST | `/create` | → 201; accepts only `{ledger}` |
| POST | `/drop` | drops the whole ledger; a branch-qualified id is a 400 |
| POST | `/drop-branch` | drops one branch; refuses `main` |
| POST | `/drop-graph` | retracts a named graph as a new commit — history preserved |
| POST | `/branch` | create branch, optional `at:` |
| GET, HEAD | `/branch/{*N}` | list live branches |
| POST | `/rebase` | 5 strategies |
| POST | `/merge` | fast-forward or 3-way, 4 strategies |
| GET, HEAD | `/merge-preview/{*N}` | ahead/behind, conflicts, netted changes |
| POST | `/revert` | compensating commit |
| GET, HEAD | `/revert-preview/{*N}` | dry run |
| GET, HEAD, PUT | `/context/{*L}` | default JSON-LD context; CAS, may 409 |
| GET, HEAD | `/info/{*L}` | `t`, `commitId`, `indexId`, graph and property statistics |
| GET, HEAD | `/exists/{*L}` | nameservice existence check |

**Admin (2)** — `/reindex`, and `/export/{*L}` which supports a point-in-time `at`.

**Events (3)** — `/events` (SSE; delivers only with `?all=true`), `/subscribe` and
`/remote/{path}` are 501 stubs.

**Submissions (1)** — `/submissions/{key}/{*L}`, idempotency-key status.

**Iceberg (5)** — `/iceberg/map`, `/iceberg/catalog/{browse,preview}`,
`/iceberg/r2rml/{generate,validate}`. The only graph-source creation surface present.

**Registered but gated off (13)** — 8 storage-proxy / nameservice-sync routes and 5
negotiated-upload routes. They appear in the routing table and 404 at runtime.

`/revert` and `/revert-preview` carry no documentation (`docs search "revert"` returns
no matches) and have no CLI subcommand. They are functional: `POST /revert` with no
body returns 400 *"Exactly one of `commit`, `commits`, or `range` must be provided"*.

---

## 4. Addressing and time

A ledger id is `name:branch`. `ws:main` and `ws:feature` are two branches of one
ledger, addressed as separate ledger ids.

Time travel is a **suffix on the ledger reference** — `ws:main@t:1` — not a field. A
top-level `t` in the query body is discarded.

### The four selectors

| Selector | Argument | Axis |
|---|---|---|
| `@t:<N>` | integer only; `@t:latest` returns 400 | transaction number |
| `@iso:<ts>` | ISO-8601 | **event** time (`f:time`) — what the change is about |
| `@recorded:<ts>` | ISO-8601 | **audit** time (`f:receivedAt`) — when it was loaded |
| `@commit:<hex>` | lowercase hex, anchored prefix, 6–64 chars | one exact commit |

`@iso:` and `@recorded:` are genuinely different axes and answer different questions.
Event time answers *when did this become true*; audit time answers *when did we learn
it*. A record that must defend what was known at a point in time reads on
`@recorded:`; a record reconstructing the world as it was reads on `@iso:`.

An unrecognised selector returns 400 and enumerates the valid set.

### `@commit:` takes the digest, not the CID

`/log`, `/show` and every transaction receipt return a base32 CID (`bagaybqabciq…`).
`@commit:` consumes the raw **SHA-256 hex digest**. These encode the same 32 bytes:

```
01            CIDv1 version
81 80 C0 01   varint multicodec 0x300001 = ContentKind::Commit
12            multihash 0x12 = sha2-256
20            digest length = 32 bytes
<32 bytes>    the SHA-256 digest   <- @commit: consumes this, hex-encoded
```

`018180c0011220` is a constant 7-byte header on every commit CID, and base32-encodes
to the literal string `bagaybqabciq`. **The first twelve characters of a commit CID
are a type tag, not entropy.** A CID passed to `@commit:` matches at no prefix length,
because those leading characters occur nowhere in the hex keyspace.

Three sources for the digest:

| Path | Source | Conversion |
|---|---|---|
| **1** (preferred) | `f:address` in the `#txn-meta` graph | none — it is the hex |
| **2** | `commit.hash` / `commit_id` | base32-decode, drop 7 bytes, hex-encode |
| **3** (simplest) | `GET /show/{L}?commit=<CID>` returns `t` → address with `@t:<N>` | none |

`/show` accepts CID, hex, hex prefix and `t:N` — the only route that accepts all four.

Prefix grammar: fewer than 6 characters returns 400; 6–64 resolve; more than 64
returns *"Commit prefix too long"*. An ambiguous prefix **errors and lists the
candidates** rather than choosing one. Collisions are real at 6 characters — on a
10,000-commit ledger, three occur (birthday expectation 2.98).

### History ranges

`POST /query` with `from` and `to` performs a history query. **`to` is validated and
then ignored**: the range is always `[from, head]`. Bounding a history query requires
filtering the returned `@t` values.

`query/datasets.md` describes `commit_id`, `iso` and `sha` keys inside the `from`
object. Only `t` and `at` are honoured; the other three are discarded.

### Read-after-write

`/info.t` is not read-after-write safe and lags routinely. `/log[0].t` does not lag,
and the write receipt's own `t` is authoritative. The `Fluree-Min-T` header blocks
until a `t` is visible; waiting on a `t` that never arrives returns 408
`ReadAfterWriteTimeout`.

---

## 5. Writes

`/insert` does not create ledgers — writing to an uncreated ledger returns
`500 Ledger not found`. `POST /create` first.

### Conditional writes are the concurrency-safe path

`POST /update` accepts `where` / `delete` / `insert` and applies them atomically. When
the guard does not match, the transaction is a no-op and nothing is written.

```bash
curl -sX POST "$B/update?ledger=ws:main" -H 'Content-Type: application/json' -d '{
 "@context":{"ws":"https://rawr.dev/ns/workstream#"},
 "where":  {"@id":"ws:item/a1","ws:status":"admitted"},
 "delete": {"@id":"ws:item/a1","ws:status":"admitted"},
 "insert": {"@id":"ws:item/a1","ws:status":"cleared"}}'
```

Twenty concurrent guarded increments all apply, producing `t=2…21` and a final count
of 20. The same workload as read-then-write loses 19 of 20, returns 200 for every
lost write, and yields a `t` sequence that runs backwards. The guard is genuinely
evaluated rather than pattern-matched away: the identical payload with `where`
misspelled applies all 20.

**Any write that depends on state it has read must express that dependency as a
`where` guard.** Reading and then writing is safe only where exactly one writer
exists, and fails silently rather than loudly when that stops being true.

Related idioms:

```jsonc
// atomic increment — no read round trip
"where": [{"@id":"ex:counter","ex:count":"?old"}, ["bind","?new","(+ ?old 1)"]],
"delete": {"@id":"ex:counter","ex:count":"?old"},
"insert": {"@id":"ex:counter","ex:count":"?new"}

// insert-if-absent — the optional + not-bound idiom is required
"where": [["optional",{"@id":"ws:item/x","ws:kind":"?existing"}],
          ["filter","(not (bound ?existing))"]],
"insert": {"@id":"ws:item/x","ws:kind":"Item"}
```

A bare required pattern that matches nothing inserts nothing at all, even for an
all-literal INSERT template.

### Determining whether a conditional write applied

Both outcomes return 200 with a well-formed receipt. Two candidate signals exist and
only one is sound:

- **`commit.hash` against the no-op sentinel** — exact. Every no-op returns
  `commit.hash` = `bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi`,
  identical across ledgers and no-op shapes, and present in no commit log. It is a
  sentinel, not a commit id, and must never be stored as one.
- **`receipt.t` against a previously read `t`** — unsound. A concurrent writer
  committing in between produces a false "applied". It fails in exactly the
  concurrent case that motivates checking.

`create` is a third shape: `t=0`, `hash=""`.

### Idempotency

The standard **`Idempotency-Key`** header is honoured on a single node, scoped per
ledger:

```
3× increment, same key       -> t=2, t=2, t=2 | counter = 1
3× increment, different keys -> t=2, t=3, t=4 | counter = 3
same key, different body     -> 409 err:db/CommitConflict, second body not applied
same key, different ledger   -> executes
```

`Fluree-Idempotency-Key` and `opts.idempotencyKey` are not recognised. Together with
guarded writes this makes a retry safe: the guard prevents a stale write from
applying, and the key prevents a successful write from applying twice when the
response is lost.

`/upsert` deduplicates an identical re-insert; `/insert` commits each one.

### Commit messages

A top-level `f:message` (with `f` bound to `https://ns.flur.ee/db#`) sets the commit
message, which `/log` returns. A bare top-level `message` writes an un-namespaced
predicate that `/log` does not read.

---

## 6. Reads

### Shared snapshot

`POST /multi-query` executes several sub-queries against one pinned snapshot and
reports `snapshot.ledgers` — the `t` each sub-query observed. This is the correct
surface for reads that must agree with one another.

It is not fully atomic. Tearing occurs at roughly 1%, and on a tear
`snapshot.ledgers` reports a `t` that a sub-query did not use. An integer
`"asOf": <t>` pin is exact. **Reads that must be mutually coherent should pin
explicitly rather than rely on the envelope's own report.**

### Explain

`/explain` returns the physical plan without executing the query. Its accuracy has a
documented limit for vector queries — see §7.

---

## 7. Search

### Full-text is BM25

Inline `fulltext()` implements BM25 with Snowball stemming, term-frequency weighting
and document-length normalisation. Its behaviour is distinguishable from substring
matching in three ways that matter:

- *"Trust busting … encrusted monopolies"* scores 0.0 for `rust` — tokenisation, so
  no substring false positives.
- A document containing only *"programming"* matches the query `programs`, through the
  stem `program`.
- A short document with one occurrence outranks a long document with three.

Two activation paths exist:

| Path | Effect on stored data |
|---|---|
| `@fulltext` datatype | replaces the stored datatype with `f:fullText`, visible in exports and to every downstream RDF consumer |
| `f:fullTextDefaults` in the `#config` graph | values remain `xsd:string` / `rdf:langString` |

Scores are identical between them. **This adapter uses the config path**, because the
data leaves the system as RDF and a search-engine detail has no business changing the
datatype a consumer sees. The `@fulltext` datatype is appropriate only where values
never leave Fluree.

```bash
# create, then configure BEFORE first data, then insert, then query
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

**The configuration must be written as SPARQL UPDATE with an explicit `GRAPH` block.**
The JSON-LD form shown in the documentation does not work on this build: posted to
`/update` it returns 400, and posted to `/insert` the `@graph` placement directive
places only the top-level subject in the config graph while the nested blank nodes
land in the default graph. The result is a 2-flake configuration where a live one is
7 flakes — accepted, and inert.

Ordering is significant. **Configure before writing data.** `fluree reindex` does not
index values written before the configuration commit. Retrofitting an existing ledger
requires: write the configuration, write one value on a configured property, then
`fluree index`.

Background indexing introduces a sub-second window after insert during which scores
read `null`; poll until non-null rather than asserting once.

`fulltext()` is available in JSON-LD Query only — SPARQL rejects it in every form, so
search cannot be expressed through the SPARQL read path. Scores are corpus-relative:
they order results within one query and carry no meaning across queries or across an
index boundary.

Capacity guidance in the docs puts the inline path at under 500K documents per
predicate.

### Vector similarity

The `@vector` datatype stores f32 vectors; `dotProduct`, `cosineSimilarity` and
`euclideanDistance` are available in both JSON-LD Query and SPARQL with exact
arithmetic. The `f` prefix must be bound in `@context` for `f:embeddingVector`.

The planner also selects **`FastPath:vector-topk`**, a runtime-SIMD parallel
shard-scan producing an **exact** top-k — every vector is scored, and results are
bit-identical to the general pipeline. It is 4–7× faster on payload-identical
comparisons and requires no index and no setup.

Selecting it requires a specific shape:

- The query vector must arrive through a single-row `values` clause. Inlining it as an
  object argument to `bind` is a parse error, and a flat 3-element array returns
  **200 with `[]`** — a silent wrong answer.
- `orderBy DESC(?score)` qualifies. `limit` alone disqualifies. Neither qualifies.
- SPARQL does not reach it; only the inline functions are shared.

> **`explain` reports this lane inaccurately.** Under time travel and under
> policy-enforced views, `plan.physical.op` still names `FastPath:vector-topk` while
> the query runs 4–6× slower. Verify the lane by observing that returned **`fuel`**
> stays flat (~1.0–1.1) and does not grow with N. The fast path also bypasses fuel
> metering, so `maxFuel` cannot bound a vector scan.

### Graph-source search is not wired

The graph-source form — `f:graphSource` with `f:searchText` or `f:queryVector` — parses
and plans, then fails at operator open:

```
BM25   -> 400 "BM25 IndexSearch requires ExecutionContext.bm25_search_provider
               or bm25_provider (not configured)"
vector -> 400 "VectorSearch requires ExecutionContext.vector_provider (not configured)"
```

The gate precedes graph-source resolution — a nonexistent source name produces a
byte-identical error to a real one — and applies equally to the CLI's in-process path,
which builds its own execution context rather than using the HTTP router. No
provider flag exists on the 59-flag server surface, and no HTTP or CLI route creates
such an index. `graph-sources/bm25.md` describes the server as having "the plumbing to
consult a per-graph-source `SearchDeploymentConfig`" while that wiring "is not yet
exposed end-to-end", with the deployment field "not persisted to the nameservice
config record by today's create flow".

BM25 and vector share this gate but not its depth. BM25's scoring engine is compiled
and demonstrably working through the inline path, so BM25 is unexposed wiring alone.
HNSW additionally requires the `vector` cargo feature, and `usearch` — a C++ library —
is not linked, the binary carrying no libstdc++. Wiring alone would make BM25
reachable; HNSW needs a different build.

**This adapter therefore treats search as inline-only** and maps the graph-source
patterns to an explicit unsupported-in-this-deployment error rather than retrying.
There is no request shape that reaches a working executor and no index to point one
at, so fallback logic would be decoration.

---

## 8. Reasoning

Reasoning is opt-in per query through a **top-level `reasoning`** key. It never
advances `t` and never writes — entailments are computed for the query and discarded.

| Mode | Provides |
|---|---|
| `none` (default) | no entailment |
| `rdfs` | transitive `subClassOf` closure at arbitrary depth |
| `owl2ql` | as `rdfs`, plus the QL profile |
| `owl2rl` | RL materialisation into results |
| `datalog` / `owl-datalog` | rule-driven entailment |

An unrecognised mode returns 400 and enumerates the valid set; an unrecognised *key*
is silently discarded. Cost is negligible — fuel 1.09 against a 1.03 baseline. SPARQL
uses `# PRAGMA reasoning: <mode>`, honoured on any line and case-insensitive in the
mode name.

### Time-travel correctness differs by mode

Under `rdfs` and `owl2ql`, the schema applied at a historical `t` is
`(schema at t) ∪ (schema at HEAD)`. A query at an earlier `t` returns entailments
derived from axioms asserted afterwards. The behaviour is deterministic and
order-independent, so it cannot be avoided by query sequencing.

`owl2rl` and `owl-datalog` apply only the schema in force at the queried `t`.

**Any read that must be faithful to a point in time uses `owl2rl` or `owl-datalog`.**
The cheaper modes are correct only at head.

### Rewriting versus materialisation

`rdfs` and `owl2ql` rewrite the pattern that was asked for. They are invisible to
`@type ?t`, to variable-predicate scans, and to graph-crawl projections — `{"?s":["*"]}`
returns identical output under `none`, `rdfs` and `owl2rl`. `owl2rl` materialises into
results and is visible to `@type ?t`.

A query that asks *"is this item a `ws:Reviewed`"* is answered by all entailing modes.
A query that asks *"what types does this item have"* is answered only by `owl2rl`.

### Asserting subsumption changes admission and visibility

Asserting `rdfs:subClassOf` into a ledger has effects beyond querying, with no
reasoning key involved:

- With a SHACL shape targeting the superclass, a write that was accepted becomes
  rejected once the axiom lands. Existing facts are untouched; subsequent writes are
  judged under the new hierarchy, and an on-demand `validate` reports previously
  conformant data as non-conformant under the current law.
- Policy grants attached to a superclass extend to every newly subsumed class. A
  policy-filtered read returning one row returns none after an unrelated schema
  assertion widens the hierarchy.

This is the correct behaviour for a system whose law is versioned data: the hierarchy
is a fact with a `t`, and admission is evaluated under the law in force. It is a
hazard only where the hierarchy is treated as inert metadata.

### Supplying axioms per query

A top-level `ontology` field supplies axioms for one query without writing them:

```json
{"reasoning":"rdfs",
 "ontology":{"@context":{...},"@id":"ws:Verified","rdfs:subClassOf":{"@id":"ws:Reviewed"}}}
```

Entailment is identical, nothing is stored, and neither SHACL admission nor policy
visibility changes. The trade is that the axiom has no `t` and no presence in the
record, so a later reader cannot reconstruct which law produced a given result. **Use
this for exploratory reads; use asserted axioms wherever the entailment forms part of
what the record must be able to explain.**

### Configuration reaches only the dataset path

Ledger-wide `f:reasoningDefaults` and cross-ledger `f:schemaSource` are honoured on
the **array/dataset** form (`"from":["ledger:main"]`) and on SPARQL. The scalar form
(`"from":"ledger:main"`) discards both. A misconfigured `f:schemaSource` errors on the
array path and silently reasons over the default graph on the scalar path.

`f:overrideControl f:OverrideNone` prevents a per-query `reasoning` key from
disabling a ledger default.

---

## 9. Branches

Branch and merge operations take a **bare family name** in `ledger`, unlike every
other endpoint, which takes `name:branch`. The qualified form produces
`name:branch:branch` and a nameservice error.

`/drop-branch` removes a single branch and refuses `main`; `/drop` removes the whole
family. `/drop-graph` retracts a named graph as a new commit, preserving history.

Branch isolation is genuine: a write on a candidate branch is invisible to `main`
until merged. `/merge-preview` reports ahead, behind, conflicts and netted changes
without writing.

---

## 10. Traps

| Trap | Consequence |
|---|---|
| Unrecognised request keys | accepted silently; 200 means accepted, not applied |
| `POST /transact` | not a route; returns 200, `t:0`, writes nothing |
| `insert` on an uncreated ledger | 500 *Ledger not found* |
| `fulltext()` `null` vs `0.0` | not indexed vs indexed-and-unmatched |
| Greedy tails | 13 routes 404 at their bare path |
| `/swagger.json` | 4-path stub |
| 404 from the PATCH oracle | not registered here, not necessarily absent from the build |
| `@commit:` with a CID | never matches; it consumes the hex digest |
| Commit CID leading characters | a type tag, shared by every commit |
| History `to` | validated then ignored; range is `[from, head]` |
| `from{sha:}` / `{iso:}` / `{commit_id:}` | documented, not honoured |
| `@t:latest` | 400 |
| `/info.t` | lags read-after-write; use the receipt or `/log[0].t` |
| Read-then-write | loses concurrent updates silently, with `t` regression |
| `receipt.t` as an applied-check | false positives under concurrency |
| No-op `commit.hash` | a sentinel, not a commit id |
| `Fluree-Idempotency-Key` | not recognised; the header is `Idempotency-Key` |
| `/multi-query` | tears ~1% and misreports `t` when it does; pin with `asOf` |
| JSON-LD full-text config | writes an inert configuration |
| `fluree reindex` | does not index pre-configuration values |
| `explain` under time travel or policy | names a fast path the query is not taking |
| Flat-array vector literal | 200 with `[]` |
| `rdfs`/`owl2ql` with time travel | entails from axioms not yet asserted at that `t` |
| Scalar `from` | discards `f:reasoningDefaults` and `f:schemaSource` |
| `config.toml` | accepts unknown and inactive sections |
| `strings` in the container | absent; `podman cp` the binary out |

---

## 11. Gaps in this build

- **Graph-source search lifecycle.** The `SearchDeploymentConfig` plumbing exists but
  is not exposed through the create flow, and the deployment field is not persisted to
  the nameservice record. BM25 becomes reachable if this is wired.
- **HNSW / ANN.** Requires both that wiring and the `vector` cargo feature; `usearch`
  is not linked in this image.
- **Scalar-path configuration.** The single-view query path discards ledger
  configuration that the dataset path honours; the mechanism is not documented.
- **Head-schema union scope.** Established for `rdfs:subClassOf`; whether
  `rdfs:subPropertyOf`, `domain`/`range` and `owl:inverseOf` behave the same way is
  not established.
- **Role scope.** The route inventory describes the default Transaction role. The
  `peer` role, Raft cluster mode and Bolt may register different sets.

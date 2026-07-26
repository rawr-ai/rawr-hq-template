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
| `@t:<N>` | integer in a `from`; `latest` only where noted below | transaction number |
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
then ignored**: the range is always `[from, head]`. `from ws:main@t:1` with
`to ws:main@t:2` returns rows at `t=3` on a ledger whose head is 3, so bounding a
history query requires filtering the returned `@t` values.

Ignored is not unread. `to` is parsed, type-checked and fed into the read-after-write
gate before the bound is discarded, which is visible in what its two failure modes
are: `to ws:main@t:99` on a ledger at `t=3` returns
`408 err:db/ReadAfterWriteTimeout`, and **`@t:latest` is accepted in `to` while a
`from` rejects it** with `400 Invalid integer for @t: 'latest'`. A SPARQL
`FROM <ws:main@t:latest>` accepts it too and resolves to head, distinguishably from
ignoring it: `@t:1` restricts, and `@t:bogus` errors. **A selector is valid per
position rather than in general**, because the positions run different parsers.

`query/datasets.md` describes `commit_id`, `iso` and `sha` keys inside the `from`
object. Only `t` and `at` are honoured; the other three are discarded.

**A history projection's row count is not a commit's flake count.** A redundant
re-assert appears as one flake in `/show` and as a retraction/assertion pair at the
same `t` in the history projection. Counting flakes means reading `/log`'s
`flake_count`, `/show`'s `flakes`, or `/submissions`' `detail.flake_count`.

### The past is readable and not writable

A time-travelled reference is a read address. `POST /update?ledger=ws:main@t:1`
returns 500; the same body against `ws:main` applies. History is reconstructed by
reading at a position, never by writing at one, so a correction is a new commit at
head rather than an edit to an old one.

### Read-after-write

`/info.t` is not read-after-write safe and lags routinely. `/log[0].t` does not lag,
and the write receipt's own `t` is authoritative. The `Fluree-Min-T` header blocks
until a `t` is visible; waiting on a `t` that never arrives returns 408
`ReadAfterWriteTimeout`.

---

## 5. Writes

`/insert` does not create ledgers — writing to an uncreated ledger returns
`500 Ledger not found`. `POST /create` first.

A ledger is named in any of four places — `?ledger=`, the path tail, a body `ledger`
field, or the `Fluree-Ledger` header. Named in none of them, the request is a
`400 err:api/MissingLedger`. Only that one header spelling is read: `X-Fluree-Ledger`,
`Ledger` and `Fluree-Ledger-Id` all leave the alias missing and produce the same 400
as sending no header at all.

### A write carries its precondition

`POST /update` accepts a guard and a change and applies them in one atomic step. The
guard is evaluated against the ledger and the change is instantiated only from what it
matched, so there is no window between deciding and writing. When the guard matches
nothing, the transaction is a no-op and nothing is written.

Two request bodies reach the same evaluator. **JSON-LD** takes `where` / `delete` /
`insert` as body fields; at least one of `insert` or `delete` is required and `where`
alone is a 400. `"delete": []` is accepted and becomes a no-op, while `"insert": []`
and `"insert": {}` are 400s. `@context` is optional when every term is an absolute
IRI; with prefixed terms and no `@context` the request is a 400 naming the unresolved
prefix. Unresolved prefixes are loud, unrecognised top-level keys are silent.

**SPARQL UPDATE** (`Content-Type: application/sparql-update`) expresses the same
guard as standard syntax:

```sparql
INSERT { <ground triples> }
WHERE  { <patterns that must match>
         FILTER NOT EXISTS { <subject> <predicate> ?a0 } }
```

**A `WHERE` containing only `FILTER NOT EXISTS` groups yields one solution and
applies**, so insert-if-absent needs no positive pattern to hang the negation off. The
JSON-LD body has no `FILTER NOT EXISTS` spelling and expresses absence as an optional
join followed by a test on the unbound variable:

```jsonc
// insert-if-absent, JSON-LD — the optional + not-bound idiom is required
"where": [["optional",{"@id":"ws:item/x","ws:kind":"?existing"}],
          ["filter","(not (bound ?existing))"]],
"insert": {"@id":"ws:item/x","ws:kind":"Item"}

// atomic increment — no read round trip
"where": [{"@id":"ex:counter","ex:count":"?old"}, ["bind","?new","(+ ?old 1)"]],
"delete": {"@id":"ex:counter","ex:count":"?old"},
"insert": {"@id":"ex:counter","ex:count":"?new"}
```

A bare required pattern that matches nothing inserts nothing at all, even for an
all-literal INSERT template.

**This adapter sends SPARQL UPDATE**, for two differences between the surfaces rather
than a preference between them.

First, a damaged guard is a different kind of event on each. `WHERE` misspelled is a
parse error and a 400; the JSON-LD `where` key misspelled is just an unrecognised
top-level key, so it is discarded silently and the change applies **unconditionally**
with a 200 — the failure mode §1 opens with, arriving at the one place where a
precondition was the point. A guard is worth building only on the surface where losing
it is loud.

Second, **a JSON-LD body has no boundary between a value and a variable.** In a
`where` or `insert`, a string beginning with `?` is read as a variable rather than as
the value it looks like, and values are caller-supplied — a tag, a title. Against an
item carrying `ws:tag "clean"`:

| Guard requires | Surface | Result |
|---|---|---|
| `ws:tag "?evil"` | JSON-LD | **applies** — the string binds as a variable and matches `"clean"` |
| `ws:tag "nope"` | JSON-LD | refused, sentinel — the control that shows an absent literal does refuse |
| `ws:tag "?evil"` | SPARQL UPDATE | refused, sentinel — quoting makes it a literal, and no item carries it |

The first row is a precondition satisfied by a value chosen by whoever supplied the
tag. SPARQL is already the read path, so one term renderer escapes every value that
reaches the server and a literal lands in literal position on both paths.

### A guard spans subjects, and stops at its own line

One `INSERT` template may name several subjects; **they commit together or not at
all.** This is the shape a decision about more than one thing needs — a resolution and
the tag it grants its parent are one fact about the world, not two that might disagree:

```sparql
INSERT { ws:child_resolution ws:kind "Resolution" ; ws:ofItem ws:child .
         ws:parent ws:tag "reviewed" . }
WHERE  { ws:child ws:derivedFrom ?p ; ws:grants ?g .
         FILTER NOT EXISTS { ws:child_resolution ws:kind ?a0 } }
```

The first send applies both triples; the second is refused, so the parent never
accumulates a duplicate grant.

**Guards respect branch isolation.** The identical insert-if-absent applies on
`family:main` and applies again, independently, on `family:try`, because neither
branch's write is visible to the other — and it is refused on whichever line already
carries the fact. A precondition is therefore scoped to the line it is addressed to,
and a candidate branch needs no special handling to be guarded.

### Subject IRIs are interned, and a guard can only name what has been written

The portion of an IRI before its final separator is interned as a **namespace** and
referred to thereafter by a small integer. Path-shaped subjects therefore mint
namespaces as data arrives: writing a clearance as
`…#stream/s1/item/<item>/cleared/<boundary>` mints one namespace per item, so the
table grows with how much work has passed through a ledger rather than with how many
kinds of thing it holds.

That growth is not merely untidy. A guard that names a subject whose namespace has
never been written refers to a code with nothing behind it, and the transaction fails:

```
400 err:system/InternalError
Transaction error: Query error: Internal error:
resolve_subject_iri: no namespace prefix for code=17
```

The failure needs an accumulated table to appear — the same guard shapes succeed in
isolation — and it does not arise on `/insert`, which resolves no preconditions. It is
reached by a guarded write whose `FILTER NOT EXISTS` names a subject in a namespace no
commit has established, which is exactly what an insert-if-absent guard does when the
thing it is checking for has never yet existed anywhere in that ledger.

> **Compose subject identity into one local name rather than into a path.** With every
> subject in the vocabulary's own namespace — `ws:cleared,s1,a,b0` rather than
> `ws:stream/s1/item/a/cleared/b0` — the count is fixed at one, that one is interned by
> the first write because the predicates share it, and no precondition can name a
> namespace that does not yet exist. Escape the parts so a separator cannot occur
> inside one.

### Exactly one, and what unguarded actually does

Twenty concurrent writers claiming one single-valued fact on one subject, three runs
of each form:

| Form | Reported applied | Reported refused | Durably recorded |
|---|---|---|---|
| `INSERT … WHERE { FILTER NOT EXISTS … }` | 1 | 19 | one value |
| `INSERT DATA { … }` | 20 | 0 | **all twenty values on one subject** |

The unguarded failure here is not lost writes. Every writer is told it succeeded, and
RDF's multi-valued properties absorb the collision into a set rather than surfacing
it, so the subject ends up carrying twenty mutually contradictory answers to a
single-valued question. **The guard is what makes a single-valued claim
single-valued.**

Which idiom is sent decides whether contention excludes or serialises. Twenty
concurrent guarded *increments* all apply, producing `t=2…21` and a final count of 20,
because each one's guard rematches against the value its predecessor left. Twenty
insert-if-absent claims exclude, because the first application is what falsifies every
other guard. The same workload as read-then-write loses 19 of 20, returns 200 for
every lost write, and yields a `t` sequence that runs backwards.

**Any write that depends on state it has read must express that dependency as a
guard.** Reading and then writing is safe only where exactly one writer exists, and
fails silently rather than loudly when that stops being true.

### Determining whether a write applied

Both outcomes return 200 with a well-formed receipt. Three candidate signals exist and
only one is sound:

- **`commit.hash` against the flake-less sentinel** — exact. Every transaction that
  commits no flakes returns `commit.hash` =
  `bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi`, identical across
  ledgers and across no-op shapes, and present in no commit log.
- **`receipt.t` against a previously read `t`** — unsound. `t` in a refused receipt is
  the ledger's head at processing time, so it advances whenever anyone commits. Under
  twenty concurrent claimants every writer receives the same `t`, and no predicate over
  it separates the one winner from the nineteen losers. It fails in exactly the
  concurrent case that motivates checking.
- **`tx-id`** — not an outcome at all. It is a digest of the request body: one body
  sent twice returns one `tx-id` whether it applied or was refused, and the same body
  sent to two ledgers returns that same `tx-id` for two distinct commits. It identifies
  an intent, never a transaction and never a commit.

**The sentinel is derivable rather than magic.** It is
`CIDv1(ContentKind::Commit, sha256(""))`: the 7-byte header `018180c0011220` of §4
followed by `e3b0c442…b855`, the SHA-256 of the empty byte string. `/show` returns 404
for it. Deriving it from those parts and checking the result against what the server
returns means a build whose content tag moves fails loudly, instead of every write
afterwards reporting itself as applied.

The sentinel means *this transaction committed no flakes*, which is broader than *the
guard matched nothing*. An unmatched guard, an empty `delete`, an `insert` template
referencing an unbound variable, and a `delete` and `insert` of the same triple all
produce it. An `insert` of an already-present triple with no matching `delete` still
commits an assert flake and so does not.

> **For a guarded write whose `insert` template is non-empty and fully ground and which
> carries no `delete`, the sentinel means exactly that the guard matched nothing.**
> Every other zero-flake shape needs an empty or self-cancelling delete, an empty
> insert, or an unbound variable in the template. This adapter emits none of the three,
> which is what makes its applied-check exact rather than approximate.

Three receipt shapes exist in total: an applied write returns head+1 and a real commit
id; a refused write returns head unchanged and the sentinel; `POST /create` returns
`t=0` and `hash: ""`. An empty hash from `/update` therefore belongs to no outcome and
is a fault rather than a refusal.

Retraction is where the equivalence breaks, in both directions. A `delete` template
instantiated from a *matching* guard emits a retraction flake **even when the triple
never existed**, advancing `t` and recording a phantom retraction; the documentation's
"retracting a non-existent triple is a no-op" holds for the SPARQL `DELETE … WHERE`
form, where an unmatched `WHERE` never instantiates the template. And `delete X` plus
`insert X` in one transaction nets to zero flakes and returns the sentinel *while the
guard matched*, which reads as a refusal that never happened.

### Idempotency

The standard **`Idempotency-Key`** header is honoured on `/insert`, `/upsert`,
`/update` (both JSON and `application/sparql-update`) and `/revert`; not on `/create`
or `/query`. The header name is case-insensitive. `Fluree-Idempotency-Key`,
`X-Idempotency-Key` and a body `opts.idempotencyKey` are not recognised, and a request
carrying only those is an unkeyed request.

Keys are capped at **128 bytes**, measured in bytes rather than characters, and
enforced: a 129-byte key is a 400 naming both figures. Spaces, UUIDs and non-ASCII are
accepted. Keys are scoped per ledger — one key on two ledgers produces two independent
records.

**A replay is byte-identical to the original**: same status, same headers including the
`idempotency-key` echo, same body. The echo appears on the first execution too, so it
is not a replay marker, and a caller cannot tell from the response whether its request
executed or was deduplicated. For state correctness that is the right behaviour. A
reused key with a *different* body returns `409 err:db/CommitConflict` — *"idempotency
key collision: key already used for a different transaction"* — and writes nothing. It
reports key reuse, not a data conflict.

**A key caches the outcome, refusals included.** This is the property that decides how
a key may be derived, and it is not the one the name suggests:

```
key K, guard requires a fact that is absent   -> refused, sentinel, t=0
assert that fact, unkeyed                     -> applied, t=1
replay key K, byte-identical body             -> cached refusal, sentinel, t=0
same body, fresh key                          -> applied, t=2
```

The guard is never re-evaluated on the replay, and the receipt reports the position the
line stood at when the key was first executed rather than where it stands now.
**A key therefore identifies one attempt, not one intent.** It may be reused only to
retry a request whose response was never seen — a timeout, a dropped connection. Any
definite response, applied or refused, ends that key's life, and a proposal made again
after re-reading carries a fresh key.

Deriving a key from the content of the intended write is the natural-looking choice and
is wrong: two attempts at one intent are the same content, so the key converts a
transient refusal into a permanent one and stalls the caller with a 200.

**`GET /submissions/{key}/{ledger}` is the out-of-band record**, and it is how a lost
response is resolved by asking rather than by guessing or by sending again:

```json
{"state":"committed","idempotency_key":"K","kind":"transact",
 "commit_id":"bagaybqabciq…","t":2,
 "detail":{"operation":"transaction","flake_count":1}}
```

`state` is **not** the applied-check — a refused write is `"committed"` too, carrying
the sentinel as its `commit_id`. `detail.flake_count` is: `0` for a no-op and greater
for an applied write, agreeing with the sentinel on every case. `{"state":"unknown"}`
means the key was never executed, so the request is safe to send. The state values are
`in_flight`, `committed` and `failed`; the route accepts both the family and the
branch-qualified ledger forms.

The recognition window is **at least eight minutes, in memory, and does not survive a
restart.** No single-node TTL is documented or configurable, and the one-hour figure in
the operations documentation describes the Raft replicated state machine's cache, which
a single-node deployment does not run. Retry windows stay well inside minutes, and a
key is not relied on after a process bounce.

Together with guarded writes this makes a retry safe without making it a decision: the
guard prevents a stale write from applying, and the key prevents a write whose response
was lost from applying twice.

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
| History `to` | validated then ignored; range is `[from, head]`, though a `to` past head still 408s |
| `from{sha:}` / `{iso:}` / `{commit_id:}` | documented, not honoured |
| `@t:latest` | rejected in a `from`, accepted in a `to`; valid per position, not in general |
| History row count as a flake count | a re-assert is one flake and two projection rows |
| `POST /update` on `ledger@t:N` | 500; the past is readable and not writable |
| `/info.t` | lags read-after-write; use the receipt or `/log[0].t` |
| Read-then-write | loses concurrent updates silently, with `t` regression |
| A misspelled JSON-LD `where` key | discarded silently; the change applies unconditionally with 200 |
| A ground literal beginning with `?` in a JSON-LD `where` or `insert` | read as a variable, not as a value |
| Path-shaped subject IRIs | mint a namespace per subject; the table grows with the data |
| A guard naming a subject whose namespace no commit has written | `resolve_subject_iri: no namespace prefix for code=N` once the table has grown |
| `"insert": []` or `"insert": {}` | 400, while `"delete": []` is accepted as a no-op |
| `receipt.t` as an applied-check | false positives under concurrency; every racer receives one `t` |
| `tx-id` as a receipt id | a body digest; identical across ledgers and across distinct commits |
| No-op `commit.hash` | a sentinel, not a commit id |
| `delete X` + `insert X` in one transaction | nets to zero and returns the sentinel although the guard matched |
| `delete` of a never-existing triple under a matching guard | advances `t` and writes a phantom retraction flake |
| An idempotency key derived from the write's content | caches a refusal, making a transient one permanent |
| `submissions.state` as the applied-check | a refusal is `"committed"` too; read `detail.flake_count` |
| An idempotency key after a restart | not recognised; the store is in memory |
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
- **Single-node idempotency window.** No TTL is documented, no environment variable or
  flag exposes one, and the documented one-hour figure belongs to the Raft cache that a
  single-node deployment does not run. The lower bound is the eight minutes measured;
  the upper bound is unestablished, so a key's recognition is relied on for a retry and
  not for a reconciliation.
- **Scalar-path configuration.** The single-view query path discards ledger
  configuration that the dataset path honours; the mechanism is not documented.
- **Head-schema union scope.** Established for `rdfs:subClassOf`; whether
  `rdfs:subPropertyOf`, `domain`/`range` and `owl:inverseOf` behave the same way is
  not established.
- **Role scope.** The route inventory describes the default Transaction role. The
  `peer` role, Raft cluster mode and Bolt may register different sets.

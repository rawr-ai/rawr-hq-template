## Context

Template `main` at `4dcf206b4c043e2028545e1cf777c72019373572`
already contains the atomic controller, one native oRPC lifecycle service, closed
release construction, deterministic packaging, and native Codex/Claude
adapters. Personal RAWR HQ is a separate content and governed-record repository.

The accepted packet remains provenance at personal commit
`cc631f60c9254802be647d66662823ae47d5e7db`, project tree
`97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`. The repository-separation
amendment remains controlling at personal commit
`43a49d48ab6c6a29b4877f20576b42b533fc82ba`, blob
`10bb040317d62834806b86b36a3a14f13c539fbc`. The later proportionality
correction is recorded in [[authority-amendment]].

## Director Frame

- **Objective:** land personal content, build one complete set in one durable
  controller root, prove native Codex/Claude convergence, review one
  `current-main` record, settle approved homes, and repeat with zero mutation.
- **Hard core:** one controller; one closed release set; one owner per skill; one
  reviewed channel record; native provider state as provider truth; independent
  Template and personal repositories.
- **Exterior:** controller-store transport, alternate launchers, issuer lineage,
  hosted approval replay, promotion attestations, generalized undo, app/runtime
  composition, and protected candidate materialization.
- **Falsifiers:** a second executable selector; a transfer graph; personal
  Template code; provider mutation outside native commands; omitted members left
  enabled; or a converged repeat that mutates.
- **Proof boundary:** focused repository/channel behavior, TypeScript, lint,
  positive Habitat topology, deterministic controller build-twice proof, native
  disposable-home convergence, approved-home settlement, and a mutation-free
  repeat.

## Decisions

### Service context flows from root dependencies into module handlers

The landed C5 service shell is retained, but its `bindings/*` and public
`ports/*` surfaces are a structural error. They let host composition reach back
into module models and let controller code execute export/provider behavior
outside the service router. This correction changes placement and dependency
flow only; it does not add a service, capability, state owner, or transport.

The service root declares the minimal typed initial dependencies that an
external runtime must supply. App/CLI runtime selects and constructs concrete
resource providers, then binds those ready capabilities when it creates the
packaged service client. Module middleware may derive service-owned execution
context from those dependencies under `provided`; each module's `module.ts`
narrows that context, and procedure handlers remain the only callable owner of
domain behavior. Contract trees compose upward into the root implementer;
implementation and context flow downward into module routers. No service-root
binding facade imports module implementation upward.

At task 2A closure, the packaged service exposes its client factory, named
construction-boundary types, thin composed router boundary, and only a
specifically required contract surface. It does not export module ports,
materializers, resource adapters, repositories, module routers, or broad DTO
barrels. Consumers import the named client-construction boundary rather than
reaching through `bindings/*`, `ports/*`, or implementation paths.
Controller-owned undo remains
the generic capsule/state coordinator, while export-owned classification and
replay will run through export procedures over the service's resource context.
Native Codex/Claude mutation remains in external providers and is not
reimplemented inside service middleware.

This follows the service boundary described by
[[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#11. Service runtime boundary contract|the runtime realization spec]]
and the current Magic Migration Collect service topology. It does not redesign
`@rawr/hq-sdk`, make the lifecycle service Effectful, or reopen app/runtime
composition.

### Repository validation remains an external Template interface

`rawr agent plugins check` selects exactly one closed TypeBox request before any
port acquisition.

- `staged` reads one exact Git index/blob snapshot without authoring objects and
  revalidates it before success. A changed index returns `SourceChanged` without
  retry or writes.
- `clean` binds repository/ref/commit/tree and declared inputs, rejects dirty or
  mismatched consumed paths, and authorizes no build by itself.
The complete six-module service context remains inert; validation does not
invent an operation-specific service bag. The content-workspace resource owns
Git mechanics, while lifecycle handlers own semantic classification.

Protected research candidates are excluded from this settlement by its exact
operator input, not by a generic path-recognition gate: release construction
reads only the canonical personal-main commit and release input selected for the
operation. No C6 acceptance invocation supplies or reads the external Inngest
candidate root while `HF01_PENDING`. A pending research lane therefore does not
block unrelated landed content. The generic controller remains capable of
operating on another explicitly selected content workspace; C6 does not infer a
candidate path from its locator.

### One current-main record is the selection authority

The fixed path remains
`plugins/agents/.lifecycle/channels/current-main.json`. Its canonical v2 envelope
contains one digest over this closed body:

```json
{
  "schemaVersion": 2,
  "channel": "current-main",
  "contentAuthority": "rawr-hq",
  "sourceRepositoryIdentity": "git:github.com/rawr-ai/rawr-hq",
  "sourceCommit": "...",
  "sourceTree": "...",
  "releaseInputDigest": "ri1_...",
  "releaseSetDigest": "rs1_...",
  "evaluationProfile": "provider-smoke@v1",
  "projections": [
    {
      "provider": "claude",
      "projectionDigest": "ap1_...",
      "rendererProtocol": "...",
      "adapterProtocol": "...",
      "capabilityProfileDigest": "cp1_..."
    },
    {
      "provider": "codex",
      "projectionDigest": "ap1_...",
      "rendererProtocol": "...",
      "adapterProtocol": "...",
      "capabilityProfileDigest": "cp1_..."
    }
  ]
}
```

The displayed object is the body. The envelope is exactly
`{schemaVersion: 2, currentMainDigest, body}`. Provider bindings are the fixed
canonical tuple `[claude, codex]`; unknown, duplicate, missing, reordered, or
extra providers reject. `currentMainDigest` is `cm2_` plus SHA-256 of the UTF-8
newline-terminated canonical body bytes. The envelope is also newline-terminated
canonical JSON and is bounded to 2 MiB. The codec returns protocol
`agent-plugin-current-main@v2` out of band. Unknown fields, noncanonical bytes,
wrong digest, and invalid source identities reject.

`sourceRepositoryIdentity` is a stable repository identity, never a local path.
The source commit/tree and fixed `.rawr/release-input.json` identify the landed
content that built the immutable set. The channel record lands later as a
record-only reviewed Git change. An explicit locator supplies the absolute path
and expected stable identity; resolution observes compiled `refs/heads/main`,
verifies identity and reachability, and returns one typed
`CanonicalChannelSelection`. Governance verifies Git/record identity. Provider
planning later verifies the selected artifact and re-rendered projection bytes.
Resolution does not compare the selector to a newer release
input: later unselected content may land without silently changing the channel.
Git review and history own human approval; no approver, task, issuer, hosted
replay, or promotion lineage is encoded.

Implementation uses two semantic checkpoints without creating two authorities.
The first exposes only the pure codec through governance and the existing
`check` command; it cannot read Git or select provider state. The second adds
observed-Git resolution and removes the v1 ceremony.

The old v1 current-main resolver, acceptance-request/evidence dependency,
promotion attestation, `attest-promotion`, and receipt-owned explicit
`retire` are deleted from service contracts, routers, public exports, client,
command discovery, and the reachable graph. Canonical closed-set sync owns
omitted-member cleanup. Provider operations emit no capsule and recover through
live reinspection plus exact-prefix convergence. Qualified `undo` remains only
for managed-export capsules. There is no promotion alias or fallback.
Personal policy and evaluation inputs remain content-repository data, but they
do not become another runtime selection chain.

### Canonical provider sync stays thin and native

Canonical sync resolves the v2 record, reads the exact complete set from the
same durable controller data root used to build it, re-renders and verifies each
projection, inspects native live state, invokes native provider commands for the
necessary delta, and inspects again. Codex and Claude adapters continue to own
their native command mapping; RAWR does not implement provider caches or
installers.

Canonical Codex/Claude sync and status do not read or write target receipts,
target-identity sidecars, mechanical evidence, or undo capsules. No provider
mode writes a controller capsule. Managed
ownership comes only from the exact native `rawr-hq` marketplace identity plus
verified embedded RAWR artifact provenance. Unmanaged or ambiguous collisions
remain preserved and block. Targeted/complete-test mechanics may retain their
existing target-local receipts/evidence internally, but those records cannot authorize
channel selection, canonical cleanup, or provider truth.

Canonical mutation reports its exact applied prefix and retry re-reads native
state. It does not build a generic rollback transaction. This is the bounded
canonical path needed for settlement, not a rewrite of every landed provider
test mode.

### Provider homes and export destinations have one visible owner

Task 5.3 removes the hidden complete native-home registry and its filesystem
scan after both owner-local boundaries are active; the current candidate still
retains that exact transitional bridge. Task 5.2 gives export one private exact
marker at `.rawr-agent-plugin-owner.json` with
canonical bytes `{"owner":"export","schemaVersion":1}\n`. Its resource edge
admits only an absent explicit destination or an existing destination carrying
those exact bytes. The claim is a monotonic authority transition:
`Absent -> ExactExportOwned`; an exact owned root remains owned. Payload and
ledger undo never removes the marker or makes that path eligible to become a
provider home on the next invocation. Any existing unmarked directory,
different marker bytes, file, symlink, or unreadable destination blocks even
under `replace-planned`.

The required authority transition is always `Absent -> ExactExportOwned`. A
native no-replace publication capability lets ordinary export perform it as one
externally visible transition. Competing root state is preserved and blocks,
and a provider cannot enter an export-created unmarked window. Once visible, the
marker is the absorbing claim. The ordinary export transaction then owns only
payload, ledger, managed GC, and their inverse actions. It never owns a root
inverse action, publication receipt, recovery state, marker-repair protocol,
transaction history, root digest, registry, or provider field.

The substrate for that transition is an explicit user product-authority gate,
not an implementation detail C6 may weaken. Two mechanisms remain admissible
pending selection by the user, or an explicitly user-delegated product
authority: one narrowly scoped shared/native directory no-replace capability
with no lifecycle semantics, or a separate point-addressed export-authorized
protected preclaim operation. The native capability is the minimal
frame-compatible recommendation and must not grow into a generalized publication
framework. A stateless preclaim is not admissible: after interruption, providers
cannot distinguish its unmarked residue from a legitimate provider home.
Selecting preclaim therefore requires a separate authority amendment naming a
persistent fence carrier and owner, provider observation, and exit/re-entry law,
and proving that the fence is neither a second destination truth nor a hidden
multi-home coordinator. Only then could ordinary export refuse `Absent` and
accept an exact preclaimed root. Duplicating the native syscall subsystem inside
the export resource is not admissible. Task 5.2 remains blocked until that
product authority authorizes the choice; unprotected `mkdir` followed by a marker write is not an
implementation of the required transition.

The existing `RejectedBeforeMutation` result remains scoped to managed payload,
ledger, and capsule mutation. A completed owner claim is durable admission state
and may therefore remain visible when later planning or undo preflight rejects;
tests and diagnostics must report that marker truth rather than imply that the
destination path stayed absent.

A losing native no-replace claimant never adopts the winner in the same
invocation. It preserves the competing entry and refuses. A cold retry
re-observes the root; an exact export marker is then admitted read-only with zero
claim writes, while every other occupant remains preserved and blocked. A failed
native publication with no winner leaves `Absent` unchanged. These distinctions
prevent a failed result from erasing either a competing occupant or a committed
authority transition. No preclaim failure/re-entry law is certified before its
required fence amendment exists.

Every provider operation requires an already-existing explicit home and treats
any entry or unreadable result at that fixed marker slot as an ownership
collision before native execution. Providers neither parse nor own the export
marker protocol, never create the home, and recheck the slot at their native
resource boundary. Export does not inspect provider state, providers do not
inspect export ledgers, and neither scans or aggregates the other owner's roots.
Native inventory and the destination ledger remain their respective state
truths.

### One durable controller root replaces transfer

Build, test, channel validation, disposable convergence, and canonical
settlement use one explicit non-repository controller data root. A repository
path remains a content locator only. No private CAS path, controller root, or
transfer address enters the release or channel identity.

The one landed stable controller selector remains executable authority. C6 adds
no second launcher, caller-supplied digest/protocol binding, PATH-obfuscation
proof, or cross-controller store protocol.

### Generated controller manifests are canonical

Oclif discovery may enumerate object keys in different insertion orders.
Generated manifest objects are recursively sorted by locale-independent code
unit order while arrays retain semantic order. Validation, release metadata,
and emitted JSON all use that canonical object. Two clean builds of the same
Template commit must produce equal controller digests and byte/mode-identical
normalized release trees; paths, inode identity, and mtimes are not compared.

### Structural enforcement is positive and bounded

Existing positive Habitat topology and complete Nx lint/typecheck population
remain. The local hook and remote workflow provide feedback now; task 8.8 must
make that workflow a required server-side merge rule before closure. C6 does
not add semantic GritQL rules for runtime behavior. Test-only scheduling belongs
to the owning Vitest project;
DevOps command discovery belongs to `@rawr/plugin-devops`. T6C1/C2 update the
closed positive command/projection inventory to remove only `attest-promotion`
and receipt-owned `retire`; qualified `undo` remains required. At task 5.4
closure, T6C3 keeps closed owner-local port, router, binding, and resource
inventories whose admitted topology has no aggregate native-home or target-scan
relationship; it does not encode their absence as a blacklist.

## Reachable Lifecycle

```text
personal content landed
  -> complete set built and tested
  -> disposable complete-test proof (omitted members preserved)
  -> current-main record reviewed and landed
  -> disposable canonical convergence and read-only repeat
  -> approved native homes converged
  -> repeat is read-only with every lifecycle/native mutation counter at zero
```

Refusal or interruption returns a truthful operation result and is retried by
ordinary re-convergence. It does not create a new durable approval, transfer,
or rollback state owner.

## Semantic Stack

| Slice | Story | Green boundary |
| --- | --- | --- |
| T6A | Thin authority record | strict OpenSpec and four standing reviews |
| T6B | Staged/clean repository checks | exact Git binding, declared-input reads, one procedure |
| T6C1a | Current-main v2 codec/public interface | canonical bytes, cold-port procedure, exact CLI projection |
| T6C1b | Observed-Git selection and cutover | direct resolution, old ceremony/commands unreachable |
| T6C2 | Thin canonical provider path | resolved selection consumption, native truth, no canonical hidden state |
| T6C3 | Export destination independence | owner-local ledger/collision law, no provider-home registry |
| T6D | Owner-correct CLI test boundaries | owner-local DevOps fixture and ordinary serialized CLI target |
| T6E | Deterministic official manifest | focused regression and independent build-twice equality |
| T6F | Landing and settlement | installed controller, personal channel, disposable/live native convergence, read-only repeat |

## Risks / Trade-offs

- **The current landed provider service is larger than the corrected target.**
  C6 gives canonical sync/status a thin native-only path and leaves unrelated
  targeted/complete test mechanics alone. The receipt-owned explicit retire
  procedure is removed because it could mutate a canonical home through hidden
  state. A broad rewrite of every remaining provider mode
  would repeat the same scope error.
- **A reviewed Git record is not an adversarial trust system.** That is
  intentional. Repository protection and required CI are the human selection
  boundary for this non-adversarial product.
- **Native providers expose different operations.** The adapters normalize the
  desired closed set, not provider internals. Product proof uses real binaries
  and live inventory instead of whole-home byte equality.
- **The active Codex process may retain old same-ID payloads.** The adapter must
  perform the native remove/add transition and verify native config/inventory.
  Because its app-server inspection is a fresh process, T6F separately records a
  bounded persistent Desktop-task visibility observation. Fresh app-server proof
  alone cannot close that row, and C6 adds no app/runtime implementation.

## Related

- Authority correction: [[authority-amendment]].
- Requirements: [[specs/agent-plugin-command-lifecycle/spec]],
  [[specs/agent-plugin-lifecycle-mode-selection/spec]],
  [[specs/agent-plugin-promotion/spec]],
  [[specs/agent-plugin-build-artifact-store/spec]],
  [[specs/agent-plugin-managed-export/spec]],
  [[specs/agent-plugin-undo-capsule/spec]],
  [[specs/agent-provider-projection/spec]],
  [[specs/agent-provider-deployment/spec]], and
  [[specs/rawr-controller-authority/spec]].
- Execution and proof: [[tasks]] and [[README]].

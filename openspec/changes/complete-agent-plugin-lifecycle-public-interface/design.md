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
The inherited managed-export and capsule surfaces are retired rather than
re-exposed through the service. Native Codex/Claude mutation remains in
external providers and is not reimplemented inside service middleware.

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
- `release-input-refresh` requires the complete explicit member identity list,
  observes one staged index while materializing only those exact roots and the
  optional existing `.rawr/release-input.json`, and emits the unique canonical
  candidate bytes. It never infers members from arbitrary directories. Every
  regular file below a selected root enters that member payload; only exact
  `skills/<identity>/SKILL.md` paths create skill inventory and claims. A valid
  prior record contributes surviving member vendor/curation bindings,
  surviving alias/provider/destination claims, locks, and quality policies;
  absent prior state contributes empty ancillary arrays. Invalid or
  wrong-authority prior bytes and an undeclared immediate plugin child refuse
  instead of being repaired.

The refresh observation encloses all selected blob reads between one opening
and closing Git binding. Changed source returns `SourceChanged`; unchanged
existing canonical bytes return `ReleaseInputReadOnlyConverged`; otherwise the
operation returns `ReleaseInputCandidateReady`. Both success variants carry the
same canonical bytes. Adoption remains a Personal review/commit action, so the
operation adds no writer, store, receipt, ledger, cache, or second state owner.
The handler owns one frozen flat request snapshot before its first await, so a
local caller alias cannot rewrite authority or membership during observation.
Before payload construction, logical bounds count every selected path even when
multiple paths share one Git object; entry, member-byte, and complete-set-byte
overflow returns typed refusal without copying or base64-encoding the payload.
The complete five-module service context remains inert; validation does not
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

The sole fixed path is
`.rawr/agent-plugin-lifecycle/channels/current-main.json`. No path under the
curated `plugins/agents` root is a governance record or fallback. Its canonical
v2 envelope contains one digest over this closed body:

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
promotion attestation, `attest-promotion`, receipt-owned explicit `retire`,
managed `export`, and capsule `undo` are deleted from service contracts,
routers, public exports, client, command discovery, and the reachable graph.
Canonical closed-set sync owns omitted-member cleanup. Provider operations emit
no capsule and recover through live reinspection plus exact-prefix convergence.
There is no stub, alias, forwarding route, or fallback.
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

### Provider lifecycle remains point-addressed; destination export transfers

Managed destination export and its capsule were inherited capabilities outside
the corrected product outcome. Repairing their publication substrate would
create the exact generalized mechanism C6 now rejects. The controller therefore
retires the export module, `rawr agent plugins export`,
`rawr agent plugins undo`, their public bindings/ports, and their CLI
composition. Useful destination, publication, ledger, and rollback requirements
transfer to the dedicated full architecture migration; C6 adds no replacement
implementation.

Every provider operation remains explicit and point-addressed. The
`completeNativeHomes` procedure, complete target-identity reader, filesystem
scan, and caller bridge are deleted rather than preserved for a second owner.
Targeted and complete-test modes retain only their requested target identities;
canonical sync/status use only their explicit provider-home inputs and live
native truth. No provider scans homes, export destinations, or ledgers.

The installed controller data root was inspected read-only before undo
retirement. Its canonical capsule path
`agent-plugins/last-operation-v1` was absent, so no applying, undoing, committed,
or otherwise non-idle export capsule can be stranded by this cut. The inspection
did not create, repair, clear, or otherwise mutate capsule state.

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
DevOps command discovery belongs to `@rawr/plugin-devops`. T6C1/C2 remove
`attest-promotion` and receipt-owned `retire`. T6C3 positively narrows the
lifecycle service to releases, vendors, packaging, providers, and governance;
the command channel to build, check, create, package, status, sync, test, and
`vendors status`/`vendors update`; and provider state access to point-addressed
contracts.
No export, undo, aggregate-home, scan, binding, or port is retained as a
compatibility surface.

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
| T6C3 | Legacy export/undo retirement | no destination/capsule command or service surface; no provider-home aggregate |
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

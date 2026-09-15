> **Preserved evidence, not current authority.** Bounded September 6 release receipt; not all authoring or provider work complete.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#prior-release) and [current assessment](../../assessment.md).

# Habitat Runtime 0.6.0

## Outcome

The core runtime is implemented and released, not merely realigned on paper.
`@habitat-ai/sdk@0.6.0` and `@habitat-ai/cli@0.6.0` are published from accepted
main `f52474a7abc232d881cd1cf272f1d063a265285d`, tagged `habitat-cli-v0.6.0`.
Habitat's own workspace has adopted the released CLI through native Nx migration.

The accepted runtime now carries named instances, dependency slots, process
selection and complete service references through the cold pipeline into real
acquisition, binding, execution, mounting and observation. Native Oclif, Elysia,
Inngest Serve/Connect and Bun web boundaries have actual executable acceptance.
Same-app processes have independent identities, leases, readiness and shutdown.

The important simplification was to stop representing Effect twice. Habitat keeps
a curated authoring API and its own domain contracts, but uses native Effect
values and process-owned managed runtimes rather than a competing interpreter.
The official oRPC Effect integration supplies the native bridge and client;
Habitat does not combine two rival Effect/oRPC runtimes. Native Inngest retains
orchestration and replay, while actual Effect steps enter the managed boundary.

Generic agent-plugin lifecycle mechanics belong to Habitat. Curated content,
policy, channels and governed releases remain Marketplace-owned. Internal service
design was corrected where required by the managed runtime rather than used as a
reason to move product/content ownership into the substrate.

## Verified Boundaries

- Exact release-main Repository Ratchet and local CI: 188 tasks passed.
- Tagged installed-package acceptance: Linux and Windows passed.
- Actual published-registry acceptance on macOS: 47 tests passed, two Windows-only
  skips, including native agent-plugin and Graphite operations.
- Native producer migration, frozen install and same-version repeat: passed;
  repeat preserved package manifest and lockfile bytes. The installed CLI resolves
  its own registry SDK, distinct from the producer's source-workspace SDK.
- Producer repository check: 147 tasks passed.
- Post-adoption [Linux and Windows installed acceptance](https://github.com/rawr-ai/rawr-hq-template/actions/runs/34013188202): passed.
- Native OpenSpec application: all 19 deltas applied, 37-file change archived,
  three requirement-empty retired specs removed, 18 canonical specs validated.
- Independent native-builder replay matched the resulting requirement bodies;
  archived deltas and seven release/adoption receipts remained byte-identical.
- Closure separation-absence acceptance: 19 tests, 185 assertions, 30 uncached
  Nx tasks passed. Historical evidence is preserved without freezing the total
  number of future canonical specifications.

The publication workflow initially failed its registry-visibility check after
both packages were published. Native failed-job retry passed registry acceptance.
No artifact, version or tag was replaced. This is recorded rather than hidden by
the final successful result.

OTLP acceptance proves real transport, connected ancestry and finalization.
It does not pretend to prove ClickHouse persistence, HyperDX queries, production
Inngest behavior or every native host. Those remain distinct qualifications.

## Closure Admission

Producer adoption and informational handoffs landed in
[PR 1027](https://github.com/rawr-ai/rawr-hq-template/pull/1027). Native archive and
closure landed in [PR 1028](https://github.com/rawr-ai/rawr-hq-template/pull/1028),
canonical main `29365b34cbfeca636606af0f6b5d4c4ac07c1066`. Its tree matches the
locally qualified closure tree exactly. Local exact-main CI passed all 188 tasks;
the [remote exact-main Repository Ratchet](https://github.com/rawr-ai/rawr-hq-template/actions/runs/34013824346)
also passed all 188 tasks with zero cache hits. Closure tree:
`aeb362c1662f02402b1647aa0a5874379ae33d59`.

Graphite naturally merged the two-node stack. One subsequent native
`gt sync --force --no-restack --no-interactive` sweep removed its consumed refs.
Independent before/after checks preserved all 61 unrelated branch heads and
captured Graphite metadata, four held worktrees, 13 ordered stashes and the
primary workspace's existing untracked Codex configuration.
The owned worktree is clean and detached at accepted main. The primary workspace
has only its preexisting untracked `.codex/config.toml`; that user file was not
modified or removed.

## What Remains

These are separately owned capabilities, not unfinished core-runtime tasks:

| Capability | Next acceptance boundary |
| --- | --- |
| Semantic ledger | Separately scoped public contract, implementation and real-backend conformance. |
| Temporal inquiry | Its actual backend/query lifecycle, independently released when accepted. |
| Consumer adoption and held transfers | Destination-owned migration and product proof before prototype/source retirement. |
| Native agent/OpenShell and desktop hosts | Real host, policy, invocation, cancellation and shutdown qualification. Authoring/managed faces already exist. |
| Full observability | Backend persistence/queryability, exception-export policy and EVLog's actual role. |

The [live deferred handoff](../../../habitat-runtime-realignment/deferred-capabilities.md)
holds their owners, dependencies and acceptance conditions. The
[implementation checkpoint](../../../habitat-runtime-realignment/IMPLEMENTATION.md)
links release provenance, migration evidence and the seven consumer lanes.

## Judgment

This is the right boundary at which to stop substrate expansion and let a real
consumer select the next need. The next useful work is one destination-owned
adoption story, not simultaneously restarting all three projects or building
every deferred capability before any consumer can move.

I am comfortable owning implementation from this position: the target has native
behavioral evidence, explicit package boundaries and usable handoffs. Confidence
comes from those proofs and the independent reviews, not from assuming a more
capable model eliminates the need for them.

Node.js and TypeScript were not upgraded speculatively. The qualified toolchain
was sufficient; the Windows failures investigated were fixture/lifetime issues,
not demonstrated compiler or runtime-version defects. Future upgrades should
qualify the actual Nx/Bun/TypeScript tuple when they address a concrete need.

Consumer repositories, Marketplace content and held historical work remain
untouched. No new consumer task, automation or global configuration change was
introduced by this closure.

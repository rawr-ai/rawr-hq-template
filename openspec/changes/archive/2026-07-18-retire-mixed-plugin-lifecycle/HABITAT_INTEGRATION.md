# Habitat Structural Authority Integration

## Decision

C5 consumes Habitat as an immutable standalone executable GitHub release. RAWR HQ-Template owns only its repository-local `.habitat` constraints and the small verified consumer that provisions and invokes the binary. The Habitat SDK source, compiler proof, and release workflow remain owned by `mateicanavra/civ7-modding-tools`; they are not copied into Template.

This is structural-check tooling, not a lifecycle service, repository ancestry relationship, or runtime dependency. It does not transfer product authority away from [[README|the C5 execution record]], [[SERVICE_TOPOLOGY|the lifecycle topology]], the accepted packet provenance, or the superseding repository-separation amendment.

## Immutable Release

The pinned release is `habitat-sdk-v0.1.1`:

| Provenance | Value |
| --- | --- |
| owner repository | `mateicanavra/civ7-modding-tools` |
| source commit | `177d08eafcaf270daec31d76524065de99aeaff8` |
| Habitat source tree | `ee8c5d1b236c3de46684e06f089d859ab9a8f90e` |
| Bun version | `1.4.0` |
| Bun revision | `a215285063c9b7b0d4b3f87bd298d4fecfd93897` |

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `habitat-sdk-darwin-arm64` | `63068786` | `6a73c416233f2190c57ff4ff9236609e6611e953c3d18b16885052b7be2737fd` |
| `habitat-sdk-linux-x64-baseline` | `79978432` | `b795af90bb08384c4c1c606121ba4306c2cc700e1bd7ca686e1301508a8a72c5` |

`scripts/habitat/release.json` records these immutable coordinates. `scripts/habitat/provision.mjs` selects only the declared host asset, verifies its exact byte count and digest, and stores it in the ignored digest-addressed cache. `scripts/habitat/check.mjs` invokes that verified binary against the exact Template repository root in read-only check mode. An absolute `HABITAT_SDK_BINARY` override is accepted only when it is executable and matches the selected manifest digest.

The SDK executable delegates admitted Grit rules to Template's exact lockfile dependency, `@getgrit/cli@0.1.0-alpha.1743007075`. The required chain performs the frozen install with dependency scripts disabled, then explicitly runs only that package's versioned native-runner installer through `habitat:grit:provision`. The executable fixture fails closed when the runner is absent.

Template contains no vendored Habitat SDK, source checkout, Effect patch, custom release publisher, or exemption ledger. Source inspection and release construction remain owner-local and disposable; the release manifest plus digest verification is the durable SDK interface, while the lockfile is the Grit provider interface.

## Positive Authority Tree

The Template `.habitat` tree positively closes three monotonic structural axes. It asserts the only admitted topology instead of enumerating historical names to forbid:

1. `require_agent_plugin_lifecycle_service_topology` admits one `@rawr/agent-plugin-lifecycle` oRPC service, its exact six modules, their uniform roots, and only populated domain-model categories.
2. `require_agent_plugin_command_channel_topology` admits curated lifecycle commands only under `rawr agent plugins` and external Oclif extension commands only under `rawr plugins`.
3. `preserve_agent_plugin_lifecycle_dependency_direction` keeps root assembly on imported module routers through `impl.router`, keeps procedure handlers on their local module context, and admits controller composition through public service ports to resource contracts. It locks `apps/cli/src/lib/agent-plugins/service-runtime/client.ts` as the sole production lifecycle-client value root, admits type-only boundary references elsewhere, and rejects service-to-provider imports, CLI-to-module-local implementation imports, nested client roots, and dynamic value relays.

Each rule has a stable identity, explicit path coverage, and a locked baseline. The first two use `structure.toml`; the dependency-direction rule uses a named Grit pattern. The service topology packet is reusable blueprint authority. The command and dependency packets are RAWR-only niche authority. Extending one of these axes requires a reviewed strengthening of the positive constraint; new historical denylist entries are not the model.

## Required Gate

The required repository chain is:

```text
bun run lint
  -> 30 Nx lint projects
bun run typecheck
  -> 44 Nx typecheck projects
bun run habitat:grit:provision
  -> exact locked Grit provider native runner
bunx nx run @rawr/habitat-consumer:test
  -> 2 provisioning checks + 32-arm dependency-rule rejection/acceptance fixture
bun run architecture:gate:agent-plugin-lifecycle
  -> 3 locked Habitat rules
```

`bun run ratchet:required` composes that exact chain. The local pre-push hook runs it as early feedback. `.github/workflows/repository-ratchet.yml` performs a frozen script-disabled dependency install and runs the same repository-owned command, including the one explicit Grit provisioning step, in ordinary `pull_request`, `merge_group`, and `push`-to-`main` CI. After the workflow lands and its context exists, protected `main` requires `Repository Ratchet / Required lint, typecheck, and topology`; branch protection, not the local hook, owns merge admission.

The workflow checks out and evaluates the candidate normally. It does not use `pull_request_target`, a custom status publisher, a default-branch evaluator kernel, or an exemption-growth protocol. Lint and typecheck are required by the root task graph, while Habitat owns only the three structural axes above.

## Proof Boundary

Provisioning tests reject unsupported hosts and corrupt assets. An executable disposable-repository fixture proves every dependency-direction Grit arm rejects its owned syntax and that the accepted module, type-only, binding, and canonical-client forms remain admitted. The real pinned Darwin artifact provisions and executes the three rules successfully, and the Linux release asset was built and proven in its owner release workflow. Repeating the structural check changes no governed repository bytes.

Habitat proves source shape only. Lifecycle transition, failure, state-owner, idempotence, undo, and command behavior remain owned by service, command, and installed-controller tests recorded in [[README#Progress And Proof|Progress And Proof]]. It makes no claim about app composition, provider-native operational database bytes, personal content acceptance, or canonical provider settlement.

## 1. Frame And Authority

- [x] 1.1 Classify both lane implementations into shared operational behavior,
  study-owned content, historical evidence, and superseded machinery.
- [x] 1.2 Record the shared cell, terminal, evaluation, observation, artifact,
  interruption, and cleanup behaviors proved by both lanes.
- [x] 1.3 Complete bounded vendor verification.
- [x] 1.4 Record `ce282cb062f0d4bdeb80117a021aa0c766537991` as
  historical Git/Bun source-quarry evidence, not a preservation mandate.
- [x] 1.5 Accept the deletion-first service/resource/provider checkpoint at
  `b826254d21d93538edd3f5436ccdc8dbf8500290`.
- [ ] 1.6 Accept the local single-user deletion amendment from the Inngest
  director and architecture steward.
- [ ] 1.7 Restack onto the exact accepted Template upstream containing the
  current service blueprint realization, vendor closure, and legal
  process-runtime provider provisioning before source migration. Do not use
  `3beb4936` as runtime authority or recreate direct host/lane provider wiring.
  Confirm the Habitat-required `#adapters/typebox` `standard` import resolves to
  the canonical `packages/hq-sdk/src/orpc/schema.ts` bridge; if the accepted
  upstream still lacks the alias/export mapping, add only that generic
  canonical mapping before the service shell. Require the primary Template
  owner to correct and behaviorally admit that bridge before use. At TypeBox
  `1.3.6`, use the official `Schema.Validator` Check/Errors structure, emit
  message-only issues, omit `Issue.path` for every error, and delete all custom
  path parsing. Cover `%`, `%2F`, `/`, `~`, `~0`, `~1`, nested objects, numeric
  object keys, and arrays; retain `__typebox` only with a proved OpenAPI
  consumer.

## 2. Research-Experiment Service

- [ ] 2.1 Manually apply the existing Habitat service blueprint to
  `services/research-experiment`; do not create a generator. Establish
  the ordinary `package.json`/Nx/TypeScript/test shell, public `src/index.ts`,
  `src/client.ts`, and `src/router.ts`, then `service/base.ts`, `contract.ts`,
  `impl.ts`, `router.ts`, and the `cells` module shell. Export only the governed
  router/client/contract surfaces; do not acquire resources in the package
  shell. In `base.ts`, directly export
  `base = implementEffect(contract, Layer.empty)` exactly once and do not call
  `.$context(...)`; in `impl.ts`, import `base` and directly export/configure
  `service` from it. Directly export the required `base`, `contract`, `service`,
  `module`, and `router` anchors. Project provisioned dependencies into narrow
  module/leaf context through legal native context middleware.
- [ ] 2.2 Implement TypeBox cell, running, terminal, evaluation, and observation
  schemas in the service. As research-service choices within the
  Habitat shell, compose the root contract with `eoc.router`, the root router
  with `service.router(...)`, and expose one `cells.run` effect-oRPC procedure
  from the single cells-module `router.ts`. Import `standard` from the
  Habitat-required `#adapters/typebox` alias backed by the canonical
  `@rawr/hq-sdk` TypeBox-to-Standard-Schema bridge only after its issue-path
  correction/admission; do not add a research-local adapter, property-map
  composition helper, or runtime key-collision checker. Build closed
  service-authored `Type.Object` schemas directly and verify them behaviorally.
- [ ] 2.3 Move direct terminal/evaluation adoption, observation correlation,
  local restart/resume, and publication ordering into service-owned DTO/policy
  modules. Delete distributed attempt fences, stage/predecessor graphs,
  orphan/residue DAGs, and service-owned replicate lineage.
- [ ] 2.4 Delete custom procedure/capability interfaces, manual JSON decoding,
  schema traversal, clone/freeze machinery, package-owned `Context.Service`,
  package-owned `ManagedRuntime`,
  `packages/research-sdk/src/contracts/schema.ts`, and obsolete barrels.
- [ ] 2.5 Prove the service flow with injected resource ports: terminal
  adoption before effects, unique local begin, durable terminal before
  verification, durable evaluation before projection, exact observation
  identity, local duplicate/restart/resume, distinct-cell overlap,
  deterministic pre-acquisition provider lookup, recovery across both
  acquisition-to-locator and solver-exit-to-capture crash windows, and
  unconfirmed-locator cleanup. Preparation and evaluation consume lane TypeBox
  data/configuration/policy plus provisioned resources, never lane-injected
  executable callbacks.

## 3. Resources And Providers

- [ ] 3.1 Move command execution behind a research-command resource contract
  and concrete host/Bun provider.
- [ ] 3.2 Move native Git materialize/capture/apply behind a Git-artifact
  resource/provider. Persist the base commit/tree and path mapping in
  `FrozenInput`; preflight Git `>=2.48.0` and record the resolved version only
  diagnostically. Capture a full-index binary patch with SHA-256 and prove fresh
  apply plus reconstructed product-tree equality under native Git ignore
  semantics. Delete hostile config/attribute policy, provider envelopes, exact
  supported-version rejection, and regenerated-patch authority.
- [ ] 3.3 Build ordinary Bun compatibility tooling outside the running service:
  clean staging, ordinary package build, `bun pm pack --ignore-scripts`, atomic
  tarball SHA/length, clean frozen consumer install, import/type/model-free
  smoke, and interruption cleanup. Delete embedded manifests, custom
  lock/placement/content graphs, and special closure admission.
- [ ] 3.4 Add a durable cell-state resource contract and resource-local
  providers for one local `Running -> SolverTerminal -> Evaluated` record. Keep
  transition rules, identity checks, adoption, and interpretation in the
  service; lanes supply data/configuration and policy, not persistence
  implementations.
- [ ] 3.5 Implement the sandbox, agent, observation, operational-event,
  Codex-OpenShell, and Codex-Langfuse providers under their explicit resource
  contracts and direct pinned vendor laws. Keep the pinned Codex-Langfuse
  upstream, maintained source/patch, deterministic tests/build, and bundle
  SHA; do not add an upstream Git-object provenance manifest.

## 4. Delete The Package-Shaped Runtime

- [ ] 4.1 Confirm every current `packages/research-sdk` production file has
  moved to the service, moved to a resource/provider, or been deleted.
- [ ] 4.2 Remove the package runtime, adapters, custom contracts, exports,
  project wiring, and `@rawr/research-sdk` identity unless an independently
  reviewed non-service package consumer proves one narrow survivor.
- [ ] 4.3 Replace the package-specific Habitat rules with the existing service
  blueprint plus only the resource/provider and dependency-direction rules
  needed by the realized topology.

## 5. Lane Compatibility

- [ ] 5.1 Pack the required Template service/resource packages through ordinary
  Bun tooling and pass clean frozen install plus import/type/model-free smoke in
  both lane consumers.
- [ ] 5.2 Bind one retained oRPC cell through the service and pass its model-free
  preparation/evaluation path.
- [ ] 5.3 Bind retained Inngest S09 through the same service, preserving its
  seven-file seed view, lane-owned control overlay, service-owned Git
  base/mapping, allowed product paths, and hidden verifier.
- [ ] 5.4 Confirm both lanes invoke the service, do not import providers, and
  retain all subject content and evidence.

## 6. Verification And Landing

- [ ] 6.1 Pass Nx lint, typecheck, test, and build for the service and every
  resource/provider.
- [ ] 6.2 Pass Habitat
  `require_service_spine_topology`,
  `require_service_anchor_exports`,
  `require_service_context_boundaries`,
  `require_service_contract_authority`,
  `require_service_module_isolation`,
  `require_service_orpc_composition`, and
  `require_orpc_error_authority`, plus agent-router placement/shape,
  dependency-direction, packet, and full ratchet checks.
- [ ] 6.3 Pass the focused model-free local resume, terminal/evaluation,
  artifact round-trip, staged package/install/smoke, interruption cleanup,
  observation, and lane-compatibility tests without provider/gateway mutation.
- [ ] 6.4 Archive or remove superseded active lane machinery only after both
  compatibility checks pass; preserve frozen evidence and provenance.
- [ ] 6.5 Restack onto current accepted Template upstream, align direct pins,
  pass frozen install and every behavioral gate, and obtain exact-commit
  acceptance from both directors.

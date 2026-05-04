---
title: RAWR Managed Agent Workspace Execution — spec analysis
id: rawr-managed-agent-workspace-execution-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:53.900108Z'
updated: '2026-05-01T21:10:18.535513Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Managed_Agent_Workspace_Execution_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Managed_Agent_Workspace_Execution_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

The Managed Agent Workspace Execution (MAWE) spec defines how provider-managed agent execution environments — model-driven autonomous/semi-autonomous agent trajectories operating over a controlled file/tool/event workspace — enter RAWR. It establishes a runtime capability resource (`ManagedAgentWorkspaceResource`), a provider abstraction (`ManagedAgentWorkspaceProvider`), a typed workspace descriptor (`ManagedAgentWorkspaceManifest`), normalized run events, an artifact drain, an outcome envelope, and exactly two canonical seams: (1) async steward run substrate, and (2) downstream product-app agent harness. The spec is explicit that MAWE is a runtime capability and harness realization pattern, not a new ontology, not a runtime authority, and not a replacement for OpenShell/Inngest/services/workstreams/sandbox resources.

## Concern coverage

- Workspace lifecycle: ensure agent → prepare workspace → start/attach run → stream events → drain → snapshot → close.
- Agent execution boundaries: bounded trajectories over explicit workspace manifests with output contract coverage.
- Resource isolation: per-tenant/per-user/per-session product workspace isolation; no cross-user reuse without explicit policy.
- Filesystem policy: readable/writable/output/denied roots, mount RO status, max output size, capture/finalization rules.
- Network policy: modes (`none | allowlist | egress-only`), allowlist/blocklist domains, inbound exposure, egress logging, MCP/connector availability.
- Execution policy: timeouts (run + idle), event/output byte caps, command/package-install/patch permissions, approval requirements, cost/budget, retry/reattach.
- Code execution sandbox: distinct from `CodeSandboxResource` / `PythonSandboxResource`; MAWE is model-driven trajectory, not deterministic code exec.
- Observability: RuntimeCatalog records (provider, capabilities, profile, manifest hash, run refs, snapshot refs, event cursor, artifact refs, output-contract status, redacted config); telemetry spans (`managed-agent.ensure-agent`, `.prepare-workspace`, `.start-run`, `.attach-run`, `.drive-run`, `.stream-events`, `.drain`, `.snapshot`, `.close-run`).
- Authentication/identity: actor kinds (`steward | trusted-operator | product-user | system | service-account | benchmark`); vault references opaque; provider API creds redacted runtime config.
- Secrets: forbidden in manifests, events, artifacts, diagnostics, catalog, prompts; vault references opaque only.
- Durable orchestration relationship: managed run is subordinate to RAWR run/Inngest workflow; provider event log is execution evidence, not workflow engine.
- Snapshots/recovery: opaque `ManagedAgentSnapshotRef`; recovery decision order (attach → resume → snapshot → fresh-from-manifest → fail).
- Provider capability validation: `ProviderCapabilitySet`; runtime compiler / workflow preflight rejects unsupported profiles before run start; silent degradation forbidden.
- Governance: outcome envelope feeds steward decision (act/propose/escalate); managed agents may not directly commit governed repo state.
- Artifact classification & drain: classes include patch, source-file, code-diff, test-report, verification-report, analysis-report, implementation-packet, classification-artifact, capability-bundle, mapping-report, destination-acceptance-candidate, snapshot-ref, log-excerpt, summary; drain is idempotent over event ids/output hashes/artifact refs/run ids.
- Provider swap: stable resource seam, provider packages, runtime profile selection, multi-instance support.
- Error model: 17 tagged error classes covering provider, capability, manifest, policy, agent definition, run lifecycle, snapshot, artifact, drain, secret, network, output-contract failures.

## Platform-level signal

Cross-cutting, primarily in **Core Runtime / Coordination** with Governance hooks. It lives below app selection and above provider-native execution. As a runtime capability resource it sits in the realization plane (definition→selection→derivation→compilation→provisioning→mounting→observation), but it interlocks with Coordination via the canonical async steward workflow seam (Inngest), and with Governance via the outcome envelope feeding steward act/propose/escalate. The spec explicitly refuses to be a top-level ontology root, role, or surface — confirming it is a horizontal capability layer.

## Vendor integrations declared

- **Effect**: `RawrEffect<...>` return types throughout the resource contract; `providerFx.acquireRelease` for provider build; standard "stand on shoulders of giants" pattern — Effect owns local execution mechanics, MAWE owns the seam.
- **Inngest**: durable async orchestration owner; `inngest.createFunction` example with `step.run` for each lifecycle phase; spec explicitly carves out that "managed agent event log != durable orchestration."
- **oRPC**: implicit ("oRPC owns callable contract mechanics" in the governing law), used by services that managed agents may call through canonical boundaries; no direct integration semantics in this spec.
- **Provider examples** (managed agent platforms): `openai-agents-sdk`, `claude-managed-agents`, `cloud-sandbox-agent`, `runloop`, `e2b`, `daytona`, `modal`, `vercel`, `local-noop`, `custom`. Each is a `ManagedAgentWorkspaceProvider` implementation; raw vendor SDK types must not cross the provider boundary.
- **MCP**: declared as provider capability flag (`mcp`) and tool surface for connector access; product shells may expose MCP-backed tools but only with actor context.
- **Stand-on-shoulders pattern**: each provider keeps native nouns (sessions, manifests, sandbox sessions, mounts, tools, memory, checkpoints, snapshots, patches, event logs) internal; RAWR normalizes them at the seam (`ManagedAgentRunEvent`, `ManagedAgentSnapshotRef`, etc.).

## Don't-own-still-manage frontier

The spec explicitly takes the "don't own, still manage" posture across multiple frontiers:

- **Compute isolation / sandboxing**: RAWR doesn't own VM/container isolation — providers (e2b, Daytona, Modal, OpenAI Agents SDK runloop, Claude managed agents) do. RAWR manages the policy declaration (filesystem/network/execution policy fields, `ProviderCapabilityRequirement`) and rejects unsupported profiles before run start.
- **Network egress / firewalling**: RAWR does not implement egress filtering; provider does. RAWR declares `ManagedWorkspaceNetworkPolicy` (modes, allowlist, blocklist, inbound exposure, egress logging) and requires provider-native manifest mapping to preserve it. Silent omission of policy is explicitly forbidden.
- **Secret access from workspace**: RAWR doesn't own secret stores in this spec; vault references are opaque handles to provider/external vaults. RAWR manages scoping fields (owner/tenant scope, actor scope, allowed tool/connector scope, expiration/rotation, audit correlation id).
- **Filesystem isolation**: provider owns the actual mount/cgroup/chroot; RAWR owns the manifest contract and provenance.
- **Snapshots / checkpoint storage**: provider owns the bytes; RAWR owns `ManagedAgentSnapshotRef` as opaque handle plus capability metadata.
- **Event ordering / streaming**: provider may use any internal mechanism (async, callback, polling, native stream); RAWR demands ordered, resumable, correlated, idempotently-drainable normalized events at the seam.

**Silences (where the spec leans on a vendor without naming the integration-point ownership crisply):**

- Cost/budget tracking is listed as a policy field but no integration with a billing/cost service is described — implicit lean on provider quota/billing.
- "Memory policy / compaction policy" on `ManagedAgentDefinition` are declared but their integration with vendor-native memory systems (OpenAI Agents SDK memory, Claude memory) is not detailed.
- Multi-agent handoff is listed as a `ProviderCapabilitySet` flag but the cross-agent coordination semantics inside a single provider session are not specified.
- Provider-side observability (HyperDX/OTel propagation across the boundary) is implied via `traceId` in event base but the exact propagation contract is unspecified.

## Where the spec makes runtime-semantic claims (and reconciliation)

The spec is careful to disclaim runtime authority — it explicitly says it does not redefine "the runtime realization lifecycle, durable async semantics, service-boundary ownership, app composition ownership." Yet it does make several runtime-adjacent claims that must reconcile to the Effect Runtime Realization Spec:

- **Lifecycle table (§9)**: it asserts how MAWE behaves at each runtime phase (Definition→Observation). This is a *use* of the canonical lifecycle, not a redefinition; consistent.
- **Resource lifetime claim (§7.1)**: "usually process-lifetime for async steward workflows and role-lifetime for product-app agent harnesses." This claims `defaultLifetime: "process"` and `allowedLifetimes: ["process", "role"]`. This is a runtime config decision that the runtime spec must honor; it is shape-correct because it uses the runtime spec's lifetime taxonomy.
- **Provider acquisition through `providerFx.acquireRelease`**: assumes the runtime kernel exposes `providerFx`. Consistent shape with the Effect Runtime Realization vendor pattern.
- **`step.run` step naming**: chooses 15 canonical step labels. This is a coordination contract with Inngest, not a runtime claim; flagged as durable-async-spec territory.
- **Run identity persistence claim**: "RAWR run identity persists across retries and resumes." This is a workstream/durable-async claim — defers to those specs but states the cross-system invariant.
- **`AsyncIterable<ManagedAgentRunEvent>` for `streamEvents`**: claims streaming semantic at the resource boundary. Public requirement is "ordered, resumable, correlated event consumption" — internal implementation may vary. This is a seam contract, not a runtime semantic.

No runtime-semantic claims appear to *contradict* the runtime authority spec; all are consistent uses of its primitives. **runtime_authority: no** is correct.

## Completeness signals

- **No explicit TODO/TBD markers** found in the body.
- **Exactness annotations** appear on most code blocks: "normative for X; illustrative for exact TypeScript spelling" — the spec consistently distinguishes locked seams from illustrative spellings (§37 enumerates locked seams explicitly).
- **Authoritative-feeling sections**: §6 (separations), §7 (ontology), §10 (resource contract), §22 (policy), §27 (errors), §34 (conformance), §35 (forbidden patterns), §37 (locked seams). These read as load-bearing canon.
- **Exploratory-feeling sections**: §31 (app composition examples) and §32–§33 (workflow/shell examples) are scaffolds; §14 (profile families) lists 8 named profiles but their internal manifest mappings are sketches.
- **Cross-spec references that depend on companion specs**: classifier path (§18), capability bundle / retargeting (§19), context compilation (§17), runtime catalog (§9, §26), workstream/run/plan-revision (§15.5), steward governance (§30). Each is treated as authoritative-elsewhere; this spec defers properly.
- **Open question — implicit**: provider-side observability propagation; cost/budget enforcement integration; multi-agent handoff semantics inside one provider session.
- **Phase markers**: none — spec reads as Status: Canonical with no deferred milestones.
- **Coverage of own claimed scope**: high — every promised concern (lifecycle, manifest, profiles, seams, security, providers, snapshots, drain, governance, conformance, forbidden patterns) is addressed.

## Cross-spec dependencies

References (defers to / consumes from):
- **RAWR Effect Runtime Realization Spec** — runtime lifecycle, resource/provider model, `defineRuntimeResource`, `defineRuntimeProvider`, RuntimeCatalog, runtime profiles, bootgraph, process runtime.
- **RAWR OpenShell Agent Runtime Spec** — explicitly contrasts: OpenShell is HQ trusted-local, MAWE is sandboxed-managed.
- **RAWR Async Runtime Canonical Spec** — durable orchestration via Inngest; managed agent run is subordinate.
- **RAWR Workstream System Spec** — workstream/run/plan-revision/evidence/artifact ownership.
- **RAWR Workstream Review / Steward** — governance act/propose/escalate decisioning.
- **RAWR Authoring Classifier System Spec** — classifier-generation profile path.
- **RAWR Factory Bundle Export Spec** — capability-bundle, target-profile, retargeting profiles and outputs.
- **RAWR Authentication Subsystem Spec** — actor context, vault refs, service authorization.
- **RAWR System Architecture Canonical Spec** — governing topology (packages/resources/services/plugins/apps), platform chain (bind→project→compose→realize→observe).

Does not supersede any other spec. Provides one named primitive (`ManagedAgentWorkspaceResource`) that other specs may reference.

## Verbatim load-bearing definitions / claims

1. (§1) "A managed agent workspace execution is a provider-backed agent trajectory over an explicit workspace. It combines an agent definition, a workspace manifest, a sandbox or managed execution environment, tool capability, event stream, artifact drain, and optional snapshot or rehydration support."
2. (§2) "Managed agents are provider-selected workspace execution substrates. They do not own the work. They execute bounded trajectories over explicit workspace manifests. RAWR owns the coordination, truth, policy, artifacts, and governance around those trajectories."
3. (§4) "There are exactly two canonical seams." — async steward run substrate; downstream product-app agent harness.
4. (§6.1) "managed agent workspace execution != HQ shell substrate ... The HQ agent role remains OpenShell-backed."
5. (§6.5) "Use a code sandbox when the system needs deterministic or bounded code execution. Use managed agent workspace execution when the system needs an autonomous or semi-autonomous agent trajectory over files, tools, and a workspace."
6. (§6.7) "provider snapshot != workstream truth ... Snapshots ... do not replace workstream state, artifact records, source control, or run lineage."
7. (§7.2) Provider examples list: "openai-agents-sdk, claude-managed-agents, cloud-sandbox-agent, runloop, e2b, daytona, modal, vercel, local-noop, custom."
8. (§7.11) `ProviderCapabilitySet` flags include: `workspace-manifest, filesystem-read, filesystem-write, shell, patch, package-install, mcp, skills, memory, compaction, storage-mount, object-storage-mount, network-policy, vault-reference, snapshot, resume-from-session, resume-from-snapshot, artifact-export, event-stream, interrupt, human-approval, multi-agent-handoff`.
9. (§10) `defaultLifetime: "process"`, `allowedLifetimes: ["process", "role"]`; `defaultNetworkMode: literal("none", "allowlist", "egress-only")`.
10. (§11) "Services do not select managed agent providers. Plugins do not select managed agent providers. Runtime profiles select provider implementations. The runtime compiler validates provider coverage and capability support."
11. (§13.1) "It is not arbitrary prompt stuffing. It is a typed workspace descriptor."
12. (§13.6) "Silent omission of workspace policy is not allowed."
13. (§21.5) "Managed agent workspaces do not receive ambient service credentials. If a managed agent needs to call a RAWR service, access must flow through an explicit tool, MCP connector, server/internal API, or product tool bridge that carries actor context and respects service authorization."
14. (§25.2) Recovery order: "1. attach to existing provider run if run policy permits and state is healthy / 2. resume from serialized provider state if available and policy permits / 3. start fresh from latest allowed snapshot if available / 4. start fresh from original workspace manifest and persisted artifacts / 5. fail with recoverable or terminal diagnostic."
15. (§29) "Silent degradation is forbidden."
16. (§30) "Direct provider-side mutation of governed repo state is forbidden. A managed agent may write to its workspace. It may emit patches or artifacts. It may not directly commit to the canonical repo unless that action is mediated by a governed steward workflow and allowed by policy."
17. (§36) "The capability breakthrough is not that external managed agents replace RAWR's shell or runtime. The capability breakthrough is that RAWR can manufacture a bounded world-slice, place it inside a managed workspace, let a provider-managed agent work inside that world-slice, then drain verified outputs back into durable workstream and steward governance."

## Estimated completeness grade (initial impression)

**A−**. The spec is coherent, normatively scoped, with locked seams (§37), conformance checklist (§34), forbidden-patterns list (§35), and clean cross-spec deferrals. It covers all promised concerns at high resolution and consistently distinguishes locked semantics from illustrative spellings. Minor gaps that prevent a clean A: provider observability/trace propagation contract is implicit; cost/budget enforcement integration is unspecified; multi-agent handoff semantics inside a provider session are flagged as a capability flag without elaboration; profile→manifest mapping for the eight canonical profiles is sketched rather than fully tabulated. Nothing contradicts the runtime authority spec; the seam is well-posed for real provider implementations.

import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readdir, readlink, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type ContentAuthority,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-release";
import { afterEach, describe, expect, it } from "vitest";

import {
  must,
  productFixture,
  releaseInputBody,
  SOURCE,
} from "../../../packages/agent-plugin-release/test/fixtures";
import { CLAUDE_ADAPTER_PROTOCOL } from "../src/adapters/claude";
import { CODEX_ADAPTER_PROTOCOL } from "../src/adapters/codex";
import { createNodeClaudeProviderAdapter } from "../src/adapters/node-claude";
import { createNodeCodexProviderAdapter } from "../src/adapters/node-codex";
import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../src/domain/marketplace";
import {
  renderCompleteProjection,
  renderTargetedProjection,
  type AdapterProtocol,
  type AgentProviderProjection,
} from "../src/domain/projection";
import type { NativeProviderMutationAction } from "../src/ports/provider";
import type { ProviderTarget } from "../src/domain/target";
import {
  canonicalizeNodeProviderTargets,
  openNodeProviderState,
  type NodeProviderState,
} from "../src/node-state";
import {
  createCompleteTest,
  type CompleteTestDependencies,
  type MechanicalEvidenceDigest,
  type MechanicalEvidenceHandle,
  type MechanicalProviderEvidence,
} from "../src/index";

const acceptanceEnabled = process.env.RAWR_NATIVE_PROVIDER_ACCEPTANCE === "1";
const acceptance = acceptanceEnabled ? describe : describe.skip;

acceptance("explicit disposable native provider homes", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null && process.env.RAWR_NATIVE_PROVIDER_KEEP !== "1") {
      await removeOwnedFixture(fixtureRoot);
    } else if (fixtureRoot !== null) {
      process.stdout.write(`retained disposable native-provider acceptance root: ${fixtureRoot}\n`);
    }
    fixtureRoot = null;
  });

  it.each([
    ["codex", CODEX_ADAPTER_PROTOCOL, "RAWR_CODEX_EXECUTABLE"],
    ["claude", CLAUDE_ADAPTER_PROTOCOL, "RAWR_CLAUDE_EXECUTABLE"],
  ] as const)("converges generated A/B through direct %s native lifecycle", async (
    provider,
    adapterProtocol,
    executableVariable,
  ) => {
    const executablePath = requiredEnvironment(executableVariable);
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-native-acceptance-")));
    const home = path.join(fixtureRoot, `${provider}-home`);
    await mkdir(home);
    const targets = await canonicalizeNodeProviderTargets([{ provider, home }]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const target = targets.value[0]!;
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const fixture = productFixture();
    const releases = [releaseSnapshot(fixture.alphaRelease), releaseSnapshot(fixture.betaRelease)];
    const refreshedAlpha = refreshedAlphaRelease(fixture);
    const complete = mustProjection(renderCompleteProjection(provider, adapterProtocol, {
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      releaseSet: fixture.releaseSet,
      members: releases,
    }));
    const targeted = mustProjection(renderTargetedProjection(
      provider,
      adapterProtocol,
      [refreshedAlpha],
    ));
    await materializeProjection(state, complete);
    await materializeProjection(state, targeted);
    const completeMarketplace = marketplaceRegistration(complete);
    const targetedMarketplace = marketplaceRegistration(targeted, complete, "beta");
    const retiredMarketplace = marketplaceRegistration(targeted);
    for (const registration of [completeMarketplace, targetedMarketplace, retiredMarketplace]) {
      const materialized = await state.projections.materializeMarketplace(provider, registration);
      if (!materialized.ok) throw new Error(materialized.issues[0].message);
    }
    const adapter = provider === "codex"
      ? createNodeCodexProviderAdapter({
          executablePath,
          marketplaceSourceRoot: state.layout.projection.marketplaces,
          contentAuthority: complete.marketplace.identity as ContentAuthority,
          marketplaceSources: marketplaceSourceReader(state),
          projectionSources: state.projections,
        })
      : createNodeClaudeProviderAdapter({
          executablePath,
          marketplaceSourceRoot: state.layout.projection.marketplaces,
          contentAuthority: complete.marketplace.identity as ContentAuthority,
          marketplaceSources: marketplaceSourceReader(state),
          projectionSources: state.projections,
        });

    const absent: ProviderMarketplaceObservation = Object.freeze({ kind: "absent" });
    await apply(adapter, {
      kind: "SetMarketplace",
      role: "final",
      target,
      prior: absent,
      priorRegistration: null,
      registration: completeMarketplace,
    });
    for (const member of complete.members) {
      await apply(adapter, {
        kind: "InstallMember",
        target,
        priorMarketplace: null,
        activeMarketplace: completeMarketplace,
        projectionDigest: complete.projectionDigest,
        member,
      });
    }
    await expectExactInventory(adapter, target, complete, ["alpha", "beta"]);

    const inventory = await adapter.readInventory(target);
    if (!inventory.ok) throw new Error(inventory.issues[0].message);
    const alpha = inventory.value.members.find((member) => member.pluginId === "alpha");
    const beta = inventory.value.members.find((member) => member.pluginId === "beta");
    if (alpha === undefined || beta === undefined) throw new Error("native member disappeared before explicit refresh or retirement");
    await apply(adapter, {
      kind: "RetireMember",
      target,
      priorMarketplace: completeMarketplace,
      activeMarketplace: completeMarketplace,
      priorProjectionDigest: complete.projectionDigest,
      prior: alpha,
      proof: "receipt",
    });
    await expectNativeIdentityAbsent(adapter, target, alpha.nativeIdentity);
    await apply(adapter, {
      kind: "SetMarketplace",
      role: "transition",
      target,
      prior: Object.freeze({ kind: "present", state: marketplaceStateOf(completeMarketplace) }),
      priorRegistration: completeMarketplace,
      registration: targetedMarketplace,
    });
    const refreshedMember = targeted.members[0];
    if (refreshedMember === undefined) throw new Error("refreshed alpha projection is empty");
    await apply(adapter, {
      kind: "InstallMember",
      target,
      priorMarketplace: null,
      activeMarketplace: targetedMarketplace,
      projectionDigest: targeted.projectionDigest,
      member: refreshedMember,
    });
    const refreshedInventory = await adapter.readInventory(target);
    if (!refreshedInventory.ok) throw new Error(refreshedInventory.issues[0].message);
    expect(refreshedInventory.value.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    const refreshedVisible = await adapter.verifyProjection(target, targeted);
    if (!refreshedVisible.ok) throw new Error(refreshedVisible.issues[0].message);

    await apply(adapter, {
      kind: "RetireMember",
      target,
      priorMarketplace: targetedMarketplace,
      activeMarketplace: targetedMarketplace,
      priorProjectionDigest: complete.projectionDigest,
      prior: beta,
      proof: "receipt",
    });
    await expectNativeIdentityAbsent(adapter, target, beta.nativeIdentity);
    await apply(adapter, {
      kind: "SetMarketplace",
      role: "final",
      target,
      prior: Object.freeze({ kind: "present", state: marketplaceStateOf(targetedMarketplace) }),
      priorRegistration: targetedMarketplace,
      registration: retiredMarketplace,
    });
    await expectExactInventory(adapter, target, targeted, ["alpha"]);
  }, 120_000);

  it.each([
    ["codex", CODEX_ADAPTER_PROTOCOL, "RAWR_CODEX_EXECUTABLE"],
    ["claude", CLAUDE_ADAPTER_PROTOCOL, "RAWR_CLAUDE_EXECUTABLE"],
  ] as const)("repeats converged %s complete-test inspection without changing lifecycle-owned native state or controller home", async (
    provider,
    adapterProtocol,
    executableVariable,
  ) => {
    const executablePath = requiredEnvironment(executableVariable);
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-native-acceptance-")));
    const home = path.join(fixtureRoot, `${provider}-home`);
    await mkdir(home);
    const targets = await canonicalizeNodeProviderTargets([{ provider, home }]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const target = targets.value[0]!;
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const fixture = productFixture();
    const snapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }> = Object.freeze({
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      releaseSet: fixture.releaseSet,
      members: Object.freeze([
        releaseSnapshot(fixture.alphaRelease),
        releaseSnapshot(fixture.betaRelease),
      ]),
    });
    const projection = mustProjection(renderCompleteProjection(provider, adapterProtocol, snapshot));
    const nativeAdapter = provider === "codex"
      ? createNodeCodexProviderAdapter({
          executablePath,
          marketplaceSourceRoot: state.layout.projection.marketplaces,
          contentAuthority: projection.marketplace.identity as ContentAuthority,
          marketplaceSources: marketplaceSourceReader(state),
          projectionSources: state.projections,
        })
      : createNodeClaudeProviderAdapter({
          executablePath,
          marketplaceSourceRoot: state.layout.projection.marketplaces,
          contentAuthority: projection.marketplace.identity as ContentAuthority,
          marketplaceSources: marketplaceSourceReader(state),
          projectionSources: state.projections,
        });
    const warmed = await nativeAdapter.inspectCapabilities(target);
    if (!warmed.ok) throw new Error(warmed.issues.map((entry) => entry.message).join("; "));
    const counters = freshNativeRepeatCounters();
    const providerAdapter: NativeAdapter = Object.freeze({
      ...nativeAdapter,
      inspectCapabilities: async (subject: ProviderTarget) => {
        counters.capabilityReads += 1;
        return await nativeAdapter.inspectCapabilities(subject);
      },
      readInventory: async (subject: ProviderTarget) => {
        counters.inventoryReads += 1;
        return await nativeAdapter.readInventory(subject);
      },
      verifyProjection: async (subject: ProviderTarget, desired: AgentProviderProjection) => {
        counters.visibilityReads += 1;
        return await nativeAdapter.verifyProjection(subject, desired);
      },
      apply: async (action: NativeProviderMutationAction) => {
        counters.nativeMutations += 1;
        return await nativeAdapter.apply(action);
      },
    });
    const evidence = new Map<MechanicalEvidenceDigest, Readonly<{
      handle: MechanicalEvidenceHandle;
      bytes: Uint8Array;
    }>>();
    const dependencies: CompleteTestDependencies = {
      releases: Object.freeze({ read: async () => success(snapshot) }),
      provider: providerAdapter,
      providerMutator: providerAdapter,
      receipts: state.targets.receipts,
      receiptWriter: state.targets.receipts,
      identities: state.targets.identities,
      identityWriter: state.targets.identities,
      projectionMaterializer: Object.freeze({
        materialize: async (desired: AgentProviderProjection) => {
          counters.projectionMaterializations += 1;
          return await state.projections.materialize(desired);
        },
      }),
      marketplaceMaterializer: Object.freeze({
        materialize: async (
          targetProvider: ProviderTarget["provider"],
          registration: ProviderMarketplaceRegistration,
        ) => {
          counters.marketplaceMaterializations += 1;
          return await state.projections.materializeMarketplace(targetProvider, registration);
        },
      }),
      priorProjections: state.projections,
      capsule: Object.freeze({
        preflight: async () => {
          counters.capsulePreflights += 1;
          return success(null);
        },
        begin: async () => {
          counters.capsuleBegins += 1;
          return success(Object.freeze({
            stage: async () => success(null),
            applied: async () => success(null),
            fail: async () => success(null),
            settle: async () => success(null),
          }));
        },
      }),
      evidence: Object.freeze({
        inspect: async (digest: MechanicalEvidenceDigest) => {
          counters.evidenceReads += 1;
          const found = evidence.get(digest);
          return success(found === undefined
            ? Object.freeze({ kind: "missing" as const })
            : Object.freeze({
                kind: "present" as const,
                handle: found.handle,
                bytes: new Uint8Array(found.bytes),
              }));
        },
        publish: async (mechanicalEvidence: MechanicalProviderEvidence) => {
          counters.evidencePublishes += 1;
          const handle: MechanicalEvidenceHandle = Object.freeze({
            evidenceDigest: mechanicalEvidence.evidenceDigest,
            artifactIdentity: `native-acceptance/${mechanicalEvidence.evidenceDigest}`,
          });
          evidence.set(mechanicalEvidence.evidenceDigest, Object.freeze({
            handle,
            bytes: new Uint8Array(mechanicalEvidence.bytes),
          }));
          return success(handle);
        },
      }),
    };
    const app = createCompleteTest(() => dependencies);
    const request = Object.freeze({
      kind: "complete-test",
      releaseSet: snapshot.ref,
      evaluationProfile: "provider-smoke@v1",
      targets: Object.freeze([{ provider, home }]),
    });

    const first = await app(request);
    if (!first.ok) throw new Error(first.issues.map((entry) => entry.message).join("; "));
    if (first.value.status !== "Mutated") {
      throw new Error(`Initial native convergence was ${first.value.status}: ${first.value.issues.map((entry) => entry.message).join("; ")}`);
    }
    await expectExactInventory(providerAdapter, target, projection, ["alpha", "beta"]);

    const roots = Object.freeze([
      ...lifecycleOwnedNativeManifestRoots(provider, home),
      Object.freeze({ label: "controller-home", root: path.join(fixtureRoot, "controller") }),
    ]);
    const before = await exactNonFollowingTreeManifest(roots);
    resetNativeRepeatCounters(counters);

    const repeated = await app(request);
    if (!repeated.ok) throw new Error(repeated.issues.map((entry) => entry.message).join("; "));
    if (repeated.value.status !== "ReadOnlyConverged") {
      throw new Error(`Repeated native convergence was ${repeated.value.status}: ${repeated.value.issues.map((entry) => entry.message).join("; ")}`);
    }
    expect(counters.capabilityReads).toBeGreaterThan(0);
    expect(counters.inventoryReads).toBeGreaterThan(0);
    expect(counters.visibilityReads).toBeGreaterThan(0);
    expect(counters.evidenceReads).toBeGreaterThan(0);
    expect(counters.nativeMutations).toBe(0);
    expect(counters.projectionMaterializations).toBe(0);
    expect(counters.marketplaceMaterializations).toBe(0);
    expect(counters.capsulePreflights).toBe(0);
    expect(counters.capsuleBegins).toBe(0);
    expect(counters.evidencePublishes).toBe(0);
    expect(await exactNonFollowingTreeManifest(roots)).toEqual(before);
  }, 120_000);
});

type NativeAdapter = ReturnType<typeof createNodeCodexProviderAdapter> | ReturnType<typeof createNodeClaudeProviderAdapter>;

interface NativeRepeatCounters {
  capabilityReads: number;
  inventoryReads: number;
  visibilityReads: number;
  evidenceReads: number;
  nativeMutations: number;
  projectionMaterializations: number;
  marketplaceMaterializations: number;
  capsulePreflights: number;
  capsuleBegins: number;
  evidencePublishes: number;
}

interface ManifestRoot {
  readonly label: string;
  readonly root: string;
}

interface ExactTreeManifestEntry {
  readonly root: string;
  readonly path: string;
  readonly kind: "absent" | "directory" | "file" | "symlink";
  readonly mode: string | null;
  readonly nlink: string | null;
  readonly size: string | null;
  readonly mtimeNs: string | null;
  readonly bytes: string | null;
}

async function apply(adapter: NativeAdapter, action: NativeProviderMutationAction): Promise<void> {
  const applied = await adapter.apply(action);
  if (!applied.ok) throw new Error(applied.issues.map((entry) => entry.message).join("; "));
}

async function expectNativeIdentityAbsent(
  adapter: NativeAdapter,
  target: ProviderTarget,
  nativeIdentity: string,
): Promise<void> {
  const inventory = await adapter.readInventory(target);
  if (!inventory.ok) throw new Error(inventory.issues[0].message);
  expect(inventory.value.members.some((member) => member.nativeIdentity === nativeIdentity)).toBe(false);
  expect(inventory.value.standaloneExposures.some((exposure) => exposure.nativeIdentity === nativeIdentity)).toBe(false);
}

async function expectExactInventory(
  adapter: NativeAdapter,
  target: ProviderTarget,
  projection: AgentProviderProjection,
  expectedIds: readonly string[],
): Promise<void> {
  const inventory = await adapter.readInventory(target);
  if (!inventory.ok) throw new Error(inventory.issues[0].message);
  expect(inventory.value.members.map((member) => member.pluginId)).toEqual(expectedIds);
  expect(inventory.value.members.every((member) => member.enablement === "enabled")).toBe(true);
  const desired = Object.freeze({
    ...projection,
    members: Object.freeze(projection.members.filter((member) => expectedIds.includes(member.pluginId))),
  });
  const visible = await adapter.verifyProjection(target, desired);
  if (!visible.ok) throw new Error(visible.issues[0].message);
}

function marketplaceStateOf(registration: ProviderMarketplaceRegistration) {
  return Object.freeze({
    provider: registration.provider,
    adapterProtocol: registration.adapterProtocol,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function marketplaceRegistration(
  primary: AgentProviderProjection,
  preserved?: AgentProviderProjection,
  preservedPluginId?: string,
): ProviderMarketplaceRegistration {
  const members = [...primary.members];
  if (preserved !== undefined && preservedPluginId !== undefined) {
    const member = preserved.members.find((candidate) => candidate.pluginId === preservedPluginId);
    if (member === undefined) throw new Error("preserved fixture member missing");
    members.push(member);
  }
  return createProviderMarketplaceRegistration({
    provider: primary.provider,
    adapterProtocol: primary.adapterProtocol,
    marketplaceIdentity: primary.marketplace.identity,
    members: members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: primary.members.includes(member)
        ? primary.projectionDigest
        : preserved!.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

async function materializeProjection(state: NodeProviderState, projection: AgentProviderProjection): Promise<void> {
  const materialized = await state.projections.materialize(projection);
  if (!materialized.ok) throw new Error(materialized.issues[0].message);
}

function marketplaceSourceReader(state: NodeProviderState) {
  return Object.freeze({
    read: async (target: ProviderTarget, registration: ProviderMarketplaceRegistration) =>
      await state.projections.readMarketplace({ target, registration }),
  });
}

function mustProjection(result: Readonly<{
  ok: true;
  value: AgentProviderProjection;
} | {
  ok: false;
  issues: readonly { readonly message: string }[];
}>): AgentProviderProjection {
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "projection failed");
  return result.value;
}

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function refreshedAlphaRelease(
  fixture: ReturnType<typeof productFixture>,
): VerifiedReleaseArtifactV1 {
  const payload = must(createAgentPluginPayload([
    { path: "skills/alpha-next/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("alpha next\n") },
    { path: "agents/alpha.md", mode: 0o644, bytes: new TextEncoder().encode("agent alpha next\n") },
  ]));
  const releaseInput = must(createAgentPluginReleaseInput(releaseInputBody(payload, fixture.betaPayload)));
  return releaseSnapshot(must(createAgentPluginRelease({
    releaseInput,
    pluginId: "alpha",
    source: Object.freeze({
      ...SOURCE,
      sourceCommit: "c".repeat(40),
      sourceTree: "d".repeat(40),
    }),
    payload,
  })));
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0 || !path.isAbsolute(value)) {
    throw new Error(`${name} must name an explicit absolute executable`);
  }
  return path.normalize(value);
}

function providerStateRoots(root: string) {
  const controllerRoot = path.join(root, "controller");
  return Object.freeze({
    providerProjectionRoot: path.join(controllerRoot, "provider-projections-v1"),
    providerTargetStateRoot: path.join(controllerRoot, "provider-target-state-v1"),
  });
}

function success<T>(value: T) {
  return Object.freeze({ ok: true as const, value });
}

function freshNativeRepeatCounters(): NativeRepeatCounters {
  return {
    capabilityReads: 0,
    inventoryReads: 0,
    visibilityReads: 0,
    evidenceReads: 0,
    nativeMutations: 0,
    projectionMaterializations: 0,
    marketplaceMaterializations: 0,
    capsulePreflights: 0,
    capsuleBegins: 0,
    evidencePublishes: 0,
  };
}

function resetNativeRepeatCounters(counters: NativeRepeatCounters): void {
  Object.assign(counters, freshNativeRepeatCounters());
}

function lifecycleOwnedNativeManifestRoots(
  provider: ProviderTarget["provider"],
  home: string,
): readonly ManifestRoot[] {
  // Codex app-server inspection advances goals/state SQLite and tmp/arg0 process
  // state. Lifecycle authority is confined to native configuration and plugin
  // projections; skills and hooks are included to detect standalone residue.
  const configName = provider === "codex" ? "config.toml" : "settings.json";
  return Object.freeze([
    Object.freeze({ label: "provider-config", root: path.join(home, configName) }),
    Object.freeze({ label: "provider-plugins", root: path.join(home, "plugins") }),
    Object.freeze({ label: "provider-skills", root: path.join(home, "skills") }),
    Object.freeze({ label: "provider-hooks", root: path.join(home, "hooks") }),
  ]);
}

async function exactNonFollowingTreeManifest(
  roots: readonly ManifestRoot[],
): Promise<readonly ExactTreeManifestEntry[]> {
  const manifest: ExactTreeManifestEntry[] = [];
  for (const root of roots) {
    try {
      await lstat(root.root);
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) throw error;
      manifest.push(Object.freeze({
        root: root.label,
        path: ".",
        kind: "absent",
        mode: null,
        nlink: null,
        size: null,
        mtimeNs: null,
        bytes: null,
      }));
      continue;
    }
    await appendManifestEntry(root, root.root, ".", manifest);
  }
  return Object.freeze(manifest);
}

async function appendManifestEntry(
  root: ManifestRoot,
  absolutePath: string,
  relativePath: string,
  manifest: ExactTreeManifestEntry[],
): Promise<void> {
  const status = await lstat(absolutePath, { bigint: true });
  const common = {
    root: root.label,
    path: relativePath,
    mode: status.mode.toString(),
    nlink: status.nlink.toString(),
    size: status.size.toString(),
    mtimeNs: status.mtimeNs.toString(),
  };
  if (status.isSymbolicLink()) {
    const targetBytes = await readlink(absolutePath, { encoding: "buffer" });
    manifest.push(Object.freeze({
      ...common,
      kind: "symlink",
      bytes: targetBytes.toString("base64"),
    }));
    return;
  }
  if (status.isFile()) {
    const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat({ bigint: true });
      const bytes = await handle.readFile();
      const after = await handle.stat({ bigint: true });
      if (
        before.dev !== status.dev
        || before.ino !== status.ino
        || before.size !== status.size
        || before.mtimeNs !== status.mtimeNs
        || after.dev !== before.dev
        || after.ino !== before.ino
        || after.size !== before.size
        || after.mtimeNs !== before.mtimeNs
      ) {
        throw new Error(`Manifest file changed while being read: ${root.label}/${relativePath}`);
      }
      manifest.push(Object.freeze({
        ...common,
        kind: "file",
        bytes: bytes.toString("base64"),
      }));
    } finally {
      await handle.close();
    }
    return;
  }
  if (!status.isDirectory()) {
    throw new Error(`Manifest refuses unsupported entry type: ${root.label}/${relativePath}`);
  }
  manifest.push(Object.freeze({ ...common, kind: "directory", bytes: null }));
  const names = await readdir(absolutePath);
  names.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  for (const name of names) {
    await appendManifestEntry(
      root,
      path.join(absolutePath, name),
      relativePath === "." ? name : `${relativePath}/${name}`,
      manifest,
    );
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("rawr-c3-native-acceptance-")) {
    throw new Error("Refusing recursive cleanup outside the owned native-provider acceptance root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical native-provider acceptance root");
  }
  await rm(root, { recursive: true });
}

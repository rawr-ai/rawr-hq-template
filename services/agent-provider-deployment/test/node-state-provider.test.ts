import { copyFile, link, lstat, mkdtemp, mkdir, readFile, realpath, rename, rm, rmdir, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  contentDigest,
  createReleaseArtifactRef,
  type ArtifactDigest,
} from "@rawr/agent-plugin-release";
import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalizeNodeProviderTargets,
  createNodeProviderOwnerRuntime,
  openNodeProviderState,
} from "../src/node-state";
import { canonicalBytes, canonicalDigest } from "../src/domain/canonical";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
} from "../src/domain/marketplace";
import {
  projectionValue,
  providerSourceTreeValue,
  type AgentProviderProjection,
  type ProviderPackageFile,
  type ProviderProjectionMember,
} from "../src/domain/projection";
import { failure, issue } from "../src/domain/result";
import { createTargetReceipt, visibleFingerprint, type VerifiedMemberIdentity } from "../src/domain/receipt";
import { createTargetIdentitySidecar, type NativeMemberObservation } from "../src/domain/state";
import type { ProviderTarget } from "../src/domain/target";
import {
  createProviderOwnerAction,
  createProviderOwnerObservedPost,
  createProviderOwnerProtocolRegistration,
  providerOwnerTargetBinding,
} from "../src/owner-protocol";

describe("node provider state", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("opens and reads absent provider state without creating controller directories", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const home = path.join(fixtureRoot, "provider-home");
    await mkdir(home);
    const targets = await canonicalizeNodeProviderTargets([{ provider: "codex", home }]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const roots = providerStateRoots(fixtureRoot);
    const state = await openNodeProviderState(roots);

    expect(await state.targets.receipts.read(targets.value[0]!)).toEqual({
      ok: true,
      value: { kind: "absent" },
    });
    expect(await state.targets.identities.read(targets.value[0]!)).toEqual({
      ok: true,
      value: { kind: "absent" },
    });
    expect(await state.targets.completeIdentities.readAll()).toEqual({ ok: true, value: [] });
    await expect(lstat(roots.providerProjectionRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(roots.providerTargetStateRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects canonical home aliases and retains admitted identity after receipt retirement", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const home = path.join(fixtureRoot, "provider-home");
    const alias = path.join(fixtureRoot, "provider-alias");
    await mkdir(home);
    await symlink(home, alias);
    const duplicate = await canonicalizeNodeProviderTargets([
      { provider: "codex", home },
      { provider: "codex", home: alias },
    ]);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.issues[0].code).toBe("DUPLICATE_TARGET");

    const targets = await canonicalizeNodeProviderTargets([{ provider: "codex", home }]);
    if (!targets.ok) return;
    const target = targets.value[0]!;
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const sidecar = createTargetIdentitySidecar(target);
    expect((await state.targets.identities.admit(target, sidecar)).ok).toBe(true);
    expect((await state.targets.completeIdentities.readAll()).ok).toBe(true);

    const receipt = receiptFixture(target);
    expect((await state.targets.receipts.publish(target, { kind: "absent" }, receipt)).ok).toBe(true);
    const removed = await state.targets.receipts.remove(target, receipt);
    if (!removed.ok) throw new Error(removed.issues[0].message);
    expect(await state.targets.receipts.read(target)).toMatchObject({ ok: true, value: { kind: "absent" } });
    expect(await state.targets.identities.read(target)).toMatchObject({
      ok: true,
      value: { kind: "present", sidecar: { identityDigest: sidecar.identityDigest } },
    });
  });

  it("materializes digest-addressed projection bytes once and rejects tampered snapshot entries", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const roots = providerStateRoots(fixtureRoot);
    const state = await openNodeProviderState(roots);
    expect(state.layout.projection.root).toBe(roots.providerProjectionRoot);
    expect(state.layout.targetState.root).toBe(roots.providerTargetStateRoot);
    const disposableWorktree = path.join(fixtureRoot, "disposable-content-worktree");
    const sourcePath = path.join(disposableWorktree, "SKILL.md");
    await mkdir(disposableWorktree);
    await writeFile(sourcePath, "skill bytes\n");
    const projection = projectionFixture(await readFile(sourcePath));
    const first = await state.projections.materialize(projection);
    await unlink(sourcePath);
    await rmdir(disposableWorktree);
    const second = await state.projections.materialize(projection);
    const inspected = await state.projections.inspect(projection);
    expect(first.ok && first.value.kind).toBe("published");
    expect(second.ok && second.value.kind).toBe("existing");
    expect(inspected.ok && inspected.value.kind).toBe("existing");

    const malformed = path.join(state.layout.targetState.identities, `pt1_${"f".repeat(64)}.json`);
    await mkdir(state.layout.targetState.identities, { recursive: true });
    await writeFile(malformed, "{}\n", { mode: 0o600 });
    const snapshot = await state.targets.completeIdentities.readAll();
    expect(snapshot.ok).toBe(false);
  });

  it("recovers a dead process lock before retrying exact target-state publication", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const home = path.join(fixtureRoot, "provider-home");
    await mkdir(home);
    const targets = await canonicalizeNodeProviderTargets([{ provider: "codex", home }]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const target = targets.value[0]!;
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    await mkdir(state.layout.targetState.locks, { recursive: true });
    await writeFile(
      path.join(state.layout.targetState.locks, `${target.targetDigest}.receipt`),
      "99999999\n",
      { mode: 0o600 },
    );

    const receipt = receiptFixture(target);
    expect((await state.targets.receipts.publish(target, { kind: "absent" }, receipt)).ok).toBe(true);
    expect(await state.targets.receipts.read(target)).toMatchObject({ ok: true, value: { kind: "present" } });

    const interruptedCandidate = path.join(state.layout.targetState.locks, ".interrupted-identity.tmp");
    const interruptedLock = path.join(state.layout.targetState.locks, `${target.targetDigest}.identity`);
    await writeFile(interruptedCandidate, "99999999\n", { mode: 0o600 });
    await link(interruptedCandidate, interruptedLock);
    const sidecar = createTargetIdentitySidecar(target);
    expect((await state.targets.identities.admit(target, sidecar)).ok).toBe(true);
    expect((await state.targets.removeAdmittedIdentityExact(target, sidecar)).ok).toBe(true);
  });

  it("rejects copied receipts and aliased admitted homes without mutating either target", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const homeA = path.join(fixtureRoot, "provider-a");
    const homeB = path.join(fixtureRoot, "provider-b");
    await mkdir(homeA);
    await mkdir(homeB);
    const targets = await canonicalizeNodeProviderTargets([
      { provider: "codex", home: homeA },
      { provider: "codex", home: homeB },
    ]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const targetA = targets.value.find((target) => target.home === homeA);
    const targetB = targets.value.find((target) => target.home === homeB);
    if (targetA === undefined || targetB === undefined) throw new Error("target fixtures missing");
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const receiptA = receiptFixture(targetA);
    expect((await state.targets.receipts.publish(targetA, { kind: "absent" }, receiptA)).ok).toBe(true);
    await copyFile(
      path.join(state.layout.targetState.receipts, `${targetA.targetDigest}.json`),
      path.join(state.layout.targetState.receipts, `${targetB.targetDigest}.json`),
    );
    expect((await state.targets.receipts.read(targetB)).ok).toBe(false);
    expect(await state.targets.receipts.read(targetA)).toMatchObject({ ok: true, value: { kind: "present" } });

    const sidecar = createTargetIdentitySidecar(targetA);
    expect((await state.targets.identities.admit(targetA, sidecar)).ok).toBe(true);
    const movedHome = path.join(fixtureRoot, "provider-a-real");
    await rename(homeA, movedHome);
    await symlink(movedHome, homeA);
    expect((await state.targets.completeIdentities.readAll()).ok).toBe(false);
  });

  it("replays a last-member retire from the stable projection archive and re-normalizes absence", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-node-state-")));
    const home = path.join(fixtureRoot, "provider-home");
    await mkdir(home);
    const targets = await canonicalizeNodeProviderTargets([{ provider: "codex", home }]);
    if (!targets.ok) throw new Error(targets.issues[0].message);
    const target = targets.value[0]!;
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const projection = projectionFixture();
    const materialized = await state.projections.materialize(projection);
    if (!materialized.ok) throw new Error(materialized.issues[0].message);
    const projected = projection.members[0]!;
    const prior: NativeMemberObservation = Object.freeze({
      pluginId: projected.pluginId,
      nativeIdentity: projected.nativeIdentity,
      artifactAuthority: projected.artifactAuthority,
      providerSourceIdentity: projected.providerSourceIdentity,
      memberFingerprint: projected.memberFingerprint,
      enablement: "enabled",
      visibleSkills: projected.visible.skills,
      visibleHooks: projected.visible.hooks,
    });
    const priorMarketplace = createProviderMarketplaceRegistration({
      provider: target.provider,
      adapterProtocol: projection.adapterProtocol,
      marketplaceIdentity: projected.providerSourceIdentity,
      members: [{
        pluginId: projected.pluginId,
        nativeIdentity: projected.nativeIdentity,
        providerSourceIdentity: projected.providerSourceIdentity,
        sourceProjectionDigest: projection.projectionDigest,
        memberFingerprint: projected.memberFingerprint,
      }],
    });
    expect((await state.projections.materializeMarketplace(target.provider, priorMarketplace)).ok).toBe(true);
    let marketplace: ProviderMarketplaceObservation = Object.freeze({ kind: "absent" });
    let member: NativeMemberObservation | null = null;
    let restores = 0;
    const marketplaceTransitions: Array<string | null> = [];
    const native = {
      readMarketplace: async () => providerSuccess(marketplace),
      setMarketplaceExact: async (input: Parameters<import("../src/node-state").NativeMemberRestorationPort["setMarketplaceExact"]>[0]) => {
        marketplaceTransitions.push(input.registration?.projectionDigest ?? null);
        marketplace = input.registration === null
          ? Object.freeze({ kind: "absent" })
          : Object.freeze({ kind: "present", state: marketplaceState(input.registration) });
        return providerSuccess(null);
      },
      readMember: async () => providerSuccess(member),
      restoreExact: async (input: Parameters<import("../src/node-state").NativeMemberRestorationPort["restoreExact"]>[0]) => {
        restores += 1;
        expect(input.expected).toBeNull();
        expect(input.prior).toEqual(prior);
        expect(input.priorSource?.memberFingerprint).toBe(prior.memberFingerprint);
        expect(input.priorSource?.path.startsWith(state.layout.projection.root)).toBe(true);
        member = input.prior;
        return providerSuccess(null);
      },
    };
    const runtime = createNodeProviderOwnerRuntime({
      projections: state.projections,
      targets: state.targets,
      members: { codex: native, claude: native },
    });
    const action = createProviderOwnerAction({
      kind: "RetireMember",
      target,
      priorMarketplace,
      activeMarketplace: null,
      priorProjectionDigest: projection.projectionDigest,
      prior,
      proof: "receipt",
    });
    const binding = providerOwnerTargetBinding(target, { kind: "absent" });
    const observedPost = createProviderOwnerObservedPost(
      action,
      binding,
      Object.freeze({ kind: "member", member: null }),
    );
    const registration = createProviderOwnerProtocolRegistration(runtime);

    expect(await registration.replay.restore({ action, observedPost, targets: [binding] })).toEqual({ kind: "Restored" });
    expect(restores).toBe(1);
    expect(marketplace).toEqual({ kind: "absent" });
    expect(marketplaceTransitions).toEqual([priorMarketplace.projectionDigest, null]);
    expect(await registration.replay.restore({ action, observedPost, targets: [binding] })).toEqual({ kind: "Restored" });
    expect(restores).toBe(1);
    expect(marketplaceTransitions).toEqual([priorMarketplace.projectionDigest, null]);
    expect(await registration.replay.verifyPrior({ actions: [{ action, observedPost }], targets: [binding] })).toEqual({ kind: "Verified" });
  });

});

function nativeObservation(
  member: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"] = "enabled",
): NativeMemberObservation {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement,
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  });
}

function marketplaceRegistration(target: ProviderTarget, projection: AgentProviderProjection) {
  const member = projection.members[0]!;
  return createProviderMarketplaceRegistration({
    provider: target.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: member.providerSourceIdentity,
    members: [{
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    }],
  });
}

function receiptFixture(target: ProviderTarget) {
  const release = createReleaseArtifactRef(
    `rd1_${"1".repeat(64)}` as Parameters<typeof createReleaseArtifactRef>[0],
    `ad1_${"2".repeat(64)}` as ArtifactDigest,
  );
  const members: readonly VerifiedMemberIdentity[] = [{
    pluginId: "alpha",
    nativeIdentity: "rawr:alpha",
    artifactAuthority: ARTIFACT_AUTHORITY,
    providerSourceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    memberFingerprint: `pm1_${"a".repeat(64)}`,
  } as VerifiedMemberIdentity];
  const marketplace = createProviderMarketplaceRegistration({
    provider: target.provider,
    adapterProtocol: "rawr-provider-adapter/codex@v1" as AgentProviderProjection["adapterProtocol"],
    marketplaceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    members: members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: `ap1_${"4".repeat(64)}` as AgentProviderProjection["projectionDigest"],
      memberFingerprint: member.memberFingerprint,
    })),
  });
  return createTargetReceipt({
    schemaVersion: 1,
    provider: target.provider,
    targetDigest: target.targetDigest,
    generation: 1,
    lineage: { kind: "initial" },
    marketplace: marketplaceState(marketplace),
    scope: {
      kind: "targeted-test",
      requestDigest: `prq1_${"3".repeat(64)}`,
      projectionDigest: `ap1_${"4".repeat(64)}`,
      adapterProtocol: "rawr-provider-adapter/codex@v1",
      capabilityProfileDigest: `cp1_${"5".repeat(64)}`,
      visibleFingerprint: visibleFingerprint(members),
      verifiedMembers: members,
      releases: [release],
      evaluationProfile: "provider-smoke@v1",
    },
    managedMembers: members.map((member) => ({
      ...member,
      sourceProjectionDigest: `ap1_${"4".repeat(64)}`,
    })),
  } as unknown as Parameters<typeof createTargetReceipt>[0]);
}

function projectionFixture(bytes = new TextEncoder().encode("skill bytes\n")): AgentProviderProjection {
  const release = createReleaseArtifactRef(
    `rd1_${"6".repeat(64)}` as Parameters<typeof createReleaseArtifactRef>[0],
    `ad1_${"7".repeat(64)}` as ArtifactDigest,
  );
  const memberBody = {
    pluginId: "alpha",
    releaseRef: release,
    artifactAuthority: ARTIFACT_AUTHORITY,
    providerSourceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    nativeIdentity: "rawr:alpha",
    files: [{ path: "skills/alpha/SKILL.md", mode: 0o644, contentDigest: contentDigest(bytes), bytes }],
    visible: { pluginIdentity: "rawr:alpha", skills: ["alpha"], hooks: [] },
  } as const;
  const member = {
    ...memberBody,
    memberFingerprint: canonicalDigest("pm1_", {
      pluginId: memberBody.pluginId,
      releaseRef: { kind: release.kind, releaseDigest: release.releaseDigest, artifactDigest: release.artifactDigest },
      artifactAuthority: ARTIFACT_AUTHORITY,
      providerSourceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
      nativeIdentity: memberBody.nativeIdentity,
      files: memberBody.files.map((file) => ({ path: file.path, mode: file.mode, contentDigest: file.contentDigest })),
      visible: memberBody.visible,
    }),
  } as unknown as ProviderProjectionMember;
  const marketplaceBytes = canonicalBytes({
    name: ARTIFACT_AUTHORITY.contentAuthority,
    plugins: [{
      name: member.pluginId,
      source: { source: "local", path: "./plugins/alpha" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "agent",
    }],
  });
  const marketplaceFiles = [{
    path: ".agents/plugins/marketplace.json",
    mode: 0o644,
    contentDigest: contentDigest(marketplaceBytes),
    bytes: marketplaceBytes,
  }] as unknown as readonly ProviderPackageFile[];
  const body = {
    schemaVersion: 1,
    provider: "codex",
    rendererProtocol: "rawr-provider-renderer/codex@v1",
    adapterProtocol: "rawr-provider-adapter/codex@v1",
    artifactAuthority: ARTIFACT_AUTHORITY,
    source: { kind: "targeted", releases: [release] },
    marketplace: {
      identity: ARTIFACT_AUTHORITY.contentAuthority,
      sourceDigest: canonicalDigest("ps1_", providerSourceTreeValue(marketplaceFiles, [member])),
      files: marketplaceFiles,
    },
    capabilityProfile: {
      schemaVersion: 1,
      provider: "codex",
      adapterProtocol: "rawr-provider-adapter/codex@v1",
      required: ["native-plugin-install", "visible-plugin-inventory"],
      capabilityProfileDigest: `cp1_${"9".repeat(64)}`,
    },
    members: [member],
  } as unknown as Omit<AgentProviderProjection, "projectionDigest">;
  return {
    ...body,
    projectionDigest: canonicalDigest("ap1_", projectionValue(body)),
  } as AgentProviderProjection;
}

const ARTIFACT_AUTHORITY = Object.freeze({
  protocol: "agent-plugin-artifact-authority@v1" as const,
  contentAuthority: "personal-rawr-hq" as ProviderProjectionMember["providerSourceIdentity"],
  sourceCommit: "a".repeat(40) as ProviderProjectionMember["artifactAuthority"]["sourceCommit"],
});

function providerStateRoots(root: string) {
  const controllerRoot = path.join(root, "controller-data", "agent-plugins");
  return Object.freeze({
    providerProjectionRoot: path.join(controllerRoot, "provider-projections-v1"),
    providerTargetStateRoot: path.join(controllerRoot, "provider-target-state-v1"),
  });
}

function providerSuccess<T>(value: T) {
  return Object.freeze({ ok: true as const, value });
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("rawr-c3-node-state-")) {
    throw new Error("Refusing recursive cleanup outside the owned provider-state fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical provider-state fixture root");
  }
  await rm(root, { recursive: true });
}

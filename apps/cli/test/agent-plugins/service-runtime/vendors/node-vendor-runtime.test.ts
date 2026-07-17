import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  parseContentAuthority,
  parsePluginId,
  parseReleaseRelativePath,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorAuthoringPlan,
  type VendorContentWorkspaceRef,
  type VendorSourceIdentity,
} from "@rawr/agent-plugin-lifecycle/ports/vendors";
import { afterEach, describe, expect, it } from "vitest";

import { canonicalJsonBytes, sha256ContentDigest } from "../../../../src/lib/agent-plugins/service-runtime/vendors/canonical";
import { createNodeVendorLifecycleRuntime } from "../../../../src/lib/agent-plugins/service-runtime/vendors/repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../releases/owned-fixture-root";

const execFileAsync = promisify(execFile);
const GIT = "/usr/bin/git";
const TEMP_PREFIX = "rawr-vendor-git-";

describe("node vendor lifecycle runtime", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("observes metadata, prepares self-contained bytes, and leaves no private Git repository", async () => {
    fixture = await createOwnedFixtureRoot();
    const upstream = await createUpstreamRepository(fixture.path);
    const before = await privateVendorRoots();
    const runtime = await createNodeVendorLifecycleRuntime({
      gitExecutable: GIT,
      now: () => new Date("2026-07-17T18:20:30.123Z"),
    });

    const observed = await runtime.upstream.observe({
      sourceId: "example",
      repositoryIdentity: upstream.root,
      refName: "refs/heads/main",
      sourcePath: "source",
      admitted: upstream.initialIdentity,
    });

    expect(observed).toMatchObject({
      kind: "Observed",
      ancestry: "same",
      observedAt: "2026-07-17T18:20:30.123Z",
    });
    if (observed.kind !== "Observed") throw new Error(`unexpected upstream observation: ${observed.kind}`);

    const prepared = await runtime.upstream.prepare({
      sourceId: "example",
      repositoryIdentity: upstream.root,
      refName: "refs/heads/main",
      sourcePath: "source",
      admitted: upstream.initialIdentity,
      expected: observed.identity,
      expectedEntries: observed.entries,
    });

    expect(prepared).toMatchObject({ kind: "Prepared", payload: { identity: observed.identity } });
    if (prepared.kind !== "Prepared") throw new Error(`unexpected upstream preparation: ${prepared.kind}`);
    expect(new TextDecoder().decode(prepared.payload.entries[0]?.bytes)).toBe("initial\n");
    expect(await privateVendorRoots()).toEqual(before);
  });

  it("authors only the planned content records, payload, and binding digests", async () => {
    fixture = await createOwnedFixtureRoot();
    const upstream = await createUpstreamRepository(fixture.path);
    const content = await createContentRepository(fixture.path, upstream.initialIdentity);
    const runtime = await createNodeVendorLifecycleRuntime({
      gitExecutable: GIT,
      now: () => new Date("2026-07-17T18:20:30.123Z"),
    });
    const initial = await runtime.repository.observe(content.workspace);
    if (initial.kind !== "Observed") throw new Error(`unexpected repository observation: ${JSON.stringify(initial)}`);

    await writeFile(path.join(upstream.root, "source", "payload.txt"), "updated\n");
    await git(upstream.root, ["add", "--all"]);
    await git(upstream.root, ["commit", "-m", "update"]);
    const upstreamObservation = await runtime.upstream.observe({
      sourceId: "example",
      repositoryIdentity: upstream.root,
      refName: "refs/heads/main",
      sourcePath: "source",
      admitted: upstream.initialIdentity,
    });
    expect(upstreamObservation).toMatchObject({ kind: "Observed", ancestry: "fast-forward" });
    if (upstreamObservation.kind !== "Observed") throw new Error(`unexpected upstream observation: ${upstreamObservation.kind}`);
    const prepared = await runtime.upstream.prepare({
      sourceId: "example",
      repositoryIdentity: upstream.root,
      refName: "refs/heads/main",
      sourcePath: "source",
      admitted: upstream.initialIdentity,
      expected: upstreamObservation.identity,
      expectedEntries: upstreamObservation.entries,
    });
    if (prepared.kind !== "Prepared") throw new Error(`unexpected upstream preparation: ${prepared.kind}`);

    const source = initial.observation.sources[0]!;
    const nextDeclaration = Object.freeze({ ...source.declaration, curationRevision: 2 });
    const nextProvenance = Object.freeze({
      ...source.provenance!,
      admitted: upstreamObservation.identity,
      importedPayloadDigest: upstreamObservation.identity.payloadDigest,
      curationRevision: 2,
      observedLatest: upstreamObservation.identity,
      observedAt: upstreamObservation.observedAt,
      disposition: "review-required" as const,
    });
    const nextLock = Object.freeze({ ...source.lock!, admitted: upstreamObservation.identity });
    const changedPaths = Object.freeze([
      ".rawr/release-input.json",
      "plugins/example/vendor",
      "vendor/locks/example.json",
      "vendor/provenance/example.json",
      "vendor/sources/example.json",
    ]);
    const plan: VendorAuthoringPlan = Object.freeze({
      contentWorkspace: content.workspace,
      expectedSnapshotDigest: initial.observation.snapshotDigest,
      releaseInputPath: content.workspace.releaseInputPath,
      sourceChanges: Object.freeze([Object.freeze({
        sourceId: "example",
        prior: upstream.initialIdentity,
        next: upstreamObservation.identity,
        memberPluginId: "example",
        declarationBinding: source.declarationBinding,
        provenanceBinding: source.provenanceBinding!,
        lockBinding: source.lockBinding!,
        priorRecords: Object.freeze({
          declaration: source.declaration,
          provenance: source.provenance!,
          lock: source.lock!,
        }),
        nextRecords: Object.freeze({
          declaration: nextDeclaration,
          provenance: nextProvenance,
          lock: nextLock,
        }),
        payload: prepared.payload,
        declarationPath: source.declarationBinding.id,
        destinationPath: source.declaration.destinationPath,
        provenancePath: source.provenanceBinding!.id,
        lockPath: source.lockBinding!.id,
      })]),
      changedPaths,
    });

    const captured = await runtime.authoring.capture(plan);
    expect(captured.kind).toBe("Captured");
    if (captured.kind !== "Captured") throw new Error(`unexpected preimage capture: ${captured.kind}`);

    const releaseInputPath = path.join(content.root, ".rawr/release-input.json");
    const payloadPath = path.join(content.root, "plugins/example/vendor/payload.txt");
    const declarationPath = path.join(content.root, "vendor/sources/example.json");
    const provenancePath = path.join(content.root, "vendor/provenance/example.json");
    const lockPath = path.join(content.root, "vendor/locks/example.json");
    const beforeConcurrentEdit = await Promise.all([
      readFile(releaseInputPath),
      readFile(payloadPath),
      readFile(provenancePath),
      readFile(lockPath),
    ]);
    await writeFile(declarationPath, "concurrent edit\n");
    expect(await runtime.authoring.apply(plan, captured.preimageHandle)).toMatchObject({
      kind: "FailedBeforeMutation",
      detail: expect.stringContaining("changed after preimage capture"),
    });
    expect(await readFile(declarationPath, "utf8")).toBe("concurrent edit\n");
    expect(await Promise.all([
      readFile(releaseInputPath),
      readFile(payloadPath),
      readFile(provenancePath),
      readFile(lockPath),
    ])).toEqual(beforeConcurrentEdit);

    await writeFile(declarationPath, canonicalJsonBytes(source.declaration));
    expect(await runtime.authoring.apply(plan, captured.preimageHandle)).toEqual({
      kind: "Applied",
      changedPaths,
    });

    expect(await readFile(path.join(content.root, "plugins/example/vendor/payload.txt"), "utf8")).toBe("updated\n");
    expect(new Uint8Array(await readFile(path.join(content.root, "vendor/sources/example.json")))).toEqual(canonicalJsonBytes(nextDeclaration));
    expect(new Uint8Array(await readFile(path.join(content.root, "vendor/provenance/example.json")))).toEqual(canonicalJsonBytes(nextProvenance));
    expect(new Uint8Array(await readFile(path.join(content.root, "vendor/locks/example.json")))).toEqual(canonicalJsonBytes(nextLock));
    const release = decodeAgentPluginReleaseInput(await readFile(path.join(content.root, ".rawr/release-input.json")));
    expect(release.ok).toBe(true);
    if (!release.ok) throw new Error("authored release input did not decode");
    expect(Object.fromEntries(release.value.body.members[0]?.vendor.map((binding) => [binding.id, binding.contentDigest]) ?? [])).toEqual({
      "vendor/sources/example.json": sha256ContentDigest(canonicalJsonBytes(nextDeclaration)),
      "vendor/provenance/example.json": sha256ContentDigest(canonicalJsonBytes(nextProvenance)),
    });
    expect(release.value.body.locks[0]?.contentDigest).toBe(sha256ContentDigest(canonicalJsonBytes(nextLock)));
  });
});

async function createUpstreamRepository(parent: string): Promise<Readonly<{
  root: string;
  initialIdentity: VendorSourceIdentity;
}>> {
  const root = path.join(parent, "upstream");
  await mkdir(path.join(root, "source"), { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, "source", "payload.txt"), "initial\n");
  await git(root, ["init", "-b", "main"]);
  await configureGit(root);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "-m", "initial"]);
  const sourceCommit = await git(root, ["rev-parse", "HEAD"]);
  const sourceTree = await git(root, ["rev-parse", "HEAD:source"]);
  const repositoryIdentity = `file://${root}`;
  const runtime = await createNodeVendorLifecycleRuntime({ gitExecutable: GIT });
  const observed = await runtime.upstream.observe({
    sourceId: "example",
    repositoryIdentity,
    refName: "refs/heads/main",
    sourcePath: "source",
    admitted: {
      repositoryIdentity,
      refName: "refs/heads/main",
      sourceCommit,
      sourceTree,
      payloadDigest: `sha256_${"0".repeat(64)}`,
    },
  });
  if (observed.kind !== "Observed") throw new Error(`could not observe fixture upstream: ${observed.kind}`);
  return Object.freeze({ root, initialIdentity: observed.identity });
}

async function createContentRepository(parent: string, admitted: VendorSourceIdentity): Promise<Readonly<{
  root: string;
  workspace: VendorContentWorkspaceRef;
}>> {
  const root = path.join(parent, "content");
  const repositoryIdentity = `file://${path.join(parent, "content-origin.git")}`;
  const declaration = Object.freeze({
    schemaVersion: 1 as const,
    sourceId: "example",
    policy: "tracked" as const,
    repositoryIdentity: admitted.repositoryIdentity,
    refName: admitted.refName,
    sourcePath: "source",
    destinationPath: "plugins/example/vendor",
    provenancePath: "vendor/provenance/example.json",
    lockPath: "vendor/locks/example.json",
    curationRevision: 1,
    supportedBaseline: "fixture-baseline",
  });
  const provenance = Object.freeze({
    schemaVersion: 1 as const,
    sourceId: "example",
    admitted,
    importedPayloadDigest: admitted.payloadDigest,
    curationRevision: 1,
    supportedBaseline: "fixture-baseline",
    observedLatest: admitted,
    observedAt: "2026-07-16T00:00:00.000Z",
    disposition: "admitted" as const,
  });
  const lock = Object.freeze({ schemaVersion: 1 as const, sourceId: "example", admitted });
  const declarationBytes = canonicalJsonBytes(declaration);
  const provenanceBytes = canonicalJsonBytes(provenance);
  const lockBytes = canonicalJsonBytes(lock);
  const pluginPayloadPath = must(parseReleaseRelativePath("skills/example/SKILL.md"));
  const pluginPayload = must(createAgentPluginPayload([{
    path: pluginPayloadPath,
    mode: 0o644,
    bytes: new TextEncoder().encode("# Fixture\n"),
  }]));
  const release = must(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority: must(parseContentAuthority("fixture-authority")),
    members: [{
      kind: "agent-plugin",
      pluginId: must(parsePluginId("example")),
      skillInventory: [{ identity: "example", manifestPath: pluginPayloadPath }],
      payload: { protocolVersion: 1, manifest: pluginPayload.manifest, payloadDigest: pluginPayload.payloadDigest },
      vendor: [
        { id: "vendor/sources/example.json", protocol: VENDOR_SOURCE_PROTOCOL, contentDigest: sha256ContentDigest(declarationBytes) },
        { id: "vendor/provenance/example.json", protocol: VENDOR_PROVENANCE_PROTOCOL, contentDigest: sha256ContentDigest(provenanceBytes) },
      ],
      curation: [],
    }],
    ownershipClaims: [{ kind: "skill", identity: "example", ownerPluginId: must(parsePluginId("example")) }],
    locks: [{ id: "vendor/locks/example.json", protocol: VENDOR_LOCK_PROTOCOL, contentDigest: sha256ContentDigest(lockBytes) }],
    qualityPolicies: [],
  }));
  await mkdir(path.join(root, ".rawr"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/sources"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/provenance"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/locks"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "plugins/example/vendor"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "plugins/example/skills/example"), { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, ".rawr/release-input.json"), canonicalSerializeAgentPluginReleaseInput(release));
  await writeFile(path.join(root, "vendor/sources/example.json"), declarationBytes);
  await writeFile(path.join(root, "vendor/provenance/example.json"), provenanceBytes);
  await writeFile(path.join(root, "vendor/locks/example.json"), lockBytes);
  await writeFile(path.join(root, "plugins/example/vendor/payload.txt"), "initial\n");
  await writeFile(path.join(root, "plugins/example/skills/example/SKILL.md"), "# Fixture\n");
  await git(root, ["init", "-b", "main"]);
  await configureGit(root);
  await git(root, ["remote", "add", "origin", repositoryIdentity]);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "-m", "content"]);
  return Object.freeze({
    root,
    workspace: Object.freeze({
      locator: root,
      repositoryIdentity,
      contentAuthority: "fixture-authority",
      refName: "refs/heads/main",
      sourceCommit: await git(root, ["rev-parse", "HEAD"]),
      sourceTree: await git(root, ["rev-parse", "HEAD^{tree}"]),
      releaseInputPath: ".rawr/release-input.json",
    }),
  });
}

async function configureGit(root: string): Promise<void> {
  await git(root, ["config", "user.email", "fixture@example.invalid"]);
  await git(root, ["config", "user.name", "Vendor Fixture"]);
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync(GIT, args, { cwd: root, encoding: "utf8" });
  return result.stdout.trim();
}

async function privateVendorRoots(): Promise<readonly string[]> {
  const names = await readdir(tmpdir());
  const roots: string[] = [];
  for (const name of names.filter((candidate) => candidate.startsWith(TEMP_PREFIX)).sort()) {
    const candidate = path.join(tmpdir(), name);
    if ((await stat(candidate)).isDirectory()) roots.push(candidate);
  }
  return roots;
}

function must<T>(result: Readonly<{ ok: true; value: T } | { ok: false; issues?: readonly unknown[] }>): T {
  if (!result.ok) throw new Error(`fixture value is invalid: ${JSON.stringify(result.issues)}`);
  return result.value;
}

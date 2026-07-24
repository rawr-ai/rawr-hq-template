import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createProductionLifecycleClient } from "../../../../src/lib/agent-plugins/service-runtime/client";
import {
  createOwnedFixtureRoot,
  type OwnedFixtureRoot,
  removeOwnedFixtureRoot,
} from "../releases/owned-fixture-root";

const execFileAsync = promisify(execFile);
const GIT = "/usr/bin/git";
const TEMP_PREFIX = "rawr-content-workspace-git-";
const VENDOR_SOURCE_PROTOCOL = "rawr-vendor-source@v1";
const VENDOR_PROVENANCE_PROTOCOL = "rawr-vendor-provenance@v1";
const VENDOR_LOCK_PROTOCOL = "rawr-vendor-lock@v1";
type VendorStatusRequest = Parameters<Client["vendors"]["status"]>[0];
type VendorContentWorkspaceRef = VendorStatusRequest["contentWorkspace"];
type VendorStatusResult = Awaited<ReturnType<Client["vendors"]["status"]>>;
type VendorSourceIdentity = NonNullable<
  Extract<VendorStatusResult, { kind: "VendorStatus" }>["sources"][number]["admitted"]
>;

const invocation = {
  context: {
    invocation: {
      traceId: "trace-node-vendor-runtime",
      commandId: "command-node-vendor-runtime",
    },
  },
} as const;

describe("node vendor lifecycle runtime", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("routes corrupt governed records through service refusal without repository effects", async () => {
    fixture = await createOwnedFixtureRoot();
    const upstream = await createUpstreamRepository(fixture.path);
    const content = await createContentRepository(fixture.path, upstream.initialIdentity);
    const client = await createProductionLifecycleClient("vendors.status", lifecycleBinding());
    expect(Object.keys(client.vendors)).toEqual(["status"]);
    // @ts-expect-error A status binding cannot represent the update procedure.
    void client.vendors.update;
    await isolatePrivateContentWorkspaceRoots(fixture.path);
    const recordPaths = [
      "vendor/sources/example.json",
      "vendor/provenance/example.json",
      "vendor/locks/example.json",
    ] as const;

    for (const relativePath of recordPaths) {
      const recordPath = path.join(content.root, relativePath);
      const original = await readFile(recordPath);
      try {
        await writeFile(recordPath, '{"schemaVersion":999}\n');
        const before = await repositoryState(content.root);

        const result = await client.vendors.status(
          { contentWorkspace: content.workspace },
          invocation
        );

        expect.soft(result, relativePath).toMatchObject({
          kind: "Rejected",
          issues: [{ code: "PayloadMismatch" }],
        });
        expect.soft(await repositoryState(content.root), relativePath).toEqual(before);
      } finally {
        await writeFile(recordPath, original);
      }
    }
  });

  it("authors service-owned records once and stutters without bytes, metadata, or temp effects", async () => {
    fixture = await createOwnedFixtureRoot();
    const upstream = await createUpstreamRepository(fixture.path);
    const content = await createContentRepository(fixture.path, upstream.initialIdentity);
    await writeFile(path.join(upstream.root, "source", "payload.txt"), "updated\n");
    await git(upstream.root, ["add", "--all"]);
    await git(upstream.root, ["commit", "-m", "update"]);
    const client = await createProductionLifecycleClient("vendors.update", lifecycleBinding());
    expect(Object.keys(client.vendors)).toEqual(["update"]);
    // @ts-expect-error An update binding cannot represent the status procedure.
    void client.vendors.status;
    const request = Object.freeze({
      contentWorkspace: content.workspace,
      sourceIds: Object.freeze(["example"]),
    });
    await isolatePrivateContentWorkspaceRoots(fixture.path);
    const changedPaths = [
      ".rawr/release-input.json",
      "plugins/example/vendor",
      "vendor/locks/example.json",
      "vendor/provenance/example.json",
      "vendor/sources/example.json",
    ];

    expect(await client.vendors.update(request, invocation)).toEqual({
      kind: "AuthoredReviewableChanges",
      sourceIds: ["example"],
      changedPaths,
    });

    expect(
      await readFile(path.join(content.root, "plugins/example/vendor/payload.txt"), "utf8")
    ).toBe("updated\n");
    const releaseInputBytes = await readFile(path.join(content.root, ".rawr/release-input.json"));
    const releaseRecordClient = await createProductionLifecycleClient(
      "releases.releaseInputRecord",
      lifecycleBinding()
    );
    const validatedReleaseInput = await releaseRecordClient.releases.releaseInputRecord(
      { kind: "validate-envelope", bytes: releaseInputBytes },
      invocation
    );
    expect(validatedReleaseInput.ok).toBe(true);
    if (!validatedReleaseInput.ok) throw new Error("authored release input was rejected");
    const release: unknown = JSON.parse(new TextDecoder().decode(releaseInputBytes));
    expect(release).toMatchObject({
      body: {
        members: [
          {
            vendor: [
              {
                id: "vendor/provenance/example.json",
                contentDigest: contentDigest(
                  await readFile(path.join(content.root, "vendor/provenance/example.json"))
                ),
              },
              {
                id: "vendor/sources/example.json",
                contentDigest: contentDigest(
                  await readFile(path.join(content.root, "vendor/sources/example.json"))
                ),
              },
            ],
          },
        ],
        locks: [
          {
            id: "vendor/locks/example.json",
            contentDigest: contentDigest(
              await readFile(path.join(content.root, "vendor/locks/example.json"))
            ),
          },
        ],
      },
    });

    const convergedState = await repositoryState(content.root);
    expect(await client.vendors.update(request, invocation)).toEqual({
      kind: "ReadOnlyConverged",
      sourceIds: ["example"],
    });
    expect(await repositoryState(content.root)).toEqual(convergedState);
  });
});

async function createUpstreamRepository(parent: string): Promise<
  Readonly<{
    root: string;
    initialIdentity: VendorSourceIdentity;
  }>
> {
  const root = path.join(parent, "upstream");
  await mkdir(path.join(root, "source"), { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, "source", "SKILL.md"), "# Vendor fixture\n");
  await writeFile(path.join(root, "source", "payload.txt"), "initial\n");
  await git(root, ["init", "-b", "main"]);
  await configureGit(root);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "-m", "initial"]);
  const sourceCommit = await git(root, ["rev-parse", "HEAD"]);
  const sourceTree = await git(root, ["rev-parse", "HEAD:source"]);
  const skillBlob = await git(root, ["rev-parse", "HEAD:source/SKILL.md"]);
  const payloadBlob = await git(root, ["rev-parse", "HEAD:source/payload.txt"]);
  const repositoryIdentity = `file://${root}`;
  const initialIdentity = Object.freeze({
    repositoryIdentity,
    refName: "refs/heads/main",
    sourceCommit,
    sourceTree,
    payloadDigest: contentDigest(
      jsonLine([
        { blob: skillBlob, mode: "100644", path: "SKILL.md" },
        { blob: payloadBlob, mode: "100644", path: "payload.txt" },
      ])
    ),
  });
  return Object.freeze({ root, initialIdentity });
}

async function createContentRepository(
  parent: string,
  admitted: VendorSourceIdentity
): Promise<
  Readonly<{
    root: string;
    workspace: VendorContentWorkspaceRef;
  }>
> {
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
  const declarationBytes = jsonLine({
    curationRevision: declaration.curationRevision,
    destinationPath: declaration.destinationPath,
    lockPath: declaration.lockPath,
    policy: declaration.policy,
    provenancePath: declaration.provenancePath,
    refName: declaration.refName,
    repositoryIdentity: declaration.repositoryIdentity,
    schemaVersion: declaration.schemaVersion,
    sourceId: declaration.sourceId,
    sourcePath: declaration.sourcePath,
    supportedBaseline: declaration.supportedBaseline,
  });
  const provenanceBytes = jsonLine({
    admitted: identityValue(provenance.admitted),
    curationRevision: provenance.curationRevision,
    disposition: provenance.disposition,
    importedPayloadDigest: provenance.importedPayloadDigest,
    observedAt: provenance.observedAt,
    observedLatest: identityValue(provenance.observedLatest),
    schemaVersion: provenance.schemaVersion,
    sourceId: provenance.sourceId,
    supportedBaseline: provenance.supportedBaseline,
  });
  const lockBytes = jsonLine({
    admitted: identityValue(lock.admitted),
    schemaVersion: lock.schemaVersion,
    sourceId: lock.sourceId,
  });
  const releaseRecordClient = await createProductionLifecycleClient(
    "releases.releaseInputRecord",
    lifecycleBinding()
  );
  const release = await releaseRecordClient.releases.releaseInputRecord(
    {
      kind: "encode-body",
      body: {
        schemaVersion: 1,
        contentAuthority: "fixture-authority",
        members: [
          {
            kind: "agent-plugin",
            pluginId: "example",
            skillInventory: [],
            payload: {
              protocolVersion: 1,
              manifest: [],
              payloadDigest: "pd1_37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570",
            },
            vendor: [
              {
                id: "vendor/sources/example.json",
                protocol: VENDOR_SOURCE_PROTOCOL,
                contentDigest: contentDigest(declarationBytes),
              },
              {
                id: "vendor/provenance/example.json",
                protocol: VENDOR_PROVENANCE_PROTOCOL,
                contentDigest: contentDigest(provenanceBytes),
              },
            ],
            curation: [],
          },
        ],
        ownershipClaims: [],
        locks: [
          {
            id: "vendor/locks/example.json",
            protocol: VENDOR_LOCK_PROTOCOL,
            contentDigest: contentDigest(lockBytes),
          },
        ],
        qualityPolicies: [],
      },
    },
    invocation
  );
  if (!release.ok) throw new Error("fixture release input was rejected");
  await mkdir(path.join(root, ".rawr"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/sources"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/provenance"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "vendor/locks"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, "plugins/example/vendor"), { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, ".rawr/release-input.json"), release.value.bytes);
  await writeFile(path.join(root, "vendor/sources/example.json"), declarationBytes);
  await writeFile(path.join(root, "vendor/provenance/example.json"), provenanceBytes);
  await writeFile(path.join(root, "vendor/locks/example.json"), lockBytes);
  await writeFile(path.join(root, "plugins/example/vendor/SKILL.md"), "# Vendor fixture\n");
  await writeFile(path.join(root, "plugins/example/vendor/payload.txt"), "initial\n");
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

async function repositoryState(root: string) {
  return Object.freeze({
    status: await git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    tree: await snapshotTree(root),
    privateRoots: await privateContentWorkspaceRoots(),
  });
}

interface SnapshotEntry {
  readonly path: string;
  readonly kind: "directory" | "file";
  readonly mode: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly bytes: readonly number[] | null;
}

async function snapshotTree(root: string, relative = ""): Promise<readonly SnapshotEntry[]> {
  const entries: SnapshotEntry[] = [];
  const current = relative === "" ? root : path.join(root, relative);
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    if (relative === "" && entry.name === ".git") continue;
    const childRelative = relative === "" ? entry.name : `${relative}/${entry.name}`;
    const child = path.join(root, childRelative);
    const info = await stat(child, { bigint: true });
    const kind = entry.isDirectory() ? ("directory" as const) : ("file" as const);
    entries.push(
      Object.freeze({
        path: childRelative,
        kind,
        mode: info.mode.toString(8),
        size: info.size.toString(),
        mtimeNs: info.mtimeNs.toString(),
        bytes: kind === "file" ? Object.freeze([...(await readFile(child))]) : null,
      })
    );
    if (kind === "directory") entries.push(...(await snapshotTree(root, childRelative)));
  }
  return Object.freeze(entries);
}

async function privateContentWorkspaceRoots(): Promise<readonly string[]> {
  const names = await readdir(tmpdir());
  const roots: string[] = [];
  for (const name of names.filter((candidate) => candidate.startsWith(TEMP_PREFIX)).sort()) {
    const candidate = path.join(tmpdir(), name);
    if ((await stat(candidate)).isDirectory()) roots.push(candidate);
  }
  return roots;
}

async function isolatePrivateContentWorkspaceRoots(ownerRoot: string): Promise<void> {
  const privateTemporaryRoot = path.join(ownerRoot, "private-tmp");
  await mkdir(privateTemporaryRoot, { mode: 0o700 });
  vi.stubEnv("TMPDIR", privateTemporaryRoot);
  if (path.resolve(tmpdir()) !== privateTemporaryRoot) {
    throw new Error("test runtime did not select its private temporary root");
  }
}

function lifecycleBinding() {
  return Object.freeze({
    providerExecutables: Object.freeze({}),
  });
}

function jsonLine(value: unknown): Uint8Array {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("fixture value is not JSON serializable");
  return new TextEncoder().encode(`${serialized}\n`);
}

function contentDigest(bytes: Uint8Array): string {
  return `sha256_${createHash("sha256").update(bytes).digest("hex")}`;
}

function identityValue(identity: VendorSourceIdentity) {
  return Object.freeze({
    payloadDigest: identity.payloadDigest,
    refName: identity.refName,
    repositoryIdentity: identity.repositoryIdentity,
    sourceCommit: identity.sourceCommit,
    sourceTree: identity.sourceTree,
  });
}

import { createHash } from "node:crypto";
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CONTROLLER_PAYLOAD_SCHEMA_VERSION,
  type ControllerPayloadEntryInput,
  canonicalSerializeControllerReleaseEnvelope,
  computeControllerMemberPayloadDigest,
  createControllerPayloadManifest,
  createControllerReleaseEnvelope,
  MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES,
} from "@rawr/controller-release";
import { afterEach, describe, expect, it } from "vitest";

import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_ENVELOPE_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
} from "../src/lib/controller/layout";
import { inspectControllerRelease } from "../src/lib/controller/release-inspector";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("controller release inspector", () => {
  it("verifies one complete release without writing", async () => {
    const fixture = await writeReleaseFixture();
    const before = await readFile(path.join(fixture.root, CONTROLLER_ENVELOPE_PATH));

    const inspection = await inspectControllerRelease({
      releaseRoot: fixture.root,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("verified");
    expect(await readFile(path.join(fixture.root, CONTROLLER_ENVELOPE_PATH))).toEqual(before);
  });

  it("reports payload tampering as structured read-only evidence", async () => {
    const fixture = await writeReleaseFixture();
    await writeFile(path.join(fixture.root, CONTROLLER_ENTRY_PATH), "tampered\n");

    const inspection = await inspectControllerRelease({
      releaseRoot: fixture.root,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("invalid");
    expect(inspection.issues.some((entry) => entry.code === "PAYLOAD_DIGEST_MISMATCH")).toBe(true);
  });

  it("rejects an in-release file that shares an outside inode", async () => {
    const fixture = await writeReleaseFixture();
    const outside = path.join(await temporaryDirectory("hardlink"), "shared-bun");
    await link(path.join(fixture.root, CONTROLLER_RUNTIME_PATH), outside);

    const inspection = await inspectControllerRelease({
      releaseRoot: fixture.root,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("invalid");
    expect(inspection.issues.some((entry) => entry.code === "SHARED_PAYLOAD_INODE")).toBe(true);
  });

  it("rejects a release-root alias even when it reaches identical bytes", async () => {
    const fixture = await writeReleaseFixture();
    const alias = path.join(await temporaryDirectory("alias"), fixture.digest);
    await symlink(fixture.root, alias);

    const inspection = await inspectControllerRelease({
      releaseRoot: alias,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("invalid");
    expect(inspection.issues).toContainEqual(
      expect.objectContaining({ code: "RELEASE_ROOT_ALIAS" })
    );
  });

  it.each([
    "symlink",
    "hardlink",
  ] as const)("rejects a byte-identical %s release envelope", async (aliasKind) => {
    const fixture = await writeReleaseFixture();
    const envelopePath = path.join(fixture.root, CONTROLLER_ENVELOPE_PATH);
    const outsidePath = path.join(
      await temporaryDirectory(`${aliasKind}-envelope`),
      "envelope.json"
    );
    await writeFile(outsidePath, await readFile(envelopePath));
    await rm(envelopePath);
    if (aliasKind === "symlink") await symlink(outsidePath, envelopePath);
    else await link(outsidePath, envelopePath);

    const inspection = await inspectControllerRelease({
      releaseRoot: fixture.root,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("invalid");
    expect(inspection.issues).toContainEqual(
      expect.objectContaining({ code: "RELEASE_ENVELOPE_ALIAS" })
    );
  });

  it("rejects an oversized sparse release envelope before decoding it", async () => {
    const fixture = await writeReleaseFixture();
    await truncate(
      path.join(fixture.root, CONTROLLER_ENVELOPE_PATH),
      MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES + 1
    );

    const inspection = await inspectControllerRelease({
      releaseRoot: fixture.root,
      expectedDigest: fixture.digest,
    });

    expect(inspection.status).toBe("invalid");
    expect(inspection.issues).toContainEqual(
      expect.objectContaining({ code: "ENVELOPE_TOO_LARGE" })
    );
  });
});

async function writeReleaseFixture(): Promise<{ root: string; digest: string }> {
  const fixtureRoot = await temporaryDirectory("release-fixture");
  const staging = path.join(fixtureRoot, "staging");
  await mkdir(staging);
  const files = new Map<string, { content: string; mode: number }>([
    [CONTROLLER_ENTRY_PATH, { content: "console.log('fixture');\n", mode: 0o644 }],
    [CONTROLLER_RUNTIME_PATH, { content: "fixture bun\n", mode: 0o755 }],
    [CONTROLLER_RUNTIME_LICENSE_PATH, { content: "fixture license\n", mode: 0o644 }],
    [CONTROLLER_DEPENDENCY_LOCK_PATH, { content: "fixture lock\n", mode: 0o644 }],
  ]);
  const entries: ControllerPayloadEntryInput[] = [];
  for (const [releasePath, value] of files) {
    const absolute = path.join(staging, releasePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, value.content);
    await chmod(absolute, value.mode);
    entries.push({
      kind: "file",
      path: releasePath,
      mode: value.mode,
      digest: digest(value.content),
    });
  }
  const memberDigest = computeControllerMemberPayloadDigest(entries, "app");
  if (!memberDigest.ok) throw new Error(JSON.stringify(memberDigest.issues));
  const manifest = createControllerPayloadManifest({
    schemaVersion: CONTROLLER_PAYLOAD_SCHEMA_VERSION,
    sourceRevision: "a".repeat(40),
    runtime: {
      path: CONTROLLER_RUNTIME_PATH,
      licensePath: CONTROLLER_RUNTIME_LICENSE_PATH,
      digest: digest(files.get(CONTROLLER_RUNTIME_PATH)!.content),
      version: "1.3.14",
      revision: "0d9b296af33f2b851fcbf4df3e9ec89751734ba4",
      platform: process.platform === "linux" ? "linux" : "darwin",
      architecture: process.arch === "x64" ? "x64" : "arm64",
    },
    entrypoint: CONTROLLER_ENTRY_PATH,
    officialMembers: [
      {
        packageId: "@rawr/cli",
        role: "command",
        version: "1.0.0",
        root: "app",
        payloadDigest: memberDigest.value,
        commandIds: ["doctor:global"],
        topics: ["doctor"],
        aliases: [],
        hiddenAliases: [],
        hooks: [],
      },
    ],
    dependencyLock: {
      path: CONTROLLER_DEPENDENCY_LOCK_PATH,
      digest: digest(files.get(CONTROLLER_DEPENDENCY_LOCK_PATH)!.content),
    },
    buildInterfaces: [{ name: "fixture", version: "1" }],
    entries,
  });
  if (!manifest.ok) throw new Error(JSON.stringify(manifest.issues));
  const envelope = createControllerReleaseEnvelope(manifest.value);
  const root = path.join(fixtureRoot, envelope.controllerDigest);
  await rename(staging, root);
  await writeFile(
    path.join(root, CONTROLLER_ENVELOPE_PATH),
    canonicalSerializeControllerReleaseEnvelope(envelope)
  );
  return { root, digest: envelope.controllerDigest };
}

async function temporaryDirectory(label: string): Promise<string> {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), `rawr-${label}-`)));
  cleanup.push(root);
  return root;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

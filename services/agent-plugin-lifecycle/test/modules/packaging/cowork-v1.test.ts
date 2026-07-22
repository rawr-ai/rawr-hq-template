import { Buffer } from "node:buffer";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertCoworkV1ProtocolBounds,
  COWORK_V1_MAX_ENTRY_COUNT,
  COWORK_V1_MAX_PAYLOAD_BYTES,
  coworkV1PackageDigest,
  createCoworkV1ArchiveRequest,
} from "../../../src/service/modules/packaging/model/helpers/cowork-v1";
import type { AgentPluginRelease } from "../../../src/service/shared/release";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";
import { packagingArtifactFixture } from "./artifact-fixture";

interface ZipEntryView {
  readonly path: string;
  readonly mode: number;
  readonly modifiedDate: number;
  readonly modifiedTime: number;
}

const roots: OwnedFixtureRoot[] = [];
const nodePackageOutput = makeNodePackageOutputAsyncPort();

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("cowork-v1", () => {
  it("renders byte-identically across order, cwd, timezone, and source-independent variation", async () => {
    const fixture = packagingArtifactFixture();
    const firstRoot = await createOwnedFixtureRoot();
    const secondRoot = await createOwnedFixtureRoot();
    roots.push(firstRoot, secondRoot);
    const originalCwd = process.cwd();
    const originalTimezone = process.env.TZ;
    try {
      process.chdir(firstRoot.path);
      process.env.TZ = "Pacific/Honolulu";
      const first = await renderCoworkV1(completePlan(fixture));

      process.chdir(secondRoot.path);
      process.env.TZ = "Asia/Tokyo";
      const second = await renderCoworkV1(
        completePlan(fixture, [fixture.betaRelease, fixture.alphaRelease])
      );

      expect(second.packageDigest).toBe(first.packageDigest);
      expect(second.bytes).toEqual(first.bytes);
      const archiveText = Buffer.from(first.bytes).toString("utf8");
      expect(archiveText).not.toContain(firstRoot.path);
      expect(archiveText).not.toContain(secondRoot.path);
      expect(archiveText).not.toContain("rawr-hq-template");
    } finally {
      process.chdir(originalCwd);
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("writes canonical paths, modes, timestamps, and the versioned protocol marker", async () => {
    const fixture = packagingArtifactFixture();
    const rendered = await renderCoworkV1(targetedPlan(fixture));
    const archive = inspectZip(rendered.bytes);

    expect(archive.entries).toEqual([
      {
        path: "scripts/alpha.sh",
        mode: 0o100755,
        modifiedDate: 10_273,
        modifiedTime: 0,
      },
      {
        path: "skills/alpha/SKILL.md",
        mode: 0o100644,
        modifiedDate: 10_273,
        modifiedTime: 0,
      },
    ]);
    expect(archive.comment).toBe("rawr-agent-plugin-cowork-v1");
    expect(rendered.packageDigest).toMatch(/^pkg1_[0-9a-f]{64}$/u);
  });

  it("changes package identity when admitted artifact bytes change", async () => {
    const firstFixture = packagingArtifactFixture("alpha one\n");
    const secondFixture = packagingArtifactFixture("alpha two\n");
    const first = await renderCoworkV1(targetedPlan(firstFixture));
    const second = await renderCoworkV1(targetedPlan(secondFixture));
    expect(second.packageDigest).not.toBe(first.packageDigest);
    expect(second.bytes).not.toEqual(first.bytes);
  });

  it("rejects a release whose encoded bytes differ from its verified envelope", async () => {
    const fixture = packagingArtifactFixture();
    const firstEntry = fixture.alphaRelease.artifactBody.payloadEntries[0];
    if (firstEntry === undefined) throw new Error("fixture entry missing");
    const tampered = {
      ...fixture.alphaRelease,
      artifactBody: {
        ...fixture.alphaRelease.artifactBody,
        payloadEntries: [
          { ...firstEntry, bytesBase64: Buffer.from("tampered\n").toString("base64") },
          ...fixture.alphaRelease.artifactBody.payloadEntries.slice(1),
        ],
      },
    } as unknown as AgentPluginRelease;

    await expect(renderCoworkV1(targetedPlan(fixture, tampered))).rejects.toThrow(
      "mismatched bytes"
    );
  });

  it("renders complete-set members below deterministic plugin roots", async () => {
    const fixture = packagingArtifactFixture();
    const rendered = await renderCoworkV1(completePlan(fixture));
    expect(inspectZip(rendered.bytes).entries.map((entry) => entry.path)).toEqual([
      "plugins/alpha/scripts/alpha.sh",
      "plugins/alpha/skills/alpha/SKILL.md",
      "plugins/beta/agents/beta.md",
      "plugins/beta/skills/beta/SKILL.md",
    ]);
  });

  it("admits exact Cowork v1 count and payload limits and rejects the next unit", () => {
    expect(() =>
      assertCoworkV1ProtocolBounds(repeatedEntrySizes(COWORK_V1_MAX_ENTRY_COUNT, 0))
    ).not.toThrow();
    expect(() =>
      assertCoworkV1ProtocolBounds(repeatedEntrySizes(COWORK_V1_MAX_ENTRY_COUNT + 1, 0))
    ).toThrow("entry limit");
    expect(() =>
      assertCoworkV1ProtocolBounds([{ path: "boundary", byteLength: COWORK_V1_MAX_PAYLOAD_BYTES }])
    ).not.toThrow();
    expect(() =>
      assertCoworkV1ProtocolBounds([
        { path: "overbound", byteLength: COWORK_V1_MAX_PAYLOAD_BYTES + 1 },
      ])
    ).toThrow("payload-byte limit");
  });

  it("bounds classic ZIP path overhead before rendering", () => {
    const longPath = "x".repeat(2_048);
    expect(() =>
      assertCoworkV1ProtocolBounds(repeatedEntrySizes(COWORK_V1_MAX_ENTRY_COUNT, 0, longPath))
    ).toThrow("projected archive-byte limit");
  });
});

async function renderCoworkV1(
  plan: Parameters<typeof createCoworkV1ArchiveRequest>[0]
): Promise<Readonly<{ bytes: Uint8Array; packageDigest: string }>> {
  const bytes = await nodePackageOutput.encodeCoworkV1(createCoworkV1ArchiveRequest(plan));
  return Object.freeze({ bytes, packageDigest: coworkV1PackageDigest(bytes) });
}

function targetedPlan(
  fixture: ReturnType<typeof packagingArtifactFixture>,
  release: AgentPluginRelease = fixture.alphaRelease
): Parameters<typeof createCoworkV1ArchiveRequest>[0] {
  return Object.freeze({ releases: Object.freeze([release]) });
}

function completePlan(
  fixture: ReturnType<typeof packagingArtifactFixture>,
  releases: readonly AgentPluginRelease[] = [fixture.alphaRelease, fixture.betaRelease]
): Parameters<typeof createCoworkV1ArchiveRequest>[0] {
  return Object.freeze({
    releases: Object.freeze(releases),
    releaseSet: fixture.releaseSet,
  });
}

function* repeatedEntrySizes(
  count: number,
  byteLength: number,
  path = "x"
): Generator<{ readonly path: string; readonly byteLength: number }> {
  for (let index = 0; index < count; index += 1) yield { path, byteLength };
}

function inspectZip(bytes: Uint8Array): {
  readonly entries: readonly ZipEntryView[];
  readonly comment: string;
} {
  const archive = Buffer.from(bytes);
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    offset += 30 + nameLength + extraLength + compressedSize;
  }

  const entries: ZipEntryView[] = [];
  while (archive.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    entries.push({
      path: archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
      mode: archive.readUInt32LE(offset + 38) >>> 16,
      modifiedTime: archive.readUInt16LE(offset + 12),
      modifiedDate: archive.readUInt16LE(offset + 14),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  expect(archive.readUInt32LE(offset)).toBe(0x06054b50);
  const commentLength = archive.readUInt16LE(offset + 20);
  const comment = archive.subarray(offset + 22, offset + 22 + commentLength).toString("utf8");
  expect(offset + 22 + commentLength).toBe(archive.byteLength);
  return { entries, comment };
}

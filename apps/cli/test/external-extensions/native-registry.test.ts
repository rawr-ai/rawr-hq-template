import { mkdirSync, readFileSync, truncateSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { nativeInstallArtifactName } from "../../src/lib/external-extensions/install-provenance";
import { NativeRegistryState } from "../../src/lib/external-extensions/native-registry";
import { createReservedControllerSurface } from "../../src/lib/external-extensions/reserved-surface";
import {
  MAX_STATIC_EVIDENCE_TEXT_BYTES,
  NodeStaticEvidencePort,
} from "../../src/lib/external-extensions/static-evidence";
import { removeFixtureRoots, tempRoot, writeExtensionFixture } from "./fixtures";

const evidence = new NodeStaticEvidencePort();
const reserved = createReservedControllerSurface({
  packageIds: ["@rawr/cli"],
  commandIds: ["doctor"],
  topics: ["plugins"],
});

afterEach(removeFixtureRoots);

describe("guarded native registry projection", () => {
  it("projects active and quarantined entries without importing or rewriting candidate state", async () => {
    const dataDir = tempRoot("native-registry");
    const sentinel = path.join(tempRoot("registry-sentinel"), "loaded");
    const activeRoot = writeExtensionFixture({
      packageId: "@fixture/active",
      commandId: "fixture:active",
      sentinelPath: sentinel,
    });
    const collidingRoot = writeExtensionFixture({
      packageId: "@fixture/colliding",
      commandId: "doctor",
    });
    const missingRoot = path.join(dataDir, "deleted-link");
    const registryPath = writeRegistry(dataDir, [
      { name: "@fixture/active", type: "link", root: activeRoot },
      { name: "@fixture/colliding", type: "link", root: collidingRoot },
      { name: "@fixture/missing", type: "link", root: missingRoot },
    ]);
    const before = readFileSync(registryPath, "utf8");

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.status).toBe("valid");
    expect(projection.active.map((entry) => entry.extension.packageId)).toEqual([
      "@fixture/active",
    ]);
    expect(projection.quarantined).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identity: "@fixture/colliding",
          reason: expect.objectContaining({ code: "reserved-surface-collision" }),
        }),
        expect.objectContaining({
          identity: "@fixture/missing",
          reason: expect.objectContaining({ code: "root-missing" }),
        }),
      ])
    );
    expect(readFileSync(registryPath, "utf8")).toBe(before);
    expect(() => readFileSync(sentinel, "utf8")).toThrow();
  });

  it.each([
    {
      label: "package identity",
      entry(root: string) {
        return { name: " @fixture/exact ", type: "link", root };
      },
      code: "entry-malformed",
    },
    {
      label: "link root",
      entry(root: string) {
        return { name: "@fixture/exact", type: "link", root: `${root} ` };
      },
      code: "root-missing",
    },
  ])("never trims a native $label into different active state", async ({ entry, code }) => {
    const dataDir = tempRoot("native-registry-exact-string");
    const root = writeExtensionFixture({ packageId: "@fixture/exact" });
    writeRegistry(dataDir, [entry(root)]);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([]);
    expect(projection.quarantined[0]?.reason.code).toBe(code);
  });

  it("keeps malformed registry state observable for reset recovery", async () => {
    const dataDir = tempRoot("malformed-native-registry");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(path.join(dataDir, "package.json"), "{broken");

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection).toMatchObject({
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [
        expect.objectContaining({
          reason: expect.objectContaining({ code: "registry-malformed" }),
        }),
      ],
    });
  });

  it("keeps an oversized sparse registry observable for reset recovery without reading it", async () => {
    const dataDir = tempRoot("oversized-native-registry");
    mkdirSync(dataDir, { recursive: true });
    const registryPath = path.join(dataDir, "package.json");
    writeFileSync(registryPath, "{}");
    truncateSync(registryPath, MAX_STATIC_EVIDENCE_TEXT_BYTES + 1);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection).toMatchObject({
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [
        expect.objectContaining({
          reason: expect.objectContaining({ code: "registry-malformed" }),
        }),
      ],
    });
  });

  it("quarantines every duplicate identity instead of selecting an arbitrary winner", async () => {
    const dataDir = tempRoot("duplicate-native-registry");
    const first = writeExtensionFixture({
      packageId: "@fixture/duplicate",
      commandId: "fixture:first",
    });
    const second = writeExtensionFixture({
      packageId: "@fixture/duplicate",
      commandId: "fixture:second",
    });
    writeRegistry(dataDir, [
      { name: "@fixture/duplicate", type: "link", root: first },
      { name: "@fixture/duplicate", type: "link", root: second },
    ]);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([]);
    expect(projection.quarantined).toHaveLength(2);
    expect(projection.quarantined.every((entry) => entry.reason.code === "entry-duplicate")).toBe(
      true
    );
  });

  it("treats a registry package-name mismatch as quarantine evidence", async () => {
    const dataDir = tempRoot("identity-mismatch-registry");
    const root = writeExtensionFixture({ packageId: "@fixture/actual" });
    writeRegistry(dataDir, [{ name: "@fixture/claimed", type: "link", root }]);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([]);
    expect(projection.quarantined[0]?.reason.code).toBe("package-identity-mismatch");
  });

  it("reports a missing native registry as a clean empty state", async () => {
    const dataDir = tempRoot("empty-native-registry");

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection).toMatchObject({
      status: "missing",
      hasResidue: false,
      active: [],
      quarantined: [],
    });
  });

  it.each([
    {
      label: "orphan package dependency",
      arrange(dataDir: string) {
        writeRegistry(dataDir, [], { "@fixture/orphan": "file:/tmp/orphan.tgz" });
      },
    },
    {
      label: "package lock",
      arrange(dataDir: string) {
        writeRegistry(dataDir, []);
        writeFileSync(path.join(dataDir, "package-lock.json"), "{}\n");
      },
    },
    {
      label: "installed tree",
      arrange(dataDir: string) {
        writeRegistry(dataDir, []);
        mkdirSync(path.join(dataDir, "node_modules"), { recursive: true });
      },
    },
  ])("quarantines $label residue behind an empty plugin list", async ({ arrange }) => {
    const dataDir = tempRoot("empty-registry-residue");
    arrange(dataDir);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection).toMatchObject({
      status: "valid",
      hasResidue: true,
      active: [],
      quarantined: [
        expect.objectContaining({
          reason: expect.objectContaining({ code: "native-package-residue" }),
        }),
      ],
    });
  });

  it("does not project a missing registry as clean while native package artifacts remain", async () => {
    const dataDir = tempRoot("missing-registry-residue");
    mkdirSync(path.join(dataDir, "node_modules"), { recursive: true });
    writeFileSync(path.join(dataDir, "yarn.lock"), "# stale\n");

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection).toMatchObject({
      status: "missing",
      hasResidue: true,
      active: [],
      quarantined: [
        expect.objectContaining({
          reason: expect.objectContaining({ code: "native-package-residue" }),
        }),
      ],
    });
  });

  it("distinguishes installed package backing state from orphan package residue", async () => {
    const dataDir = tempRoot("installed-package-state");
    const packageId = "@fixture/installed";
    writeExtensionFixture({
      root: path.join(dataDir, "node_modules", ...packageId.split("/")),
      packageId,
    });
    writeRegistry(dataDir, [{ name: packageId, type: "user", tag: "latest" }], {
      [packageId]: "1.0.0",
      "@fixture/orphan": "file:/tmp/orphan.tgz",
    });
    writeFileSync(path.join(dataDir, "package-lock.json"), "{}\n");

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active.map((entry) => entry.extension.packageId)).toEqual([packageId]);
    expect(projection.quarantined).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({
          code: "native-package-residue",
          message: expect.stringContaining("@fixture/orphan"),
        }),
      }),
    ]);
  });

  it("quarantines a user entry whose native package dependency is missing", async () => {
    const dataDir = tempRoot("missing-user-dependency");
    const packageId = "@fixture/installed";
    writeExtensionFixture({
      root: path.join(dataDir, "node_modules", ...packageId.split("/")),
      packageId,
    });
    writeRegistry(dataDir, [{ name: packageId, type: "user", url: provenanceUrl("a", "b") }]);

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([]);
    expect(projection.quarantined).toEqual([
      expect.objectContaining({
        identity: packageId,
        reason: expect.objectContaining({ code: "native-dependency-missing" }),
      }),
    ]);
  });

  it("quarantines mismatched content-addressed user-entry and dependency provenance", async () => {
    const dataDir = tempRoot("mismatched-user-dependency");
    const packageId = "@fixture/installed";
    writeExtensionFixture({
      root: path.join(dataDir, "node_modules", ...packageId.split("/")),
      packageId,
    });
    writeRegistry(dataDir, [{ name: packageId, type: "user", url: provenanceUrl("a", "b") }], {
      [packageId]: provenanceUrl("c", "b"),
    });

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([]);
    expect(projection.quarantined).toEqual([
      expect.objectContaining({
        identity: packageId,
        reason: expect.objectContaining({ code: "native-dependency-mismatch" }),
      }),
    ]);
  });

  it("accepts matching content-addressed provenance independent of staging parent", async () => {
    const dataDir = tempRoot("matching-user-dependency");
    const packageId = "@fixture/installed";
    writeExtensionFixture({
      root: path.join(dataDir, "node_modules", ...packageId.split("/")),
      packageId,
    });
    const entryUrl = provenanceUrl("a", "b", "/tmp/removed-entry-stage");
    const dependencySpec = provenanceUrl("a", "b", "/tmp/removed-dependency-stage");
    writeRegistry(dataDir, [{ name: packageId, type: "user", url: entryUrl }], {
      [packageId]: dependencySpec,
    });

    const projection = await new NativeRegistryState(dataDir, reserved, evidence).read();

    expect(projection.active).toEqual([
      expect.objectContaining({
        entry: expect.objectContaining({ dependencySpec, url: entryUrl }),
        extension: expect.objectContaining({ packageId }),
      }),
    ]);
    expect(projection.quarantined).toEqual([]);
  });
});

function provenanceUrl(
  artifactDigest: string,
  fingerprint: string,
  parent = "/tmp/removed-stage"
): string {
  return pathToFileURL(
    path.join(
      parent,
      nativeInstallArtifactName({
        artifactSha256: artifactDigest.repeat(64),
        staticFingerprint: fingerprint.repeat(64),
      })
    )
  ).href;
}

function writeRegistry(
  dataDir: string,
  plugins: readonly unknown[],
  dependencies: Readonly<Record<string, string>> = {}
): string {
  const registryPath = path.join(dataDir, "package.json");
  writeFileSync(
    registryPath,
    JSON.stringify(
      { name: "rawr", private: true, dependencies, oclif: { schema: 1, plugins } },
      null,
      2
    )
  );
  return registryPath;
}

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Config } from "@oclif/core";
import { afterEach, describe, expect, it } from "vitest";

import { createGuardedExternalConfiguration } from "../../src/lib/external-extensions/bootstrap";
import { createReservedControllerSurface } from "../../src/lib/external-extensions/reserved-surface";
import {
  registerExternalExtensionRuntime,
  resolveExternalExtensionRuntime,
} from "../../src/lib/external-extensions/runtime";
import type { ExternalExtensionCommandRuntime } from "../../src/lib/external-extensions/service";
import {
  NodeStaticEvidencePort,
  type StaticEvidenceResult,
} from "../../src/lib/external-extensions/static-evidence";
import { removeFixtureRoots, tempRoot, writeExtensionFixture } from "./fixtures";

afterEach(() => {
  removeFixtureRoots();
});

describe("guarded external activation", () => {
  it("keeps the command runtime bound across Oclif's dispatch reload", async () => {
    const config = await Config.load({
      root: writeCliFixture(),
      userPlugins: false,
      devPlugins: false,
      jitPlugins: false,
    });
    const runtime = unavailableRuntime();
    registerExternalExtensionRuntime(config, runtime);

    const dispatchedConfig = await Config.load(config);

    expect(dispatchedConfig).not.toBe(config);
    expect(dispatchedConfig.plugins.get(dispatchedConfig.pjson.name)).toBe(
      config.plugins.get(config.pjson.name),
    );
    expect(resolveExternalExtensionRuntime(dispatchedConfig)).toBe(runtime);
  });

  it("quarantines a manifest swap without invoking Oclif dynamic fallback", async () => {
    const dataDir = tempRoot("bootstrap-native-data");
    const sentinel = path.join(tempRoot("bootstrap-sentinel"), "command-loaded");
    const extensionRoot = writeExtensionFixture({
      packageId: "@fixture/swapped",
      commandId: "fixture:swapped",
      sentinelPath: sentinel,
    });
    const cliRoot = writeCliFixture();
    const packagePath = path.join(extensionRoot, "package.json");
    const packageManifest = JSON.parse(readFileSync(packagePath, "utf8")) as Record<string, unknown>;
    packageManifest.type = "module";
    writeFileSync(packagePath, `${JSON.stringify(packageManifest, null, 2)}\n`);

    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      path.join(dataDir, "package.json"),
      `${JSON.stringify({
        name: "@rawr/cli",
        private: true,
        dependencies: {},
        oclif: {
          plugins: [
            { name: "@fixture/swapped", type: "link", root: extensionRoot },
          ],
        },
      }, null, 2)}\n`,
    );

    const priorDataDir = process.env.RAWR_DATA_DIR;
    process.env.RAWR_DATA_DIR = dataDir;
    try {
      const configuration = await createGuardedExternalConfiguration({
        argv: ["fixture", "swapped"],
        cliRoot,
        reserved: createReservedControllerSurface({}),
        evidence: new ManifestSwapEvidence(
          path.join(extensionRoot, "oclif.manifest.json"),
        ),
        createRuntime: () => unavailableRuntime(),
      });

      expect(configuration.projection.active).toEqual([]);
      expect(configuration.projection.quarantined).toEqual([
        expect.objectContaining({
          identity: "@fixture/swapped",
          reason: expect.objectContaining({ code: "command-manifest-malformed" }),
        }),
      ]);
      expect(configuration.config.plugins.has("@fixture/swapped")).toBe(false);
      expect(existsSync(sentinel)).toBe(false);
    } finally {
      if (priorDataDir === undefined) delete process.env.RAWR_DATA_DIR;
      else process.env.RAWR_DATA_DIR = priorDataDir;
    }
  });

  it("drops undeclared cached permutations before Oclif command registration", async () => {
    const dataDir = tempRoot("bootstrap-permutation-data");
    const extensionRoot = writeExtensionFixture({
      packageId: "@fixture/permuted",
      commandId: "fixture:permuted",
    });
    const manifestPath = path.join(extensionRoot, "oclif.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      commands: Record<string, Record<string, unknown>>;
    };
    manifest.commands["fixture:permuted"]!.permutations = ["plugins"];
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const cliRoot = writeCliFixture();

    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      path.join(dataDir, "package.json"),
      `${JSON.stringify({
        name: "@rawr/cli",
        private: true,
        dependencies: {},
        oclif: {
          plugins: [
            { name: "@fixture/permuted", type: "link", root: extensionRoot },
          ],
        },
      }, null, 2)}\n`,
    );

    const priorDataDir = process.env.RAWR_DATA_DIR;
    process.env.RAWR_DATA_DIR = dataDir;
    try {
      const configuration = await createGuardedExternalConfiguration({
        argv: ["fixture", "permuted"],
        cliRoot,
        reserved: createReservedControllerSurface({ commandIds: ["plugins"] }),
        createRuntime: () => unavailableRuntime(),
      });

      expect(configuration.projection.active).toHaveLength(1);
      expect(configuration.config.findCommand("fixture:permuted")).toBeDefined();
      expect(configuration.config.findCommand("plugins")).toBeUndefined();
    } finally {
      if (priorDataDir === undefined) delete process.env.RAWR_DATA_DIR;
      else process.env.RAWR_DATA_DIR = priorDataDir;
    }
  });

  it("quarantines an external package named like the controller root without replacing it", async () => {
    const dataDir = tempRoot("bootstrap-root-collision-data");
    const extensionRoot = writeExtensionFixture({
      packageId: "rawr",
      commandId: "foreign:root-collision",
    });
    const cliRoot = writeCliFixture("rawr");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      path.join(dataDir, "package.json"),
      `${JSON.stringify({
        name: "rawr",
        private: true,
        dependencies: {},
        oclif: {
          plugins: [{ name: "rawr", type: "link", root: extensionRoot }],
        },
      }, null, 2)}\n`,
    );

    const priorDataDir = process.env.RAWR_DATA_DIR;
    process.env.RAWR_DATA_DIR = dataDir;
    try {
      const configuration = await createGuardedExternalConfiguration({
        argv: ["foreign", "root-collision"],
        cliRoot,
        reserved: createReservedControllerSurface({}),
        createRuntime: () => unavailableRuntime(),
      });

      expect(configuration.projection.active).toEqual([]);
      expect(configuration.projection.quarantined).toEqual([
        expect.objectContaining({
          identity: "rawr",
          reason: expect.objectContaining({ code: "reserved-surface-collision" }),
        }),
      ]);
      expect(configuration.config.pjson.name).toBe("rawr");
      expect(configuration.config.plugins.get("rawr")?.root).toBe(cliRoot);
      expect(configuration.config.findCommand("foreign:root-collision")).toBeUndefined();
    } finally {
      if (priorDataDir === undefined) delete process.env.RAWR_DATA_DIR;
      else process.env.RAWR_DATA_DIR = priorDataDir;
    }
  });
});

function writeCliFixture(name = "@fixture/cli"): string {
  const root = tempRoot("bootstrap-cli");
  mkdirSync(path.join(root, "dist", "commands"), { recursive: true });
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name,
      version: "1.0.0",
      type: "module",
      oclif: {
        bin: "rawr",
        commands: "./dist/commands",
      },
    }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "oclif.manifest.json"),
    `${JSON.stringify({ version: "1.0.0", commands: {} }, null, 2)}\n`,
  );
  return root;
}

class ManifestSwapEvidence extends NodeStaticEvidencePort {
  private swapped = false;

  constructor(private readonly manifestPath: string) {
    super();
  }

  override async readText(target: string): Promise<StaticEvidenceResult<string>> {
    const evidence = await super.readText(target);
    if (!this.swapped && target === this.manifestPath && evidence.ok) {
      this.swapped = true;
      rmSync(this.manifestPath);
    }
    return evidence;
  }
}

function unavailableRuntime(): ExternalExtensionCommandRuntime {
  const unavailable = async (): Promise<never> => {
    throw new Error("runtime is not used by activation metadata tests");
  };
  return {
    inspect: unavailable,
    install: unavailable,
    link: unavailable,
    list: unavailable,
    reset: unavailable,
    uninstall: unavailable,
    update: unavailable,
  };
}

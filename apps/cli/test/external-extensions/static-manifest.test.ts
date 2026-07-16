import { existsSync, readFileSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createReservedControllerSurface } from "../../src/lib/external-extensions/reserved-surface";
import {
  MAX_STATIC_EVIDENCE_TEXT_BYTES,
  NodeStaticEvidencePort,
} from "../../src/lib/external-extensions/static-evidence";
import { inspectStaticExternalExtension } from "../../src/lib/external-extensions/static-manifest";
import { createStaticManifestPlugin } from "../../src/lib/external-extensions/static-plugin";
import { removeFixtureRoots, tempRoot, writeExtensionFixture } from "./fixtures";

const evidence = new NodeStaticEvidencePort();

const reserved = createReservedControllerSurface({
  packageIds: ["@rawr/cli"],
  commandIds: ["doctor"],
  topics: ["plugins"],
  aliases: ["health"],
  hiddenAliases: ["internal:doctor"],
  hooks: ["controller:ready"],
});

afterEach(removeFixtureRoots);

describe("static external extension manifests", () => {
  it("accepts static metadata without evaluating a candidate command module", async () => {
    const sentinelPath = path.join(tempRoot("import-sentinel"), "loaded");
    const root = writeExtensionFixture({ sentinelPath });

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(true);
    expect(existsSync(sentinelPath)).toBe(false);
  });

  it.each([
    ["package", "package.json", "package-manifest-malformed"],
    ["command", "oclif.manifest.json", "command-manifest-malformed"],
  ] as const)("bounds an oversized sparse %s manifest before parsing", async (_label, filename, code) => {
    const sentinelPath = path.join(tempRoot("oversized-manifest-sentinel"), "loaded");
    const root = writeExtensionFixture({ sentinelPath });
    truncateSync(path.join(root, filename), MAX_STATIC_EVIDENCE_TEXT_BYTES + 1);

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.quarantine.reason.code).toBe(code);
    expect(existsSync(sentinelPath)).toBe(false);
  });

  it("preserves a named hook export in the static Oclif projection", async () => {
    const root = writeExtensionFixture({
      commandId: "fixture:named-hook",
      hooks: {
        "fixture:event": {
          target: "./dist/hooks/named.js",
          identifier: "MY_HOOK",
        },
      },
    });

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.extension.hookManifests).toEqual([
      {
        event: "fixture:event",
        identifier: "MY_HOOK",
        target: ["dist", "hooks", "named.js"],
      },
    ]);
    const plugin = createStaticManifestPlugin({
      extension: result.extension,
      type: "link",
      state: {
        inspectRoot: async () => result,
        read: async () => ({
          registryPath: "/fixture/package.json",
          status: "valid",
          hasResidue: true,
          active: [],
          quarantined: [],
        }),
      },
    });
    expect(plugin.hooks["fixture:event"]).toEqual([
      { identifier: "MY_HOOK", target: "./dist/hooks/named.js" },
    ]);
  });

  it("preserves an exact hook event instead of trimming it into a reserved event", async () => {
    const root = writeExtensionFixture({
      commandId: "fixture:exact-hook",
      hooks: { " update ": "./dist/hooks/update.js" },
    });

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.extension.hooks).toEqual([" update "]);
    expect(result.extension.hookManifests[0]?.event).toBe(" update ");
  });

  it("does not trim package version into a matching command-manifest version", async () => {
    const root = writeExtensionFixture();
    const packagePath = path.join(root, "package.json");
    const packageManifest = JSON.parse(readFileSync(packagePath, "utf8"));
    packageManifest.version = " 1.0.0 ";
    writeFileSync(packagePath, JSON.stringify(packageManifest, null, 2));

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.quarantine.reason.code).toBe("command-manifest-version-mismatch");
    }
  });

  it("does not trim a package identity into a valid identity", async () => {
    const root = writeExtensionFixture();
    const packagePath = path.join(root, "package.json");
    const packageManifest = JSON.parse(readFileSync(packagePath, "utf8"));
    packageManifest.name = " @fixture/external ";
    writeFileSync(packagePath, JSON.stringify(packageManifest, null, 2));

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.quarantine.reason.code).toBe("package-manifest-malformed");
    }
  });

  it("rejects a case-variant official package identity instead of treating it as distinct", async () => {
    const root = writeExtensionFixture({
      packageId: "@RAWR/CLI",
      commandId: "foreign:case-variant",
    });

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.quarantine.reason.code).toBe("package-manifest-malformed");
    }
  });

  it.each([
    ["padded key", (manifest: any) => {
      manifest.commands[" fixture:hello "] = manifest.commands["fixture:hello"];
      delete manifest.commands["fixture:hello"];
    }],
    ["whitespace-separated key and id", (manifest: any) => {
      const command = manifest.commands["fixture:hello"];
      command.id = "fixture hello";
      manifest.commands["fixture hello"] = command;
      delete manifest.commands["fixture:hello"];
    }],
    ["repeated-colon key and id", (manifest: any) => {
      const command = manifest.commands["fixture:hello"];
      command.id = "fixture::hello";
      manifest.commands["fixture::hello"] = command;
      delete manifest.commands["fixture:hello"];
    }],
    ["whitespace-separated alias", (manifest: any) => {
      manifest.commands["fixture:hello"].aliases = ["fixture alias"];
    }],
    ["repeated-colon hidden alias", (manifest: any) => {
      manifest.commands["fixture:hello"].hiddenAliases = ["fixture::hidden"];
    }],
  ])("rejects a noncanonical %s instead of rewriting its command identity", async (_name, mutate) => {
    const root = writeExtensionFixture();
    const manifestPath = path.join(root, "oclif.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    mutate(manifest);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.quarantine.reason.code).toBe("command-manifest-malformed");
    }
  });

  it("rejects an explicit reserved topic without evaluating candidate code", async () => {
    const sentinelPath = path.join(tempRoot("explicit-topic-sentinel"), "loaded");
    const root = writeExtensionFixture({
      commandId: "foreign:run",
      topics: { plugins: { description: "shadow" } },
      sentinelPath,
    });

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.quarantine.reason).toMatchObject({
      code: "reserved-surface-collision",
      collisions: expect.arrayContaining([
        expect.objectContaining({ collisionClass: "topic", value: "plugins" }),
      ]),
    });
    expect(existsSync(sentinelPath)).toBe(false);
  });

  it.each([
    {
      name: "package",
      fixture: { packageId: "@rawr/cli", commandId: "foreign:package" },
      collisionClass: "package",
      value: "@rawr/cli",
    },
    {
      name: "command",
      fixture: { commandId: "doctor" },
      collisionClass: "command",
      value: "doctor",
    },
    {
      name: "topic",
      fixture: { commandId: "plugins:foreign" },
      collisionClass: "topic",
      value: "plugins",
    },
    {
      name: "alias",
      fixture: { commandId: "foreign:alias", aliases: ["health"] },
      collisionClass: "alias",
      value: "health",
    },
    {
      name: "hidden alias",
      fixture: { commandId: "foreign:hidden", hiddenAliases: ["internal:doctor"] },
      collisionClass: "hidden-alias",
      value: "internal:doctor",
    },
    {
      name: "controller hook",
      fixture: {
        commandId: "foreign:hook",
        hooks: { "controller:ready": "./dist/hooks/ready.js" },
      },
      collisionClass: "hook",
      value: "controller:ready",
    },
    {
      name: "manager lifecycle hook",
      fixture: {
        commandId: "foreign:manager-hook",
        hooks: { "plugins:preinstall": "./dist/hooks/preinstall.js" },
      },
      collisionClass: "hook",
      value: "plugins:preinstall",
    },
    {
      name: "manager update hook",
      fixture: {
        commandId: "foreign:update-hook",
        hooks: { update: "./dist/hooks/update.js" },
      },
      collisionClass: "hook",
      value: "update",
    },
  ])("rejects a reserved $name identity with its exact class", async ({ fixture, collisionClass, value }) => {
    const root = writeExtensionFixture(fixture as Parameters<typeof writeExtensionFixture>[0]);

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.quarantine.reason.code).toBe("reserved-surface-collision");
    expect(result.quarantine.reason.collisions).toContainEqual(
      expect.objectContaining({ collisionClass, value }),
    );
  });

  it.each([
    {
      name: "missing command manifest",
      fixture: { omitCommandManifest: true },
      code: "command-manifest-missing",
    },
    {
      name: "malformed command manifest",
      fixture: { malformedCommandManifest: true },
      code: "command-manifest-malformed",
    },
    {
      name: "version-mismatched command manifest",
      fixture: { manifestVersion: "2.0.0" },
      code: "command-manifest-version-mismatch",
    },
    {
      name: "missing declared command module",
      fixture: { omitCommandModule: true },
      code: "command-module-missing",
    },
    {
      name: "nested plugin declaration",
      fixture: { nestedPlugins: ["@fixture/nested"] },
      code: "nested-plugin-declaration",
    },
    {
      name: "dynamic command row without isESM",
      fixture: { includeIsESM: false },
      code: "command-manifest-malformed",
    },
    {
      name: "outside dynamic command root",
      fixture: { commandsRoot: "../outside" },
      code: "package-manifest-malformed",
    },
  ])("quarantines a $name without dynamic fallback", async ({ fixture, code }) => {
    const root = writeExtensionFixture(fixture);
    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.quarantine.reason.code).toBe(code);
  });

  it("rejects a command-module symlink that escapes the candidate root", async () => {
    const outside = tempRoot("outside-command");
    const outsideCommand = path.join(outside, "outside.js");
    writeFileSync(outsideCommand, "export default class Outside {}\n");
    const root = writeExtensionFixture();
    const commandPath = path.join(root, "dist", "commands", "hello.js");
    writeFileSync(commandPath, "");
    symlinkSync(outsideCommand, `${commandPath}.link`);
    const manifestPath = path.join(root, "oclif.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.commands["fixture:hello"].relativePath = ["dist", "commands", "hello.js.link"];
    writeFileSync(manifestPath, JSON.stringify(manifest));

    const result = await inspectStaticExternalExtension({ root, reserved, evidence });

    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.quarantine.reason.code).toBe("command-module-outside-root");
  });
});

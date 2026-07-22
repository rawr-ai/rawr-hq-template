import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertControllerClassification,
  controllerCommandPackages,
  controllerMemberIds,
  externalFixtureIds,
} from "../src/lib/controller/classification";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function workspaceCliPackageIds(): string[] {
  const cliPluginsRoot = path.join(workspaceRoot, "plugins", "cli");
  return fs
    .readdirSync(cliPluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(cliPluginsRoot, entry.name, "package.json"))
    .filter((packagePath) => fs.existsSync(packagePath))
    .map((packagePath) => JSON.parse(fs.readFileSync(packagePath, "utf8")) as { name: string })
    .map((manifest) => manifest.name)
    .sort();
}

describe("controller command-package classification", () => {
  it("classifies every Template workspace CLI package exactly once", () => {
    expect(() => assertControllerClassification()).not.toThrow();

    const classifiedWorkspaceIds = controllerCommandPackages
      .filter((row) => row.source === "workspace" && row.packageId !== "@rawr/cli")
      .map((row) => row.packageId)
      .sort();

    expect(classifiedWorkspaceIds).toEqual(workspaceCliPackageIds());
  });

  it("keeps Hello external and all supported official modules in the controller", () => {
    expect(externalFixtureIds()).toEqual(new Set(["@rawr/plugin-hello"]));
    expect(controllerMemberIds()).toEqual(
      new Set([
        "@rawr/cli",
        "@oclif/plugin-help",
        "@oclif/plugin-plugins",
        "@rawr/plugin-devops",
        "@rawr/plugin-hyperresearch",
        "@rawr/plugin-session-tools",
        "@rawr/plugin-chatgpt-corpus",
      ])
    );
  });

  it("makes static Oclif discovery exactly the classified discoverable set", () => {
    const cliManifest = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, "apps", "cli", "package.json"), "utf8")
    ) as { oclif?: { plugins?: string[] } };
    const expected = controllerCommandPackages
      .filter(
        (row) =>
          row.disposition === "controller-member" && row.discoverCommands && row.role !== "cli-root"
      )
      .map((row) => row.packageId)
      .sort();

    expect([...(cliManifest.oclif?.plugins ?? [])].sort()).toEqual(expected);
    expect(cliManifest.oclif?.plugins).not.toContain("@oclif/plugin-plugins");
  });

  it("rejects duplicate identities instead of choosing an owner", () => {
    expect(() =>
      assertControllerClassification([controllerCommandPackages[0], controllerCommandPackages[0]])
    ).toThrow("CONTROLLER_CLASSIFICATION_DUPLICATE:@rawr/cli");
  });
});

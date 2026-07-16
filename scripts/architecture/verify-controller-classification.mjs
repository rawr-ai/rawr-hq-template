import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertControllerClassification,
  controllerCommandPackages,
} from "../../apps/cli/src/lib/controller/classification.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPluginsRoot = path.join(workspaceRoot, "plugins", "cli");
const cliManifest = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "apps", "cli", "package.json"), "utf8"),
);

assertControllerClassification();

const discovered = fs
  .readdirSync(cliPluginsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(cliPluginsRoot, entry.name, "package.json"))
  .filter((packagePath) => fs.existsSync(packagePath))
  .map((packagePath) => JSON.parse(fs.readFileSync(packagePath, "utf8")).name)
  .sort();

const classified = controllerCommandPackages
  .filter((row) => row.source === "workspace" && row.packageId !== "@rawr/cli")
  .map((row) => row.packageId)
  .sort();

if (JSON.stringify(discovered) !== JSON.stringify(classified)) {
  throw new Error(
    `CONTROLLER_CLASSIFICATION_INCOMPLETE discovered=${JSON.stringify(discovered)} classified=${JSON.stringify(classified)}`,
  );
}

const declaredOclifPlugins = [...(cliManifest.oclif?.plugins ?? [])].sort();
const expectedOclifPlugins = controllerCommandPackages
  .filter((row) =>
    row.disposition === "controller-member"
    && row.discoverCommands
    && row.role !== "cli-root"
  )
  .map((row) => row.packageId)
  .sort();
if (JSON.stringify(declaredOclifPlugins) !== JSON.stringify(expectedOclifPlugins)) {
  throw new Error(
    `CONTROLLER_DISCOVERY_CLASSIFICATION_MISMATCH declared=${JSON.stringify(declaredOclifPlugins)} classified=${JSON.stringify(expectedOclifPlugins)}`,
  );
}

for (const row of controllerCommandPackages) {
  const manifestPath = row.source === "dependency"
    ? path.join(workspaceRoot, "apps", "cli", "node_modules", ...row.packageId.split("/"), "package.json")
    : path.join(workspaceRoot, row.sourceRoot, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.name !== row.packageId) {
    throw new Error(
      `CONTROLLER_CLASSIFICATION_PACKAGE_MISMATCH row=${row.packageId} manifest=${String(manifest.name)}`,
    );
  }
}

console.log(`controller classification: ${controllerCommandPackages.length} packages, complete`);

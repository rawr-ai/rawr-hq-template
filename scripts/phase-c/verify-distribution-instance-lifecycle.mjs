#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function mustExist(relPath) {
  const absPath = path.join(root, relPath);
  try {
    const stat = await fs.stat(absPath);
    assertCondition(stat.isFile(), `${relPath} must be a file`);
  } catch {
    throw new Error(`missing file: ${relPath}`);
  }
}

async function readFile(relPath) {
  const absPath = path.join(root, relPath);
  return fs.readFile(absPath, "utf8");
}

async function readPackageScripts() {
  const pkgRaw = await readFile("package.json");
  const pkg = JSON.parse(pkgRaw);
  return pkg.scripts ?? {};
}

await Promise.all([
  mustExist("scripts/dev/install-global-rawr.sh"),
  mustExist("scripts/dev/activate-global-rawr.sh"),
  mustExist("apps/cli/src/commands/doctor/global.ts"),
  mustExist("apps/cli/test/doctor-global.test.ts"),
  mustExist("packages/hq/test/instance-alias-isolation.test.ts"),
  mustExist("plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts"),
]);

const [installSource, activateSource, doctorSource, doctorTestSource, hqTestSource, pluginTestSource, scripts] =
  await Promise.all([
    readFile("scripts/dev/install-global-rawr.sh"),
    readFile("scripts/dev/activate-global-rawr.sh"),
    readFile("apps/cli/src/commands/doctor/global.ts"),
    readFile("apps/cli/test/doctor-global.test.ts"),
    readFile("packages/hq/test/instance-alias-isolation.test.ts"),
    readFile("plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts"),
    readPackageScripts(),
  ]);

for (const fieldName of [
  "ownerFilePath",
  "ownerWorkspacePath",
  "ownerMatchesCurrentInstanceByRealpath",
  "aliasInstanceSeamStatus",
  "currentInstanceRoot",
  "commandSurfaces",
]) {
  assertCondition(doctorSource.includes(fieldName), `doctor global must include additive seam diagnostic field: ${fieldName}`);
}

assertCondition(doctorSource.includes('recommendedMode: "bun-symlink"'), "doctor global must keep bun-symlink recommended mode");
assertCondition(
  /externalCliPlugins:\s*"rawr plugins \.\.\."/.test(doctorSource),
  "doctor global must keep Channel A command surface as command guidance",
);
assertCondition(
  /workspaceRuntimePlugins:\s*"rawr plugins web \.\.\."/.test(doctorSource),
  "doctor global must keep Channel B command surface as command guidance",
);

assertCondition(installSource.includes("Alias/instance seam:"), "install-global script must print alias/instance seam state");
assertCondition(
  installSource.includes("activate-global-rawr.sh"),
  "install-global script must direct explicit owner transfer through activate-global-rawr.sh",
);
assertCondition(activateSource.includes("global-rawr-owner-path"), "activate-global script must persist owner file path");
assertCondition(
  activateSource.includes("Global rawr owner transferred") || activateSource.includes("Global rawr owner initialized"),
  "activate-global script must report owner lifecycle transition",
);

assertCondition(doctorTestSource.includes("aliasInstanceSeamStatus"), "doctor-global test must assert seam status diagnostics");
assertCondition(
  doctorTestSource.includes("commandSurfaces.workspaceRuntimePlugins"),
  "doctor-global test must assert command surface split",
);

assertCondition(
  hqTestSource.includes('canonicalWorkspaceSource).toBe("workspace-root")') &&
    hqTestSource.includes('canonicalWorkspaceSource).toBe("global-owner")'),
  "hq seam isolation test must cover instance-local default and explicit global-owner fallback",
);
assertCondition(
  pluginTestSource.includes('canonicalWorkspaceSource).toBe("workspace-root")') &&
    pluginTestSource.includes('canonicalWorkspaceSource).toBe("global-owner")'),
  "plugin seam isolation test must cover instance-local default and explicit global-owner fallback",
);

assertCondition(
  scripts["phase-c:gate:c3-distribution-contract"] === "bun scripts/phase-c/verify-distribution-instance-lifecycle.mjs",
  "package.json must define phase-c:gate:c3-distribution-contract",
);
assertCondition(
  scripts["phase-c:gate:c3-distribution-runtime"] ===
    "bunx vitest run --project hq packages/hq/test/instance-alias-isolation.test.ts && bunx vitest run --project plugin-plugins plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts",
  "phase-c:gate:c3-distribution-runtime must run required C3 runtime tests",
);
assertCondition(
  scripts["phase-c:c3:quick"] ===
    "bun run phase-c:gate:drift-core && bun run phase-c:gate:c3-distribution-contract && bun run phase-c:gate:c3-distribution-runtime",
  "phase-c:c3:quick must run drift-core + c3 contract + c3 runtime gates",
);
assertCondition(
  scripts["phase-c:c3:full"] === "bun run phase-c:c3:quick && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",
  "phase-c:c3:full must include C3 quick + legacy metadata hard-delete guard",
);

console.log("phase-c distribution/lifecycle contract verified");

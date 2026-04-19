#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectPath = path.join(root, "tools", "eslint-fixtures", "project.json");
const negativePluginPath = path.join(root, "tools", "eslint-fixtures", "negative-plugin-imports-plugin.ts");
const negativeServicePath = path.join(root, "tools", "eslint-fixtures", "negative-service-imports-app.ts");
const negativePackagePath = path.join(root, "tools", "eslint-fixtures", "negative-package-imports-service.ts");
const positiveServicePath = path.join(root, "tools", "eslint-fixtures", "positive-service-imports-package.ts");

const project = JSON.parse(await fs.readFile(projectPath, "utf8"));
const [negativePluginSource, negativeServiceSource, negativePackageSource, positiveServiceSource] = await Promise.all([
  fs.readFile(negativePluginPath, "utf8"),
  fs.readFile(negativeServicePath, "utf8"),
  fs.readFile(negativePackagePath, "utf8"),
  fs.readFile(positiveServicePath, "utf8"),
]);

const requiredTags = ["type:package", "migration-slice:structural-tranche"];
for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`eslint-fixtures structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (
  negativePluginSource.includes('type:plugin') ||
  negativeServiceSource.includes('type:service') ||
  negativePackageSource.includes('type:package')
) {
  console.error("eslint-fixtures structural failed: fixture sources must not encode project tags directly.");
  process.exit(1);
}

if (!negativePluginSource.includes("../../plugins/cli/plugins/src/lib/workspace-plugins.ts")) {
  console.error("eslint-fixtures structural failed: plugin-negative fixture must keep the plugin import edge.");
  process.exit(1);
}

if (!negativeServiceSource.includes("../../apps/server/src/index.ts")) {
  console.error("eslint-fixtures structural failed: app-negative fixture must keep the app import edge.");
  process.exit(1);
}

if (!negativePackageSource.includes("../../services/hq-ops/src/index.ts")) {
  console.error("eslint-fixtures structural failed: package-negative fixture must keep the service import edge.");
  process.exit(1);
}

if (!positiveServiceSource.includes("@rawr/core")) {
  console.error("eslint-fixtures structural failed: positive package fixture must keep the package import edge.");
  process.exit(1);
}

console.log("eslint-fixtures structural verified");

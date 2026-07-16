import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const forbiddenPaths = [
  "plugins/cli/plugins/src/commands/plugins/cli/install/all.ts",
  "plugins/cli/plugins/src/commands/plugins/converge.ts",
  "plugins/cli/plugins/src/commands/plugins/doctor/links.ts",
  "plugins/cli/plugins/src/lib/plugin-install-service.ts",
  "plugins/cli/plugins/src/lib/rawr-source-runner.ts",
  "services/hq-ops/src/service/modules/plugin-install",
  "services/hq-ops/test/plugin-install.test.ts",
];
const forbiddenText = [
  ["install-reconcile", /install-reconcile/u],
  ["official relink helper", /plugin-install-service|rawr-source-runner/u],
  ["checkout owner file", /global-rawr-owner-path/u],
  ["source CLI global link", /apps\/cli\/bin\/run\.js/u],
  ["workspace-derived Oclif repair", /reconcile-cli-command-plugin-links|assessInstallState|planInstallRepair/u],
  ["source CLI recursion", /bun\s+run\s+rawr|["']run["']\s*,\s*["']rawr["']/u],
  ["official install repair flags", /["']--checks["']\s*,\s*["']install["']|--checks\s+install|["']--repair["']/u],
  ["worktree link-healing option", /healLinks|heal-links/u],
];
const scanRoots = [
  "apps/cli/src",
  "plugins/cli/plugins/src",
  "scripts/dev",
  "scripts/githooks",
  "services/hq-ops/src",
  "services/dev/src",
  "plugins/cli/devops/src",
];

const findings = [];
for (const relativePath of forbiddenPaths) {
  if (fs.existsSync(path.join(root, relativePath))) findings.push(`forbidden path remains: ${relativePath}`);
}
for (const scanRoot of scanRoots) {
  for (const file of walk(path.join(root, scanRoot))) {
    const text = fs.readFileSync(file, "utf8");
    for (const [label, pattern] of forbiddenText) {
      if (pattern.test(text)) findings.push(`${label} remains in ${path.relative(root, file)}`);
    }
  }
}

if (findings.length > 0) throw new Error(`OFFICIAL_RELINK_AUTHORITY_REMAINS\n${findings.join("\n")}`);
console.log("official relink authority: absent");

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(?:js|mjs|sh|ts)$/u.test(entry.name) ? [entryPath] : [];
  });
}

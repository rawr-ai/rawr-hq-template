#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = (modeArg?.split("=", 2)[1] ?? "baseline").trim();

if (mode !== "baseline" && mode !== "completion") {
  console.error(`Unsupported mode: ${mode}. Use --mode=baseline|completion.`);
  process.exit(2);
}

const root = process.cwd();
const rawrFile = path.join(root, "apps", "server", "src", "rawr.ts");
const orpcFile = path.join(root, "apps", "server", "src", "orpc.ts");
const manifestFile = path.join(root, "rawr.hq.ts");

const rawrSource = await fs.readFile(rawrFile, "utf8");
const orpcSource = await fs.readFile(orpcFile, "utf8");
const manifestSource = mode === "completion" ? await fs.readFile(manifestFile, "utf8") : "";

const requiredChecks = [
  { label: "/api/inngest mount", ok: rawrSource.includes('"/api/inngest"') },
  { label: "/rpc routing registration", ok: orpcSource.includes('"/rpc"') },
  { label: "/api/orpc routing registration", ok: orpcSource.includes('"/api/orpc"') },
];

if (mode === "completion") {
  requiredChecks.push({
    label: "manifest workflow capability mapping authority",
    ok:
      manifestSource.includes("workflows") &&
      manifestSource.includes("capabilities") &&
      manifestSource.includes("pathPrefix"),
  });
  requiredChecks.push({
    label: "/api/workflows capability-family wiring",
    ok: rawrSource.includes('"/api/workflows/*"') && rawrSource.includes("resolveWorkflowCapability"),
  });
  requiredChecks.push({
    label: "manifest capability mapping consumed in runtime routing",
    ok: rawrSource.includes("rawrHqManifest.workflows.capabilities"),
  });
  requiredChecks.push({
    label: "no dedicated /rpc/workflows mount",
    ok: !rawrSource.includes('"/rpc/workflows') && !orpcSource.includes('"/rpc/workflows'),
  });
}

const failures = requiredChecks.filter((item) => !item.ok);

if (failures.length === 0) {
  console.log(`manifest-smoke (${mode}) passed.`);
  process.exit(0);
}

console.error(`manifest-smoke (${mode}) failed:`);
for (const failure of failures) {
  console.error(`  - missing ${failure.label}`);
}
process.exit(1);

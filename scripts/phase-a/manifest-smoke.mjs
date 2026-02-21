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

const rawrSource = await fs.readFile(rawrFile, "utf8");
const orpcSource = await fs.readFile(orpcFile, "utf8");

const requiredChecks = [
  { label: "/api/inngest mount", ok: rawrSource.includes('"/api/inngest"') },
  { label: "/rpc routing registration", ok: orpcSource.includes('"/rpc"') },
  { label: "/api/orpc routing registration", ok: orpcSource.includes('"/api/orpc"') },
];

if (mode === "completion") {
  requiredChecks.push({
    label: "/api/workflows route family wiring",
    ok: rawrSource.includes('"/api/workflows') || rawrSource.includes("'/api/workflows"),
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

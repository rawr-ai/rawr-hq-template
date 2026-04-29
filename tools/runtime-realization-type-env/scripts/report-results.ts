import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ManifestStatus =
  | "proof"
  | "vendor-proof"
  | "simulation-proof"
  | "xfail"
  | "todo"
  | "out-of-scope";

interface ManifestEntry {
  readonly id: string;
  readonly status: ManifestStatus;
  readonly source: string;
  readonly oracle: string;
  readonly fixtures: readonly string[];
  readonly gates?: readonly string[];
}

interface Manifest {
  readonly spec: {
    readonly path: string;
    readonly sha256: string;
  };
  readonly currentExperiment?: {
    readonly id: string;
    readonly focus: string;
    readonly relatedEntries: readonly string[];
  };
  readonly entries: readonly ManifestEntry[];
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "evidence", "proof-manifest.json"), "utf8"),
) as Manifest;

const byStatus = new Map<ManifestStatus, ManifestEntry[]>();
for (const status of [
  "proof",
  "vendor-proof",
  "simulation-proof",
  "xfail",
  "todo",
  "out-of-scope",
] as const) {
  byStatus.set(status, []);
}
for (const entry of manifest.entries) {
  byStatus.get(entry.status)?.push(entry);
}

console.log("runtime-realization-type-env report");
console.log(`spec: ${manifest.spec.path}`);
console.log(`spec sha256: ${manifest.spec.sha256}`);

if (manifest.currentExperiment) {
  console.log("");
  console.log(`current experiment: ${manifest.currentExperiment.id}`);
  console.log(`focus: ${manifest.currentExperiment.focus}`);
  console.log(
    `related entries: ${manifest.currentExperiment.relatedEntries.join(", ")}`,
  );
}

console.log("");
for (const [status, entries] of byStatus) {
  console.log(`${status}: ${entries.length}`);
  for (const entry of entries) {
    console.log(`  - ${entry.id}`);
    console.log(`    oracle: ${entry.oracle}`);
    if (entry.gates?.length) {
      console.log(`    gates: ${entry.gates.join(", ")}`);
    }
  }
}

console.log("");
console.log(
  "green gate means proof, vendor-proof, and simulation-proof entries passed their named gates while open entries stayed fenced.",
);
console.log("xfail means architecture unresolved, not necessarily TypeScript failure.");

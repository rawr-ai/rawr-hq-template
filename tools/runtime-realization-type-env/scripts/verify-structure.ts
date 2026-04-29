import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(toolRoot, "..", "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8")) as T;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

const requiredPaths = [
  "tools/runtime-realization-type-env/README.md",
  "tools/runtime-realization-type-env/project.json",
  "tools/runtime-realization-type-env/tsconfig.json",
  "tools/runtime-realization-type-env/tsconfig.fail-base.json",
  "tools/runtime-realization-type-env/evidence/focus-log.md",
  "tools/runtime-realization-type-env/evidence/effect-integration-map.md",
  "tools/runtime-realization-type-env/evidence/effect-integration-work-plan.md",
  "tools/runtime-realization-type-env/evidence/proof-manifest.json",
  "tools/runtime-realization-type-env/evidence/runtime-realization-lab-v2-plan.md",
  "tools/runtime-realization-type-env/evidence/spine-audit-map.md",
  "tools/runtime-realization-type-env/evidence/vendor-fidelity.md",
  "tools/runtime-realization-type-env/src/sdk/effect.ts",
  "tools/runtime-realization-type-env/src/sdk/service.ts",
  "tools/runtime-realization-type-env/src/sdk/plugins/server.ts",
  "tools/runtime-realization-type-env/src/sdk/plugins/async.ts",
  "tools/runtime-realization-type-env/src/spine/artifacts.ts",
  "tools/runtime-realization-type-env/src/spine/simulate.ts",
  "tools/runtime-realization-type-env/src/mini-runtime/process-runtime.ts",
  "tools/runtime-realization-type-env/src/mini-runtime/managed-runtime.ts",
  "tools/runtime-realization-type-env/src/mini-runtime/process-resources.ts",
  "tools/runtime-realization-type-env/src/vendor/effect/runtime.ts",
  "tools/runtime-realization-type-env/src/vendor/boundaries/typebox.ts",
  "tools/runtime-realization-type-env/src/vendor/boundaries/orpc.ts",
  "tools/runtime-realization-type-env/src/vendor/boundaries/inngest.ts",
  "tools/runtime-realization-type-env/fixtures/positive/work-items-service.ts",
  "tools/runtime-realization-type-env/fixtures/inline-negative/authoring-contracts.ts",
  "tools/runtime-realization-type-env/fixtures/inline-negative/vendor-boundaries.ts",
  "tools/runtime-realization-type-env/fixtures/fail/portable-closure.fail.ts",
  "tools/runtime-realization-type-env/fixtures/todo/async-step-membership.todo.ts",
  "tools/runtime-realization-type-env/scripts/assert-negative-types.ts",
  "tools/runtime-realization-type-env/scripts/report-results.ts",
  "tools/runtime-realization-type-env/scripts/verify-structure.ts",
  "tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts",
  "tools/runtime-realization-type-env/test/spine-simulation.test.ts",
  "tools/runtime-realization-type-env/test/vendor-boundaries/boundary-shapes.test.ts",
  "tools/runtime-realization-type-env/test/vendor-effect/effect-runtime.test.ts",
  "tools/architecture-inventory/runtime-realization-type-env.json",
];

for (const requiredPath of requiredPaths) {
  assert(exists(requiredPath), `missing required path: ${requiredPath}`);
}

assert(
  !exists("tools/runtime-realization-type-env/package.json"),
  "type env must not be a workspace package",
);

const rootPackage = readJson<{
  scripts: Record<string, string>;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}>("package.json");

assert(
  rootPackage.scripts["runtime-realization:type-env"] ===
    "bunx nx run runtime-realization-type-env:gate",
  "root convenience script drifted",
);

for (const scriptName of ["build", "typecheck", "pretest:vitest", "test:vitest", "test"]) {
  const script = rootPackage.scripts[scriptName] ?? "";
  assert(
    !script.includes("runtime-realization-type-env"),
    `${scriptName} must not include runtime-realization-type-env`,
  );
}

assert(
  !(rootPackage.workspaces ?? []).some((workspace) => workspace.includes("tools/")),
  "tools must not be added to package workspaces",
);

assert(
  rootPackage.devDependencies?.effect === "3.21.2",
  "runtime type env must pin effect@3.21.2 as a root dev dependency",
);
assert(
  !("effect" in (rootPackage.dependencies ?? {})),
  "effect must not be added as a production dependency for the lab",
);

const tsconfigBase = read("tsconfig.base.json");
assert(
  !tsconfigBase.includes("@rawr/sdk"),
  "pseudo-SDK aliases must stay local to the type env tsconfig",
);

const vitestConfig = read("vitest.config.ts");
assert(
  !vitestConfig.includes("runtime-realization-type-env"),
  "root Vitest project list must not include the type env",
);

const project = readJson<{
  name: string;
  root: string;
  tags: string[];
  targets: Record<string, unknown>;
}>("tools/runtime-realization-type-env/project.json");

assert(project.name === "runtime-realization-type-env", "project name drifted");
assert(project.root === "tools/runtime-realization-type-env", "project root drifted");
for (const tag of ["type:tool", "migration-slice:runtime-realization", "spec-conformance"]) {
  assert(project.tags.includes(tag), `project missing tag ${tag}`);
}
for (const target of [
  "sync",
  "structural",
  "report",
  "typecheck",
  "negative",
  "vendor-effect",
  "vendor-boundaries",
  "mini-runtime",
  "simulate",
  "gate",
]) {
  assert(target in project.targets, `project missing target ${target}`);
}

const gateTargets = new Set([
  "structural",
  "report",
  "typecheck",
  "negative",
  "vendor-effect",
  "vendor-boundaries",
  "mini-runtime",
  "simulate",
]);

type ManifestStatus =
  | "proof"
  | "vendor-proof"
  | "simulation-proof"
  | "xfail"
  | "todo"
  | "out-of-scope";
const allowedStatuses = new Set<ManifestStatus>([
  "proof",
  "vendor-proof",
  "simulation-proof",
  "xfail",
  "todo",
  "out-of-scope",
]);
const gatedProofStatuses = new Set<ManifestStatus>([
  "proof",
  "vendor-proof",
  "simulation-proof",
]);

const manifest = readJson<{
  spec: { path: string; sha256: string };
  currentExperiment?: {
    id: string;
    focus: string;
    relatedEntries: string[];
  };
  entries: Array<{
    id: string;
    status: string;
    fixtures: string[];
    gates?: string[];
  }>;
}>("tools/runtime-realization-type-env/evidence/proof-manifest.json");

assert(
  manifest.spec.path ===
    "docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md",
  "proof manifest must pin the repo canonical runtime spec",
);
const runtimeSpecSha256 = createHash("sha256")
  .update(read(manifest.spec.path))
  .digest("hex");
assert(
  manifest.spec.sha256 === runtimeSpecSha256,
  `proof manifest authority hash drifted: expected ${runtimeSpecSha256}`,
);

const manifestFixtures = new Set(
  manifest.entries.flatMap((entry) => entry.fixtures ?? []),
);
const manifestEntryIds = new Set<string>();

for (const entry of manifest.entries) {
  assert(entry.id, "manifest entry missing id");
  assert(!manifestEntryIds.has(entry.id), `duplicate manifest entry id: ${entry.id}`);
  manifestEntryIds.add(entry.id);
  assert(
    allowedStatuses.has(entry.status as ManifestStatus),
    `manifest entry ${entry.id} has invalid status: ${entry.status}`,
  );

  if (gatedProofStatuses.has(entry.status as ManifestStatus)) {
    assert(
      (entry.gates ?? []).length > 0,
      `manifest entry ${entry.id} must name at least one regression gate`,
    );
    for (const gate of entry.gates ?? []) {
      assert(gateTargets.has(gate), `manifest entry ${entry.id} names unknown gate ${gate}`);
    }
  }

  for (const fixture of entry.fixtures ?? []) {
    assert(
      exists(`tools/runtime-realization-type-env/${fixture}`),
      `manifest fixture missing: ${fixture}`,
    );

    if (gatedProofStatuses.has(entry.status as ManifestStatus)) {
      assert(
        !fixture.startsWith("fixtures/todo/"),
        `proof entry ${entry.id} must not point at todo fixture ${fixture}`,
      );
    }

    if (fixture.startsWith("fixtures/todo/")) {
      assert(
        entry.status === "xfail" || entry.status === "todo",
        `todo fixture ${fixture} must belong to xfail or todo entry, not ${entry.status}`,
      );
    }
  }
}

if (manifest.currentExperiment) {
  assert(manifest.currentExperiment.id, "currentExperiment missing id");
  assert(manifest.currentExperiment.focus, "currentExperiment missing focus");
  assert(
    manifest.currentExperiment.relatedEntries.length > 0,
    "currentExperiment must name related manifest entries",
  );
  for (const entryId of manifest.currentExperiment.relatedEntries) {
    assert(
      manifestEntryIds.has(entryId),
      `currentExperiment references unknown entry: ${entryId}`,
    );
  }
}

const todoFiles = walk(path.join(toolRoot, "fixtures", "todo"))
  .map((filePath) => path.relative(toolRoot, filePath).split(path.sep).join("/"))
  .sort();

for (const todoFile of todoFiles) {
  assert(manifestFixtures.has(todoFile), `todo fixture missing manifest entry: ${todoFile}`);
}

const typeEnvTsconfig = readJson<{
  include?: string[];
  exclude?: string[];
}>("tools/runtime-realization-type-env/tsconfig.json");

assert(
  (typeEnvTsconfig.exclude ?? []).includes("fixtures/todo/**"),
  "todo fixtures must remain excluded from the positive typecheck",
);

const sourceFiles = walk(toolRoot).filter((filePath) => filePath.endsWith(".ts"));
const forbiddenImportPattern =
  /from\s+["'](?:@rawr\/(?:core|server|cli|web|hq-app|hq-sdk|runtime-context|bootgraph|example-todo|plugin-|agent-config-sync|session-intelligence|chatgpt-corpus)|\.\.\/\.\.\/(?:apps|packages|services|plugins)\/)/;
const rawEffectImportPattern = /from\s+["']effect(?:\/[^"']*)?["']/;
const rawEffectAllowedPrefixes = [
  "src/sdk/effect.ts",
  "src/mini-runtime/",
  "src/vendor/effect/",
  "test/vendor-effect/",
];

for (const sourceFile of sourceFiles) {
  const source = fs.readFileSync(sourceFile, "utf8");
  const relativeSourceFile = path.relative(toolRoot, sourceFile).split(path.sep).join("/");
  assert(
    !forbiddenImportPattern.test(source),
    `forbidden production import in ${path.relative(repoRoot, sourceFile)}`,
  );
  if (rawEffectImportPattern.test(source)) {
    assert(
      rawEffectAllowedPrefixes.some((allowedPath) =>
        relativeSourceFile === allowedPath || relativeSourceFile.startsWith(allowedPath),
      ),
      `raw effect import is not allowed in ${path.relative(repoRoot, sourceFile)}`,
    );
  }
}

console.log("runtime-realization-type-env structural guard passed.");

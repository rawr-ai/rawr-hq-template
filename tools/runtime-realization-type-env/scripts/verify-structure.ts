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
  "tools/runtime-realization-type-env/AGENTS.md",
  "tools/runtime-realization-type-env/RUNBOOK.md",
  "tools/runtime-realization-type-env/project.json",
  "tools/runtime-realization-type-env/tsconfig.json",
  "tools/runtime-realization-type-env/tsconfig.fail-base.json",
  "tools/runtime-realization-type-env/evidence/current-lab-state.md",
  "tools/runtime-realization-type-env/evidence/AGENTS.md",
  "tools/runtime-realization-type-env/evidence/README.md",
  "tools/runtime-realization-type-env/evidence/systems/README.md",
  "tools/runtime-realization-type-env/evidence/systems/effect-integration-map.md",
  "tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md",
  "tools/runtime-realization-type-env/evidence/systems/telemetry-observation-map.md",
  "tools/runtime-realization-type-env/evidence/vendors/README.md",
  "tools/runtime-realization-type-env/evidence/vendors/typescript.md",
  "tools/runtime-realization-type-env/evidence/vendors/effect.md",
  "tools/runtime-realization-type-env/evidence/vendors/orpc.md",
  "tools/runtime-realization-type-env/evidence/vendors/elysia.md",
  "tools/runtime-realization-type-env/evidence/vendors/typebox.md",
  "tools/runtime-realization-type-env/evidence/vendors/inngest.md",
  "tools/runtime-realization-type-env/evidence/vendors/hyperdx-otlp.md",
  "tools/runtime-realization-type-env/evidence/vendors/semantica.md",
  "tools/runtime-realization-type-env/guidance/guardrails-design.md",
  "tools/runtime-realization-type-env/phases/README.md",
  "tools/runtime-realization-type-env/phases/phase-one/README.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/README.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/default-research-program-2026-04-30/README.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/default-research-program-2026-04-30/workflow-runtime-research-program-dra.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/default-research-program-2026-04-30/ref-runtime-realization-research-program.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/pre-phase-two-2026-04-30/README.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/pre-phase-two-2026-04-30/workflow-effect-integration-work-plan.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/pre-phase-two-2026-04-30/workflow-middle-spine-verification-work-plan.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/pre-phase-two-2026-04-30/workflow-runtime-realization-lab-v2-plan.md",
  "tools/runtime-realization-type-env/phases/phase-one/_archive/pre-phase-two-2026-04-30/workflow-runtime-spine-diagnostic-work-plan.md",
  "tools/runtime-realization-type-env/phases/phase-one/workstreams/workstream-2026-04-30-phase-one-runtime-research-program-closeout.md",
  "tools/runtime-realization-type-env/phases/phase-two/README.md",
  "tools/runtime-realization-type-env/phases/phase-two/workflow-phase-two-level-zero.md",
  "tools/runtime-realization-type-env/phases/phase-two/ref-2026-04-30-phase-two-production-critical-claim-ledger.md",
  "tools/runtime-realization-type-env/phases/phase-two/handoffs/handoff-2026-05-01-post-phase-two-runtime-reframe.md",
  "tools/runtime-realization-type-env/phases/phase-two/workstreams/workstream-2026-04-30-phase-two-spine-composition-program-workstream.md",
  "tools/runtime-realization-type-env/phases/phase-two/workstreams/workstream-2026-04-30-phase-two-prelaunch-workspace-preparation.md",
  "tools/runtime-realization-type-env/phases/phase-three/README.md",
  "tools/runtime-realization-type-env/phases/phase-three/workflow-phase-three-program-dra.md",
  "tools/runtime-realization-type-env/phases/phase-three/workstreams/ref-2026-05-01-phase-three-started-passage-vendor-integration-reference.md",
  "tools/runtime-realization-type-env/phases/phase-three/handoffs/handoff-2026-05-01-post-phase-three-live-proof-reframe.md",
  "tools/runtime-realization-type-env/phases/phase-three/handoffs/ref-2026-05-01-oracle-salvage-to-reference-runtime-report.md",
  "tools/runtime-realization-type-env/phases/phase-three/workstreams/workstream-2026-05-01-phase-three-program-workstream.md",
  "tools/runtime-realization-type-env/phases/phase-three/workstreams/workstream-2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md",
  "tools/runtime-realization-type-env/guidance/README.md",
  "tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md",
  "tools/runtime-realization-type-env/guidance/template-workstream-report.md",
  "tools/runtime-realization-type-env/evidence/proof-manifest.json",
  "tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md",
  "tools/runtime-realization-type-env/src/sdk/effect.ts",
  "tools/runtime-realization-type-env/src/sdk/service.ts",
  "tools/runtime-realization-type-env/src/sdk/plugins/server.ts",
  "tools/runtime-realization-type-env/src/sdk/plugins/async.ts",
  "tools/runtime-realization-type-env/src/spine/artifacts.ts",
  "tools/runtime-realization-type-env/src/spine/simulate.ts",
  "tools/runtime-realization-type-env/src/oracle/process-runtime.ts",
  "tools/runtime-realization-type-env/src/oracle/managed-runtime.ts",
  "tools/runtime-realization-type-env/src/oracle/process-resources.ts",
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
  "tools/runtime-realization-type-env/test/oracle/process-runtime.test.ts",
  "tools/runtime-realization-type-env/test/spine-simulation.test.ts",
  "tools/runtime-realization-type-env/test/vendor-boundaries/boundary-shapes.test.ts",
  "tools/runtime-realization-type-env/test/vendor-effect/effect-runtime.test.ts",
  "tools/architecture-inventory/runtime-realization-type-env.json",
];

for (const requiredPath of requiredPaths) {
  assert(exists(requiredPath), `missing required path: ${requiredPath}`);
}

const retiredRuntimePrefix = ["mi", "ni"].join("");
const retiredRuntimeTitlePrefix =
  retiredRuntimePrefix.charAt(0).toUpperCase() + retiredRuntimePrefix.slice(1);
const retiredOraclePathSegment = [retiredRuntimePrefix, "runtime"].join("-");
const retiredOraclePhrase = [retiredRuntimePrefix, "runtime"].join(" ");
const retiredOracleTitlePhrase = [retiredRuntimeTitlePrefix, "runtime"].join(
  "-",
);
const retiredPhaseTwoOverclaimSlug = [
  "phase-two",
  "production",
  "readiness",
  "program",
  "workstream.md",
].join("-");

for (const retiredPath of [
  "tools/runtime-realization-type-env/evidence/phases",
  "tools/runtime-realization-type-env/evidence/workstreams",
  "tools/runtime-realization-type-env/evidence/handoffs",
  "tools/runtime-realization-type-env/evidence/_archive",
  "tools/runtime-realization-type-env/evidence/focus-log.md",
  "tools/runtime-realization-type-env/evidence/spine-audit-map.md",
  "tools/runtime-realization-type-env/evidence/effect-integration-map.md",
  "tools/runtime-realization-type-env/evidence/vendor-fidelity.md",
  "tools/runtime-realization-type-env/phases/foundation-research",
  "tools/runtime-realization-type-env/phases/phase-three/transition",
  "tools/runtime-realization-type-env/templates",
  "tools/runtime-realization-type-env/workflows",
  "tools/runtime-realization-type-env/evidence/design-guardrails.md",
  "tools/runtime-realization-type-env/phases/phase-one/refs",
  "tools/runtime-realization-type-env/phases/phase-one/workflows",
  "tools/runtime-realization-type-env/phases/phase-two/refs",
  "tools/runtime-realization-type-env/phases/phase-two/workflows",
  "tools/runtime-realization-type-env/phases/phase-three/refs",
  "tools/runtime-realization-type-env/phases/phase-three/workflows",
  "tools/runtime-realization-type-env/evidence/workflow-phase-two-level-zero.md",
  "tools/runtime-realization-type-env/evidence/ref-2026-04-30-phase-two-production-critical-claim-ledger.md",
  "tools/runtime-realization-type-env/evidence/workflow-runtime-research-program-dra.md",
  "tools/runtime-realization-type-env/evidence/ref-runtime-realization-research-program.md",
  "tools/runtime-realization-type-env/evidence/workflow-effect-integration-work-plan.md",
  "tools/runtime-realization-type-env/evidence/workflow-middle-spine-verification-work-plan.md",
  "tools/runtime-realization-type-env/evidence/workflow-runtime-realization-lab-v2-plan.md",
  "tools/runtime-realization-type-env/evidence/workflow-runtime-spine-diagnostic-work-plan.md",
  `tools/runtime-realization-type-env/src/${retiredOraclePathSegment}`,
  `tools/runtime-realization-type-env/test/${retiredOraclePathSegment}`,
  `tools/runtime-realization-type-env/phases/phase-three/handoffs/ref-2026-05-01-${retiredOraclePathSegment}-salvage-to-reference-runtime-report.md`,
  `tools/runtime-realization-type-env/phases/phase-two/workstreams/workstream-2026-04-30-${retiredPhaseTwoOverclaimSlug}`,
]) {
  assert(
    !exists(retiredPath),
    `retired runtime lab evidence topology path must not exist: ${retiredPath}`,
  );
}

const toolFiles = walk(toolRoot).map((filePath) =>
  path.relative(toolRoot, filePath).split(path.sep).join("/"),
);

const retiredOracleNamedPaths = toolFiles.filter((filePath) =>
  filePath.toLowerCase().includes(retiredOraclePathSegment),
);
assert(
  retiredOracleNamedPaths.length === 0,
  `runtime lab paths must use Oracle naming, not the retired proof-harness name: ${retiredOracleNamedPaths.join(", ")}`,
);

const namingFramePaths = [
  "tools/runtime-realization-type-env/AGENTS.md",
  "tools/runtime-realization-type-env/README.md",
  "tools/runtime-realization-type-env/RUNBOOK.md",
  "tools/runtime-realization-type-env/evidence/AGENTS.md",
  "tools/runtime-realization-type-env/evidence/README.md",
  "tools/runtime-realization-type-env/guidance/guardrails-design.md",
  "tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md",
];
const requiredNamingTerms = [
  "Runtime Realization Lab",
  "Oracle",
  "Lab-Production Proof",
  "Reference Runtime",
  "Parent-Repo Migration",
];
const retiredActivePhrases = [
  "parent Parent-Repo Migration",
  "Lab-Production Proof requires a migration slice",
  ["not", "the", "runtime"].join(" "),
  retiredOraclePathSegment,
  retiredOraclePhrase,
  retiredOracleTitlePhrase,
];
for (const namingFramePath of namingFramePaths) {
  const content = read(namingFramePath);
  for (const term of requiredNamingTerms) {
    assert(
      content.includes(term),
      `${namingFramePath} must carry naming-frame term: ${term}`,
    );
  }
  for (const retiredPhrase of retiredActivePhrases) {
    assert(
      !content.includes(retiredPhrase),
      `${namingFramePath} contains retired naming phrase: ${retiredPhrase}`,
    );
  }
}

const directPhaseFiles = fs
  .readdirSync(path.join(repoRoot, "tools/runtime-realization-type-env/phases"), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isFile() && entry.name !== "README.md")
  .map((entry) => entry.name);
assert(
  directPhaseFiles.length === 0,
  `phase files must live inside a phase dossier: ${directPhaseFiles.join(", ")}`,
);

const evidenceRootEntries = fs
  .readdirSync(path.join(repoRoot, "tools/runtime-realization-type-env/evidence"), {
    withFileTypes: true,
  });
const invalidEvidenceRootFiles = evidenceRootEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter(
    (fileName) =>
      ![
        "AGENTS.md",
        "README.md",
        "current-lab-state.md",
        "proof-manifest.json",
        "runtime-spine-verification-diagnostic.md",
      ].includes(fileName),
  );
assert(
  invalidEvidenceRootFiles.length === 0,
  `evidence root files must stay authority/current-state only: ${invalidEvidenceRootFiles.join(", ")}`,
);

const invalidEvidenceRootDirs = evidenceRootEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((dirName) => dirName !== "systems" && dirName !== "vendors");
assert(
  invalidEvidenceRootDirs.length === 0,
  `evidence root directories must be systems or vendors only: ${invalidEvidenceRootDirs.join(", ")}`,
);

const systemEvidenceEntries = fs.readdirSync(
  path.join(repoRoot, "tools/runtime-realization-type-env/evidence/systems"),
  {
    withFileTypes: true,
  },
);
const invalidSystemEvidenceDirs = systemEvidenceEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert(
  invalidSystemEvidenceDirs.length === 0,
  `system evidence directories are not allowed: ${invalidSystemEvidenceDirs.join(", ")}`,
);

const systemEvidenceFiles = systemEvidenceEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const invalidSystemEvidenceFiles = systemEvidenceFiles.filter(
  (fileName) => fileName !== "README.md" && !/.+-map\.md$/.test(fileName),
);
assert(
  invalidSystemEvidenceFiles.length === 0,
  `system evidence files must be README.md or *-map.md: ${invalidSystemEvidenceFiles.join(", ")}`,
);

const vendorEvidenceEntries = fs.readdirSync(
  path.join(repoRoot, "tools/runtime-realization-type-env/evidence/vendors"),
  {
    withFileTypes: true,
  },
);
const invalidVendorEvidenceDirs = vendorEvidenceEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert(
  invalidVendorEvidenceDirs.length === 0,
  `vendor evidence directories are not allowed: ${invalidVendorEvidenceDirs.join(", ")}`,
);

const vendorEvidenceFiles = vendorEvidenceEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const expectedVendorEvidenceFiles = new Set([
  "README.md",
  "typescript.md",
  "effect.md",
  "orpc.md",
  "elysia.md",
  "typebox.md",
  "inngest.md",
  "hyperdx-otlp.md",
  "semantica.md",
]);
const invalidVendorEvidenceFiles = vendorEvidenceFiles.filter(
  (fileName) => !expectedVendorEvidenceFiles.has(fileName),
);
assert(
  invalidVendorEvidenceFiles.length === 0,
  `unexpected vendor evidence files: ${invalidVendorEvidenceFiles.join(", ")}`,
);

const guidanceFiles = fs
  .readdirSync(path.join(repoRoot, "tools/runtime-realization-type-env/guidance"), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const invalidGuidanceFiles = guidanceFiles.filter(
  (fileName) =>
    fileName !== "README.md" &&
    !/^(guardrails|workflow|template)-.+\.md$/.test(fileName),
);
assert(
  invalidGuidanceFiles.length === 0,
  `guidance files must be README.md or use guardrails-, workflow-, or template- prefixes: ${invalidGuidanceFiles.join(", ")}`,
);

for (const phaseName of ["phase-one", "phase-two", "phase-three"]) {
  const phaseEntries = fs.readdirSync(
    path.join(repoRoot, "tools/runtime-realization-type-env/phases", phaseName),
    { withFileTypes: true },
  );
  const invalidPhaseRootFiles = phaseEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (fileName) =>
        fileName !== "README.md" &&
        !/^workflow-.+\.md$/.test(fileName) &&
        !/^ref-.+\.md$/.test(fileName),
    );
  assert(
    invalidPhaseRootFiles.length === 0,
    `phase root files must be README.md, workflow-*.md, or ref-*.md: ${phaseName}: ${invalidPhaseRootFiles.join(", ")}`,
  );

  const invalidPhaseRootDirs = phaseEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (dirName) =>
        dirName !== "workstreams" &&
        dirName !== "handoffs" &&
        dirName !== "_archive",
    );
  assert(
    invalidPhaseRootDirs.length === 0,
    `phase root directories must be workstreams, handoffs, or _archive: ${phaseName}: ${invalidPhaseRootDirs.join(", ")}`,
  );

  for (const producedDir of ["workstreams", "handoffs"]) {
    const producedPath = path.join(
      repoRoot,
      "tools/runtime-realization-type-env/phases",
      phaseName,
      producedDir,
    );
    if (!fs.existsSync(producedPath)) continue;

    const producedEntries = fs.readdirSync(producedPath, { withFileTypes: true });
    const nestedDirs = producedEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    assert(
      nestedDirs.length === 0,
      `phase ${producedDir} directories must stay flat: ${phaseName}: ${nestedDirs.join(", ")}`,
    );

    const allowedFilePattern =
      producedDir === "workstreams"
        ? /^(README|workstream-.+|ref-.+)\.md$/
        : /^(README|handoff-.+|ref-.+)\.md$/;
    const invalidProducedFiles = producedEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => !allowedFilePattern.test(fileName));
    assert(
      invalidProducedFiles.length === 0,
      `phase ${producedDir} files use invalid names: ${phaseName}: ${invalidProducedFiles.join(", ")}`,
    );
  }
}

const unprefixedDatedPhaseReports = toolFiles.filter((filePath) => {
  if (!filePath.startsWith("phases/")) return false;
  const baseName = path.basename(filePath);
  return /^20\d{2}-\d{2}-\d{2}-.+\.md$/.test(baseName);
});
assert(
  unprefixedDatedPhaseReports.length === 0,
  `phase reports must use workstream-, handoff-, ref-, or workflow- prefixes: ${unprefixedDatedPhaseReports.join(", ")}`,
);

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
  "oracle",
  "middle-spine",
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
  "oracle",
  "middle-spine",
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
  "src/sdk/runtime/provider-plan-internals.ts",
  "src/oracle/",
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

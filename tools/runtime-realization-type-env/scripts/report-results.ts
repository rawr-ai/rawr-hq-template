import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";
import { Value } from "typebox/value";

const MANIFEST_STATUSES = [
  "proof",
  "vendor-proof",
  "simulation-proof",
  "xfail",
  "todo",
  "out-of-scope",
] as const;

const ManifestStatusSchema = Type.Union([
  Type.Literal("proof"),
  Type.Literal("vendor-proof"),
  Type.Literal("simulation-proof"),
  Type.Literal("xfail"),
  Type.Literal("todo"),
  Type.Literal("out-of-scope"),
]);

const ManifestEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    status: ManifestStatusSchema,
    source: Type.String({ minLength: 1 }),
    oracle: Type.String({ minLength: 1 }),
    fixtures: Type.Array(Type.String({ minLength: 1 })),
    gates: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false }
);

const ManifestSchema = Type.Object(
  {
    spec: Type.Object(
      {
        path: Type.String({ minLength: 1 }),
        sha256: Type.String({ pattern: "^[a-f0-9]{64}$" }),
      },
      { additionalProperties: false }
    ),
    currentExperiment: Type.Optional(
      Type.Object(
        {
          id: Type.String({ minLength: 1 }),
          focus: Type.String({ minLength: 1 }),
          relatedEntries: Type.Array(Type.String({ minLength: 1 })),
        },
        { additionalProperties: false }
      )
    ),
    entries: Type.Array(ManifestEntrySchema),
  },
  { additionalProperties: false }
);

type Manifest = Static<typeof ManifestSchema>;
type ManifestEntry = Static<typeof ManifestEntrySchema>;
type ManifestStatus = Static<typeof ManifestStatusSchema>;

/**
 * Locates the repository authority and contained lab used to validate one
 * evidence manifest without inferring either root from ambient process state.
 */
export interface ManifestValidationRoots {
  readonly repoRoot: string;
  readonly toolRoot: string;
}

const manifestValidator = Compile(ManifestSchema);
const canonicalSpecPath =
  "docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md";
const gatedProofStatuses = new Set<ManifestStatus>(["proof", "vendor-proof", "simulation-proof"]);
const nonBehaviorGateTargets = new Set(["report", "evidence-manifest"]);
const simulationBehaviorTargets = new Set([
  "oracle",
  "middle-spine",
  "simulate",
  "reference-runtime",
]);
const vendorBehaviorTargets = new Set(["vendor-effect", "vendor-boundaries"]);

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(toolRoot, "..", "..");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function pathInside(root: string, relativePath: string, label: string): string {
  assert(!path.isAbsolute(relativePath), `${label} must be relative: ${relativePath}`);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolvedPath);
  assert(
    relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    `${label} escapes its owner root: ${relativePath}`
  );
  return resolvedPath;
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readScheduledGateTargets(toolRoot: string): Set<string> {
  const projectPath = path.join(toolRoot, "project.json");
  let project: unknown;
  try {
    project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid runtime realization project configuration: ${detail}`);
  }

  assert(
    isRecord(project) && isRecord(project.targets),
    "runtime realization project configuration must define targets"
  );
  const gateTarget = project.targets.gate;
  assert(
    isRecord(gateTarget) && Array.isArray(gateTarget.dependsOn),
    "runtime realization gate must declare its dependencies"
  );
  const scheduledTargets = gateTarget.dependsOn.filter(
    (dependency): dependency is string => typeof dependency === "string"
  );
  for (const target of scheduledTargets) {
    assert(
      target in project.targets,
      `runtime realization gate schedules an unknown target: ${target}`
    );
  }
  return new Set(scheduledTargets);
}

function parseManifestJson(contents: string): Manifest {
  let candidate: unknown;
  try {
    candidate = JSON.parse(contents);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid proof manifest JSON: ${detail}`);
  }

  if (!manifestValidator.Check(candidate)) {
    const details = [...Value.Errors(ManifestSchema, candidate)]
      .map((error) => error.message)
      .join("; ");
    throw new Error(`invalid proof manifest structure: ${details}`);
  }

  return candidate;
}

function validateManifest(manifest: Manifest, roots: ManifestValidationRoots): void {
  assert(
    manifest.spec.path === canonicalSpecPath,
    `proof manifest must pin the repo canonical runtime spec: ${canonicalSpecPath}`
  );

  const specPath = pathInside(roots.repoRoot, manifest.spec.path, "manifest spec path");
  assert(
    fs.existsSync(specPath) && fs.statSync(specPath).isFile(),
    `manifest spec missing: ${manifest.spec.path}`
  );
  const actualSpecHash = createHash("sha256").update(fs.readFileSync(specPath)).digest("hex");
  assert(
    manifest.spec.sha256 === actualSpecHash,
    `proof manifest authority hash drifted: expected ${actualSpecHash}`
  );

  const manifestEntryIds = new Set<string>();
  const manifestFixtures = new Set<string>();
  const scheduledGateTargets = readScheduledGateTargets(roots.toolRoot);
  const behaviorGateTargets = new Set(
    [...scheduledGateTargets].filter((gate) => !nonBehaviorGateTargets.has(gate))
  );

  for (const entry of manifest.entries) {
    assert(!manifestEntryIds.has(entry.id), `duplicate manifest entry id: ${entry.id}`);
    manifestEntryIds.add(entry.id);

    if (gatedProofStatuses.has(entry.status)) {
      assert(
        (entry.gates?.length ?? 0) > 0,
        `manifest entry ${entry.id} must name at least one regression gate`
      );

      for (const gate of entry.gates ?? []) {
        assert(
          scheduledGateTargets.has(gate),
          `manifest entry ${entry.id} names gate not scheduled by the owner gate: ${gate}`
        );
      }

      assert(
        (entry.gates ?? []).some((gate) => behaviorGateTargets.has(gate)),
        `manifest entry ${entry.id} must name at least one behavior gate`
      );

      if (entry.status === "simulation-proof") {
        assert(
          (entry.gates ?? []).some((gate) => simulationBehaviorTargets.has(gate)),
          `simulation-proof entry ${entry.id} must include oracle, simulate, middle-spine, or reference-runtime`
        );
      }

      if (entry.status === "vendor-proof") {
        assert(
          (entry.gates ?? []).some((gate) => vendorBehaviorTargets.has(gate)),
          `vendor-proof entry ${entry.id} must include vendor-effect or vendor-boundaries`
        );
      }
    }

    for (const fixture of entry.fixtures) {
      manifestFixtures.add(fixture);
      const fixturePath = pathInside(roots.toolRoot, fixture, "manifest fixture path");
      assert(
        fs.existsSync(fixturePath) && fs.statSync(fixturePath).isFile(),
        `manifest fixture missing: ${fixture}`
      );

      if (gatedProofStatuses.has(entry.status)) {
        assert(
          !fixture.startsWith("fixtures/todo/"),
          `proof entry ${entry.id} must not point at todo fixture ${fixture}`
        );
      }

      if (fixture.startsWith("fixtures/todo/")) {
        assert(
          entry.status === "xfail" || entry.status === "todo",
          `todo fixture ${fixture} must belong to xfail or todo entry, not ${entry.status}`
        );
      }
    }
  }

  if (manifest.currentExperiment) {
    assert(
      manifest.currentExperiment.relatedEntries.length > 0,
      "currentExperiment must name related manifest entries"
    );
    for (const entryId of manifest.currentExperiment.relatedEntries) {
      assert(
        manifestEntryIds.has(entryId),
        `currentExperiment references unknown entry: ${entryId}`
      );
    }
  }

  const todoRoot = path.join(roots.toolRoot, "fixtures", "todo");
  for (const todoFile of walkFiles(todoRoot)) {
    const relativeTodoFile = path.relative(roots.toolRoot, todoFile).split(path.sep).join("/");
    assert(
      manifestFixtures.has(relativeTodoFile),
      `todo fixture missing manifest entry: ${relativeTodoFile}`
    );
  }
}

/**
 * Decodes and validates an evidence manifest before tests or report rendering
 * can treat its entries as accounts of the lab's named behavior gates.
 */
export function parseAndValidateManifest(
  contents: string,
  roots: ManifestValidationRoots
): Manifest {
  const manifest = parseManifestJson(contents);
  validateManifest(manifest, roots);
  return manifest;
}

function readManifest(roots: ManifestValidationRoots): Manifest {
  const manifestPath = path.join(roots.toolRoot, "evidence", "proof-manifest.json");
  return parseAndValidateManifest(fs.readFileSync(manifestPath, "utf8"), roots);
}

/**
 * Renders the validated evidence inventory without changing its established
 * operator-facing grouping or proof-status vocabulary.
 */
export function renderReport(manifest: Manifest): string {
  const byStatus = new Map<ManifestStatus, ManifestEntry[]>(
    MANIFEST_STATUSES.map((status) => [status, []])
  );
  for (const entry of manifest.entries) {
    byStatus.get(entry.status)?.push(entry);
  }

  const lines = [
    "runtime-realization-type-env report",
    `spec: ${manifest.spec.path}`,
    `spec sha256: ${manifest.spec.sha256}`,
  ];

  if (manifest.currentExperiment) {
    lines.push(
      "",
      `current experiment: ${manifest.currentExperiment.id}`,
      `focus: ${manifest.currentExperiment.focus}`,
      `related entries: ${manifest.currentExperiment.relatedEntries.join(", ")}`
    );
  }

  lines.push("");
  for (const [status, entries] of byStatus) {
    lines.push(`${status}: ${entries.length}`);
    for (const entry of entries) {
      lines.push(`  - ${entry.id}`, `    oracle: ${entry.oracle}`);
      if (entry.gates?.length) {
        lines.push(`    gates: ${entry.gates.join(", ")}`);
      }
    }
  }

  lines.push(
    "",
    "green gate means proof, vendor-proof, and simulation-proof entries passed their named gates while open entries stayed fenced.",
    "xfail means architecture unresolved, not necessarily TypeScript failure."
  );
  return lines.join("\n");
}

if (import.meta.main) {
  console.log(renderReport(readManifest({ repoRoot, toolRoot })));
}

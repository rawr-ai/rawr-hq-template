import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { Value } from "typebox/value";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const EXEMPT_PROJECT_KINDS = new Set(["type:content", "type:fixture"]);

const TargetDependencySchema = Type.Union([
  Type.String(),
  Type.Object(
    {
      target: Type.String(),
      projects: Type.Optional(Type.Array(Type.String())),
    },
    { additionalProperties: true }
  ),
]);

const ProjectTargetSchema = Type.Object(
  {
    dependsOn: Type.Optional(Type.Array(TargetDependencySchema)),
  },
  { additionalProperties: true }
);

const ProjectNodeSchema = Type.Object(
  {
    data: Type.Object(
      {
        root: Type.String(),
        tags: Type.Optional(Type.Array(Type.String())),
        targets: Type.Record(Type.String(), ProjectTargetSchema),
      },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

/**
 * Defines the Nx graph facts consumed by Habitat project admission.
 *
 * Nx remains graph authority; this schema only closes the observation boundary
 * before the rule evaluates project kind, foundational quality targets, and
 * the single workspace lint owner.
 */
export const QualityTargetGraphSchema = Type.Object(
  {
    graph: Type.Object(
      { nodes: Type.Record(Type.String(), ProjectNodeSchema) },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

/**
 * Rejects any non-root Nx project outside the repository quality contract.
 *
 * Habitat owns this admission rule. Code projects require `check` and
 * `typecheck`; explicitly classified content and fixture projects require
 * `check`. Every resolved check must retain the shared `habitat:lint`
 * dependency, while code-project checks must also retain `typecheck`. The
 * resolved graph may contain only `habitat:lint`.
 *
 * @param {unknown} value Resolved Nx project-graph output.
 */
export function assertQualityTargetAdmission(value) {
  if (!Value.Check(QualityTargetGraphSchema, value)) {
    const [issue] = Value.Errors(QualityTargetGraphSchema, value);
    throw new Error(`Nx project graph is invalid: ${issue?.message ?? "schema mismatch"}`);
  }

  const violations = [];
  const lintOwners = Object.entries(value.graph.nodes)
    .filter(([, node]) => "lint" in node.data.targets)
    .map(([name, node]) => `${name} (${node.data.root})`)
    .sort();
  if (lintOwners.length !== 1 || lintOwners[0] !== "habitat (scripts/habitat)") {
    violations.push(
      `resolved lint ownership must be exactly habitat (scripts/habitat); found ${lintOwners.length === 0 ? "none" : lintOwners.join(", ")}`
    );
  }

  for (const [name, node] of Object.entries(value.graph.nodes)) {
    if (node.data.root === ".") {
      continue;
    }

    const projectKinds = (node.data.tags ?? []).filter((tag) => tag.startsWith("type:"));
    if (projectKinds.length !== 1) {
      const found = projectKinds.length === 0 ? "none" : projectKinds.sort().join(", ");
      violations.push(
        `${name} (${node.data.root}) must declare exactly one type:* project kind; found ${found}`
      );
      continue;
    }
    const requiredTargets = EXEMPT_PROJECT_KINDS.has(projectKinds[0])
      ? ["check"]
      : ["check", "typecheck"];
    const missing = requiredTargets.filter((target) => !(target in node.data.targets));
    if (missing.length > 0) {
      violations.push(`${name} (${node.data.root}) is missing ${missing.join(", ")}`);
    }

    const checkTarget = node.data.targets.check;
    if (checkTarget !== undefined) {
      const dependencies = checkTarget.dependsOn ?? [];
      const lintDependencyCount = dependencies.filter(
        (dependency) =>
          typeof dependency === "object" &&
          dependency.target === "lint" &&
          dependency.projects?.length === 1 &&
          dependency.projects[0] === "habitat"
      ).length;
      if (lintDependencyCount !== 1) {
        violations.push(
          `${name} (${node.data.root}) check must depend exactly once on habitat:lint; found ${lintDependencyCount}`
        );
      }

      if (!EXEMPT_PROJECT_KINDS.has(projectKinds[0])) {
        const typecheckDependencyCount = dependencies.filter(
          (dependency) => dependency === "typecheck"
        ).length;
        if (typecheckDependencyCount !== 1) {
          violations.push(
            `${name} (${node.data.root}) check must depend exactly once on typecheck; found ${typecheckDependencyCount}`
          );
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `QUALITY_TARGET_ADMISSION_FAILED\n${violations.sort().join("\n")}\n` +
        "Declare exactly one project kind and a check target; retain the shared Habitat lint edge, retain typecheck for code projects, and let only Habitat own lint."
    );
  }
}

function readProjectGraph() {
  const result = spawnSync(process.execPath, ["x", "nx", "graph", "--file=stdout"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Nx project graph exited ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

if (import.meta.main) {
  try {
    assertQualityTargetAdmission(readProjectGraph());
    console.log(
      "quality target admission: every non-root project has one kind and check, every check retains Habitat lint, every code check retains typecheck, and Habitat solely owns lint"
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { Value } from "typebox/value";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EXEMPT_PROJECT_KINDS = new Set(["type:content", "type:fixture"]);

const ProjectNodeSchema = Type.Object(
  {
    data: Type.Object(
      {
        root: Type.String(),
        tags: Type.Optional(Type.Array(Type.String())),
        targets: Type.Record(Type.String(), Type.Unknown()),
      },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

export const QualityTargetGraphSchema = Type.Object(
  {
    graph: Type.Object(
      { nodes: Type.Record(Type.String(), ProjectNodeSchema) },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

/** @param {unknown} value */
export function assertQualityTargetAdmission(value) {
  if (!Value.Check(QualityTargetGraphSchema, value)) {
    const [issue] = Value.Errors(QualityTargetGraphSchema, value);
    throw new Error(`Nx project graph is invalid at ${issue?.instancePath || "(root)"}`);
  }

  const violations = [];
  for (const [name, node] of Object.entries(value.graph.nodes)) {
    if (node.data.root === ".") continue;

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
      : ["check", "lint", "typecheck"];
    const missing = requiredTargets.filter((target) => !(target in node.data.targets));
    if (missing.length > 0) {
      violations.push(`${name} (${node.data.root}) is missing ${missing.join(", ")}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `QUALITY_TARGET_ADMISSION_FAILED\n${violations.sort().join("\n")}\n` +
        "Declare exactly one project kind and a check target; code projects also require lint and typecheck."
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
      "quality target admission: all projects have one kind and check; all code projects own lint and typecheck"
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

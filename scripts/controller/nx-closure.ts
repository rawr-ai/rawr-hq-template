import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, posix, relative, resolve, sep } from "node:path";

export type ControllerNxProject = Readonly<{
  name: string;
  root: string;
}>;

type NxGraphNode = Readonly<{
  name?: unknown;
  data?: Readonly<{ root?: unknown }>;
}>;

type NxGraphDependency = Readonly<{
  target?: unknown;
}>;

const PROTECTED_PROJECT_ROOTS = [
  /^plugins\/agents(?:\/|$)/,
  /^tools\/[^/]*-skill-quality(?:\/|$)/,
  /(?:^|\/)research-vault(?:\/|$)/,
];

function parseGraph(value: unknown): {
  nodes: Record<string, NxGraphNode>;
  dependencies: Record<string, readonly NxGraphDependency[]>;
} {
  if (value === null || typeof value !== "object" || !("graph" in value)) {
    throw new Error("Nx project graph is missing graph data");
  }
  const graph = value.graph;
  if (
    graph === null ||
    typeof graph !== "object" ||
    !("nodes" in graph) ||
    graph.nodes === null ||
    typeof graph.nodes !== "object" ||
    !("dependencies" in graph) ||
    graph.dependencies === null ||
    typeof graph.dependencies !== "object"
  ) {
    throw new Error("Nx project graph has an invalid shape");
  }
  return {
    nodes: graph.nodes as Record<string, NxGraphNode>,
    dependencies: graph.dependencies as Record<string, readonly NxGraphDependency[]>,
  };
}

export function resolveControllerNxClosure(options: {
  graph: unknown;
  rootProjectNames: readonly string[];
  forbiddenProjectNames?: readonly string[];
}): readonly ControllerNxProject[] {
  if (options.rootProjectNames.length === 0) {
    throw new Error("controller Nx closure requires at least one explicit root project");
  }
  const graph = parseGraph(options.graph);
  const forbidden = new Set(options.forbiddenProjectNames ?? ["@rawr/plugin-hello"]);
  const pending = [...new Set(options.rootProjectNames)];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const projectName = pending.shift();
    if (projectName === undefined || visited.has(projectName)) {
      continue;
    }
    if (forbidden.has(projectName)) {
      throw new Error(`external fixture cannot enter the controller Nx closure: ${projectName}`);
    }
    const node = graph.nodes[projectName];
    if (node === undefined) {
      throw new Error(`controller Nx root or dependency is absent from the graph: ${projectName}`);
    }
    visited.add(projectName);
    const dependencies = graph.dependencies[projectName] ?? [];
    for (const dependency of dependencies) {
      if (typeof dependency.target !== "string") {
        throw new Error(`controller Nx dependency has no target: ${projectName}`);
      }
      pending.push(dependency.target);
    }
  }

  const projects = [...visited].map((projectName) => {
    const root = graph.nodes[projectName]?.data?.root;
    if (
      typeof root !== "string" ||
      root.length === 0 ||
      root.includes("\\") ||
      root.includes("\0") ||
      root.endsWith("/") ||
      posix.isAbsolute(root) ||
      posix.normalize(root) !== root ||
      root === "." ||
      root === ".." ||
      root.startsWith("../")
    ) {
      throw new Error(`controller Nx project has an invalid root: ${projectName}`);
    }
    if (PROTECTED_PROJECT_ROOTS.some((pattern) => pattern.test(root))) {
      throw new Error(
        `protected project cannot enter the controller Nx closure: ${projectName}:${root}`
      );
    }
    return Object.freeze({ name: projectName, root });
  });
  projects.sort((left, right) => left.name.localeCompare(right.name));
  return Object.freeze(projects);
}

export async function assertCanonicalControllerNxProjectRoots(options: {
  workspaceRoot: string;
  projects: readonly ControllerNxProject[];
}): Promise<void> {
  const workspaceRoot = await realpath(options.workspaceRoot);
  for (const project of options.projects) {
    const lexicalRoot = resolve(workspaceRoot, project.root);
    if (!isContained(workspaceRoot, lexicalRoot)) {
      throw new Error(
        `controller Nx project root escapes workspace: ${project.name}:${project.root}`
      );
    }
    const status = await lstat(lexicalRoot);
    const canonicalRoot = await realpath(lexicalRoot);
    if (!status.isDirectory() || canonicalRoot !== lexicalRoot) {
      throw new Error(`controller Nx project root is an alias: ${project.name}:${project.root}`);
    }
    const canonicalRelative = relative(workspaceRoot, canonicalRoot).split(sep).join("/");
    if (
      !canonicalRelative ||
      PROTECTED_PROJECT_ROOTS.some((pattern) => pattern.test(canonicalRelative))
    ) {
      throw new Error(
        `protected or invalid project cannot enter the controller Nx closure: ${project.name}:${canonicalRelative}`
      );
    }
  }
}

function isContained(root: string, candidate: string): boolean {
  const offset = relative(root, candidate);
  return offset !== "" && offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset);
}

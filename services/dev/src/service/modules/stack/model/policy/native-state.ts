import type { GraphiteStack } from "../dto";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Selects only native current/downstack ancestry, refusing ambiguous selected identities. */
export function selectedStack(output: string, branch: string): GraphiteStack | undefined {
  let state: unknown;
  try {
    state = JSON.parse(output);
  } catch {
    return undefined;
  }
  if (!record(state)) return undefined;
  const branches: GraphiteStack["branches"] = [];
  const visited = new Set<string>();
  let current = branch;
  while (!visited.has(current)) {
    visited.add(current);
    if (!Object.hasOwn(state, current)) return undefined;
    const node = state[current];
    if (!record(node)) return undefined;
    if (node.trunk === true) return { trunk: current, branches };
    if (
      node.trunk !== false ||
      typeof node.needs_restack !== "boolean" ||
      !Array.isArray(node.parents) ||
      node.parents.length !== 1
    )
      return undefined;
    const parent: unknown = node.parents[0];
    if (
      !record(parent) ||
      typeof parent.ref !== "string" ||
      parent.ref.length === 0 ||
      typeof parent.sha !== "string" ||
      parent.sha.length === 0
    )
      return undefined;
    branches.push({ branch: current, parent: parent.ref, needsRestack: node.needs_restack });
    current = parent.ref;
  }
  return undefined;
}

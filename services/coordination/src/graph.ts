import type { CoordinationWorkflowV1, DeskDefinitionV1 } from "./types";

export function deskMap(workflow: CoordinationWorkflowV1): Map<string, DeskDefinitionV1> {
  return new Map(workflow.desks.map((desk) => [desk.deskId, desk]));
}

export function outgoingAdjacency(workflow: CoordinationWorkflowV1): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const desk of workflow.desks) out.set(desk.deskId, []);
  for (const handoff of workflow.handoffs) {
    const next = out.get(handoff.fromDeskId);
    if (next) next.push(handoff.toDeskId);
  }
  return out;
}

export function incomingAdjacency(workflow: CoordinationWorkflowV1): Map<string, string[]> {
  const incoming = new Map<string, string[]>();
  for (const desk of workflow.desks) incoming.set(desk.deskId, []);
  for (const handoff of workflow.handoffs) {
    const prev = incoming.get(handoff.toDeskId);
    if (prev) prev.push(handoff.fromDeskId);
  }
  return incoming;
}

export function reachableFromEntry(workflow: CoordinationWorkflowV1): Set<string> {
  const out = outgoingAdjacency(workflow);
  const seen = new Set<string>();
  const queue: string[] = [workflow.entryDeskId];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);

    const neighbors = out.get(current) ?? [];
    for (const next of neighbors) {
      if (!seen.has(next)) queue.push(next);
    }
  }

  return seen;
}

export function hasCycle(workflow: CoordinationWorkflowV1): boolean {
  const out = outgoingAdjacency(workflow);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const next of out.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const desk of workflow.desks) {
    if (dfs(desk.deskId)) return true;
  }
  return false;
}

export function topologicalDeskOrder(workflow: CoordinationWorkflowV1): string[] {
  const out = outgoingAdjacency(workflow);
  const inDeg = new Map<string, number>();
  for (const desk of workflow.desks) inDeg.set(desk.deskId, 0);
  for (const handoff of workflow.handoffs) {
    inDeg.set(handoff.toDeskId, (inDeg.get(handoff.toDeskId) ?? 0) + 1);
  }

  const queue = Array.from(inDeg.entries())
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    order.push(current);

    for (const next of out.get(current) ?? []) {
      const deg = (inDeg.get(next) ?? 0) - 1;
      inDeg.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (order.length !== workflow.desks.length) {
    throw new Error("Cannot produce topological order for cyclic workflow");
  }

  return order;
}

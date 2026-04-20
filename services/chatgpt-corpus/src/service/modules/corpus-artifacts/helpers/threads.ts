import type { JsonConversationSourceRecord } from "../../source-materials/entities";
import type { Anomaly, FamilyGraph, IntermediateGraph, NormalizedThread, Relationship } from "../entities";
import { filename, filenameStem, slugify } from "./names";

export function buildUnifiedThread(
  family: FamilyGraph,
  jsonRecordsById: Map<string, JsonConversationSourceRecord>,
  anomalies: Anomaly[],
): NormalizedThread {
  const sourceLookup = new Map(family.member_source_ids.map((sourceId) => [sourceId, jsonRecordsById.get(sourceId)!]));
  const edgesBySourceId = new Map(
    family.edges.filter((edge) => edge.type !== "duplicate_of").map((edge) => [edge.from_source_id, edge]),
  );
  const duplicateEdgesBySourceId = new Map(
    family.edges.filter((edge) => edge.type === "duplicate_of").map((edge) => [edge.from_source_id, edge]),
  );

  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (sourceId: string) => {
    if (visited.has(sourceId)) return;
    const edge = edgesBySourceId.get(sourceId);
    if (edge) visit(edge.to_source_id);
    visited.add(sourceId);
    order.push(sourceId);
  };

  for (const sourceId of family.member_source_ids) {
    if (!duplicateEdgesBySourceId.has(sourceId)) visit(sourceId);
  }

  const nodes: Array<NormalizedThread["nodes"][number]> = [];
  const graphEdges: Array<NormalizedThread["edges"][number]> = [];
  const branches: Array<NormalizedThread["branches"][number]> = [];
  const branchPoints: Array<NormalizedThread["branch_points"][number]> = [];
  const representativeNodeId = new Map<string, string>();
  const sourcePathNodes = new Map<string, string[]>();
  const messageKey = (sourceId: string, index: number) => `${sourceId}:${index}`;

  const addMessageNodes = (
    record: JsonConversationSourceRecord,
    divergenceIndex: number,
    parentSourceId?: string,
    branchPointId?: string,
  ) => {
    const branchNodes: string[] = [];
    for (const [index, message] of record.messages.entries()) {
      if (parentSourceId && index < divergenceIndex) {
        const inheritedNodeId = representativeNodeId.get(messageKey(parentSourceId, index))!;
        representativeNodeId.set(messageKey(record.sourceId, index), inheritedNodeId);
        branchNodes.push(inheritedNodeId);
        continue;
      }
      const nodeId = `${family.family_id}__msg__${slugify(filenameStem(record.relativePath))}__${String(index).padStart(3, "0")}`;
      representativeNodeId.set(messageKey(record.sourceId, index), nodeId);
      branchNodes.push(nodeId);
      nodes.push({
        node_id: nodeId,
        type: "message",
        role: message.role,
        say: message.say,
        source_file_id: record.sourceId,
        source_message_index: index,
        source_title: record.title,
        source_link: record.link ?? null,
      });
      if (parentSourceId && index === divergenceIndex && branchPointId) {
        graphEdges.push({
          from_node_id: branchPointId,
          to_node_id: nodeId,
          type: "starts_branch_path",
        });
      } else if (index > 0) {
        const previousNodeId = representativeNodeId.get(messageKey(record.sourceId, index - 1));
        if (previousNodeId && previousNodeId !== nodeId) {
          graphEdges.push({
            from_node_id: previousNodeId,
            to_node_id: nodeId,
            type: "next_message",
          });
        }
      }
    }
    sourcePathNodes.set(record.sourceId, branchNodes);
    const uniqueNodes = branchNodes.filter((nodeId, index) => index === 0 || nodeId !== branchNodes[index - 1]);
    return {
      startNodeId: uniqueNodes[0],
      endNodeId: uniqueNodes.at(-1),
    };
  };

  const rootRecord = sourceLookup.get(family.root_source_id)!;
  const rootNodes = addMessageNodes(rootRecord, 0);
  branches.push({
    branch_id: `${family.family_id}__branch__${slugify(filenameStem(rootRecord.relativePath))}`,
    parent_branch_point_id: null,
    semantic_name: slugify(filenameStem(rootRecord.relativePath)),
    status: family.classification[rootRecord.sourceId],
    source_file_ids: [rootRecord.sourceId],
    start_node_id: rootNodes.startNodeId ?? null,
    end_node_id: rootNodes.endNodeId ?? null,
    confidence: 1,
    rationale: "Selected as the earliest or shallowest representative conversation in the family.",
  });

  for (const sourceId of order) {
    if (sourceId === family.root_source_id) continue;
    const record = sourceLookup.get(sourceId)!;
    const edge = edgesBySourceId.get(sourceId)!;
    const divergenceIndex = edge.shared_prefix_len;
    const anchorNodeId = divergenceIndex > 0
      ? representativeNodeId.get(messageKey(edge.to_source_id, divergenceIndex - 1))
      : undefined;
    const branchPointId = `${family.family_id}__branch-point__${slugify(filenameStem(record.relativePath))}`;
    branchPoints.push({
      branch_point_id: branchPointId,
      parent_source_id: edge.to_source_id,
      child_source_id: sourceId,
      shared_prefix_len: divergenceIndex,
      anchor_node_id: anchorNodeId ?? null,
      evidence: edge.evidence,
      confidence: edge.confidence,
    });
    nodes.push({
      node_id: branchPointId,
      type: "branch_point",
      parent_source_id: edge.to_source_id,
      child_source_id: sourceId,
      shared_prefix_len: divergenceIndex,
      anchor_node_id: anchorNodeId ?? null,
      evidence: edge.evidence,
      confidence: edge.confidence,
    });
    if (anchorNodeId) {
      graphEdges.push({
        from_node_id: anchorNodeId,
        to_node_id: branchPointId,
        type: "branches_at",
      });
    }
    const childNodes = addMessageNodes(record, divergenceIndex, edge.to_source_id, branchPointId);
    branches.push({
      branch_id: `${family.family_id}__branch__${slugify(filenameStem(record.relativePath))}`,
      parent_branch_point_id: branchPointId,
      semantic_name: slugify(filenameStem(record.relativePath)),
      status: family.classification[sourceId],
      source_file_ids: [sourceId],
      start_node_id: childNodes.startNodeId ?? null,
      end_node_id: childNodes.endNodeId ?? null,
      confidence: edge.confidence,
      rationale: "Grouped into this family by shared title or shared opening conversation trunk.",
    });
  }

  for (const [sourceId, edge] of duplicateEdgesBySourceId.entries()) {
    const record = sourceLookup.get(sourceId)!;
    const canonicalPathNodes = sourcePathNodes.get(edge.to_source_id) ?? [];
    sourcePathNodes.set(sourceId, [...canonicalPathNodes]);
    branches.push({
      branch_id: `${family.family_id}__branch__${slugify(filenameStem(record.relativePath))}`,
      parent_branch_point_id: null,
      semantic_name: slugify(filenameStem(record.relativePath)),
      status: family.classification[sourceId],
      source_file_ids: [sourceId],
      start_node_id: canonicalPathNodes[0] ?? null,
      end_node_id: canonicalPathNodes.at(-1) ?? null,
      confidence: 1,
      rationale: "Marked duplicate because the message payload matches another export exactly.",
    });
  }

  const defaultReadingOrder: string[] = [];
  const seenNodeIds = new Set<string>();
  for (const sourceId of order) {
    for (const nodeId of sourcePathNodes.get(sourceId) ?? []) {
      if (seenNodeIds.has(nodeId)) continue;
      seenNodeIds.add(nodeId);
      defaultReadingOrder.push(nodeId);
    }
  }

  const familyAnomalies = anomalies.filter((anomaly) =>
    anomaly.source_ids.some((sourceId) => family.member_source_ids.includes(sourceId)),
  );

  return {
    schema_version: "rawr.conversation-thread.v1",
    thread_id: family.family_id,
    canonical_title: family.canonical_title,
    root_source_ids: [family.root_source_id],
    source_files: [...sourceLookup.values()].map((record) => ({
      source_id: record.sourceId,
      filename: filename(record.relativePath),
      path: record.relativePath,
      title: record.title,
      classification: family.classification[record.sourceId],
      link: record.link ?? null,
      message_count: record.messages.length,
    })),
    source_links: [...new Set(
      [...sourceLookup.values()]
        .map((record) => record.link)
        .filter((link): link is string => typeof link === "string" && link.length > 0),
    )].sort(),
    summary: family.summary,
    nodes,
    edges: graphEdges,
    branch_points: branchPoints,
    branches,
    views: {
      default_reading_order: defaultReadingOrder,
      root_path_order: sourcePathNodes.get(family.root_source_id) ?? [],
      branch_orders: Object.fromEntries(
        branches
          .filter((branch) => branch.source_file_ids.length > 0)
          .map((branch) => [branch.branch_id, sourcePathNodes.get(branch.source_file_ids[0]!) ?? []]),
      ),
    },
    anomalies: familyAnomalies,
  };
}

export function buildIntermediateGraph(
  normalizedThreads: NormalizedThread[],
  relationships: Relationship[],
): IntermediateGraph {
  const nodes = normalizedThreads.flatMap((thread) =>
    thread.nodes.map((node) => ({
      thread_id: thread.thread_id,
      ...node,
    })),
  );
  const edges = normalizedThreads.flatMap((thread) =>
    thread.edges.map((edge) => ({
      thread_id: thread.thread_id,
      ...edge,
    })),
  );
  return {
    schema_version: "rawr.conversation-intermediate-graph.v1",
    generated_at: new Date().toISOString(),
    nodes,
    edges,
    relationships,
  };
}

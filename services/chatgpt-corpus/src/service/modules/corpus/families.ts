import path from "node:path";
import type {
  Anomaly,
  FamilyEdge,
  FamilyGraph,
  JsonConversationMessage,
  NormalizedThread,
  Relationship,
  SourceRecord,
} from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function parseDate(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const normalized = value.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function normalizeMessageText(text: string): string {
  return text
    .replace(/Thought for \d+[smh](?: \d+[smh])?/g, " ")
    .replace(/Called tool/g, " ")
    .replace(/Received app response/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sharedPrefix(
  left: JsonConversationMessage[],
  right: JsonConversationMessage[],
  fuzzy = false,
): number {
  let count = 0;
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftMessage = left[index]!;
    const rightMessage = right[index]!;
    const same = fuzzy
      ? leftMessage.role === rightMessage.role &&
        normalizeMessageText(leftMessage.say) === normalizeMessageText(rightMessage.say)
      : leftMessage.role === rightMessage.role && leftMessage.say === rightMessage.say;
    if (!same) break;
    count += 1;
  }
  return count;
}

function confidenceForEdge(input: {
  exactPrefixLen: number;
  fuzzyPrefixLen: number;
  childLen: number;
  parentLen: number;
  sameTitle: boolean;
  sameLink: boolean;
  sameFirstPrompt: boolean;
  exactDuplicate: boolean;
}): number {
  if (input.exactDuplicate) return 1;
  const ratio = input.exactPrefixLen / Math.max(1, Math.min(input.childLen, input.parentLen));
  let confidence = 0.4 + ratio * 0.35;
  if (input.fuzzyPrefixLen >= input.exactPrefixLen) confidence += 0.08;
  if (input.sameTitle) confidence += 0.1;
  if (input.sameLink) confidence += 0.1;
  if (input.sameFirstPrompt) confidence += 0.12;
  return Number(Math.min(0.99, confidence).toFixed(2));
}

export function buildFamilyGraphs(jsonRecords: SourceRecord[]): FamilyGraph[] {
  const pairMetrics = new Map<string, {
    exactPrefixLen: number;
    fuzzyPrefixLen: number;
    sameLink: boolean;
    sameNormalizedTitle: boolean;
    sameFirstPrompt: boolean;
    exactDuplicate: boolean;
  }>();
  const keyForPair = (leftName: string, rightName: string) => [leftName, rightName].sort().join("::");
  const namesToRecord = new Map(jsonRecords.map((record) => [path.basename(record.path), record]));

  for (const left of jsonRecords) {
    for (const right of jsonRecords) {
      const leftName = path.basename(left.path);
      const rightName = path.basename(right.path);
      if (leftName >= rightName) continue;
      const leftMessages = left.messages ?? [];
      const rightMessages = right.messages ?? [];
      const leftFirstPrompt = leftMessages.find((message) => message.role === "Prompt")?.say ?? "";
      const rightFirstPrompt = rightMessages.find((message) => message.role === "Prompt")?.say ?? "";
      pairMetrics.set(keyForPair(leftName, rightName), {
        exactPrefixLen: sharedPrefix(leftMessages, rightMessages),
        fuzzyPrefixLen: sharedPrefix(leftMessages, rightMessages, true),
        sameLink: Boolean(left.link && left.link === right.link),
        sameNormalizedTitle: left.normalizedTitle === right.normalizedTitle,
        sameFirstPrompt: Boolean(leftFirstPrompt && leftFirstPrompt === rightFirstPrompt),
        exactDuplicate: left.messagesHash === right.messagesHash,
      });
    }
  }

  const parent = new Map(jsonRecords.map((record) => [path.basename(record.path), path.basename(record.path)]));
  const find = (name: string): string => {
    const current = parent.get(name);
    if (!current || current === name) return name;
    const root = find(current);
    parent.set(name, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const [pairKey, metrics] of pairMetrics.entries()) {
    const [leftName, rightName] = pairKey.split("::");
    if (metrics.sameNormalizedTitle || (metrics.sameFirstPrompt && metrics.exactPrefixLen >= 4)) {
      union(leftName!, rightName!);
    }
  }

  const groups = new Map<string, string[]>();
  for (const name of parent.keys()) {
    const root = find(name);
    const bucket = groups.get(root) ?? [];
    bucket.push(name);
    groups.set(root, bucket);
  }

  const familyGraphs: FamilyGraph[] = [];
  const sortedGroups = [...groups.values()].sort((left, right) => left[0]!.localeCompare(right[0]!));
  for (const memberNames of sortedGroups) {
    const members = [...memberNames].sort((left, right) => left.localeCompare(right));
    const memberRecords = members.map((name) => namesToRecord.get(name)!).filter(Boolean);
    const rootRecord = [...memberRecords].sort((left, right) => {
      const leftTuple = [left.branchDepth, parseDate(left.created), left.messages?.length ?? 0, path.basename(left.path)];
      const rightTuple = [right.branchDepth, parseDate(right.created), right.messages?.length ?? 0, path.basename(right.path)];
      return String(leftTuple).localeCompare(String(rightTuple));
    })[0]!;

    const nonDuplicates: SourceRecord[] = [];
    const duplicates = new Map<string, string>();
    for (const record of [...memberRecords].sort((left, right) => {
      const leftTuple = [left.branchDepth, parseDate(left.created), left.messages?.length ?? 0, path.basename(left.path)];
      const rightTuple = [right.branchDepth, parseDate(right.created), right.messages?.length ?? 0, path.basename(right.path)];
      return String(leftTuple).localeCompare(String(rightTuple));
    })) {
      let duplicateTarget: SourceRecord | undefined;
      for (const existing of nonDuplicates) {
        const metrics = pairMetrics.get(keyForPair(path.basename(record.path), path.basename(existing.path)));
        if (metrics?.exactDuplicate) {
          duplicateTarget = existing;
          break;
        }
      }
      if (duplicateTarget) duplicates.set(path.basename(record.path), path.basename(duplicateTarget.path));
      else nonDuplicates.push(record);
    }

    const classification: Record<string, "standalone" | "root" | "branch" | "duplicate"> = {};
    const edges: FamilyEdge[] = [];
    if (nonDuplicates.length === 1 && duplicates.size === 0) {
      classification[nonDuplicates[0]!.sourceId] = "standalone";
    } else {
      classification[rootRecord.sourceId] = "root";
    }

    const placed: SourceRecord[] = [rootRecord];
    for (const record of nonDuplicates) {
      if (record.sourceId === rootRecord.sourceId) continue;
      let bestParent: SourceRecord | undefined;
      let bestMetrics:
        | {
            exactPrefixLen: number;
            fuzzyPrefixLen: number;
            sameLink: boolean;
            sameNormalizedTitle: boolean;
            sameFirstPrompt: boolean;
            exactDuplicate: boolean;
          }
        | undefined;
      let bestScore = -1;

      for (const candidate of placed) {
        const metrics = pairMetrics.get(keyForPair(path.basename(record.path), path.basename(candidate.path)));
        if (!metrics) continue;
        const score =
          metrics.exactPrefixLen * 100 +
          metrics.fuzzyPrefixLen * 10 +
          Number(metrics.sameLink) * 5 +
          Number(metrics.sameNormalizedTitle) * 3;
        if (score > bestScore) {
          bestScore = score;
          bestParent = candidate;
          bestMetrics = metrics;
        }
      }

      const fallbackParent = bestParent ?? rootRecord;
      const fallbackMetrics = bestMetrics ?? {
        exactPrefixLen: 0,
        fuzzyPrefixLen: 0,
        sameLink: false,
        sameNormalizedTitle: false,
        sameFirstPrompt: false,
        exactDuplicate: false,
      };

      placed.push(record);
      classification[record.sourceId] = "branch";
      edges.push({
        fromSourceId: record.sourceId,
        toSourceId: fallbackParent.sourceId,
        type: "branches_from",
        confidence: confidenceForEdge({
          exactPrefixLen: fallbackMetrics.exactPrefixLen,
          fuzzyPrefixLen: fallbackMetrics.fuzzyPrefixLen,
          childLen: record.messages?.length ?? 0,
          parentLen: fallbackParent.messages?.length ?? 0,
          sameTitle: fallbackMetrics.sameNormalizedTitle,
          sameLink: fallbackMetrics.sameLink,
          sameFirstPrompt: fallbackMetrics.sameFirstPrompt,
          exactDuplicate: fallbackMetrics.exactDuplicate,
        }),
        sharedPrefixLen: fallbackMetrics.exactPrefixLen,
        evidence: [
          `exact_shared_prefix_messages=${fallbackMetrics.exactPrefixLen}`,
          `fuzzy_shared_prefix_messages=${fallbackMetrics.fuzzyPrefixLen}`,
          ...(fallbackMetrics.sameNormalizedTitle ? [`normalized_title_match=${record.normalizedTitle}`] : []),
          ...(fallbackMetrics.sameFirstPrompt ? ["same_first_prompt=true"] : []),
          ...(fallbackMetrics.sameLink ? ["same_export_link=true"] : []),
        ],
      });
    }

    for (const [duplicateName, canonicalName] of duplicates.entries()) {
      const duplicateRecord = namesToRecord.get(duplicateName)!;
      classification[duplicateRecord.sourceId] = "duplicate";
      const metrics = pairMetrics.get(keyForPair(duplicateName, canonicalName))!;
      edges.push({
        fromSourceId: duplicateRecord.sourceId,
        toSourceId: namesToRecord.get(canonicalName)!.sourceId,
        type: "duplicate_of",
        confidence: 1,
        sharedPrefixLen: metrics.exactPrefixLen,
        evidence: ["exact_duplicate_messages=true"],
      });
    }

    familyGraphs.push({
      family_id: `family-${slugify(rootRecord.normalizedTitle ?? rootRecord.title)}`,
      canonical_title: rootRecord.normalizedTitle ?? rootRecord.title,
      summary: rootRecord.summary,
      member_source_ids: memberRecords.map((record) => record.sourceId),
      member_filenames: members,
      root_source_id: rootRecord.sourceId,
      classification,
      edges: edges.map((edge) => ({
        from_source_id: edge.fromSourceId,
        to_source_id: edge.toSourceId,
        type: edge.type,
        confidence: edge.confidence,
        shared_prefix_len: edge.sharedPrefixLen,
        evidence: edge.evidence,
      })),
    });
  }

  return familyGraphs;
}

export function buildRelationships(familyGraphs: FamilyGraph[]): Relationship[] {
  return familyGraphs.flatMap((family) =>
    family.edges.map((edge) => ({
      from_id: edge.from_source_id,
      to_id: edge.to_source_id,
      type: edge.type,
      confidence: edge.confidence,
      evidence: edge.evidence,
      notes: `Shared prefix length: ${edge.shared_prefix_len}`,
    })),
  );
}

export function buildUnifiedThread(
  family: FamilyGraph,
  jsonRecordsById: Map<string, SourceRecord>,
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

  const nodes: Array<Record<string, unknown>> = [];
  const graphEdges: Array<Record<string, unknown>> = [];
  const branches: Array<Record<string, unknown>> = [];
  const branchPoints: Array<Record<string, unknown>> = [];
  const representativeNodeId = new Map<string, string>();
  const sourcePathNodes = new Map<string, string[]>();
  const messageKey = (sourceId: string, index: number) => `${sourceId}:${index}`;

  const addMessageNodes = (
    record: SourceRecord,
    divergenceIndex: number,
    parentSourceId?: string,
    branchPointId?: string,
  ) => {
    const branchNodes: string[] = [];
    for (const [index, message] of (record.messages ?? []).entries()) {
      if (parentSourceId && index < divergenceIndex) {
        const inheritedNodeId = representativeNodeId.get(messageKey(parentSourceId, index))!;
        representativeNodeId.set(messageKey(record.sourceId, index), inheritedNodeId);
        branchNodes.push(inheritedNodeId);
        continue;
      }
      const nodeId = `${family.family_id}__msg__${slugify(path.parse(record.path).name)}__${String(index).padStart(3, "0")}`;
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
        source_link: record.link,
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
    branch_id: `${family.family_id}__branch__${slugify(path.parse(rootRecord.path).name)}`,
    parent_branch_point_id: null,
    semantic_name: slugify(path.parse(rootRecord.path).name),
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
    const branchPointId = `${family.family_id}__branch-point__${slugify(path.parse(record.path).name)}`;
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
      branch_id: `${family.family_id}__branch__${slugify(path.parse(record.path).name)}`,
      parent_branch_point_id: branchPointId,
      semantic_name: slugify(path.parse(record.path).name),
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
      branch_id: `${family.family_id}__branch__${slugify(path.parse(record.path).name)}`,
      parent_branch_point_id: null,
      semantic_name: slugify(path.parse(record.path).name),
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
      filename: path.basename(record.path),
      path: path.resolve(record.path),
      title: record.title,
      classification: family.classification[record.sourceId],
      link: record.link ?? null,
      message_count: record.messages?.length ?? 0,
    })),
    source_links: [...new Set([...sourceLookup.values()].map((record) => record.link).filter(Boolean))].sort(),
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
          .filter((branch) => Array.isArray(branch.source_file_ids) && branch.source_file_ids.length > 0)
          .map((branch) => {
            const sourceId = (branch.source_file_ids as string[])[0]!;
            return [branch.branch_id as string, sourcePathNodes.get(sourceId) ?? []];
          }),
      ),
    },
    anomalies: familyAnomalies,
  };
}

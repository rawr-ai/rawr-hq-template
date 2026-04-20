import type { JsonConversationSourceRecord } from "../../source-materials/entities";
import type { FamilyGraph, Relationship } from "../entities";
import { confidenceForEdge, sharedPrefix } from "./message-prefix";
import { filename, parseDate, slugify } from "./names";

type PairMetrics = {
  exactPrefixLen: number;
  fuzzyPrefixLen: number;
  sameLink: boolean;
  sameNormalizedTitle: boolean;
  sameFirstPrompt: boolean;
  exactDuplicate: boolean;
};

const keyForPair = (leftId: string, rightId: string) => [leftId, rightId].sort().join("::");

function sortedByRootPreference(records: JsonConversationSourceRecord[]): JsonConversationSourceRecord[] {
  return [...records].sort((left, right) => {
    const leftTuple = [left.branchDepth, parseDate(left.created), left.messages.length, left.relativePath];
    const rightTuple = [right.branchDepth, parseDate(right.created), right.messages.length, right.relativePath];
    return String(leftTuple).localeCompare(String(rightTuple));
  });
}

function buildPairMetrics(jsonRecords: JsonConversationSourceRecord[]): Map<string, PairMetrics> {
  const pairMetrics = new Map<string, PairMetrics>();

  for (const left of jsonRecords) {
    for (const right of jsonRecords) {
      if (left.sourceId >= right.sourceId) continue;
      const leftMessages = left.messages;
      const rightMessages = right.messages;
      const leftFirstPrompt = leftMessages.find((message) => message.role === "Prompt")?.say ?? "";
      const rightFirstPrompt = rightMessages.find((message) => message.role === "Prompt")?.say ?? "";
      pairMetrics.set(keyForPair(left.sourceId, right.sourceId), {
        exactPrefixLen: sharedPrefix(leftMessages, rightMessages),
        fuzzyPrefixLen: sharedPrefix(leftMessages, rightMessages, true),
        sameLink: Boolean(left.link && left.link === right.link),
        sameNormalizedTitle: left.normalizedTitle === right.normalizedTitle,
        sameFirstPrompt: Boolean(leftFirstPrompt && leftFirstPrompt === rightFirstPrompt),
        exactDuplicate: left.messagesHash === right.messagesHash,
      });
    }
  }

  return pairMetrics;
}

function groupRelatedSources(
  jsonRecords: JsonConversationSourceRecord[],
  pairMetrics: Map<string, PairMetrics>,
): string[][] {
  const parent = new Map(jsonRecords.map((record) => [record.sourceId, record.sourceId]));
  const find = (sourceId: string): string => {
    const current = parent.get(sourceId);
    if (!current || current === sourceId) return sourceId;
    const root = find(current);
    parent.set(sourceId, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const [pairKey, metrics] of pairMetrics.entries()) {
    const [leftSourceId, rightSourceId] = pairKey.split("::");
    if (metrics.sameNormalizedTitle || (metrics.sameFirstPrompt && metrics.exactPrefixLen >= 4)) {
      union(leftSourceId!, rightSourceId!);
    }
  }

  const groups = new Map<string, string[]>();
  for (const name of parent.keys()) {
    const root = find(name);
    const bucket = groups.get(root) ?? [];
    bucket.push(name);
    groups.set(root, bucket);
  }

  return [...groups.values()].sort((left, right) => left[0]!.localeCompare(right[0]!));
}

function splitDuplicates(
  memberRecords: JsonConversationSourceRecord[],
  pairMetrics: Map<string, PairMetrics>,
): {
  nonDuplicates: JsonConversationSourceRecord[];
  duplicates: Map<string, string>;
} {
  const nonDuplicates: JsonConversationSourceRecord[] = [];
  const duplicates = new Map<string, string>();

  for (const record of sortedByRootPreference(memberRecords)) {
    let duplicateTarget: JsonConversationSourceRecord | undefined;
    for (const existing of nonDuplicates) {
      const metrics = pairMetrics.get(keyForPair(record.sourceId, existing.sourceId));
      if (metrics?.exactDuplicate) {
        duplicateTarget = existing;
        break;
      }
    }
    if (duplicateTarget) duplicates.set(record.sourceId, duplicateTarget.sourceId);
    else nonDuplicates.push(record);
  }

  return { nonDuplicates, duplicates };
}

export function buildFamilyGraphs(jsonRecords: JsonConversationSourceRecord[]): FamilyGraph[] {
  const pairMetrics = buildPairMetrics(jsonRecords);
  const recordsById = new Map(jsonRecords.map((record) => [record.sourceId, record]));
  const sortedGroups = groupRelatedSources(jsonRecords, pairMetrics);
  const familyGraphs: FamilyGraph[] = [];

  for (const memberSourceIds of sortedGroups) {
    const memberRecords = [...memberSourceIds]
      .sort((left, right) => left.localeCompare(right))
      .map((sourceId) => recordsById.get(sourceId)!)
      .filter(Boolean);
    const rootRecord = sortedByRootPreference(memberRecords)[0]!;
    const { nonDuplicates, duplicates } = splitDuplicates(memberRecords, pairMetrics);
    const classification: Record<string, "standalone" | "root" | "branch" | "duplicate"> = {};
    const edges: Array<{
      fromSourceId: string;
      toSourceId: string;
      type: "branches_from" | "duplicate_of";
      confidence: number;
      sharedPrefixLen: number;
      evidence: string[];
    }> = [];

    if (nonDuplicates.length === 1 && duplicates.size === 0) {
      classification[nonDuplicates[0]!.sourceId] = "standalone";
    } else {
      classification[rootRecord.sourceId] = "root";
    }

    const placed: JsonConversationSourceRecord[] = [rootRecord];
    for (const record of nonDuplicates) {
      if (record.sourceId === rootRecord.sourceId) continue;
      let bestParent: JsonConversationSourceRecord | undefined;
      let bestMetrics: PairMetrics | undefined;
      let bestScore = -1;

      for (const candidate of placed) {
        const metrics = pairMetrics.get(keyForPair(record.sourceId, candidate.sourceId));
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
          childLen: record.messages.length,
          parentLen: fallbackParent.messages.length,
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

    for (const [duplicateSourceId, canonicalSourceId] of duplicates.entries()) {
      const duplicateRecord = recordsById.get(duplicateSourceId)!;
      classification[duplicateRecord.sourceId] = "duplicate";
      const metrics = pairMetrics.get(keyForPair(duplicateSourceId, canonicalSourceId))!;
      edges.push({
        fromSourceId: duplicateRecord.sourceId,
        toSourceId: canonicalSourceId,
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
      member_filenames: memberRecords.map((record) => filename(record.relativePath)),
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

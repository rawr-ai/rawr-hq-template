import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CorpusWorkspaceError } from "./errors";
import {
  getWorkspacePaths,
  type CorpusWorkspacePaths,
  WORKSPACE_GITIGNORE,
  WORKSPACE_README,
} from "./workspace";

type SourceType = "json_conversation" | "markdown_document";
type FamilyClassification = "standalone" | "root" | "branch" | "duplicate";

type JsonConversationMessage = {
  role: string;
  say: string;
};

type SourceRecord = {
  sourceId: string;
  path: string;
  type: SourceType;
  hash: string;
  sizeBytes: number;
  title: string;
  summary: string;
  created?: string;
  updated?: string;
  exported?: string;
  link?: string;
  messages?: JsonConversationMessage[];
  messagesHash?: string;
  normalizedTitle?: string;
  branchDepth: number;
  lineCount?: number;
  headings?: string[];
};

type FamilyEdge = {
  fromSourceId: string;
  toSourceId: string;
  type: "branches_from" | "duplicate_of";
  confidence: number;
  sharedPrefixLen: number;
  evidence: string[];
};

type FamilyGraph = {
  family_id: string;
  canonical_title: string;
  summary: string;
  member_source_ids: string[];
  member_filenames: string[];
  root_source_id: string;
  classification: Record<string, FamilyClassification>;
  edges: Array<{
    from_source_id: string;
    to_source_id: string;
    type: FamilyEdge["type"];
    confidence: number;
    shared_prefix_len: number;
    evidence: string[];
  }>;
};

type Relationship = {
  from_id: string;
  to_id: string;
  type: FamilyEdge["type"];
  confidence: number;
  evidence: string[];
  notes: string;
};

type Anomaly = {
  anomaly_id: string;
  type: string;
  source_ids: string[];
  severity: "high" | "medium" | "low";
  notes: string;
};

type NormalizedThread = Record<string, unknown>;

export type InitWorkspaceResult = {
  workspaceRoot: string;
  createdPaths: string[];
  existingPaths: string[];
  files: {
    readmePath: string;
    gitignorePath: string;
  };
};

export type ConsolidateWorkspaceResult = {
  workspaceRoot: string;
  sourceCounts: {
    jsonConversations: number;
    markdownDocuments: number;
    totalSources: number;
  };
  familyCount: number;
  normalizedThreadCount: number;
  anomalyCount: number;
  warnings: string[];
  outputPaths: {
    inventory: string;
    familyGraphs: string;
    intermediateGraph: string;
    manifest: string;
    reportsDir: string;
    normalizedThreadsDir: string;
    validationReport: string;
  };
};

type ConversationExport = {
  metadata?: {
    title?: string;
    link?: string;
    dates?: {
      created?: string;
      updated?: string;
      exported?: string;
    };
  };
  messages?: unknown;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function fileSha256(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

function shortSummary(text: string, limit = 180): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length <= limit ? collapsed : `${collapsed.slice(0, limit - 3)}...`;
}

function parseDate(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const normalized = value.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function branchDepthFromTitle(title: string): number {
  return (title.match(/Branch ·/g) ?? []).length;
}

function normalizeTitle(title: string): string {
  return title.replace(/^(Branch ·\s*)+/, "").trim();
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

function assertConversationMessageArray(value: unknown, sourcePath: string): JsonConversationMessage[] {
  if (!Array.isArray(value)) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_EXPORT",
      sourcePath,
      "`messages` must be an array",
    );
  }

  return value.map((message, index) => {
    if (!message || typeof message !== "object") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must be an object`,
      );
    }

    const role = (message as Record<string, unknown>).role;
    const say = (message as Record<string, unknown>).say;
    if (typeof role !== "string" || role.trim() === "") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must include a string role`,
      );
    }
    if (typeof say !== "string") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must include a string say payload`,
      );
    }

    return { role, say };
  });
}

async function readConversationExport(sourcePath: string): Promise<ConversationExport> {
  const raw = await fs.readFile(sourcePath, "utf8");
  try {
    return JSON.parse(raw) as ConversationExport;
  } catch (error) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_JSON",
      sourcePath,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function listFiles(dirPath: string, extension: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.join(dirPath, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

async function loadSources(paths: CorpusWorkspacePaths): Promise<SourceRecord[]> {
  const records: SourceRecord[] = [];
  const jsonPaths = await listFiles(paths.sourceJsonDir, ".json");
  const markdownPaths = await listFiles(paths.sourceDocsDir, ".md");

  for (const jsonPath of jsonPaths) {
    const parsed = await readConversationExport(jsonPath);
    const messages = assertConversationMessageArray(parsed.messages, jsonPath);
    const metadata = parsed.metadata ?? {};
    const title = typeof metadata.title === "string" && metadata.title.trim() !== ""
      ? metadata.title
      : path.parse(jsonPath).name;
    const firstPrompt = messages.find((message) => message.role === "Prompt")?.say ?? "";
    const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
    const dates = metadata.dates ?? {};
    records.push({
      sourceId: `src-json-${slugify(path.parse(jsonPath).name)}`,
      path: jsonPath,
      type: "json_conversation",
      hash: await fileSha256(jsonPath),
      sizeBytes: (await fs.stat(jsonPath)).size,
      title,
      summary: shortSummary(firstPrompt || lastResponse || title),
      created: typeof dates.created === "string" ? dates.created : undefined,
      updated: typeof dates.updated === "string" ? dates.updated : undefined,
      exported: typeof dates.exported === "string" ? dates.exported : undefined,
      link: typeof metadata.link === "string" ? metadata.link : undefined,
      messages,
      messagesHash: sha256Text(JSON.stringify(messages)),
      normalizedTitle: normalizeTitle(title),
      branchDepth: branchDepthFromTitle(title),
    });
  }

  for (const markdownPath of markdownPaths) {
    const text = await fs.readFile(markdownPath, "utf8");
    const lines = text.split(/\r?\n/);
    records.push({
      sourceId: `src-md-${slugify(path.parse(markdownPath).name)}`,
      path: markdownPath,
      type: "markdown_document",
      hash: await fileSha256(markdownPath),
      sizeBytes: (await fs.stat(markdownPath)).size,
      title: path.parse(markdownPath).name,
      summary: shortSummary(lines.slice(0, 10).map((line) => line.trim()).filter(Boolean).join(" ") || path.parse(markdownPath).name),
      lineCount: lines.length,
      headings: lines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "")).slice(0, 8),
      branchDepth: 0,
    });
  }

  return records;
}

function buildInventory(records: SourceRecord[]): Array<Record<string, unknown>> {
  return records.map((record) => {
    const base: Record<string, unknown> = {
      source_id: record.sourceId,
      type: record.type,
      path: path.resolve(record.path),
      filename: path.basename(record.path),
      hash_sha256: record.hash,
      size_bytes: record.sizeBytes,
      title: record.title,
      summary: record.summary,
    };

    if (record.type === "json_conversation") {
      return {
        ...base,
        normalized_title: record.normalizedTitle,
        branch_depth: record.branchDepth,
        message_count: record.messages?.length ?? 0,
        messages_hash: record.messagesHash,
        created: record.created,
        updated: record.updated,
        exported: record.exported,
        link: record.link,
        first_prompt: record.messages?.find((message) => message.role === "Prompt")?.say ?? "",
        last_response: [...(record.messages ?? [])].reverse().find((message) => message.role === "Response")?.say ?? "",
      };
    }

    return {
      ...base,
      line_count: record.lineCount,
      headings: record.headings ?? [],
    };
  });
}

function detectAnomalies(jsonRecords: SourceRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const byHash = new Map<string, SourceRecord[]>();
  const byMessagesHash = new Map<string, SourceRecord[]>();
  const byLink = new Map<string, SourceRecord[]>();

  for (const record of jsonRecords) {
    const hashBucket = byHash.get(record.hash) ?? [];
    hashBucket.push(record);
    byHash.set(record.hash, hashBucket);

    if (record.messagesHash) {
      const messageBucket = byMessagesHash.get(record.messagesHash) ?? [];
      messageBucket.push(record);
      byMessagesHash.set(record.messagesHash, messageBucket);
    }

    if (record.link) {
      const linkBucket = byLink.get(record.link) ?? [];
      linkBucket.push(record);
      byLink.set(record.link, linkBucket);
    }

    const messages = record.messages ?? [];
    if (messages.length === 0) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(path.parse(record.path).name)}-empty-conversation`,
        type: "empty_conversation",
        source_ids: [record.sourceId],
        severity: "high",
        notes: "Conversation export contains no messages.",
      });
      continue;
    }

    const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
    if (!lastResponse.trim()) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(path.parse(record.path).name)}-blank-final-response`,
        type: "blank_final_response",
        source_ids: [record.sourceId],
        severity: "medium",
        notes: "Final assistant response is blank in this export.",
      });
    }

    if (messages.some((message) => message.say.toLowerCase().includes("tokens truncated"))) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(path.parse(record.path).name)}-truncated-message`,
        type: "truncated_message",
        source_ids: [record.sourceId],
        severity: "medium",
        notes: "At least one message contains exporter truncation text.",
      });
    }
  }

  for (const [hashValue, members] of byHash.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-duplicate-hash-${hashValue.slice(0, 12)}`,
        type: "duplicate_hash",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Files share the same content hash.",
      });
    }
  }

  for (const [hashValue, members] of byMessagesHash.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-duplicate-messages-${hashValue.slice(0, 12)}`,
        type: "duplicate_messages",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Exports share identical message content even if metadata differs.",
      });
    }
  }

  for (const [linkValue, members] of byLink.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-same-link-${slugify(linkValue.split("/c/").at(-1) ?? linkValue)}`,
        type: "same_conversation_link",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Multiple exports share the same ChatGPT conversation link.",
      });
    }
  }

  return anomalies;
}

function buildFamilyGraphs(jsonRecords: SourceRecord[]): FamilyGraph[] {
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

    const classification: Record<string, FamilyClassification> = {};
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

function buildRelationships(familyGraphs: FamilyGraph[]): Relationship[] {
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

function buildUnifiedThread(
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

function buildIntermediateGraph(
  normalizedThreads: NormalizedThread[],
  relationships: Relationship[],
): Record<string, unknown> {
  const nodes = normalizedThreads.flatMap((thread) => {
    const threadId = String(thread.thread_id);
    return ((thread.nodes as Array<Record<string, unknown>>) ?? []).map((node) => ({
      thread_id: threadId,
      ...node,
    }));
  });
  const edges = normalizedThreads.flatMap((thread) => {
    const threadId = String(thread.thread_id);
    return ((thread.edges as Array<Record<string, unknown>>) ?? []).map((edge) => ({
      thread_id: threadId,
      ...edge,
    }));
  });
  return {
    schema_version: "rawr.conversation-intermediate-graph.v1",
    generated_at: new Date().toISOString(),
    nodes,
    edges,
    relationships,
  };
}

function buildManifest(input: {
  inventory: Array<Record<string, unknown>>;
  familyGraphs: FamilyGraph[];
  normalizedThreads: NormalizedThread[];
  relationships: Relationship[];
  anomalies: Anomaly[];
  paths: CorpusWorkspacePaths;
}): Record<string, unknown> {
  return {
    manifest_version: "rawr.conversation-corpus.v1",
    generated_at: new Date().toISOString(),
    workspace_root: input.paths.workspaceRoot,
    corpus_summary: {
      source_count: input.inventory.length,
      json_conversation_count: input.inventory.filter((item) => item.type === "json_conversation").length,
      markdown_document_count: input.inventory.filter((item) => item.type === "markdown_document").length,
      family_count: input.familyGraphs.length,
      normalized_thread_count: input.normalizedThreads.length,
      anomaly_count: input.anomalies.length,
    },
    source_items: input.inventory,
    thread_families: input.familyGraphs,
    normalized_threads: input.normalizedThreads.map((thread) => ({
      thread_id: thread.thread_id,
      canonical_title: thread.canonical_title,
      path: path.join(input.paths.normalizedDir, `${thread.thread_id}.json`),
      branch_count: Array.isArray(thread.branches) ? thread.branches.length : 0,
      anomaly_count: Array.isArray(thread.anomalies) ? thread.anomalies.length : 0,
    })),
    documents: input.inventory
      .filter((item) => item.type === "markdown_document")
      .map((item) => ({
        source_id: item.source_id,
        title: item.title,
        path: item.path,
        summary: item.summary,
      })),
    relationships: input.relationships,
    anomalies: input.anomalies,
  };
}

function buildAmbiguityFlags(
  familyGraphs: FamilyGraph[],
  relationships: Relationship[],
  markdownDocCount: number,
): Array<Record<string, unknown>> {
  const flags: Array<Record<string, unknown>> = [];
  for (const relationship of relationships) {
    if (relationship.confidence < 0.85) {
      flags.push({
        kind: "low_confidence_relationship",
        from_id: relationship.from_id,
        to_id: relationship.to_id,
        type: relationship.type,
        confidence: relationship.confidence,
        notes: relationship.notes,
      });
    }
  }

  for (const family of familyGraphs) {
    const branchCount = Object.values(family.classification).filter((classification) =>
      classification === "root" || classification === "branch" || classification === "standalone",
    ).length;
    const hasStrongEdge = family.edges.some((edge) => edge.type !== "duplicate_of" && edge.confidence >= 0.9);
    if (branchCount > 1 && !hasStrongEdge) {
      flags.push({
        kind: "weak_family_branching_signal",
        family_id: family.family_id,
        notes: "This family grouped multiple conversations without any high-confidence branch edge.",
      });
    }
  }

  if (markdownDocCount === 0) {
    flags.push({
      kind: "no_markdown_docs",
      notes: "No curated Markdown source docs were present under work/docs/source.",
    });
  }

  return flags;
}

function buildCanonicalitySummary(familyGraphs: FamilyGraph[]): string {
  const lines = ["# Canonicality Summary", "", "## Conversation Families", ""];
  if (familyGraphs.length === 0) {
    lines.push("- No conversation exports were found.");
    return lines.join("\n");
  }

  for (const family of familyGraphs) {
    const rootIndex = family.member_source_ids.indexOf(family.root_source_id);
    const rootFilename = rootIndex >= 0 ? family.member_filenames[rootIndex]! : family.member_filenames[0]!;
    const duplicateCount = Object.values(family.classification).filter((classification) => classification === "duplicate").length;
    lines.push(
      `- \`${family.canonical_title}\`: root \`${rootFilename}\`, ${family.member_source_ids.length} source files, ${duplicateCount} duplicates.`,
    );
  }

  return lines.join("\n");
}

function buildDecisionLog(): string {
  return `# Decision Log

## Confirmed defaults

- Raw conversation exports remain untouched in \`source-material/conversations/raw-json/\`.
- Optional Markdown source docs live under \`work/docs/source/\`.
- All derived artifacts are written under \`work/generated/\`.
- Conversation families are grouped by normalized title first, then by matching opening prompt plus shared prefix depth.
- Root conversations are selected by shallower branch depth, earlier creation date when available, then shorter message history.
- Exact message duplicates stay visible as duplicate branches instead of being silently discarded.
`;
}

function buildMentalMap(familyGraphs: FamilyGraph[], anomalies: Anomaly[]): string {
  const lines = ["# Mental Map", "", "## Families", ""];
  if (familyGraphs.length === 0) {
    lines.push("- No conversation exports were found.");
  } else {
    for (const family of familyGraphs) {
      lines.push(`- \`${family.family_id}\`: ${family.summary}`);
    }
  }

  lines.push("", "## Anomalies", "");
  if (anomalies.length === 0) {
    lines.push("- No anomalies detected.");
  } else {
    for (const anomaly of anomalies) {
      lines.push(`- \`${anomaly.type}\` on ${anomaly.source_ids.join(", ")}`);
    }
  }

  return lines.join("\n");
}

function buildValidationReport(input: {
  inventory: Array<Record<string, unknown>>;
  familyGraphs: FamilyGraph[];
  normalizedThreads: NormalizedThread[];
  manifest: Record<string, unknown>;
}): Record<string, boolean> {
  const jsonSourceIds = new Set(
    input.inventory
      .filter((item) => item.type === "json_conversation")
      .map((item) => String(item.source_id)),
  );
  const familySourceIds = new Set(input.familyGraphs.flatMap((family) => family.member_source_ids));
  const validation = {
    source_inventory_complete: jsonSourceIds.size + input.inventory.filter((item) => item.type === "markdown_document").length === input.inventory.length,
    every_json_in_one_family: jsonSourceIds.size === familySourceIds.size &&
      [...jsonSourceIds].every((sourceId) => familySourceIds.has(sourceId)),
    one_normalized_thread_per_family: input.normalizedThreads.length === input.familyGraphs.length,
    manifest_has_workspace_root: Boolean(input.manifest.workspace_root),
  };
  return {
    ...validation,
    all_passed: Object.values(validation).every(Boolean),
  };
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeMarkdown(filePath: string, text: string): Promise<void> {
  await fs.writeFile(filePath, `${text.trimEnd()}\n`, "utf8");
}

export async function initCorpusWorkspace(workspaceRoot: string): Promise<InitWorkspaceResult> {
  const paths = getWorkspacePaths(workspaceRoot);
  const createdPaths: string[] = [];
  const existingPaths: string[] = [];

  const ensureDir = async (dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: false });
      createdPaths.push(dirPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        await fs.mkdir(dirPath, { recursive: true });
        createdPaths.push(dirPath);
        return;
      }
      if (err.code === "EEXIST") {
        existingPaths.push(dirPath);
        return;
      }
      throw error;
    }
  };

  await ensureDir(paths.workspaceRoot);
  await ensureDir(paths.sourceJsonDir);
  await ensureDir(paths.sourceDocsDir);

  const writeFileIfChanged = async (filePath: string, contents: string) => {
    try {
      const existing = await fs.readFile(filePath, "utf8");
      if (existing === contents) {
        existingPaths.push(filePath);
        return;
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw error;
    }
    await fs.writeFile(filePath, contents, "utf8");
    createdPaths.push(filePath);
  };

  await writeFileIfChanged(paths.readmePath, `${WORKSPACE_README.trimEnd()}\n`);
  await writeFileIfChanged(paths.gitignorePath, `${WORKSPACE_GITIGNORE.trimEnd()}\n`);

  return {
    workspaceRoot: paths.workspaceRoot,
    createdPaths: [...new Set(createdPaths)],
    existingPaths: [...new Set(existingPaths)],
    files: {
      readmePath: paths.readmePath,
      gitignorePath: paths.gitignorePath,
    },
  };
}

export async function consolidateCorpusWorkspace(workspaceRoot: string): Promise<ConsolidateWorkspaceResult> {
  const paths = getWorkspacePaths(workspaceRoot);
  const records = await loadSources(paths);
  const jsonRecords = records.filter((record): record is SourceRecord & { type: "json_conversation"; messages: JsonConversationMessage[] } =>
    record.type === "json_conversation" && Array.isArray(record.messages),
  );
  const markdownDocCount = records.filter((record) => record.type === "markdown_document").length;
  const inventory = buildInventory(records);
  const anomalies = detectAnomalies(jsonRecords);
  const familyGraphs = buildFamilyGraphs(jsonRecords);
  const relationships = buildRelationships(familyGraphs);
  const jsonRecordsById = new Map(jsonRecords.map((record) => [record.sourceId, record]));
  const normalizedThreads = familyGraphs.map((family) => buildUnifiedThread(family, jsonRecordsById, anomalies));
  const intermediateGraph = buildIntermediateGraph(normalizedThreads, relationships);
  const manifest = buildManifest({
    inventory,
    familyGraphs,
    normalizedThreads,
    relationships,
    anomalies,
    paths,
  });
  const ambiguityFlags = buildAmbiguityFlags(familyGraphs, relationships, markdownDocCount);
  const validationReport = buildValidationReport({
    inventory,
    familyGraphs,
    normalizedThreads,
    manifest,
  });
  const warnings: string[] = [];
  if (jsonRecords.length === 0) warnings.push("No conversation exports were found under source-material/conversations/raw-json.");
  if (markdownDocCount === 0) warnings.push("No curated Markdown source docs were found under work/docs/source.");

  await fs.mkdir(paths.normalizedDir, { recursive: true });
  await fs.mkdir(paths.reportsDir, { recursive: true });

  await Promise.all(
    normalizedThreads.map((thread) =>
      writeJson(path.join(paths.normalizedDir, `${String(thread.thread_id)}.json`), thread),
    ),
  );
  await Promise.all([
    writeJson(path.join(paths.corpusDir, "inventory.json"), inventory),
    writeJson(path.join(paths.corpusDir, "family-graphs.json"), familyGraphs),
    writeJson(path.join(paths.corpusDir, "intermediate-graph.json"), intermediateGraph),
    writeJson(path.join(paths.corpusDir, "corpus-manifest.json"), manifest),
    writeJson(path.join(paths.reportsDir, "anomalies.json"), anomalies),
    writeJson(path.join(paths.reportsDir, "ambiguity-flags.json"), ambiguityFlags),
    writeJson(path.join(paths.reportsDir, "validation-report.json"), validationReport),
    writeMarkdown(path.join(paths.reportsDir, "canonicality-summary.md"), buildCanonicalitySummary(familyGraphs)),
    writeMarkdown(path.join(paths.reportsDir, "decision-log.md"), buildDecisionLog()),
    writeMarkdown(path.join(paths.reportsDir, "mental-map.md"), buildMentalMap(familyGraphs, anomalies)),
    writeMarkdown(paths.readmePath, WORKSPACE_README),
  ]);

  if (!validationReport.all_passed) {
    throw new Error(`Validation failed; see ${path.join(paths.reportsDir, "validation-report.json")}`);
  }

  return {
    workspaceRoot: paths.workspaceRoot,
    sourceCounts: {
      jsonConversations: jsonRecords.length,
      markdownDocuments: markdownDocCount,
      totalSources: records.length,
    },
    familyCount: familyGraphs.length,
    normalizedThreadCount: normalizedThreads.length,
    anomalyCount: anomalies.length,
    warnings,
    outputPaths: {
      inventory: path.join(paths.corpusDir, "inventory.json"),
      familyGraphs: path.join(paths.corpusDir, "family-graphs.json"),
      intermediateGraph: path.join(paths.corpusDir, "intermediate-graph.json"),
      manifest: path.join(paths.corpusDir, "corpus-manifest.json"),
      reportsDir: paths.reportsDir,
      normalizedThreadsDir: paths.normalizedDir,
      validationReport: path.join(paths.reportsDir, "validation-report.json"),
    },
  };
}

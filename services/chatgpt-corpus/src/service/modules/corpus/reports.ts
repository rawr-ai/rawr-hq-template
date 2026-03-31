import path from "node:path";
import type { Anomaly, FamilyGraph, NormalizedThread, Relationship, SourceRecord } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function detectAnomalies(jsonRecords: SourceRecord[]): Anomaly[] {
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

export function buildAmbiguityFlags(
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

export function buildCanonicalitySummary(familyGraphs: FamilyGraph[]): string {
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

export function buildDecisionLog(): string {
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

export function buildMentalMap(familyGraphs: FamilyGraph[], anomalies: Anomaly[]): string {
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

export function buildValidationReport(input: {
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

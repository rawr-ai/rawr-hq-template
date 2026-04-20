import {
  SOURCE_MATERIAL_DIRECTORIES,
  createNormalizedThreadArtifactRef,
} from "../../../../shared/layout";
import type {
  AmbiguityFlag,
  Anomaly,
  FamilyGraph,
  InventoryItem,
  Manifest,
  NormalizedThread,
  Relationship,
  ValidationReport,
} from "../entities";

export function buildManifest(input: {
  inventory: InventoryItem[];
  familyGraphs: FamilyGraph[];
  normalizedThreads: NormalizedThread[];
  relationships: Relationship[];
  anomalies: Anomaly[];
}): Manifest {
  return {
    manifest_version: "rawr.conversation-corpus.v1",
    generated_at: new Date().toISOString(),
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
      path: createNormalizedThreadArtifactRef(thread.thread_id).relativePath,
      branch_count: thread.branches.length,
      anomaly_count: thread.anomalies.length,
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

export function buildAmbiguityFlags(
  familyGraphs: FamilyGraph[],
  relationships: Relationship[],
  markdownDocCount: number,
): AmbiguityFlag[] {
  const flags: AmbiguityFlag[] = [];
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
      notes: `No curated Markdown source docs were present under ${SOURCE_MATERIAL_DIRECTORIES.documents}.`,
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

- Raw conversation exports remain untouched in \`${SOURCE_MATERIAL_DIRECTORIES.conversations}/\`.
- Optional Markdown source docs live under \`${SOURCE_MATERIAL_DIRECTORIES.documents}/\`.
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
  inventory: InventoryItem[];
  familyGraphs: FamilyGraph[];
  normalizedThreads: NormalizedThread[];
  manifest: Manifest;
}): ValidationReport {
  const jsonSourceIds = new Set(
    input.inventory
      .filter((item) => item.type === "json_conversation")
      .map((item) => item.source_id),
  );
  const familySourceIds = new Set(input.familyGraphs.flatMap((family) => family.member_source_ids));
  const validation = {
    source_inventory_complete: jsonSourceIds.size + input.inventory.filter((item) => item.type === "markdown_document").length === input.inventory.length,
    every_json_in_one_family: jsonSourceIds.size === familySourceIds.size &&
      [...jsonSourceIds].every((sourceId) => familySourceIds.has(sourceId)),
    one_normalized_thread_per_family: input.normalizedThreads.length === input.familyGraphs.length,
    manifest_has_corpus_summary: Boolean(input.manifest.corpus_summary),
  };
  return {
    ...validation,
    all_passed: Object.values(validation).every(Boolean),
  };
}

import path from "node:path";
import type { Anomaly, CorpusWorkspacePaths, FamilyGraph, NormalizedThread, Relationship } from "./types";

export function buildIntermediateGraph(
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

export function buildManifest(input: {
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

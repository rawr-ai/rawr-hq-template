import { SOURCE_MATERIAL_DIRECTORIES } from "../../../../shared/layout";
import type { SourceRecord, SourceSnapshot } from "../../source-materials/entities";
import type { InventoryItem } from "../entities";
import { filename } from "./names";

export function buildWarnings(snapshot: SourceSnapshot): string[] {
  const warnings: string[] = [];
  if (snapshot.jsonRecords.length === 0) {
    warnings.push(`No conversation exports were found under ${SOURCE_MATERIAL_DIRECTORIES.conversations}.`);
  }
  if (snapshot.markdownDocCount === 0) {
    warnings.push(`No curated Markdown source docs were found under ${SOURCE_MATERIAL_DIRECTORIES.documents}.`);
  }
  return warnings;
}

export function buildInventory(records: SourceRecord[]): InventoryItem[] {
  return records.map((record) => {
    if (record.type === "json_conversation") {
      return {
        source_id: record.sourceId,
        type: "json_conversation",
        path: record.relativePath,
        filename: filename(record.relativePath),
        hash_sha256: record.hash,
        size_bytes: record.sizeBytes,
        title: record.title,
        summary: record.summary,
        normalized_title: record.normalizedTitle,
        branch_depth: record.branchDepth,
        message_count: record.messages.length,
        messages_hash_sha256: record.messagesHash,
        created: record.created,
        updated: record.updated,
        exported: record.exported,
        link: record.link,
        first_prompt: record.messages.find((message) => message.role === "Prompt")?.say ?? "",
        last_response: [...record.messages].reverse().find((message) => message.role === "Response")?.say ?? "",
      };
    }

    return {
      source_id: record.sourceId,
      type: "markdown_document",
      path: record.relativePath,
      filename: filename(record.relativePath),
      hash_sha256: record.hash,
      size_bytes: record.sizeBytes,
      title: record.title,
      summary: record.summary,
      branch_depth: record.branchDepth,
      line_count: record.lineCount,
      headings: record.headings,
    };
  });
}

import { createHash } from "node:crypto";
import type {
  HqOpsResources,
  SemanticEmbeddingConfig,
  SqliteDatabase,
} from "../../../shared/ports/resources";
import type { JournalSearchRow } from "../entities";
import { listRecentSnippetsFull } from "./storage";

export class SemanticSearchUnavailableError extends Error {
  constructor() {
    super("Semantic search not configured (missing embedding provider configuration)");
    this.name = "SemanticSearchUnavailableError";
  }
}

function semanticContent(snippet: { title: string; body: string; tags: string[] }): string {
  const tags = snippet.tags.length > 0 ? `tags: ${snippet.tags.join(",")}\n` : "";
  return `${snippet.title}\n${tags}\n${snippet.body}`.trim();
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function float32ToBlob(vec: Float32Array): Uint8Array {
  return new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
}

function blobToFloat32(blob: Uint8Array): Float32Array {
  const ab = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
  return new Float32Array(ab);
}

async function ensureSnippetEmbedding(
  resources: HqOpsResources,
  db: SqliteDatabase,
  input: { id: string; model: string; content: string; config: SemanticEmbeddingConfig },
): Promise<Float32Array> {
  const contentHash = sha256Hex(input.content);
  const row = db.prepare(
    `SELECT provider, model, dims, contentHash, vector
     FROM snippet_embeddings
     WHERE id = $id`,
  ).get({ $id: input.id }) as
    | { provider: string; model: string; dims: number; contentHash: string; vector: Uint8Array }
    | undefined;

  if (
    row &&
    row.provider === input.config.provider &&
    row.model === input.model &&
    row.contentHash === contentHash &&
    row.vector
  ) {
    return blobToFloat32(row.vector);
  }

  const vec = await resources.embeddings.embedText({ text: input.content, config: input.config });
  db.prepare(
    `INSERT OR REPLACE INTO snippet_embeddings (id, provider, model, dims, contentHash, vector, updatedAt)
     VALUES ($id, $provider, $model, $dims, $contentHash, $vector, $updatedAt)`,
  ).run({
    $id: input.id,
    $provider: input.config.provider,
    $model: input.model,
    $dims: vec.length,
    $contentHash: contentHash,
    $vector: float32ToBlob(vec),
    $updatedAt: new Date().toISOString(),
  });

  return vec;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let a2 = 0;
  let b2 = 0;

  for (let i = 0; i < n; i += 1) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    a2 += av * av;
    b2 += bv * bv;
  }

  if (a2 === 0 || b2 === 0) return 0;
  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
}

export async function searchSnippetsSemantic(
  resources: HqOpsResources,
  db: SqliteDatabase,
  query: string,
  limit: number,
  opts?: { candidateLimit?: number },
): Promise<Array<JournalSearchRow & { score: number }>> {
  const config = resources.embeddings.getConfig();
  if (!config) throw new SemanticSearchUnavailableError();

  const candidateLimit = Math.max(1, Math.min(opts?.candidateLimit ?? 200, 500));
  const candidates = listRecentSnippetsFull(db, candidateLimit);
  if (candidates.length === 0) return [];

  const qVec = await resources.embeddings.embedText({ text: query, config });
  const scored: Array<JournalSearchRow & { score: number }> = [];

  for (const snippet of candidates) {
    const content = semanticContent(snippet);
    const vec = await ensureSnippetEmbedding(resources, db, {
      id: snippet.id,
      model: config.model,
      content,
      config,
    });
    const score = cosineSimilarity(qVec, vec);
    const row: JournalSearchRow = {
      id: snippet.id,
      ts: snippet.ts,
      kind: snippet.kind,
      title: snippet.title,
      preview: snippet.preview,
      tags: snippet.tags,
      sourceEventId: snippet.sourceEventId,
    };
    scored.push({ ...row, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { listRecentSnippetsFull, type JournalSearchRow } from "./index-db.js";

export type SemanticProvider = "openai" | "voyage";

export type SemanticConfig = {
  provider: SemanticProvider;
  apiKey: string;
  model: string;
};

const DEFAULT_OPENAI_MODEL = "text-embedding-3-small";
const DEFAULT_VOYAGE_MODEL = "voyage-3-lite";

export function getSemanticConfig(env: NodeJS.ProcessEnv = process.env): SemanticConfig | null {
  const openAiKey = env.OPENAI_API_KEY;
  if (typeof openAiKey === "string" && openAiKey.trim() !== "") {
    return {
      provider: "openai",
      apiKey: openAiKey.trim(),
      model: (env.RAWR_EMBEDDINGS_MODEL ?? DEFAULT_OPENAI_MODEL).trim(),
    };
  }

  const voyageKey = env.VOYAGE_API_KEY;
  if (typeof voyageKey === "string" && voyageKey.trim() !== "") {
    return {
      provider: "voyage",
      apiKey: voyageKey.trim(),
      model: (env.RAWR_EMBEDDINGS_MODEL ?? DEFAULT_VOYAGE_MODEL).trim(),
    };
  }

  return null;
}

export function isSemanticConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSemanticConfig(env) !== null;
}

export type SemanticSearchRow = JournalSearchRow & { score: number };

export async function searchSnippetsSemantic(
  db: Database,
  query: string,
  limit: number,
  opts?: { candidateLimit?: number; env?: NodeJS.ProcessEnv },
): Promise<SemanticSearchRow[]> {
  const env = opts?.env ?? process.env;
  const config = getSemanticConfig(env);
  if (!config) throw new Error("Semantic search not configured (missing OPENAI_API_KEY or VOYAGE_API_KEY)");

  const candidateLimit = Math.max(1, Math.min(opts?.candidateLimit ?? 200, 500));
  const candidates = listRecentSnippetsFull(db, candidateLimit);
  if (candidates.length === 0) return [];

  const qVec = await embedText(query, config);

  const scored: Array<SemanticSearchRow> = [];
  for (const snippet of candidates) {
    const content = semanticContent(snippet);
    const vec = await ensureSnippetEmbedding(db, {
      id: snippet.id,
      provider: config.provider,
      model: config.model,
      content,
      config,
    });
    const score = cosineSimilarity(qVec, vec);
    scored.push({ ...snippet, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function semanticContent(snippet: { title: string; body: string; tags: string[] }): string {
  const tags = snippet.tags?.length ? `tags: ${snippet.tags.join(",")}\n` : "";
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
  db: Database,
  input: { id: string; provider: SemanticProvider; model: string; content: string; config: SemanticConfig },
): Promise<Float32Array> {
  const contentHash = sha256Hex(input.content);
  const row = db
    .prepare(
      `SELECT provider, model, dims, contentHash, vector
       FROM snippet_embeddings
       WHERE id = $id`,
    )
    .get({ $id: input.id }) as
    | { provider: string; model: string; dims: number; contentHash: string; vector: Uint8Array }
    | undefined;

  if (
    row &&
    row.provider === input.provider &&
    row.model === input.model &&
    row.contentHash === contentHash &&
    row.vector
  ) {
    return blobToFloat32(row.vector);
  }

  const vec = await embedText(input.content, input.config);
  const updatedAt = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO snippet_embeddings (id, provider, model, dims, contentHash, vector, updatedAt)
     VALUES ($id, $provider, $model, $dims, $contentHash, $vector, $updatedAt)`,
  ).run({
    $id: input.id,
    $provider: input.provider,
    $model: input.model,
    $dims: vec.length,
    $contentHash: contentHash,
    $vector: float32ToBlob(vec),
    $updatedAt: updatedAt,
  });

  return vec;
}

async function embedText(text: string, config: SemanticConfig): Promise<Float32Array> {
  if (config.provider === "openai") return await embedOpenAi(text, config);
  return await embedVoyage(text, config);
}

async function embedOpenAi(text: string, config: SemanticConfig): Promise<Float32Array> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: config.model, input: text }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings failed: ${res.status} ${raw}`.trim());
  }

  const json = (await res.json()) as any;
  const embedding = json?.data?.[0]?.embedding as unknown;
  if (!Array.isArray(embedding) || !embedding.every((v) => typeof v === "number")) {
    throw new Error("OpenAI embeddings response missing data[0].embedding");
  }
  return Float32Array.from(embedding);
}

async function embedVoyage(text: string, config: SemanticConfig): Promise<Float32Array> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: config.model, input: [text] }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`Voyage embeddings failed: ${res.status} ${raw}`.trim());
  }

  const json = (await res.json()) as any;
  const embedding = json?.data?.[0]?.embedding as unknown;
  if (!Array.isArray(embedding) || !embedding.every((v) => typeof v === "number")) {
    throw new Error("Voyage embeddings response missing data[0].embedding");
  }
  return Float32Array.from(embedding);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let a2 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    a2 += av * av;
    b2 += bv * bv;
  }
  if (a2 === 0 || b2 === 0) return 0;
  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
}


import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { InquiryDefinition } from "./definition";
import type { FlureeClient, JsonObject } from "./fluree-client";
import { assertHistoryObservation } from "./history";
import { contextFor } from "./namespaces";
import { type CheckpointQueryResult, type InquiryCheckpoint, queryAtCheckpoint } from "./query";

export type SessionSource = "claude" | "codex";
export type SessionRole = "assistant" | "user";

export interface SessionMessage {
  readonly id: string;
  readonly parentId?: string;
  readonly role: SessionRole;
  readonly sequence: number;
  readonly text: string;
  readonly timestamp?: string;
}

export interface SessionTranscript {
  readonly cwd?: string;
  readonly id: string;
  readonly messages: readonly SessionMessage[];
  readonly source: SessionSource;
}

export interface SessionProjectionOptions {
  readonly namespace: string;
  readonly sourcePath: string;
}

export interface SessionIntakeReport {
  readonly commit: string;
  readonly contentHash: string;
  readonly generation: string;
  readonly identifier: string;
  readonly locator: string;
  readonly messages: number;
  readonly session: string;
  readonly source: SessionSource;
}

type UnknownRecord = Record<string, unknown>;
type SessionClient = Pick<FlureeClient, "ledger" | "query" | "upsert">;
type SessionQueryClient = Pick<FlureeClient, "ledger" | "query" | "sparql">;

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  const record = asRecord(response);
  return Array.isArray(record?.result) ? record.result : [];
}

export function parseSessionJsonl(source: SessionSource, jsonl: string): SessionTranscript {
  const records = jsonl
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "")
    .map((line, index) => parseRecord(line, index + 1));

  return source === "codex" ? parseCodex(records) : parseClaude(records);
}

export function projectSession(
  transcript: SessionTranscript,
  options: SessionProjectionOptions
): readonly JsonObject[] {
  const namespace = normalizeNamespace(options.namespace);
  const sessionIri = identityIri(
    namespace,
    "session",
    stableId(
      "session",
      JSON.stringify([transcript.source, transcript.id, options.sourcePath, transcript.cwd ?? null])
    )
  );
  const messageIris = new Map(
    transcript.messages.map((message) => [
      message.id,
      identityIri(
        namespace,
        "message",
        stableId(
          "session-message",
          JSON.stringify([
            sessionIri,
            message.id,
            message.parentId ?? null,
            message.role,
            message.sequence,
            message.text,
            message.timestamp ?? null,
          ])
        )
      ),
    ])
  );
  if (messageIris.size !== transcript.messages.length) {
    throw new Error("Visible session messages must have unique source identities");
  }
  const session: JsonObject = {
    "@id": sessionIri,
    "@type": `${namespace}session#Session`,
    [`${namespace}session#identifier`]: transcript.id,
    [`${namespace}session#source`]: transcript.source,
    [`${namespace}session#sourcePath`]: options.sourcePath,
    ...(transcript.cwd === undefined ? {} : { [`${namespace}session#cwd`]: transcript.cwd }),
  };

  const messages = transcript.messages.map((message) => {
    const messageIri = messageIris.get(message.id);
    if (messageIri === undefined) {
      throw new Error(`Session message '${message.id}' has no projected identity`);
    }
    const parentIri =
      message.parentId === undefined ? undefined : messageIris.get(message.parentId);
    const projected: JsonObject = {
      "@id": messageIri,
      "@type": `${namespace}session#Message`,
      [`${namespace}session#inSession`]: { "@id": sessionIri },
      [`${namespace}session#role`]: message.role,
      [`${namespace}session#sequence`]: message.sequence,
      [`${namespace}session#text`]: {
        "@value": message.text,
        "@type": "@fulltext",
        "@annotation": {
          [`${namespace}meta#method`]: `${transcript.source}-visible-text`,
          [`${namespace}meta#source`]: options.sourcePath,
        },
      },
      ...(parentIri === undefined
        ? {}
        : {
            [`${namespace}session#repliesTo`]: {
              "@id": parentIri,
            },
          }),
      ...(message.timestamp === undefined
        ? {}
        : {
            [`${namespace}session#observedAt`]: {
              "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
              "@value": message.timestamp,
            },
          }),
    } satisfies JsonObject;
    return projected;
  });

  return [session, ...messages];
}

export async function intakeSession(options: {
  readonly client: SessionClient;
  readonly commit: string;
  readonly definition: InquiryDefinition;
  readonly file: string;
  readonly historyGeneration: string;
  readonly locator?: string;
  readonly source: SessionSource;
}): Promise<SessionIntakeReport> {
  if (options.client.ledger !== options.definition.ledger) {
    throw new Error(
      `Fluree client ledger '${options.client.ledger}' does not match definition '${options.definition.ledger}'`
    );
  }
  const namespace = normalizeNamespace(options.definition.namespace);
  await assertHistoryObservation({
    client: options.client,
    commit: options.commit,
    definition: options.definition,
    generation: options.historyGeneration,
  });
  const observedCommit = identityIri(namespace, "git/commit", options.commit);
  const jsonl = await readFile(options.file, "utf8");
  const transcript = parseSessionJsonl(options.source, jsonl);
  if (transcript.messages.length === 0) {
    throw new Error("Session intake requires at least one visible message");
  }
  const locator = options.locator ?? options.file;
  const contentHash = stableId(
    "visible-session",
    JSON.stringify({
      cwd: transcript.cwd ?? null,
      id: transcript.id,
      messages: transcript.messages,
      source: transcript.source,
    })
  );
  const projection = projectSession(transcript, {
    namespace,
    sourcePath: locator,
  });
  const messageReferences = projection.slice(1).map((message) => {
    const id = message["@id"];
    if (typeof id !== "string") {
      throw new Error("Projected session message requires an absolute identity");
    }
    return { "@id": id };
  });
  const sessionIri = projection[0]?.["@id"];
  if (typeof sessionIri !== "string") {
    throw new Error("Projected session requires an absolute identity");
  }
  const generation = identityIri(
    namespace,
    "session-generation",
    stableId("session-generation", JSON.stringify([sessionIri, contentHash, options.commit]))
  );
  const generationType = `${namespace}session#Generation`;
  const complete = `${namespace}session#complete`;
  const common = {
    [`${namespace}session#contentHash`]: contentHash,
    [`${namespace}session#session`]: {
      "@id": sessionIri,
    },
    [`${namespace}session#source`]: options.source,
    [`${namespace}session#message`]: messageReferences,
    [`${namespace}session#observedCommit`]: {
      "@id": identityIri(namespace, "git/commit", options.commit),
    },
  };

  await options.client.upsert(projection);
  await options.client.upsert({
    "@id": generation,
    "@type": generationType,
    ...common,
    [`${namespace}session#messageCount`]: transcript.messages.length,
    [complete]: true,
  });

  return {
    commit: options.commit,
    contentHash,
    generation,
    identifier: transcript.id,
    locator,
    messages: transcript.messages.length,
    session: sessionIri,
    source: transcript.source,
  };
}

/**
 * Retrieve candidate dialogue that is explicitly connected to a frame and Git.
 *
 * Full-text score proposes relevance only. The returned frame and commit edges
 * are exact observations; neither the score nor message text grants identity.
 */
export async function searchFrameSession(options: {
  readonly checkpoint: InquiryCheckpoint;
  readonly client: SessionQueryClient;
  readonly definition: InquiryDefinition;
  readonly limit?: number;
  readonly text: string;
}): Promise<CheckpointQueryResult> {
  const text = options.text.trim();
  if (text === "" || text.length > 1_000) {
    throw new Error("Session search text must contain 1 to 1,000 characters");
  }
  const limit = options.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
    throw new Error("Session search limit must be an integer from 1 to 100");
  }
  const frameWhere: JsonObject[] =
    options.checkpoint.evidenceVersion === "checkpoint-evidence-v2"
      ? [
          {
            "@id": options.checkpoint.frameObservation,
            "@type": "frame:Observation",
            "frame:sessionGeneration": { "@id": "?generation" },
            "frame:observedCommit": { "@id": "?observedCommit" },
            "frame:selectedAttestation": { "@id": "?frame" },
            "frame:complete": true,
          },
          {
            "@id": "?frame",
            "@type": "frame:LineageAttestation",
            "frame:assessment": { "@id": "?frameAssessment" },
            "frame:source": { "@id": "?frameCommit" },
          },
          {
            "@id": "?frameAssessment",
            "@type": "frame:Assessment",
            "frame:title": "?frameTitle",
          },
        ]
      : [
          {
            "@id": "?frame",
            "@type": "frame:Attestation",
            "frame:sessionGeneration": { "@id": "?generation" },
            "frame:title": "?frameTitle",
            "frame:source": { "@id": "?frameCommit" },
          },
        ];
  return queryAtCheckpoint({
    checkpoint: options.checkpoint,
    client: options.client,
    definition: options.definition,
    query: {
      kind: "jsonld",
      body: {
        "@context": contextFor(options.definition),
        select: [
          "?message",
          "?role",
          "?sequence",
          "?text",
          "?score",
          "?session",
          "?generation",
          "?observedCommit",
          "?frameCommit",
          "?frame",
          "?frameTitle",
        ],
        where: [
          {
            "@id": "?message",
            "@type": "session:Message",
            "session:inSession": { "@id": "?session" },
            "session:role": "?role",
            "session:sequence": "?sequence",
            "session:text": "?text",
          },
          {
            "@id": "?generation",
            "@type": "session:Generation",
            "session:session": { "@id": "?session" },
            "session:message": { "@id": "?message" },
            "session:complete": true,
            "session:observedCommit": { "@id": "?observedCommit" },
          },
          ...frameWhere,
          {
            "@id": "?observedCommit",
            "@type": "git:Commit",
          },
          {
            "@id": "?frameCommit",
            "@type": "git:Commit",
          },
          ["bind", "?score", ["fulltext", "?text", text]],
          ["filter", "(> ?score 0)"],
        ],
        orderBy: [
          ["desc", "?score"],
          ["asc", "?sequence"],
        ],
        limit,
      },
    },
  });
}

function parseCodex(records: readonly UnknownRecord[]): SessionTranscript {
  const metadata = records.find((record) => record.type === "session_meta");
  const payload = asRecord(metadata?.payload);
  const id =
    stringValue(payload?.session_id) ??
    stringValue(payload?.id) ??
    stableId("codex", JSON.stringify(records[0] ?? {}));
  const messages: SessionMessage[] = [];

  for (const record of records) {
    if (record.type !== "response_item") continue;
    const item = asRecord(record.payload);
    if (item?.type !== "message") continue;
    const role = sessionRole(item.role);
    if (!role) continue;
    const text = visibleText(item.content, role === "assistant" ? "output_text" : "input_text");
    if (!text || isInjectedContext(text)) continue;
    messages.push({
      id: stableId(id, `${messages.length}:${role}:${text}`),
      role,
      sequence: messages.length,
      text,
      timestamp: stringValue(record.timestamp),
    });
  }

  return {
    cwd: stringValue(payload?.cwd),
    id,
    messages,
    source: "codex",
  };
}

function parseClaude(records: readonly UnknownRecord[]): SessionTranscript {
  const firstMessage = records.find(
    (record) => record.type === "user" || record.type === "assistant"
  );
  const id =
    stringValue(firstMessage?.sessionId) ?? stableId("claude", JSON.stringify(records[0] ?? {}));
  const messages: SessionMessage[] = [];

  for (const record of records) {
    if (record.type !== "user" && record.type !== "assistant") continue;
    const message = asRecord(record.message);
    const role = sessionRole(message?.role);
    if (!role) continue;
    const text = visibleText(message?.content, "text");
    if (!text || isInjectedContext(text)) continue;
    messages.push({
      id: stringValue(record.uuid) ?? stableId(id, `${messages.length}:${role}:${text}`),
      parentId: stringValue(record.parentUuid),
      role,
      sequence: messages.length,
      text,
      timestamp: stringValue(record.timestamp),
    });
  }

  return {
    cwd: stringValue(firstMessage?.cwd),
    id,
    messages,
    source: "claude",
  };
}

function visibleText(content: unknown, textType: string): string | undefined {
  const items = Array.isArray(content) ? content : [content];
  const parts = items.flatMap((item) => {
    if (typeof item === "string" && textType === "text") return [item];
    const block = asRecord(item);
    return block?.type === textType && typeof block.text === "string" ? [block.text] : [];
  });
  const text = parts.join("\n\n").trim();
  return text === "" ? undefined : text;
}

function isInjectedContext(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("<environment_context>") && trimmed.endsWith("</environment_context>")) ||
    (trimmed.startsWith("# AGENTS.md instructions for ") && trimmed.includes("\n<INSTRUCTIONS>"))
  );
}

function parseRecord(line: string, lineNumber: number): UnknownRecord {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (cause) {
    throw new Error(`Invalid session JSON on line ${lineNumber}`, { cause });
  }
  const record = asRecord(value);
  if (!record) throw new Error(`Session line ${lineNumber} is not an object`);
  return record;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function sessionRole(value: unknown): SessionRole | undefined {
  return value === "assistant" || value === "user" ? value : undefined;
}

function stableId(scope: string, value: string): string {
  return createHash("sha256").update(`${scope}\0${value}`).digest("hex");
}

function identityIri(namespace: string, kind: string, identity: string): string {
  return `${namespace}id/${kind}/${encodeURIComponent(identity)}`;
}

function normalizeNamespace(namespace: string): string {
  return namespace.endsWith("/") || namespace.endsWith("#") ? namespace : `${namespace}/`;
}

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  inquiryCheckpointEvidenceHash,
  inquiryCheckpointIri,
  inquiryDefinitionHash,
} from "../../checkpoint";
import type { JsonObject } from "../../fluree-client";
import { inquiryIri } from "../../namespaces";
import {
  intakeSession,
  parseSessionJsonl,
  projectSession,
  searchFrameSession,
} from "../../session";

describe("session transcript", () => {
  test("keeps only visible Codex user and assistant text", () => {
    const transcript = parseSessionJsonl(
      "codex",
      [
        JSON.stringify({
          type: "session_meta",
          payload: { session_id: "codex-1", cwd: "/repo" },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "developer",
            content: [{ type: "input_text", text: "hidden policy" }],
          },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "# AGENTS.md instructions for /repo\n\n<INSTRUCTIONS>\nhidden routing\n</INSTRUCTIONS>",
              },
            ],
          },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "<environment_context>\n<cwd>/repo</cwd>\n</environment_context>",
              },
            ],
          },
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-07-30T11:59:59Z",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "What changed?" }],
          },
        }),
        JSON.stringify({
          type: "response_item",
          payload: { type: "function_call_output", output: "noisy tool log" },
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-07-30T12:00:00Z",
          payload: {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "The frame changed." }],
          },
        }),
      ].join("\n")
    );

    expect(transcript).toMatchObject({
      cwd: "/repo",
      id: "codex-1",
      source: "codex",
    });
    expect(
      transcript.messages.map(({ role, text, timestamp }) => ({ role, text, timestamp }))
    ).toEqual([
      {
        role: "user",
        text: "What changed?",
        timestamp: "2026-07-30T11:59:59Z",
      },
      {
        role: "assistant",
        text: "The frame changed.",
        timestamp: "2026-07-30T12:00:00Z",
      },
    ]);
  });

  test("keeps Claude text and excludes thinking, tools, and tool results", () => {
    const transcript = parseSessionJsonl(
      "claude",
      [
        JSON.stringify({
          type: "user",
          uuid: "u1",
          parentUuid: null,
          sessionId: "claude-1",
          cwd: "/repo",
          timestamp: "2026-07-30T12:00:00Z",
          message: {
            role: "user",
            content: [
              { type: "text", text: "Use the product model." },
              { type: "tool_result", content: "noisy tool log" },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "a1",
          parentUuid: "u1",
          sessionId: "claude-1",
          timestamp: "2026-07-30T12:00:01Z",
          message: {
            role: "assistant",
            content: [
              { type: "thinking", thinking: "hidden reasoning" },
              { type: "tool_use", name: "Read" },
              { type: "text", text: "I will use its authority." },
            ],
          },
        }),
      ].join("\n")
    );

    expect(transcript.messages).toEqual([
      {
        id: "u1",
        role: "user",
        sequence: 0,
        text: "Use the product model.",
        timestamp: "2026-07-30T12:00:00Z",
      },
      {
        id: "a1",
        parentId: "u1",
        role: "assistant",
        sequence: 1,
        text: "I will use its authority.",
        timestamp: "2026-07-30T12:00:01Z",
      },
    ]);
  });

  test("projects source-attested JSON-LD without claiming semantic identity", () => {
    const transcript = parseSessionJsonl(
      "codex",
      [
        JSON.stringify({
          type: "session_meta",
          payload: { session_id: "codex-1" },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "Show the proof." }],
          },
        }),
      ].join("\n")
    );

    const projection = projectSession(transcript, {
      namespace: "https://example.test/inquiry",
      sourcePath: ".codex/session.jsonl",
    });

    expect(projection).toHaveLength(2);
    expect(projection[0]).toMatchObject({
      "@type": "https://example.test/inquiry/session#Session",
      "https://example.test/inquiry/session#source": "codex",
    });
    expect(projection[0]?.["@id"]).toMatch(
      /^https:\/\/example\.test\/inquiry\/id\/session\/[0-9a-f]{64}$/u
    );
    expect(projection[1]).toMatchObject({
      "@type": "https://example.test/inquiry/session#Message",
      "https://example.test/inquiry/session#role": "user",
      "https://example.test/inquiry/session#sequence": 0,
      "https://example.test/inquiry/session#text": {
        "@value": "Show the proof.",
        "@type": "@fulltext",
        "@annotation": {
          "https://example.test/inquiry/meta#method": "codex-visible-text",
          "https://example.test/inquiry/meta#source": ".codex/session.jsonl",
        },
      },
    });
    const edited = projectSession(
      {
        ...transcript,
        messages: [{ ...transcript.messages[0], text: "Show different proof." }],
      },
      {
        namespace: "https://example.test/inquiry",
        sourcePath: ".codex/session.jsonl",
      }
    );
    expect(edited[1]?.["@id"]).not.toBe(projection[1]?.["@id"]);
  });

  test("records only an explicit complete-history commit observation", async () => {
    const writes: unknown[] = [];
    const queries: JsonObject[] = [];
    const fixtureRoot = await mkdtemp(join(tmpdir(), "habitat-session-"));
    const path = join(fixtureRoot, "fixture-session.jsonl");
    await writeFile(
      path,
      [
        JSON.stringify({
          type: "session_meta",
          payload: { session_id: "codex-1" },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "Commit the frame." }],
          },
        }),
      ].join("\n")
    );
    try {
      const client = {
        ledger: "example/history:main",
        async query(body: JsonObject) {
          queries.push(body);
          return [["commit"]];
        },
        async upsert(nodes: JsonObject | readonly JsonObject[], options?: unknown) {
          writes.push({ nodes, options });
          return {};
        },
      };
      const definition = {
        ledger: "example/history:main",
        namespace: "https://example.test/inquiry/",
      } as never;
      const historyGeneration = inquiryIri(definition, "git:history-generation", "history-123");
      const first = await intakeSession({
        client,
        commit: "a".repeat(40),
        definition,
        file: path,
        historyGeneration,
        source: "codex",
      });
      const second = await intakeSession({
        client,
        commit: "b".repeat(40),
        definition,
        file: path,
        historyGeneration,
        source: "codex",
      });
      const relocated = await intakeSession({
        client,
        commit: "a".repeat(40),
        definition,
        file: path,
        historyGeneration,
        locator: "codex://thread/relocated",
        source: "codex",
      });

      expect(first.commit).toBe("a".repeat(40));
      expect(second.commit).toBe("b".repeat(40));
      expect(first.contentHash).toBe(second.contentHash);
      expect(first.session).toBe(second.session);
      expect(first.generation).not.toBe(second.generation);
      expect(relocated.session).not.toBe(first.session);
      expect(relocated.generation).not.toBe(first.generation);
      expect(queries[0]).toMatchObject({
        from: "example/history:main",
        select: ["?commit"],
        where: [
          {
            "@id": `https://example.test/inquiry/id/git/commit/${"a".repeat(40)}`,
            "@type": "git:Commit",
            "git:observedIn": { "@id": historyGeneration },
          },
          {
            "@id": historyGeneration,
            "@type": "git:HistoryGeneration",
            "git:complete": true,
          },
        ],
        limit: 1,
      });
      expect(JSON.stringify(writes)).toContain(
        `https://example.test/inquiry/id/git/commit/${"a".repeat(40)}`
      );
      expect(JSON.stringify(writes)).toContain("https://example.test/inquiry/session#message");
      expect(JSON.stringify(writes)).not.toContain(
        '"https://example.test/inquiry/session#complete":false'
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("refuses an unobserved commit before writing any session evidence", async () => {
    let writes = 0;
    await expect(
      intakeSession({
        client: {
          ledger: "example/history:main",
          async query() {
            return [];
          },
          async upsert() {
            writes += 1;
            return {};
          },
        },
        commit: "a".repeat(40),
        definition: {
          ledger: "example/history:main",
          namespace: "https://example.test/inquiry/",
        } as never,
        file: "/does/not/matter.jsonl",
        historyGeneration: "https://example.test/inquiry/id/git/history-generation/history-123",
        source: "codex",
      })
    ).rejects.toThrow(/not present in .*history-generation/u);
    expect(writes).toBe(0);
  });

  test("searches only checkpointed frame-linked session evidence", async () => {
    const queries: JsonObject[] = [];
    const definition = {
      ledger: "example/history:main",
      namespace: "https://example.test/inquiry/",
    } as never;
    const observedCommit = "a".repeat(40);
    const historyGeneration = inquiryIri(definition, "git:history-generation", "history-123");
    const frameAttestation = inquiryIri(definition, "frame:attestation", "frame-123");
    const evidence = {
      observedCommit,
      historyGeneration,
      projectionGenerations: [],
      frameAttestation,
    } as const;
    const modelHash = "model";
    const transaction = "fluree:commit:sha256:checkpoint";
    await searchFrameSession({
      checkpoint: {
        evidenceVersion: "checkpoint-evidence-v1",
        ledger: "example/history:main",
        id: inquiryCheckpointIri(definition, modelHash, evidence),
        transaction,
        definitionHash: inquiryDefinitionHash(definition),
        evidenceHash: inquiryCheckpointEvidenceHash(definition, modelHash, evidence),
        modelHash,
        ...evidence,
        t: 7,
      },
      client: {
        ledger: "example/history:main",
        async query(body) {
          queries.push(body);
          const select = JSON.stringify(body.select);
          if (select === '["?transaction","?t"]') return [[transaction, "7"]];
          if (select.includes("observedCommit")) {
            return [
              [
                inquiryIri(definition, "git:commit", observedCommit),
                historyGeneration,
                undefined,
                undefined,
                frameAttestation,
              ],
            ];
          }
          if (select.includes("frameSource")) return [["frame-source"]];
          if (select.includes("sessionGeneration") || select.includes("ruleNode")) return [];
          return { result: [] };
        },
        async sparql() {
          throw new Error("Session search must use native JSON-LD fulltext");
        },
      },
      definition,
      text: "frame authority",
    });

    const search = queries.find((query) =>
      JSON.stringify(query.where).includes('["fulltext","?text","frame authority"]')
    );
    expect(search?.from).toBe("example/history:main@t:7");
    expect(search?.fromNamed).toBeUndefined();
    expect(JSON.stringify(search?.where)).toContain('["fulltext","?text","frame authority"]');
    expect(JSON.stringify(search?.where)).toContain('"session:message":{"@id":"?message"}');
    expect(JSON.stringify(search?.where)).toContain(
      '"frame:sessionGeneration":{"@id":"?generation"}'
    );
    expect(JSON.stringify(search?.where)).toContain(
      '"session:observedCommit":{"@id":"?observedCommit"}'
    );
    expect(JSON.stringify(search?.where)).toContain('"frame:source":{"@id":"?frameCommit"}');
  });

  test("joins successor dialogue through its exact frame observation", async () => {
    const queries: JsonObject[] = [];
    const definition = {
      ledger: "example/history:main",
      namespace: "https://example.test/inquiry/",
    } as never;
    const observedCommit = "a".repeat(40);
    const historyGeneration = inquiryIri(definition, "git:history-generation", "history-123");
    const frameAttestation = inquiryIri(definition, "frame:lineage-attestation", "frame-123");
    const frameGeneration = inquiryIri(definition, "frame:generation", "generation-123");
    const frameObservation = inquiryIri(definition, "frame:observation", "observation-123");
    const sessionGeneration = inquiryIri(definition, "session-generation", "session-123");
    const evidence = {
      evidenceVersion: "checkpoint-evidence-v2" as const,
      observedCommit,
      historyGeneration,
      projectionGenerations: [],
      sessionGeneration,
      frameAttestation,
      frameGeneration,
      frameObservation,
    };
    const modelHash = "model";
    const transaction = "fluree:commit:sha256:checkpoint-v2";
    await searchFrameSession({
      checkpoint: {
        ledger: "example/history:main",
        id: inquiryCheckpointIri(definition, modelHash, evidence),
        transaction,
        definitionHash: inquiryDefinitionHash(definition),
        evidenceHash: inquiryCheckpointEvidenceHash(definition, modelHash, evidence),
        modelHash,
        ...evidence,
        t: 8,
      },
      client: {
        ledger: "example/history:main",
        async query(body) {
          queries.push(body);
          const select = JSON.stringify(body.select);
          if (select === '["?transaction","?t"]') return [[transaction, "8"]];
          if (select.includes("observedCommit")) {
            return [
              [
                inquiryIri(definition, "git:commit", observedCommit),
                historyGeneration,
                undefined,
                sessionGeneration,
                frameAttestation,
                undefined,
                "checkpoint-evidence-v2",
                frameGeneration,
                frameObservation,
              ],
            ];
          }
          if (select.includes("frameSource")) {
            return [[inquiryIri(definition, "git:commit", observedCommit)]];
          }
          if (JSON.stringify(body.where).includes("session:Generation")) {
            return [[sessionGeneration]];
          }
          if (select.includes("ruleNode")) return [];
          return { result: [], reasoning: { capped: false } };
        },
        async sparql(query) {
          if (/\bASK\b/u.test(query)) return true;
          throw new Error("Session search must use native JSON-LD fulltext");
        },
      },
      definition,
      text: "selection shift",
    });

    const search = queries.find((query) =>
      JSON.stringify(query.where).includes('["fulltext","?text","selection shift"]')
    );
    const where = JSON.stringify(search?.where);
    expect(where).toContain(`"@id":"${frameObservation}"`);
    expect(where).toContain('"@type":"frame:Observation"');
    expect(where).toContain('"frame:selectedAttestation":{"@id":"?frame"}');
    expect(where).toContain('"@type":"frame:LineageAttestation"');
    expect(where).toContain('"@type":"frame:Assessment"');
  });
});

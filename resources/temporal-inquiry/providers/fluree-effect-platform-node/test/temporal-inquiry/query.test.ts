import { describe, expect, test } from "vitest";

import {
  assertInquiryCheckpointEvidenceComplete,
  assertInquiryCheckpointEvidenceReceiptsComplete,
  type InquiryCheckpointEvidence,
  inquiryCheckpointEvidenceHash,
  inquiryCheckpointIri,
  inquiryDefinitionHash,
  normalizeInquiryCheckpointEvidence,
} from "../../checkpoint";
import type { JsonObject } from "../../fluree-client";
import { queryCurrentInquiryCheckpoint } from "../../index";
import { semanticMaterializationIri } from "../../materialization";
import {
  evidenceHash,
  inquiryIri,
  namespacesFor,
  semanticGraphIri,
  transactionMetadataSource,
} from "../../namespaces";
import {
  assertNoQueryTimeRules,
  assertReasoningComplete,
  type CheckpointSemanticDataset,
  checkpointLedger,
  checkpointSparqlQuery,
  type InquiryCheckpoint,
  queryAtCheckpoint,
  readCheckpointSparqlInput,
  renderCheckpointSparql,
  resolveInquiryCheckpoint,
} from "../../query";
import { definitionFixture, SHA } from "./fixture";

const checkpointEvidence = {
  observedCommit: SHA,
  historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
  projectionGenerations: [],
  frameAttestation: inquiryIri(definitionFixture, "frame:attestation", "frame-123"),
} as const satisfies InquiryCheckpointEvidence;
const MODEL_HASH = "model-hash";
const checkpoint: InquiryCheckpoint = {
  evidenceVersion: "checkpoint-evidence-v1",
  ledger: definitionFixture.ledger,
  id: inquiryCheckpointIri(definitionFixture, MODEL_HASH, checkpointEvidence),
  transaction: "fluree:commit:sha256:abcdef",
  definitionHash: inquiryDefinitionHash(definitionFixture),
  evidenceHash: inquiryCheckpointEvidenceHash(definitionFixture, MODEL_HASH, checkpointEvidence),
  modelHash: MODEL_HASH,
  ...checkpointEvidence,
  t: 42,
};

const lineageCheckpoint: InquiryCheckpoint = {
  ...checkpoint,
  evidenceVersion: "checkpoint-evidence-v2",
  frameAttestation: inquiryIri(definitionFixture, "frame:lineage-attestation", "frame-lineage-123"),
  frameGeneration: inquiryIri(definitionFixture, "frame:generation", "frame-generation-123"),
  frameObservation: inquiryIri(definitionFixture, "frame:observation", "frame-observation-123"),
};

const semanticDefinition = {
  ...definitionFixture,
  model: {
    ...definitionFixture.model,
    materialization: "tools/temporal-inquiry/model/materialization.sparql",
  },
};
const semanticIdentity = {
  graph: semanticGraphIri(semanticDefinition),
  queryHash: "a".repeat(64),
  contentHash: "b".repeat(64),
  modelHash: MODEL_HASH,
  baseT: 41,
  materializedT: checkpoint.t,
  nodeCount: 3,
};
const semanticReceipt = {
  id: semanticMaterializationIri(semanticDefinition, semanticIdentity),
  ...semanticIdentity,
};
const semanticCheckpointEvidence = {
  ...checkpointEvidence,
  semanticMaterialization: semanticReceipt.id,
} as const satisfies InquiryCheckpointEvidence;
const semanticCheckpoint: InquiryCheckpoint = {
  evidenceVersion: "checkpoint-evidence-v1",
  ledger: semanticDefinition.ledger,
  id: inquiryCheckpointIri(semanticDefinition, MODEL_HASH, semanticCheckpointEvidence),
  transaction: checkpoint.transaction,
  definitionHash: inquiryDefinitionHash(semanticDefinition),
  evidenceHash: inquiryCheckpointEvidenceHash(
    semanticDefinition,
    MODEL_HASH,
    semanticCheckpointEvidence
  ),
  modelHash: MODEL_HASH,
  ...semanticCheckpointEvidence,
  semantic: semanticReceipt,
  t: checkpoint.t,
};

const ledgerInfo = (commitT = checkpoint.t, indexT = checkpoint.t) => ({
  commitId: `fluree:commit:${String(commitT)}`,
  commitT,
  indexId: `fluree:index:${String(indexT)}`,
  indexT,
  ledger: definitionFixture.ledger,
});

const checkpointEvidenceRows = () => [
  [
    inquiryIri(definitionFixture, "git:commit", checkpoint.observedCommit),
    checkpoint.historyGeneration,
    undefined,
    undefined,
    checkpoint.frameAttestation,
  ],
];

function checkpointBoundaryResponse(
  body: JsonObject,
  rules: readonly string[] = []
): unknown | undefined {
  const select = JSON.stringify(body.select);
  if (select.includes("?checkpoint")) {
    return [
      [
        checkpoint.transaction,
        checkpoint.id,
        checkpoint.definitionHash,
        checkpoint.evidenceHash,
        checkpoint.modelHash,
        String(checkpoint.t),
        checkpoint.transaction,
      ],
    ];
  }
  if (select === '["?transaction","?t"]') {
    return [[checkpoint.transaction, String(checkpoint.t)]];
  }
  if (select.includes("observedCommit")) return checkpointEvidenceRows();
  if (select.includes("frameSource")) return [["frame-source"]];
  if (select.includes("sessionGeneration")) return [];
  if (select.includes("ruleNode")) return rules.map((rule) => [rule]);
  return undefined;
}

function semanticCheckpointBoundaryResponse(
  body: JsonObject,
  rules: readonly string[] = []
): unknown | undefined {
  const select = JSON.stringify(body.select);
  if (select.includes("?checkpoint")) {
    return [
      [
        semanticCheckpoint.transaction,
        semanticCheckpoint.id,
        semanticCheckpoint.definitionHash,
        semanticCheckpoint.evidenceHash,
        semanticCheckpoint.modelHash,
        String(semanticCheckpoint.t),
        semanticCheckpoint.transaction,
      ],
    ];
  }
  if (select.includes("?materialization")) {
    return [
      [
        semanticReceipt.id,
        semanticReceipt.graph,
        semanticReceipt.queryHash,
        semanticReceipt.contentHash,
        semanticReceipt.modelHash,
        String(semanticReceipt.baseT),
        String(semanticReceipt.materializedT),
        String(semanticReceipt.nodeCount),
      ],
    ];
  }
  if (select.includes("observedCommit")) {
    return [
      [
        inquiryIri(semanticDefinition, "git:commit", semanticCheckpoint.observedCommit),
        semanticCheckpoint.historyGeneration,
        undefined,
        undefined,
        semanticCheckpoint.frameAttestation,
        semanticReceipt.id,
      ],
    ];
  }
  return checkpointBoundaryResponse(body, rules);
}

function requireSemanticDataset(
  semantic: CheckpointSemanticDataset | undefined
): CheckpointSemanticDataset {
  if (semantic === undefined) throw new Error("Expected a semantic checkpoint dataset");
  return semantic;
}

describe("checkpoint query boundary", () => {
  const evidenceGraph = `${definitionFixture.namespace}graph/evidence`;

  test("refuses only Fluree's top-level query-time rules control", () => {
    expect(() => assertNoQueryTimeRules({ rules: [] })).toThrow(/Query-time rules are disabled/u);
    expect(() =>
      assertNoQueryTimeRules({
        nested: [{ "https://ns.flur.ee/db#rules": [] }],
      })
    ).not.toThrow();
    expect(() =>
      assertNoQueryTimeRules({
        where: { "https://example.test/rules": "?rule" },
      })
    ).not.toThrow();
    expect(() => assertNoQueryTimeRules({ reasoning: "datalog" })).not.toThrow();
  });

  test("discriminates successor frame identities from replayable predecessor evidence", () => {
    expect(
      normalizeInquiryCheckpointEvidence(definitionFixture, {
        ...checkpointEvidence,
        evidenceVersion: "checkpoint-evidence-v2",
        frameAttestation: lineageCheckpoint.frameAttestation,
        frameGeneration: lineageCheckpoint.frameGeneration,
        frameObservation: lineageCheckpoint.frameObservation,
      })
    ).toEqual(
      expect.objectContaining({
        evidenceVersion: "checkpoint-evidence-v2",
        frameAttestation: lineageCheckpoint.frameAttestation,
      })
    );
    expect(() =>
      normalizeInquiryCheckpointEvidence(definitionFixture, {
        ...checkpointEvidence,
        evidenceVersion: "checkpoint-evidence-v2",
        frameGeneration: lineageCheckpoint.frameGeneration,
        frameObservation: lineageCheckpoint.frameObservation,
      })
    ).toThrow(/identity from this inquiry/u);
  });

  test("proves complete successor receipts and source ancestry before checkpoint sealing", async () => {
    const evidence: InquiryCheckpointEvidence = {
      ...checkpointEvidence,
      evidenceVersion: "checkpoint-evidence-v2",
      frameAttestation: lineageCheckpoint.frameAttestation,
      frameGeneration: lineageCheckpoint.frameGeneration,
      frameObservation: lineageCheckpoint.frameObservation,
    };
    const queries: JsonObject[] = [];
    const ancestry: string[] = [];
    await assertInquiryCheckpointEvidenceReceiptsComplete(
      {
        ledger: definitionFixture.ledger,
        async query(body) {
          queries.push(body);
          return JSON.stringify(body.select).includes("frameSource")
            ? [[inquiryIri(definitionFixture, "git:commit", SHA)]]
            : [];
        },
        async sparql(query) {
          ancestry.push(query);
          return { head: {}, boolean: true };
        },
      },
      definitionFixture,
      evidence
    );
    const frameProof = JSON.stringify(queries[0]?.where);
    expect(frameProof).toContain("frame:member");
    expect(frameProof).toContain("frame:selectedAttestation");
    expect(frameProof).toContain("frame:selectedContent");
    expect(frameProof).toContain("?observedBlob");
    expect(ancestry[0]).toContain("git#parent");
    expect(ancestry[0]).toContain("*");

    await expect(
      assertInquiryCheckpointEvidenceReceiptsComplete(
        {
          ledger: definitionFixture.ledger,
          async query(body) {
            return JSON.stringify(body.select).includes("frameSource")
              ? [[inquiryIri(definitionFixture, "git:commit", SHA)]]
              : [];
          },
          async sparql() {
            return false;
          },
        },
        definitionFixture,
        evidence
      )
    ).rejects.toThrow(/not an ancestor/u);
  });

  test("refuses a successor checkpoint whose frame member changed after intake", async () => {
    const evidence: InquiryCheckpointEvidence = {
      ...checkpointEvidence,
      evidenceVersion: "checkpoint-evidence-v2",
      frameAttestation: lineageCheckpoint.frameAttestation,
      frameGeneration: lineageCheckpoint.frameGeneration,
      frameObservation: lineageCheckpoint.frameObservation,
    };
    const frame = namespacesFor(definitionFixture).frame;
    await expect(
      assertInquiryCheckpointEvidenceComplete(
        {
          ledger: definitionFixture.ledger,
          async query(body) {
            const select = JSON.stringify(body.select);
            if (select.includes("frameSource")) {
              return [[inquiryIri(definitionFixture, "git:commit", SHA)]];
            }
            if (body.from === transactionMetadataSource(definitionFixture.ledger)) {
              return [["fluree:commit:frame-intake", "1"]];
            }
            if (
              Array.isArray(body.select) &&
              body.select.every(
                (selection) =>
                  selection !== null && typeof selection === "object" && !Array.isArray(selection)
              )
            ) {
              const subjects = body.select.map(
                (selection) => Object.keys(selection as JsonObject)[0]
              );
              const current = body.from === definitionFixture.ledger;
              const expansions = subjects.map((subject) => {
                if (subject === evidence.frameGeneration) {
                  const reconstructionVersion = "frame-reconstruction-v1";
                  return {
                    "@id": subject,
                    "@type": `${frame}Generation`,
                    [`${frame}member`]: { "@id": evidence.frameAttestation },
                    [`${frame}memberCount`]: 1,
                    [`${frame}membershipDigest`]: evidenceHash(
                      `${reconstructionVersion}\nframe:LineageAttestation ${evidence.frameAttestation}\n`
                    ),
                    [`${frame}reconstructionVersion`]: reconstructionVersion,
                  };
                }
                if (subject === evidence.frameObservation) {
                  return { "@id": subject, "@type": `${frame}Observation` };
                }
                return {
                  "@id": subject,
                  "@type": `${frame}LineageAttestation`,
                  ...(current ? { [`${frame}introductionKind`]: "mutated" } : {}),
                };
              });
              return expansions.length === 1 ? expansions : [expansions];
            }
            return [];
          },
          async sparql() {
            return true;
          },
        },
        definitionFixture,
        evidence
      )
    ).rejects.toThrow(/content changed after intake/u);
  });

  test("renders only checkpoint-owned identities into direct agent SPARQL", () => {
    const template = `# PRAGMA reasoning: none
SELECT ?checkpoint ?frame ?observation
FROM __QUERY_LEDGER__
WHERE {
  VALUES ?checkpoint { __INQUIRY_CHECKPOINT__ }
  VALUES ?frame { __FRAME_ATTESTATION__ }
  VALUES ?observation { __FRAME_OBSERVATION__ }
}`;
    const rendered = renderCheckpointSparql(
      definitionFixture,
      template,
      checkpointLedger(lineageCheckpoint),
      lineageCheckpoint,
      undefined
    );
    expect(rendered).toContain(`<${checkpointLedger(lineageCheckpoint)}>`);
    expect(rendered).toContain(`<${lineageCheckpoint.frameAttestation}>`);
    expect(rendered).toContain(`<${lineageCheckpoint.frameObservation}>`);
    expect(rendered).not.toMatch(/__[A-Z][A-Z0-9_]*__/u);
    expect(checkpointSparqlQuery(definitionFixture, template).requiresSemantic).toBe(false);

    expect(() =>
      renderCheckpointSparql(
        definitionFixture,
        template,
        checkpointLedger(checkpoint),
        checkpoint,
        undefined
      )
    ).toThrow(/evidence v2/u);
    expect(() =>
      renderCheckpointSparql(
        definitionFixture,
        `${template}\n# __UNOWNED_CONTEXT__`,
        checkpointLedger(lineageCheckpoint),
        lineageCheckpoint,
        undefined
      )
    ).toThrow(/unsupported placeholder/u);
  });

  test("loads exactly one direct SPARQL file-or-stdin source", async () => {
    await expect(readCheckpointSparqlInput({ stdin: "SELECT * WHERE {}\n" })).resolves.toBe(
      "SELECT * WHERE {}\n"
    );
    await expect(readCheckpointSparqlInput({})).rejects.toThrow(/exactly one/u);
    await expect(
      readCheckpointSparqlInput({ file: "query.sparql", stdin: "SELECT * WHERE {}" })
    ).rejects.toThrow(/exactly one/u);
    await expect(readCheckpointSparqlInput({ stdin: " \n" })).rejects.toThrow(/must not be empty/u);
  });

  test("selects checkpoints by exact identity, transaction time, or observed commit", async () => {
    const bodies: JsonObject[] = [];
    const client = {
      ledger: definitionFixture.ledger,
      async query(body: JsonObject) {
        bodies.push(body);
        if (
          body.from === definitionFixture.ledger &&
          JSON.stringify(body.select) === '["?checkpoint"]'
        ) {
          return [[checkpoint.id]];
        }
        return checkpointBoundaryResponse(body);
      },
      async sparql() {
        throw new Error("Projection-free predecessor checkpoint must not execute SPARQL");
      },
    };
    await resolveInquiryCheckpoint(client, definitionFixture, { checkpoint: checkpoint.id });
    expect(JSON.stringify(bodies[0]?.where)).toContain(checkpoint.id);
    bodies.length = 0;
    await resolveInquiryCheckpoint(client, definitionFixture, { t: checkpoint.t });
    expect(JSON.stringify(bodies[0]?.where)).toContain(`\"f:t\":${String(checkpoint.t)}`);
    bodies.length = 0;
    await resolveInquiryCheckpoint(client, definitionFixture, { observedCommit: SHA });
    expect(bodies[0]?.from).toBe(definitionFixture.ledger);
    expect(JSON.stringify(bodies[0]?.where)).toContain(SHA);
  });

  test("observed-commit selection ignores a malformed candidate and keeps the latest valid one", async () => {
    const malformed = inquiryIri(
      definitionFixture,
      "model:inquiry-checkpoint",
      "malformed-candidate"
    );
    const resolved = await resolveInquiryCheckpoint(
      {
        ledger: definitionFixture.ledger,
        async query(body) {
          if (
            body.from === definitionFixture.ledger &&
            JSON.stringify(body.select) === '["?checkpoint"]'
          ) {
            return [[malformed], [checkpoint.id]];
          }
          if (
            body.from === transactionMetadataSource(definitionFixture.ledger) &&
            (body.where as JsonObject)?.["meta:inquiryCheckpoint"] !== undefined &&
            ((body.where as JsonObject)["meta:inquiryCheckpoint"] as JsonObject)["@id"] ===
              malformed
          ) {
            return [];
          }
          return checkpointBoundaryResponse(body);
        },
        async sparql() {
          throw new Error("Projection-free predecessor checkpoint must not execute SPARQL");
        },
      },
      definitionFixture,
      { observedCommit: SHA }
    );
    expect(resolved.id).toBe(checkpoint.id);
  });

  test("observed-commit selection fails closed when a canonical candidate cannot be proved", async () => {
    const newest = inquiryIri(definitionFixture, "model:inquiry-checkpoint", "newest-candidate");
    await expect(
      resolveInquiryCheckpoint(
        {
          ledger: definitionFixture.ledger,
          async query(body) {
            if (
              body.from === definitionFixture.ledger &&
              JSON.stringify(body.select) === '["?checkpoint"]'
            ) {
              return [[newest], [checkpoint.id]];
            }
            if (
              body.from === transactionMetadataSource(definitionFixture.ledger) &&
              JSON.stringify(body.select).includes("?checkpoint") &&
              (
                (body.where as readonly JsonObject[])[0]?.["meta:inquiryCheckpoint"] as JsonObject
              )?.["@id"] === newest
            ) {
              throw new Error("temporary Fluree read failure");
            }
            return checkpointBoundaryResponse(body);
          },
          async sparql() {
            throw new Error("Selection proof must not execute SPARQL");
          },
        },
        definitionFixture,
        { observedCommit: SHA }
      )
    ).rejects.toThrow(/temporary Fluree read failure/u);
  });

  test("resolves only an explicit complete inquiry checkpoint with transaction time", async () => {
    const queries: JsonObject[] = [];
    const resolved = await resolveInquiryCheckpoint(
      {
        ledger: definitionFixture.ledger,
        async query(body) {
          queries.push(body);
          return checkpointBoundaryResponse(body);
        },
        async sparql() {
          throw new Error("Projection-free checkpoint must not execute SPARQL");
        },
      },
      definitionFixture
    );

    expect(queries[0]?.from).toBe(transactionMetadataSource(definitionFixture.ledger));
    expect(queries[0]?.where).toEqual([
      {
        "@id": "?transaction",
        "meta:inquiryCheckpoint": { "@id": "?checkpoint" },
        "meta:definitionHash": "?definitionHash",
        "meta:evidenceHash": "?evidenceHash",
        "meta:inquiryComplete": true,
        "meta:modelHash": "?modelHash",
        "f:t": "?t",
      },
      ["optional", { "@id": "?transaction", "f:address": "?address" }],
    ]);
    expect(queries[0]?.orderBy).toEqual([["desc", "?t"]]);
    expect(queries[2]?.from).toBe("example/history:main@t:42");
    expect(queries.every((body) => body.reasoning === "none")).toBe(true);
    expect(resolved).toEqual({
      ...checkpoint,
      address: checkpoint.transaction,
    });
    expect(checkpointLedger(resolved)).toBe("example/history:main@t:42");
  });

  test("resolves and proves the current checkpoint only once before querying", async () => {
    const bodies: JsonObject[] = [];
    let completionProofs = 0;
    let evidenceProofs = 0;
    const result = await queryCurrentInquiryCheckpoint({
      definition: definitionFixture,
      client: {
        ledger: definitionFixture.ledger,
        async info() {
          return ledgerInfo();
        },
        async query(body) {
          bodies.push(body);
          const select = JSON.stringify(body.select);
          if (select === '["?transaction","?t"]') completionProofs += 1;
          if (select.includes("observedCommit")) evidenceProofs += 1;
          const boundary = checkpointBoundaryResponse(body, [
            "https://example.test/inquiry/id/rule/current-binding",
          ]);
          if (boundary !== undefined) return boundary;
          return {
            result: [["current-answer"]],
            reasoning: { capped: false },
          };
        },
        async sparql() {
          throw new Error("JSON-LD current query should not execute SPARQL");
        },
      },
      query: {
        kind: "jsonld",
        body: {
          select: ["?answer"],
          where: [],
          reasoning: "datalog",
        },
      },
    });

    expect(completionProofs).toBe(1);
    expect(evidenceProofs).toBe(1);
    expect(result.inquiryCheckpoint).toEqual({
      ...checkpoint,
      address: checkpoint.transaction,
    });
    expect(result.snapshotLedger).toBe("example/history:main@t:42");
    expect(result.queryLedger).toBe("example/history:main");
    expect(result.currentHead).toEqual({
      before: ledgerInfo(),
      after: ledgerInfo(),
    });
    expect(result.timings).toEqual({
      prepareMs: expect.any(Number),
      proofMs: expect.any(Number),
      executeMs: expect.any(Number),
      totalMs: expect.any(Number),
    });
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(result.timings.executeMs);
    expect(result.rules).toEqual(["https://example.test/inquiry/id/rule/current-binding"]);
    const answerBody = bodies.find((body) => JSON.stringify(body.select).includes("answer"));
    expect(answerBody?.from).toBe("example/history:main");
    expect(answerBody?.reasoning).toBe("none");
  });

  test("proves projection receipts on reads without re-expanding projection content", async () => {
    const generation = inquiryIri(
      definitionFixture,
      "model:projection-generation",
      "projection-123"
    );
    const bodies: JsonObject[] = [];
    await assertInquiryCheckpointEvidenceReceiptsComplete(
      {
        ledger: definitionFixture.ledger,
        async query(body) {
          bodies.push(body);
          const select = JSON.stringify(body.select);
          if (select.includes("frameSource")) return [["frame-source"]];
          if (select.includes("sessionGeneration")) return [];
          if (select === '["?generation"]') return [[generation]];
          throw new Error(`Unexpected receipt query: ${select}`);
        },
      },
      definitionFixture,
      {
        ...checkpointEvidence,
        projectionGenerations: [generation],
      },
      checkpointLedger(checkpoint)
    );

    expect(bodies).toHaveLength(3);
    expect(bodies.every((body) => body.from === checkpointLedger(checkpoint))).toBe(true);
    expect(
      bodies.some(
        (body) =>
          Array.isArray(body.select) &&
          body.select.some((selection) => typeof selection === "object")
      )
    ).toBe(false);
    expect(bodies.every((body) => body.reasoning === "none")).toBe(true);
  });

  test("gives a current SPARQL builder the checkpoint proved by that same query", async () => {
    const builtFrom: Array<{
      readonly checkpoint: InquiryCheckpoint;
      readonly queryLedger: string;
    }> = [];
    let completionProofs = 0;
    const result = await queryCurrentInquiryCheckpoint({
      definition: definitionFixture,
      client: {
        ledger: definitionFixture.ledger,
        async info() {
          return ledgerInfo();
        },
        async query(body) {
          if (JSON.stringify(body.select) === '["?transaction","?t"]') {
            completionProofs += 1;
          }
          return checkpointBoundaryResponse(body, [
            "https://example.test/inquiry/id/rule/current-binding",
          ]);
        },
        async sparql() {
          return {
            result: [["current-answer"]],
            reasoning: { capped: false },
          };
        },
      },
      query: (currentCheckpoint) => ({
        kind: "sparql",
        build: (queryLedger, builtCheckpoint) => {
          expect(builtCheckpoint).toBe(currentCheckpoint);
          builtFrom.push({ checkpoint: currentCheckpoint, queryLedger });
          return `# PRAGMA reasoning: none\nSELECT *\nFROM <${queryLedger}>\nWHERE { <${currentCheckpoint.id}> ?predicate ?object }`;
        },
      }),
    });

    expect(completionProofs).toBe(1);
    expect(builtFrom).toEqual([
      {
        checkpoint: {
          ...checkpoint,
          address: checkpoint.transaction,
        },
        queryLedger: "example/history:main",
      },
    ]);
    expect(result.snapshotLedger).toBe("example/history:main@t:42");
    expect(result.queryLedger).toBe("example/history:main");
    expect(result.inquiryCheckpoint.id).toBe(checkpoint.id);
  });

  test("builds a current JSON-LD query from the checkpoint proved by that same query", async () => {
    let builtCheckpoint: InquiryCheckpoint | undefined;
    const result = await queryCurrentInquiryCheckpoint({
      definition: definitionFixture,
      client: {
        ledger: definitionFixture.ledger,
        async info() {
          return ledgerInfo();
        },
        async query(body) {
          const boundary = checkpointBoundaryResponse(body, [
            "https://example.test/inquiry/id/rule/current-binding",
          ]);
          if (boundary !== undefined) return boundary;
          return {
            result: [["current-answer"]],
            reasoning: { capped: false },
          };
        },
        async sparql() {
          throw new Error("JSON-LD current query should not execute SPARQL");
        },
      },
      query: (currentCheckpoint) => {
        builtCheckpoint = currentCheckpoint;
        return {
          kind: "jsonld",
          body: {
            select: ["?answer"],
            where: {
              "@id": currentCheckpoint.id,
              "model:complete": true,
            },
          },
        };
      },
    });

    expect(builtCheckpoint).toEqual({
      ...checkpoint,
      address: checkpoint.transaction,
    });
    expect(result.inquiryCheckpoint).toBe(builtCheckpoint);
  });

  test("refuses a current query unless the current head and index equal its checkpoint", async () => {
    for (const info of [ledgerInfo(43, 43), ledgerInfo(42, 41)]) {
      let semanticQueries = 0;
      await expect(
        queryCurrentInquiryCheckpoint({
          definition: definitionFixture,
          client: {
            ledger: definitionFixture.ledger,
            async info() {
              return info;
            },
            async query(body) {
              const boundary = checkpointBoundaryResponse(body);
              if (boundary !== undefined) return boundary;
              semanticQueries += 1;
              return [];
            },
            async sparql() {
              semanticQueries += 1;
              return [];
            },
          },
          query: {
            kind: "jsonld",
            body: {
              select: ["?answer"],
              where: [],
              reasoning: "datalog",
            },
          },
        })
      ).rejects.toThrow(/Current Fluree head changed before checkpoint query/u);
      expect(semanticQueries).toBe(0);
    }
  });

  test("discards a current result when the head advances during its query", async () => {
    let infoCalls = 0;
    let semanticQueries = 0;
    await expect(
      queryCurrentInquiryCheckpoint({
        definition: definitionFixture,
        client: {
          ledger: definitionFixture.ledger,
          async info() {
            infoCalls += 1;
            return infoCalls === 1 ? ledgerInfo() : ledgerInfo(43, 43);
          },
          async query(body) {
            const boundary = checkpointBoundaryResponse(body);
            if (boundary !== undefined) return boundary;
            semanticQueries += 1;
            return {
              result: [["stale-answer"]],
              reasoning: { capped: false },
            };
          },
          async sparql() {
            throw new Error("JSON-LD current query should not execute SPARQL");
          },
        },
        query: {
          kind: "jsonld",
          body: {
            select: ["?answer"],
            where: [],
            reasoning: "datalog",
          },
        },
      })
    ).rejects.toThrow(/Current Fluree head changed after checkpoint query/u);
    expect(infoCalls).toBe(2);
    expect(semanticQueries).toBe(1);
  });

  test("discards a same-time result when the native head identity changes", async () => {
    let infoCalls = 0;
    await expect(
      queryCurrentInquiryCheckpoint({
        definition: definitionFixture,
        client: {
          ledger: definitionFixture.ledger,
          async info() {
            infoCalls += 1;
            return {
              ...ledgerInfo(),
              commitId: `fluree:commit:replacement-${String(infoCalls)}`,
            };
          },
          async query(body) {
            const boundary = checkpointBoundaryResponse(body);
            if (boundary !== undefined) return boundary;
            return { result: [["stale-answer"]], reasoning: { capped: false } };
          },
          async sparql() {
            throw new Error("JSON-LD current query should not execute SPARQL");
          },
        },
        query: {
          kind: "jsonld",
          body: {
            select: ["?answer"],
            where: [],
          },
        },
      })
    ).rejects.toThrow(/head identity changed after checkpoint query/u);
    expect(infoCalls).toBe(2);
  });

  test("rejects a checkpoint identity completed by more than one transaction", async () => {
    let queryCalls = 0;
    await expect(
      resolveInquiryCheckpoint(
        {
          ledger: definitionFixture.ledger,
          async query(body) {
            queryCalls += 1;
            if (queryCalls === 2) {
              return [
                [checkpoint.transaction, String(checkpoint.t)],
                ["fluree:commit:sha256:duplicate", "43"],
              ];
            }
            return checkpointBoundaryResponse(body);
          },
          async sparql() {
            throw new Error("Projection-free checkpoint must not execute SPARQL");
          },
        },
        definitionFixture
      )
    ).rejects.toThrow(/one canonical completion transaction/u);
  });

  test("pins JSON-LD and stored-rule lookup to the same immutable snapshot", async () => {
    const bodies: JsonObject[] = [];
    const result = await queryAtCheckpoint({
      definition: definitionFixture,
      checkpoint,
      client: {
        ledger: definitionFixture.ledger,
        async query(body) {
          bodies.push(body);
          const boundary = checkpointBoundaryResponse(body, [
            "https://example.test/inquiry/id/rule/accepted-binding",
          ]);
          if (boundary !== undefined) return boundary;
          return {
            result: [["answer"]],
            reasoning: { capped: false },
          };
        },
        async sparql() {
          throw new Error("JSON-LD test should not execute SPARQL");
        },
      },
      query: {
        kind: "jsonld",
        namedGraphs: {
          evidence: evidenceGraph,
        },
        body: {
          select: ["?answer"],
          where: [],
          reasoning: "datalog",
        },
      },
    });

    const rulesBody = bodies.find((body) => JSON.stringify(body.select).includes("ruleNode"));
    const answerBody = bodies.find((body) => JSON.stringify(body.select).includes("answer"));
    expect(rulesBody?.from).toEqual({
      "@id": "example/history:main@t:42",
      graph: namespacesFor(definitionFixture).graphs.rules,
    });
    expect(rulesBody?.reasoning).toBe("none");
    expect(answerBody?.from).toBe("example/history:main@t:42");
    expect(answerBody?.reasoning).toBe("none");
    expect(answerBody?.fromNamed).toEqual({
      evidence: {
        "@id": "example/history:main@t:42",
        "@graph": evidenceGraph,
      },
    });
    expect(result.rules).toEqual(["https://example.test/inquiry/id/rule/accepted-binding"]);
    expect(result.inquiryCheckpoint).toBe(checkpoint);
    expect(result.queryLedger).toBe("example/history:main@t:42");
    expect(result.currentHead).toBeUndefined();
    expect(result.queryHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  test("rejects caller-supplied JSON-LD datasets before querying", async () => {
    for (const [key, body] of [
      ["from", { from: definitionFixture.ledger }],
      ["fromNamed", { fromNamed: {} }],
      ["from-named", { "from-named": {} }],
    ] as const) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("JSON-LD test should not execute SPARQL");
            },
          },
          query: { kind: "jsonld", body },
        })
      ).rejects.toThrow(`must not set '${key}'`);
      expect(queryCalls).toBe(0);
    }
  });

  test("rejects nested and aliased Fluree graph sources before querying", async () => {
    const bodies: JsonObject[] = [
      {
        select: ["?result"],
        where: [
          {
            "f:graphSource": "live-search:main",
            "f:searchText": "checkpoint escape",
          },
        ],
      },
      {
        "@context": {
          source: "https://ns.flur.ee/db#graphSource",
        },
        where: [{ source: "live-search:main" }],
      },
      {
        "@context": {
          "@vocab": "https://ns.flur.ee/db#",
        },
        where: [{ graphSource: "live-search:main" }],
      },
      {
        where: [
          {
            nested: {
              "https://ns.flur.ee/db#graphSource": "live-vector:main",
            },
          },
        ],
      },
    ];
    for (const body of bodies) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("Escaping JSON-LD query must not execute");
            },
          },
          query: { kind: "jsonld", body },
        })
      ).rejects.toThrow(/external Fluree graph source/u);
      expect(queryCalls).toBe(0);
    }
  });

  test("resolves chained JSON-LD graph-source aliases before querying", async () => {
    const bodies: JsonObject[] = [
      {
        "@context": {
          source: "fluree:graphSource",
          fluree: "https://ns.flur.ee/db#",
        },
        where: [{ source: "live-search:main" }],
      },
      {
        "@context": {
          source: { "@id": "sourceAlias" },
          sourceAlias: { "@id": "f:graphSource" },
        },
        where: [{ source: "live-search:main" }],
      },
      {
        "@context": {
          "@vocab": "fluree:",
          fluree: "f",
        },
        where: [{ graphSource: "live-vector:main" }],
      },
      {
        "@context": {
          https: "https://example.test/not-the-standard-scheme/",
          source: "https://ns.flur.ee/db#graphSource",
        },
        where: [{ source: "live-search:main" }],
      },
    ];

    for (const body of bodies) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("Aliased graph-source query must not execute");
            },
          },
          query: { kind: "jsonld", body },
        })
      ).rejects.toThrow(/external Fluree graph source/u);
      expect(queryCalls).toBe(0);
    }
  });

  test("rejects remote JSON-LD contexts whose graph-source aliases cannot be audited", async () => {
    for (const context of [
      "https://example.test/context.jsonld",
      [{ source: "https://ns.flur.ee/db#graphSource" }],
    ] as const) {
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              throw new Error("Unsupported-context query must not execute");
            },
            async sparql() {
              throw new Error("Unsupported-context query must not execute");
            },
          },
          query: {
            kind: "jsonld",
            body: {
              "@context": context,
              where: [],
            },
          },
        })
      ).rejects.toThrow(/inline object @context/u);
    }
  });

  test("fails closed on unsupported inline JSON-LD context constructs", async () => {
    const contexts: readonly JsonObject[] = [
      {
        "@import": "https://example.test/context.jsonld",
      },
      {
        source: {
          "@reverse": "f:graphSource",
        },
      },
      {
        wrapper: {
          "@id": "https://example.test/wrapper",
          "@context": {
            source: "f:graphSource",
          },
        },
      },
    ];

    for (const context of contexts) {
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              throw new Error("Unsupported-context query must not execute");
            },
            async sparql() {
              throw new Error("Unsupported-context query must not execute");
            },
          },
          query: {
            kind: "jsonld",
            body: {
              "@context": context,
              where: [],
            },
          },
        })
      ).rejects.toThrow(/unsupported @context construct/u);
    }
  });

  test("revalidates and rejects a supplied checkpoint that does not match its node", async () => {
    let queryCalls = 0;
    let evidenceProofs = 0;
    await expect(
      queryAtCheckpoint({
        definition: definitionFixture,
        checkpoint: {
          ...checkpoint,
          observedCommit: "b".repeat(40),
        },
        client: {
          ledger: definitionFixture.ledger,
          async query(body) {
            queryCalls += 1;
            if (JSON.stringify(body.select).includes("observedCommit")) evidenceProofs += 1;
            return checkpointBoundaryResponse(body);
          },
          async sparql() {
            throw new Error("Forged checkpoint must not execute its authored query");
          },
        },
        query: {
          kind: "sparql",
          build: (snapshotLedger) =>
            `# PRAGMA reasoning: none\nSELECT *\nFROM <${snapshotLedger}>\nWHERE { ?subject ?predicate ?object }`,
        },
      })
    ).rejects.toThrow(/does not match its immutable Fluree evidence/u);
    expect(queryCalls).toBe(4);
    expect(evidenceProofs).toBe(1);
  });

  test("requires authored SPARQL to explicitly disable reasoning", async () => {
    let queryCalls = 0;
    await expect(
      queryAtCheckpoint({
        definition: definitionFixture,
        checkpoint,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            queryCalls += 1;
            return [];
          },
          async sparql() {
            throw new Error("SPARQL without the reasoning pragma must not execute");
          },
        },
        query: {
          kind: "sparql",
          build: (snapshotLedger) =>
            `SELECT *\nFROM <${snapshotLedger}>\nWHERE { ?subject ?predicate ?object }`,
        },
      })
    ).rejects.toThrow(/explicitly disable reasoning/u);
    expect(queryCalls).toBe(0);
  });

  test.each([
    "# PRAGMA reasoning: none\n# PRAGMA reasoning: datalog",
    "# PRAGMA reasoning: none\n# PRAGMA reasoning: none",
  ])("rejects conflicting or repeated reasoning pragmas", async (pragmas) => {
    let queryCalls = 0;
    await expect(
      queryAtCheckpoint({
        definition: definitionFixture,
        checkpoint,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            queryCalls += 1;
            return [];
          },
          async sparql() {
            throw new Error("SPARQL with repeated pragmas must not execute");
          },
        },
        query: {
          kind: "sparql",
          build: (snapshotLedger) =>
            `${pragmas}
SELECT *
FROM <${snapshotLedger}>
WHERE { ?subject ?predicate ?object }`,
        },
      })
    ).rejects.toThrow(/exactly one reasoning:none pragma/u);
    expect(queryCalls).toBe(0);
  });

  test("accepts one authored SPARQL FROM clause for the supplied snapshot", async () => {
    const sparqlQueries: string[] = [];
    await queryAtCheckpoint({
      definition: definitionFixture,
      checkpoint,
      client: {
        ledger: definitionFixture.ledger,
        async query(body) {
          return checkpointBoundaryResponse(body);
        },
        async sparql(sparql) {
          sparqlQueries.push(sparql);
          return [];
        },
      },
      query: {
        kind: "sparql",
        build: (snapshotLedger) =>
          `# PRAGMA reasoning: none\nSELECT *\nFROM <${snapshotLedger}>\nWHERE { ?subject ?predicate ?object }`,
      },
    });

    expect(sparqlQueries).toEqual([
      "# PRAGMA reasoning: none\nSELECT *\nFROM <example/history:main@t:42>\nWHERE { ?subject ?predicate ?object }",
    ]);
  });

  test("admits exactly the current base and sealed semantic SPARQL sources", async () => {
    const sparqlQueries: string[] = [];
    let builtSemantic: CheckpointSemanticDataset | undefined;
    const result = await queryCurrentInquiryCheckpoint({
      definition: semanticDefinition,
      client: {
        ledger: semanticDefinition.ledger,
        async info() {
          return ledgerInfo();
        },
        async query(body) {
          const boundary = semanticCheckpointBoundaryResponse(body);
          if (boundary !== undefined) return boundary;
          throw new Error(`Unexpected semantic checkpoint query: ${JSON.stringify(body.select)}`);
        },
        async sparql(sparql) {
          sparqlQueries.push(sparql);
          return {
            result: [["semantic-answer"]],
            reasoning: { capped: false },
          };
        },
      },
      query: {
        kind: "sparql",
        requiresSemantic: true,
        build: (queryLedger, builtCheckpoint, semanticValue) => {
          const semantic = requireSemanticDataset(semanticValue);
          expect(builtCheckpoint.semantic).toEqual(semanticReceipt);
          builtSemantic = semantic;
          return `# PRAGMA reasoning: none\nSELECT *\nFROM <${queryLedger}>\nFROM NAMED <${semantic.source}>\nWHERE { GRAPH <${semantic.name}> { ?subject ?predicate ?object } }`;
        },
      },
    });

    expect(builtSemantic).toEqual({
      graph: semanticReceipt.graph,
      name: `${semanticDefinition.ledger}#${semanticReceipt.graph}`,
      source: `${semanticDefinition.ledger}#${semanticReceipt.graph}`,
    });
    expect(sparqlQueries).toEqual([
      `# PRAGMA reasoning: none\nSELECT *\nFROM <${semanticDefinition.ledger}>\nFROM NAMED <${semanticDefinition.ledger}#${semanticReceipt.graph}>\nWHERE { GRAPH <${semanticDefinition.ledger}#${semanticReceipt.graph}> { ?subject ?predicate ?object } }`,
    ]);
    expect(result.inquiryCheckpoint.semantic).toEqual(semanticReceipt);
    expect(result.queryLedger).toBe(semanticDefinition.ledger);
  });

  test("pins the semantic source while keeping its SPARQL graph name stable", async () => {
    const sparqlQueries: string[] = [];
    await queryAtCheckpoint({
      definition: semanticDefinition,
      checkpoint: semanticCheckpoint,
      client: {
        ledger: semanticDefinition.ledger,
        async query(body) {
          const boundary = semanticCheckpointBoundaryResponse(body);
          if (boundary !== undefined) return boundary;
          throw new Error(`Unexpected semantic checkpoint query: ${JSON.stringify(body.select)}`);
        },
        async sparql(sparql) {
          sparqlQueries.push(sparql);
          return [];
        },
      },
      query: {
        kind: "sparql",
        requiresSemantic: true,
        build: (queryLedger, _checkpoint, semanticValue) => {
          const semantic = requireSemanticDataset(semanticValue);
          expect(semantic).toEqual({
            graph: semanticReceipt.graph,
            name: `${semanticDefinition.ledger}#${semanticReceipt.graph}`,
            source: `${semanticDefinition.ledger}@t:${String(
              semanticCheckpoint.t
            )}#${semanticReceipt.graph}`,
          });
          return `# PRAGMA reasoning: none
SELECT *
FROM <${queryLedger}>
FROM NAMED <${semantic.source}>
WHERE { GRAPH <${semantic.name}> { ?subject ?predicate ?object } }`;
        },
      },
    });

    expect(sparqlQueries.at(-1)).toContain(
      `FROM NAMED <${semanticDefinition.ledger}@t:${String(
        semanticCheckpoint.t
      )}#${semanticReceipt.graph}>`
    );
    expect(sparqlQueries.at(-1)).toContain(
      `GRAPH <${semanticDefinition.ledger}#${semanticReceipt.graph}>`
    );
  });

  test("keeps default-only SPARQL available on a checkpoint with semantic evidence", async () => {
    const sparqlQueries: string[] = [];
    await queryAtCheckpoint({
      definition: semanticDefinition,
      checkpoint: semanticCheckpoint,
      client: {
        ledger: semanticDefinition.ledger,
        async query(body) {
          return semanticCheckpointBoundaryResponse(body);
        },
        async sparql(query) {
          sparqlQueries.push(query);
          return [];
        },
      },
      query: {
        kind: "sparql",
        build: (queryLedger, _checkpoint, semantic) => {
          expect(semantic).toBeUndefined();
          return `# PRAGMA reasoning: none\nSELECT *\nFROM <${queryLedger}>\nWHERE { ?subject ?predicate ?object }`;
        },
      },
    });
    expect(sparqlQueries).toHaveLength(1);
    expect(sparqlQueries[0]).not.toContain("FROM NAMED");
    expect(sparqlQueries[0]).not.toContain("GRAPH");
  });

  test("refuses a required semantic query when the checkpoint has no materialization", async () => {
    let calls = 0;
    await expect(
      queryAtCheckpoint({
        definition: definitionFixture,
        checkpoint,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            calls += 1;
            return [];
          },
          async sparql() {
            calls += 1;
            return [];
          },
        },
        query: {
          kind: "sparql",
          requiresSemantic: true,
          build: () => {
            throw new Error("Receipt-less semantic query must not be built");
          },
        },
      })
    ).rejects.toThrow(/requires a complete semantic materialization/u);
    expect(calls).toBe(0);
  });

  test("refuses a mismatched semantic receipt before building the query", async () => {
    let built = false;
    let calls = 0;
    await expect(
      queryAtCheckpoint({
        definition: semanticDefinition,
        checkpoint: {
          ...semanticCheckpoint,
          semanticMaterialization: "https://example.test/materialization/mismatch",
        },
        client: {
          ledger: semanticDefinition.ledger,
          async query() {
            calls += 1;
            return [];
          },
          async sparql() {
            calls += 1;
            return [];
          },
        },
        query: {
          kind: "sparql",
          requiresSemantic: true,
          build: () => {
            built = true;
            throw new Error("Mismatched semantic receipt must not build");
          },
        },
      })
    ).rejects.toThrow(/receipt is incomplete/u);
    expect(built).toBe(false);
    expect(calls).toBe(0);
  });

  test("rejects unsealed or repeated semantic SPARQL sources", async () => {
    for (const violation of [
      "missing-named",
      "duplicate-default",
      "duplicate-named",
      "wrong-named",
      "wrong-graph",
    ] as const) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: semanticDefinition,
          checkpoint: semanticCheckpoint,
          client: {
            ledger: semanticDefinition.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("Invalid semantic SPARQL must not execute");
            },
          },
          query: {
            kind: "sparql",
            requiresSemantic: true,
            build: (queryLedger, _checkpoint, semanticValue) => {
              const semantic = requireSemanticDataset(semanticValue);
              const namedSource =
                violation === "wrong-named"
                  ? `${queryLedger}#https://example.test/inquiry/graph/unsealed`
                  : semantic.source;
              const graph =
                violation === "wrong-graph"
                  ? "https://example.test/inquiry/graph/unsealed"
                  : semantic.name;
              return [
                "# PRAGMA reasoning: none",
                "SELECT *",
                `FROM <${queryLedger}>`,
                ...(violation === "duplicate-default" ? [`FROM <${queryLedger}>`] : []),
                ...(violation === "missing-named" ? [] : [`FROM NAMED <${namedSource}>`]),
                ...(violation === "duplicate-named" ? [`FROM NAMED <${namedSource}>`] : []),
                `WHERE { GRAPH <${graph}> { ?subject ?predicate ?object } }`,
              ].join("\n");
            },
          },
        })
      ).rejects.toThrow(violation === "wrong-graph" ? /sealed semantic graph/u : /FROM NAMED/u);
      expect(queryCalls).toBe(0);
    }
  });

  test("rejects SPARQL dataset clauses beyond its one checkpoint FROM", async () => {
    const invalidDatasets = [
      "WHERE { ?subject ?predicate ?object }",
      "FROM <example/history:main@t:41>\nWHERE { ?subject ?predicate ?object }",
      "FROM <example/history:main@t:42>\nFROM <example/history:other@t:42>\nWHERE { ?subject ?predicate ?object }",
      "FROM <example/history:main@t:42>\nFROM NAMED <https://example.test/extra>\nWHERE { ?subject ?predicate ?object }",
    ];

    for (const dataset of invalidDatasets) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("Invalid SPARQL should not execute");
            },
          },
          query: {
            kind: "sparql",
            build: () => `# PRAGMA reasoning: none\nSELECT *\n${dataset}`,
          },
        })
      ).rejects.toThrow(/exactly one default FROM/u);
      expect(queryCalls).toBe(0);
    }
  });

  test("rejects SPARQL alternate source-selection constructs before querying", async () => {
    const alternateSources = [
      "SERVICE <fluree:remote:https://example.test/ledger> { ?subject ?predicate ?object }",
      "FILTER (?object < 5) SERVICE <fluree:remote:https://example.test/ledger> { ?subject ?predicate ?object }",
      "INSERT DATA { <https://example.test/s> <https://example.test/p> <https://example.test/o> }",
      "DELETE DATA { <https://example.test/s> <https://example.test/p> <https://example.test/o> }",
      "CLEAR DEFAULT",
      "CREATE GRAPH <https://example.test/graph>",
      "DROP DEFAULT",
    ];

    for (const alternateSource of alternateSources) {
      let queryCalls = 0;
      await expect(
        queryAtCheckpoint({
          definition: definitionFixture,
          checkpoint,
          client: {
            ledger: definitionFixture.ledger,
            async query() {
              queryCalls += 1;
              return [];
            },
            async sparql() {
              throw new Error("Federated SPARQL must not execute");
            },
          },
          query: {
            kind: "sparql",
            build: (snapshotLedger) =>
              `# PRAGMA reasoning: none\nSELECT *\nFROM <${snapshotLedger}>\nWHERE { ${alternateSource} }`,
          },
        })
      ).rejects.toThrow(/alternate source-selection construct|must not use GRAPH/u);
      expect(queryCalls).toBe(0);
    }
  });

  test("rejects GRAPH when the checkpoint has no semantic receipt", async () => {
    let queryCalls = 0;
    await expect(
      queryAtCheckpoint({
        definition: definitionFixture,
        checkpoint,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            queryCalls += 1;
            return [];
          },
          async sparql() {
            throw new Error("Unsealed graph SPARQL must not execute");
          },
        },
        query: {
          kind: "sparql",
          build: (snapshotLedger) =>
            `# PRAGMA reasoning: none\nSELECT *\nFROM <${snapshotLedger}>\nWHERE { GRAPH <https://example.test/live-graph> { ?subject ?predicate ?object } }`,
        },
      })
    ).rejects.toThrow(/must not use GRAPH/u);
    expect(queryCalls).toBe(0);
  });

  test("ignores source-selection words in SPARQL literals and comments", async () => {
    const sparqlQueries: string[] = [];
    await queryAtCheckpoint({
      definition: definitionFixture,
      checkpoint,
      client: {
        ledger: definitionFixture.ledger,
        async query(body) {
          return checkpointBoundaryResponse(body);
        },
        async sparql(sparql) {
          sparqlQueries.push(sparql);
          return [];
        },
      },
      query: {
        kind: "sparql",
        build: (snapshotLedger) =>
          `# PRAGMA reasoning: none\nSELECT ("FROM SERVICE GRAPH" AS ?label)\nFROM <${snapshotLedger}>\nWHERE { ?subject ?predicate ?value . FILTER (?value < 5) }\n# GRAPH <live:main>`,
      },
    });

    expect(sparqlQueries).toHaveLength(1);
  });

  test("fails closed when native reasoning is capped", () => {
    expect(() =>
      assertReasoningComplete({
        reasoning: { capped: true, capped_reason: "facts" },
      })
    ).toThrow(/capped \(facts\)/u);
  });
});

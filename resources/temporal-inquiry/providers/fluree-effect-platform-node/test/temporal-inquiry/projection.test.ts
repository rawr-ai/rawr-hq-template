import { describe, expect, test } from "vitest";

import type { JsonObject } from "../../fluree-client";
import { inquiryIri } from "../../namespaces";
import {
  assertProjectionGenerationImmutable,
  type CompleteProjectionEnvelope,
  intakeProjection,
  projectionGeneration,
} from "../../projection";
import { definitionFixture, SHA } from "./fixture";

const PROJECTION_NODE = "https://example.test/syntax/example";
const PROJECTION_PREDICATE = "https://example.test/syntax#name";
const HISTORY_GENERATION = inquiryIri(definitionFixture, "git:history-generation", "history-123");

function envelope(
  nodes: readonly JsonObject[] = [
    {
      "@id": PROJECTION_NODE,
      "@type": "https://example.test/syntax#Declaration",
    },
  ]
): CompleteProjectionEnvelope {
  const content = {
    schemaVersion: 1,
    kind: "projection",
    version: "example-syntax-v1",
    source: {
      id: "example-syntax",
      revision: SHA,
      path: "src/example.ts",
    },
    nodes,
    complete: true,
  } as const;
  return {
    ...content,
    generation: projectionGeneration(definitionFixture, content, HISTORY_GENERATION),
  };
}

describe("structural projection intake", () => {
  test("writes exact repository nodes and one generic complete generation atomically", async () => {
    let written: readonly JsonObject[] = [];
    let uniqueProperties: unknown;
    const pointQueries: JsonObject[] = [];
    const value = envelope();
    const historyGeneration = HISTORY_GENERATION;
    const report = await intakeProjection({
      definition: definitionFixture,
      envelope: value,
      historyGeneration,
      client: {
        ledger: definitionFixture.ledger,
        async query(body) {
          const where = JSON.stringify(body.where);
          if (body.where === undefined) {
            pointQueries.push(body);
            return [{ "@id": PROJECTION_NODE }];
          }
          return where.includes("ProjectionGeneration") ? [] : [["commit"]];
        },
        async insert(nodes, options) {
          written = Array.isArray(nodes) ? nodes : [nodes];
          uniqueProperties = options?.opts?.uniqueProperties;
          return {};
        },
      },
    });

    expect(report).toEqual({
      existing: false,
      ledger: definitionFixture.ledger,
      generation: value.generation,
      historyGeneration,
      observedCommit: SHA,
      nodes: 1,
      version: value.version,
    });
    expect(written.find((node) => node["@id"] === value.generation)).toEqual(
      expect.objectContaining({
        "@id": value.generation,
        "@type": "model:ProjectionGeneration",
        "model:historyGeneration": { "@id": historyGeneration },
        "model:observedCommit": {
          "@id": inquiryIri(definitionFixture, "git:commit", SHA),
        },
        "model:complete": true,
      })
    );
    expect(written).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "model:ProjectionCompletion",
          "model:projectionKey": { "@id": value.generation },
        }),
      ])
    );
    expect(uniqueProperties).toEqual([
      `${definitionFixture.namespace}model#projectionKey`,
      `${definitionFixture.namespace}model#node`,
    ]);
    expect(pointQueries).toEqual([
      {
        from: definitionFixture.ledger,
        reasoning: "none",
        select: [
          {
            [PROJECTION_NODE]: ["*"],
          },
        ],
      },
    ]);
  });

  test("refuses adapter-chosen identities and unobserved source revisions before writing", async () => {
    let writes = 0;
    const historyGeneration = HISTORY_GENERATION;
    await expect(
      intakeProjection({
        definition: definitionFixture,
        envelope: { ...envelope(), generation: "https://example.test/forged" },
        historyGeneration,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            return [["commit"]];
          },
          async insert() {
            writes += 1;
            return {};
          },
        },
      })
    ).rejects.toThrow(/exact content identity/u);
    await expect(
      intakeProjection({
        definition: definitionFixture,
        envelope: envelope(),
        historyGeneration,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            return [];
          },
          async insert() {
            writes += 1;
            return {};
          },
        },
      })
    ).rejects.toThrow(/not present in/u);
    expect(writes).toBe(0);
  });

  test("refuses a projection subject that already has ambient triples", async () => {
    let writes = 0;
    await expect(
      intakeProjection({
        definition: definitionFixture,
        envelope: envelope(),
        historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
        client: {
          ledger: definitionFixture.ledger,
          async query(body) {
            const where = JSON.stringify(body.where);
            if (body.where === undefined) {
              return [
                {
                  "@id": PROJECTION_NODE,
                  [PROJECTION_PREDICATE]: "ambient",
                },
              ];
            }
            return where.includes("ProjectionGeneration") ? [] : [["commit"]];
          },
          async insert() {
            writes += 1;
            return {};
          },
        },
      })
    ).rejects.toThrow(/fresh, generation-owned observations/u);
    expect(writes).toBe(0);
  });

  test("includes the exact history generation in projection identity", async () => {
    const otherHistoryGeneration = inquiryIri(
      definitionFixture,
      "git:history-generation",
      "history-456"
    );
    const value = envelope();
    const content = {
      schemaVersion: value.schemaVersion,
      kind: value.kind,
      version: value.version,
      source: value.source,
      nodes: value.nodes,
      complete: value.complete,
    } as const;

    expect(projectionGeneration(definitionFixture, content, HISTORY_GENERATION)).toBe(
      value.generation
    );
    expect(projectionGeneration(definitionFixture, content, otherHistoryGeneration)).not.toBe(
      value.generation
    );

    let queries = 0;
    await expect(
      intakeProjection({
        definition: definitionFixture,
        envelope: value,
        historyGeneration: otherHistoryGeneration,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            queries += 1;
            return [];
          },
          async insert() {
            throw new Error("Mismatched projection identity must not write");
          },
        },
      })
    ).rejects.toThrow(/exact content identity/u);
    expect(queries).toBe(0);
  });

  test("batches constant subject expansions and validates every returned identity", async () => {
    const nodes = Array.from({ length: 101 }, (_, index) => ({
      "@id": `https://example.test/syntax/generated-${String(index)}`,
      "@type": "https://example.test/syntax#Declaration",
    }));
    const batchSizes: number[] = [];
    let writes = 0;

    await intakeProjection({
      definition: definitionFixture,
      envelope: envelope(nodes),
      historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
      client: {
        ledger: definitionFixture.ledger,
        async query(body) {
          if (body.where !== undefined) {
            return JSON.stringify(body.where).includes("ProjectionGeneration") ? [] : [["commit"]];
          }
          if (!Array.isArray(body.select)) {
            throw new Error("Expected constant subject expansion columns");
          }
          const expansions = body.select.map((column) => {
            if (column === null || typeof column !== "object" || Array.isArray(column)) {
              throw new Error("Expected one constant subject expansion");
            }
            const subjects = Object.keys(column);
            if (subjects.length !== 1) throw new Error("Expected one subject per column");
            return { "@id": subjects[0] };
          });
          batchSizes.push(expansions.length);
          return expansions.length === 1 ? expansions : [expansions];
        },
        async insert() {
          writes += 1;
          return {};
        },
      },
    });

    expect(batchSizes).toEqual([100, 1]);
    expect(writes).toBe(1);
  });

  test.each([
    {
      label: "nested nodes",
      node: {
        "@id": PROJECTION_NODE,
        "https://example.test/syntax#child": {
          "@id": "https://example.test/syntax/child",
          "https://example.test/syntax#name": "child",
        },
      },
      error: /nested node/u,
    },
    {
      label: "blank-node references",
      node: {
        "@id": PROJECTION_NODE,
        "https://example.test/syntax#child": { "@id": "_:child" },
      },
      error: /blank node/u,
    },
    {
      label: "edge annotations",
      node: {
        "@id": PROJECTION_NODE,
        [PROJECTION_PREDICATE]: {
          "@value": "example",
          "@annotation": {
            "https://example.test/syntax#source": "adapter",
          },
        },
      },
      error: /edge annotation/u,
    },
    {
      label: "nested arrays",
      node: {
        "@id": PROJECTION_NODE,
        [PROJECTION_PREDICATE]: [["nested"]],
      },
      error: /nested array/u,
    },
  ])("refuses unsupported $label before querying or writing", async ({ node, error }) => {
    let calls = 0;
    await expect(
      intakeProjection({
        definition: definitionFixture,
        envelope: envelope([node]),
        historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            calls += 1;
            return [["commit"]];
          },
          async insert() {
            calls += 1;
            return {};
          },
        },
      })
    ).rejects.toThrow(error);
    expect(calls).toBe(0);
  });
});

describe("projection checkpoint immutability", () => {
  const snapshot = `${definitionFixture.ledger}@t:9`;
  const generation = envelope().generation;
  const otherProjectionNode = "https://example.test/syntax/other";
  const modelNamespace = `${definitionFixture.namespace}model#`;

  interface ExpansionResponse {
    readonly expansions: readonly Record<string, unknown>[];
    readonly from: string;
    readonly response: unknown;
    readonly subjects: readonly string[];
  }

  function client(options?: {
    readonly intakeRows?: readonly unknown[];
    readonly intakeNodes?: readonly string[];
    readonly checkpointNodes?: readonly string[];
    readonly mutate?: boolean;
    readonly mutateMarker?: boolean;
    readonly reorderCheckpoint?: boolean;
    readonly idOnlyNodes?: ReadonlySet<string>;
    readonly pointQueries?: JsonObject[];
    readonly transformExpansionResponse?: (value: ExpansionResponse) => unknown;
  }) {
    return {
      ledger: definitionFixture.ledger,
      async query(body: JsonObject) {
        const where = JSON.stringify(body.where) ?? "";
        if (body.from === definitionFixture.ledger && where.includes("git:Commit")) {
          return [["commit"]];
        }
        if (
          body.from === definitionFixture.ledger &&
          where.includes("model:ProjectionGeneration")
        ) {
          return [[generation]];
        }
        if (body.from === `${definitionFixture.ledger}#txn-meta`) {
          return options?.intakeRows ?? [["fluree:commit:sha256:intake", 7]];
        }
        if (body.where !== undefined || !Array.isArray(body.select)) {
          throw new Error(`Unexpected projection query: ${JSON.stringify(body)}`);
        }
        options?.pointQueries?.push(body);
        const subjects = body.select.map((column) => {
          if (column === null || typeof column !== "object" || Array.isArray(column)) {
            throw new Error("Expected a constant projection subject root");
          }
          const roots = Object.keys(column);
          if (roots.length !== 1) throw new Error("Expected one root per expansion column");
          return roots[0];
        });
        const checkpoint = body.from === snapshot;
        const memberIds = checkpoint
          ? (options?.checkpointNodes ?? options?.intakeNodes ?? [PROJECTION_NODE])
          : (options?.intakeNodes ?? [PROJECTION_NODE]);
        let expansions = subjects.map((subject) => {
          if (subject === generation) {
            const nodeValues = memberIds.map((node) => ({ "@id": node }));
            return {
              "@id": generation,
              "@type": `${modelNamespace}ProjectionGeneration`,
              [`${modelNamespace}projectionVersion`]:
                options?.mutateMarker === true && checkpoint
                  ? "mutated-version"
                  : "example-syntax-v1",
              [`${modelNamespace}node`]:
                nodeValues.length === 1
                  ? nodeValues[0]
                  : options?.reorderCheckpoint === true && checkpoint
                    ? [...nodeValues].reverse()
                    : nodeValues,
              [`${modelNamespace}complete`]: true,
            };
          }
          if (options?.idOnlyNodes?.has(subject) === true) return { "@id": subject };
          const values =
            options?.mutate === true && checkpoint && subject === PROJECTION_NODE
              ? ["mutated", "second"]
              : options?.reorderCheckpoint === true && checkpoint
                ? ["second", "original"]
                : ["original", "second"];
          return {
            "@id": subject,
            "@type": "https://example.test/syntax#Declaration",
            [PROJECTION_PREDICATE]: values,
          };
        });
        if (options?.reorderCheckpoint === true && checkpoint && expansions.length > 1) {
          expansions = [...expansions].reverse();
        }
        const response = subjects.length === 1 ? [expansions[0]] : [expansions];
        return (
          options?.transformExpansionResponse?.({
            expansions,
            from: String(body.from),
            response,
            subjects,
          }) ?? response
        );
      },
    };
  }

  test("reuses an already complete immutable projection generation", async () => {
    let writes = 0;
    const report = await intakeProjection({
      definition: definitionFixture,
      envelope: envelope(),
      historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
      client: {
        ...client(),
        async insert() {
          writes += 1;
          return {};
        },
      },
    });

    expect(report.existing).toBe(true);
    expect(writes).toBe(0);
  });

  test("uses bounded constant-root expansions at intake and checkpoint snapshots", async () => {
    const pointQueries: JsonObject[] = [];
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ pointQueries }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).resolves.toBeUndefined();

    expect(pointQueries.map((query) => query.from)).toEqual([
      `${definitionFixture.ledger}@t:7`,
      snapshot,
      `${definitionFixture.ledger}@t:7`,
      snapshot,
    ]);
    expect(pointQueries).toHaveLength(4);
    for (const query of pointQueries) {
      expect(query).not.toHaveProperty("@context");
      expect(query).not.toHaveProperty("where");
      expect(query.select).toEqual(expect.any(Array));
      for (const column of query.select as readonly JsonObject[]) {
        const roots = Object.keys(column);
        expect(roots).toHaveLength(1);
        expect(roots[0]).toMatch(/^https:\/\//u);
        expect(column[roots[0]]).toEqual(["*"]);
      }
    }
    expect(JSON.stringify(pointQueries)).not.toContain("VALUES ?subject");
  });

  test("compares direct RDF terms as sets regardless of root or value order", async () => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({
          intakeNodes: [PROJECTION_NODE, otherProjectionNode],
          reorderCheckpoint: true,
        }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).resolves.toBeUndefined();
  });

  test("batches immutable subject boundaries deterministically", async () => {
    const nodes = Array.from(
      { length: 101 },
      (_, index) => `https://example.test/syntax/boundary-${String(index).padStart(3, "0")}`
    );
    const pointQueries: JsonObject[] = [];

    await expect(
      assertProjectionGenerationImmutable({
        client: client({ intakeNodes: nodes, pointQueries }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).resolves.toBeUndefined();

    expect(pointQueries.map((query) => (query.select as readonly unknown[]).length)).toEqual([
      1, 1, 100, 1, 100, 1,
    ]);
    expect(pointQueries.map((query) => query.from)).toEqual([
      `${definitionFixture.ledger}@t:7`,
      snapshot,
      `${definitionFixture.ledger}@t:7`,
      `${definitionFixture.ledger}@t:7`,
      snapshot,
      snapshot,
    ]);
  });

  test("rejects projection content mutated between intake and checkpoint", async () => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ mutate: true }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(/content changed after its intake transaction/u);
  });

  test("rejects projection marker metadata mutated after intake", async () => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ mutateMarker: true }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(/content changed after its intake transaction/u);
  });

  test("rejects projection node membership mutated after intake", async () => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ checkpointNodes: [otherProjectionNode] }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(/node membership changed/u);
  });

  test("preserves an explicitly admitted member with no outgoing triples", async () => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ idOnlyNodes: new Set([PROJECTION_NODE]) }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).resolves.toBeUndefined();
  });

  test.each([
    {
      label: "missing root",
      transform: ({ from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE ? [] : response,
      error: /invalid projection subject expansion response/u,
    },
    {
      label: "malformed single-root shape",
      transform: ({ expansions, from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE ? [[expansions[0]]] : response,
      error: /invalid projection subject expansion response/u,
    },
    {
      label: "nested reference",
      transform: ({ expansions, from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE
          ? [
              {
                ...expansions[0],
                [PROJECTION_PREDICATE]: {
                  "@id": otherProjectionNode,
                  [PROJECTION_PREDICATE]: "nested",
                },
              },
            ]
          : response,
      error: /direct IRI reference, not a nested node/u,
    },
    {
      label: "blank reference",
      transform: ({ expansions, from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE
          ? [
              {
                ...expansions[0],
                [PROJECTION_PREDICATE]: { "@id": "_:blank" },
              },
            ]
          : response,
      error: /must not reference a blank node/u,
    },
    {
      label: "edge annotation",
      transform: ({ expansions, from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE
          ? [
              {
                ...expansions[0],
                [PROJECTION_PREDICATE]: {
                  "@value": "annotated",
                  "@annotation": { [PROJECTION_PREDICATE]: "review" },
                },
              },
            ]
          : response,
      error: /must not contain an edge annotation/u,
    },
    {
      label: "nested array",
      transform: ({ expansions, from, subjects, response }: ExpansionResponse) =>
        from === snapshot && subjects[0] === PROJECTION_NODE
          ? [{ ...expansions[0], [PROJECTION_PREDICATE]: [["nested"]] }]
          : response,
      error: /must not contain a nested array/u,
    },
  ])("fails closed on a $label expansion", async ({ transform, error }) => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ transformExpansionResponse: transform }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(error);
  });

  test.each([
    "duplicate",
    "unexpected",
  ] as const)("fails closed on a %s root in a multi-root expansion", async (kind) => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({
          intakeNodes: [PROJECTION_NODE, otherProjectionNode],
          transformExpansionResponse: ({ expansions, from, response, subjects }) => {
            if (from !== snapshot || subjects[0] === generation) return response;
            return [
              [
                expansions[0],
                kind === "duplicate"
                  ? expansions[0]
                  : {
                      ...expansions[1],
                      "@id": "https://example.test/syntax/unexpected",
                    },
              ],
            ];
          },
        }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(/invalid projection subject expansion response/u);
  });

  test.each([
    {
      label: "missing",
      rows: [] as const,
      error: /has no projection intake transaction/u,
    },
    {
      label: "duplicate",
      rows: [
        ["fluree:commit:sha256:first", 7],
        ["fluree:commit:sha256:second", 8],
      ] as const,
      error: /more than one projection intake transaction/u,
    },
  ])("rejects a $label projection intake transaction", async ({ rows, error }) => {
    await expect(
      assertProjectionGenerationImmutable({
        client: client({ intakeRows: rows }),
        definition: definitionFixture,
        generation,
        snapshot,
      })
    ).rejects.toThrow(error);
  });
});

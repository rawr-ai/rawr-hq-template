import { describe, expect, test } from "vitest";

import type { FlureeGraphUpdate, FlureeLedgerInfo, JsonObject } from "../../fluree-client";
import {
  MATERIALIZATION_LEDGER_TOKEN,
  refreshSemanticMaterialization,
  semanticMaterializationIri,
} from "../../materialization";
import { evidenceHash, semanticGraphIri } from "../../namespaces";
import { definitionFixture } from "./fixture";

const MODEL_HASH = "model-hash";
const CONTEXT = {
  ex: "https://example.test/",
  model: "https://example.test/inquiry/model#",
} satisfies JsonObject;
const MATERIALIZATION_QUERY = `# PRAGMA reasoning: datalog
PREFIX ex: <https://example.test/>
CONSTRUCT {
  ?subject ex:status ?status .
}
FROM ${MATERIALIZATION_LEDGER_TOKEN}
WHERE {
  ?subject ex:derivedStatus ?status .
}`;

function ledgerHead(t: number): FlureeLedgerInfo {
  return {
    ledger: definitionFixture.ledger,
    commitT: t,
    indexT: t,
    commitId: `fluree:commit:${String(t)}`,
    indexId: `fluree:index:${String(t)}`,
  };
}

function trackedGraph(
  nodes: readonly JsonObject[],
  context: JsonObject | undefined = CONTEXT,
  reasoning: unknown = { capped: false }
): unknown {
  return {
    result: {
      ...(context === undefined ? {} : { "@context": context }),
      "@graph": nodes,
    },
    reasoning,
  };
}

function clientHarness(
  options: {
    readonly infos?: readonly FlureeLedgerInfo[];
    readonly committed?: unknown;
    readonly next?: unknown;
    readonly previous?: unknown;
    readonly update?: unknown;
  } = {}
) {
  const queries: Array<{ readonly query: string; readonly tracked?: boolean }> = [];
  const updates: FlureeGraphUpdate[] = [];
  const waits: number[] = [];
  const infos = options.infos ?? [ledgerHead(12), ledgerHead(12), ledgerHead(13)];
  const next = options.next ?? trackedGraph([{ "@id": "ex:derived", "ex:status": "current" }]);
  const responses = [
    options.previous ?? trackedGraph([], CONTEXT),
    next,
    options.committed ?? next,
  ];
  let infoIndex = 0;
  let responseIndex = 0;

  const client = {
    ledger: definitionFixture.ledger,
    async info(): Promise<FlureeLedgerInfo> {
      const info = infos[infoIndex];
      infoIndex += 1;
      if (info === undefined) throw new Error("Unexpected ledger info request");
      return info;
    },
    async sparql(query: string, tracked?: boolean): Promise<unknown> {
      queries.push({ query, tracked });
      const response = responses[responseIndex];
      responseIndex += 1;
      if (response === undefined) throw new Error("Unexpected SPARQL request");
      return response;
    },
    async updateGraph(update: FlureeGraphUpdate): Promise<unknown> {
      updates.push(update);
      return options.update ?? { result: { updated: true }, t: 13 };
    },
    async waitForIndex(): Promise<FlureeLedgerInfo> {
      waits.push(waits.length + 1);
      return waits.length === 1 ? (infos[0] ?? ledgerHead(12)) : (infos.at(-1) ?? ledgerHead(13));
    },
  };

  return { client, queries, updates, waits };
}

describe("semantic materialization", () => {
  test("reads the previous graph without reasoning then atomically replaces the fixed graph from one Datalog CONSTRUCT", async () => {
    const previous = [{ "@id": "ex:derived", "ex:status": "stale" }] satisfies JsonObject[];
    const next = [
      { "@id": "ex:derived", "ex:status": "current" },
      { "@id": "ex:other", "ex:status": "current" },
    ] satisfies JsonObject[];
    const harness = clientHarness({
      previous: trackedGraph(previous, { ex: CONTEXT.ex }),
      next: trackedGraph(next, CONTEXT),
    });

    const result = await refreshSemanticMaterialization({
      client: harness.client,
      definition: definitionFixture,
      modelHash: MODEL_HASH,
      query: MATERIALIZATION_QUERY,
    });

    const graph = semanticGraphIri(definitionFixture);
    const builtQuery = MATERIALIZATION_QUERY.replace(
      MATERIALIZATION_LEDGER_TOKEN,
      `<${definitionFixture.ledger}>`
    );
    expect(harness.queries).toHaveLength(3);
    expect(harness.queries[0]).toEqual({
      query: `# PRAGMA reasoning: none
PREFIX ex: <https://example.test/>

CONSTRUCT {
  ?subject ?predicate ?object .
}
FROM <${definitionFixture.ledger}#${graph}>
WHERE {
  ?subject ?predicate ?object .
}`,
      tracked: true,
    });
    expect(harness.queries[1]).toEqual({ query: builtQuery, tracked: true });
    expect(harness.queries[2]).toEqual({
      query: `# PRAGMA reasoning: none
PREFIX ex: <https://example.test/>

CONSTRUCT {
  ?subject ?predicate ?object .
}
FROM <${definitionFixture.ledger}@t:13#${graph}>
WHERE {
  ?subject ?predicate ?object .
}`,
      tracked: true,
    });
    expect(harness.queries[0]?.query.match(/\bCONSTRUCT\b/gu)).toHaveLength(1);
    expect(harness.queries[1]?.query.match(/\bCONSTRUCT\b/gu)).toHaveLength(1);
    expect(harness.queries[0]?.query).toContain("# PRAGMA reasoning: none");
    expect(harness.queries[1]?.query).toContain("# PRAGMA reasoning: datalog");

    expect(harness.updates).toEqual([
      {
        graph,
        context: CONTEXT,
        delete: previous,
        insert: next,
        tracked: true,
      },
    ]);
    expect(harness.waits).toHaveLength(2);
    expect(result).toMatchObject({
      graph,
      queryHash: evidenceHash(builtQuery),
      modelHash: MODEL_HASH,
      baseT: 12,
      materializedT: 13,
      nodeCount: 2,
    });
    const { id, ...identity } = result;
    expect(id).toBe(semanticMaterializationIri(definitionFixture, identity));
  });

  test("refuses a receipt when the committed graph differs from the Datalog result", async () => {
    const harness = clientHarness({
      committed: trackedGraph([{ "@id": "ex:derived", "ex:status": "unexpected" }]),
    });

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query: MATERIALIZATION_QUERY,
      })
    ).rejects.toThrow(/Committed semantic JSON-LD graph does not equal/u);

    expect(harness.updates).toHaveLength(1);
    expect(harness.queries).toHaveLength(3);
  });

  test("refuses a receipt when the committed context changes compact IRI meaning", async () => {
    const nodes = [{ "@id": "ex:derived", "ex:status": "current" }] satisfies JsonObject[];
    const harness = clientHarness({
      next: trackedGraph(nodes, { ex: "https://example.test/" }),
      committed: trackedGraph(nodes, { ex: "https://other.example/" }),
    });

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query: MATERIALIZATION_QUERY,
      })
    ).rejects.toThrow(/Committed semantic JSON-LD graph does not equal/u);

    expect(harness.updates).toHaveLength(1);
    expect(harness.queries).toHaveLength(3);
  });

  test("preserves order-sensitive arrays inside scoped JSON-LD contexts", async () => {
    const nodes = [{ "@id": "ex:derived", "ex:status": "current" }] satisfies JsonObject[];
    const first = { local: "https://first.example/" };
    const second = { local: "https://second.example/" };
    const context = (scoped: readonly JsonObject[]) =>
      ({
        ex: "https://example.test/",
        scoped: {
          "@context": scoped,
          "@id": "ex:scoped",
        },
      }) satisfies JsonObject;
    const harness = clientHarness({
      next: trackedGraph(nodes, context([first, second])),
      committed: trackedGraph(nodes, context([second, first])),
    });

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query: MATERIALIZATION_QUERY,
      })
    ).rejects.toThrow(/Committed semantic JSON-LD graph does not equal/u);
  });

  test("refuses publication when the ledger head changes during construction", async () => {
    const harness = clientHarness({
      infos: [ledgerHead(12), ledgerHead(13)],
    });

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query: MATERIALIZATION_QUERY,
      })
    ).rejects.toThrow(/head changed while semantic materialization was being constructed/u);

    expect(harness.queries).toHaveLength(2);
    expect(harness.updates).toHaveLength(0);
    expect(harness.waits).toHaveLength(1);
  });

  test.each([
    {
      name: "an explicitly labelled blank node",
      response: () => trackedGraph([{ "@id": "_:derived", "ex:status": "current" }]),
      error: /blank node/u,
    },
    {
      name: "an anonymous JSON-LD node",
      response: () => trackedGraph([{ "@type": "ex:Derived", "ex:status": "current" }]),
      error: /ground @id/u,
    },
    {
      name: "a nested anonymous JSON-LD node",
      response: () =>
        trackedGraph([
          {
            "@id": "ex:derived",
            "ex:related": { "@type": "ex:Related", "ex:status": "current" },
          },
        ]),
      error: /blank node/u,
    },
    {
      name: "an empty closure",
      response: () => trackedGraph([]),
      error: /empty semantic materialization/u,
    },
    {
      name: "capped native reasoning",
      response: () =>
        trackedGraph([{ "@id": "ex:derived", "ex:status": "current" }], CONTEXT, {
          capped: true,
          capped_reason: "max iterations",
        }),
      error: /capped \(max iterations\)/u,
    },
    {
      name: "a closure above the node cap",
      response: () =>
        trackedGraph(
          Array.from(
            { length: 100_001 },
            (_, index) => ({ "@id": `ex:derived-${String(index)}` }) satisfies JsonObject
          )
        ),
      error: /100000 node limit/u,
    },
  ])("rejects $name", async ({ response, error }) => {
    const harness = clientHarness({ next: response() });

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query: MATERIALIZATION_QUERY,
      })
    ).rejects.toThrow(error);

    expect(harness.updates).toHaveLength(0);
  });

  test.each([
    {
      name: "a missing ledger placeholder",
      query: MATERIALIZATION_QUERY.replace(
        MATERIALIZATION_LEDGER_TOKEN,
        `<${definitionFixture.ledger}>`
      ),
      error: /exactly one __QUERY_LEDGER__/u,
    },
    {
      name: "a repeated ledger placeholder",
      query: MATERIALIZATION_QUERY.replace(
        `FROM ${MATERIALIZATION_LEDGER_TOKEN}`,
        `FROM ${MATERIALIZATION_LEDGER_TOKEN}\nFROM ${MATERIALIZATION_LEDGER_TOKEN}`
      ),
      error: /exactly one __QUERY_LEDGER__/u,
    },
    {
      name: "an unresolved template placeholder",
      query: MATERIALIZATION_QUERY.replace(
        "WHERE {",
        "WHERE {\n  BIND(__UNRESOLVED__ AS ?unresolved)"
      ),
      error: /unresolved template token/u,
    },
    {
      name: "a second FROM source",
      query: MATERIALIZATION_QUERY.replace(
        `FROM ${MATERIALIZATION_LEDGER_TOKEN}`,
        `FROM ${MATERIALIZATION_LEDGER_TOKEN}\nFROM <urn:other>`
      ),
      error: /exactly one kernel-owned FROM source/u,
    },
    {
      name: "a GRAPH dataset clause",
      query: MATERIALIZATION_QUERY.replace(
        "WHERE {",
        "WHERE {\n  GRAPH ?graph { ?subject ?predicate ?object }"
      ),
      error: /must not use GRAPH/u,
    },
    {
      name: "a SERVICE hidden after a less-than comparison",
      query: MATERIALIZATION_QUERY.replace(
        "WHERE {",
        "WHERE {\n  FILTER (?status < 5)\n  SERVICE <https://remote.example/ledger> { ?s ?p ?o }"
      ),
      error: /must not use SERVICE/u,
    },
    {
      name: "a second reasoning pragma",
      query: MATERIALIZATION_QUERY.replace(
        "# PRAGMA reasoning: datalog",
        "# PRAGMA reasoning: datalog\n# PRAGMA reasoning: none"
      ),
      error: /must select native Datalog reasoning/u,
    },
    {
      name: "a ledger placeholder outside the FROM source",
      query: MATERIALIZATION_QUERY.replace(
        `FROM ${MATERIALIZATION_LEDGER_TOKEN}`,
        `FROM <urn:other>\n# ${MATERIALIZATION_LEDGER_TOKEN}`
      ),
      error: /exactly one __QUERY_LEDGER__/u,
    },
  ])("rejects materialization query with $name", async ({ query, error }) => {
    const harness = clientHarness();

    await expect(
      refreshSemanticMaterialization({
        client: harness.client,
        definition: definitionFixture,
        modelHash: MODEL_HASH,
        query,
      })
    ).rejects.toThrow(error);

    expect(harness.queries).toHaveLength(0);
    expect(harness.updates).toHaveLength(0);
  });

  test("derives the same content receipt from equivalent JSON-LD ordering", async () => {
    const left = clientHarness({
      next: trackedGraph(
        [
          { "@id": "ex:two", "ex:tags": ["beta", "alpha"], "ex:value": 2 },
          { "@id": "ex:one", "ex:value": 1 },
        ],
        { ex: CONTEXT.ex, model: CONTEXT.model }
      ),
    });
    const right = clientHarness({
      next: trackedGraph(
        [
          { "ex:value": 1, "@id": "ex:one" },
          { "ex:value": 2, "ex:tags": ["alpha", "beta"], "@id": "ex:two" },
        ],
        { model: CONTEXT.model, ex: CONTEXT.ex }
      ),
    });

    const [leftReceipt, rightReceipt] = await Promise.all(
      [left, right].map(({ client }) =>
        refreshSemanticMaterialization({
          client,
          definition: definitionFixture,
          modelHash: MODEL_HASH,
          query: MATERIALIZATION_QUERY,
        })
      )
    );

    expect(leftReceipt).toEqual(rightReceipt);
    expect(leftReceipt.contentHash).toMatch(/^[0-9a-f]{64}$/u);
  });
});

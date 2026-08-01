import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

import { refreshSemanticMaterialization } from "../../materialization";
import { namespacesFor, semanticGraphIri, sparqlIri } from "../../namespaces";
import { runTemporalInquiryOperation } from "../../operation";
import { definitionFixture } from "./fixture";

const liveTest = process.env.HABITAT_FLUREE_LIVE === "1" ? test : test.skip;

function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local TCP port"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

liveTest(
  "materializes Datalog once and serves indexed semantic history without reasoning",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "habitat-materialization-live-"));
    const cacheRoot = join(root, "cache");
    try {
      const port = await availablePort();
      const definition = {
        ...definitionFixture,
        ledger: "habitat/materialization-live:main",
        runtime: {
          ...definitionFixture.runtime,
          endpoint: `http://127.0.0.1:${port}`,
          storage: "storage",
        },
      };
      const namespaces = namespacesFor(definition);
      const semanticGraph = semanticGraphIri(definition);
      await runTemporalInquiryOperation(
        { access: "write", cacheRoot, definition, root },
        async ({ client }) => {
          await client.createLedger();
          await client.upsertTrig(
            `@prefix f: <https://ns.flur.ee/db#> .
GRAPH <${namespaces.graphs.rules}> {
  <https://example.test/rule/derive>
    f:rule """
      PREFIX ex: <https://example.test/>
      CONSTRUCT {
        ?subject ex:derived ?object .
        ?subject ex:inferredByRule <https://example.test/rule/derive> .
      }
      WHERE {
        ?subject ex:source ?object .
      }
    """^^f:sparql .
}
`,
            true
          );
          await client.upsertTrig(
            `@prefix f: <https://ns.flur.ee/db#> .
GRAPH <urn:fluree:${definition.ledger}#config> {
  <https://example.test/config/ledger>
    a f:LedgerConfig ;
    f:reasoningDefaults <https://example.test/config/reasoning> ;
    f:datalogDefaults <https://example.test/config/datalog> .

  <https://example.test/config/reasoning>
    f:overrideControl f:OverrideAll .

  <https://example.test/config/datalog>
    f:datalogEnabled true ;
    f:rulesSource <https://example.test/config/rules-ref> ;
    f:allowQueryTimeRules false ;
    f:overrideControl f:OverrideNone .

  <https://example.test/config/rules-ref>
    a f:GraphRef ;
    f:graphSource <https://example.test/config/rules-source> .

  <https://example.test/config/rules-source>
    f:graphSelector <${namespaces.graphs.rules}> .
}
`,
            true
          );
          await client.upsert(
            {
              "@id": "https://example.test/input",
              "https://example.test/source": "first",
            },
            { tracked: true }
          );

          const query = `# PRAGMA reasoning: datalog
PREFIX ex: <https://example.test/>
CONSTRUCT {
  ?subject ?predicate ?object .
}
FROM __QUERY_LEDGER__
WHERE {
  VALUES ?predicate {
    ex:derived
    ex:inferredByRule
  }
  ?subject ?predicate ?object .
}`;
          const first = await refreshSemanticMaterialization({
            client,
            definition,
            modelHash: "a".repeat(64),
            query,
          });
          expect(first.graph).toBe(semanticGraph);
          expect(first.nodeCount).toBe(1);

          const read = (ledger: string) =>
            client.sparql(`# PRAGMA reasoning: none
PREFIX ex: <https://example.test/>
SELECT ?value
FROM ${sparqlIri(ledger)}
FROM NAMED ${sparqlIri(`${ledger}#${semanticGraph}`)}
WHERE {
  GRAPH ${sparqlIri(`${definition.ledger}#${semanticGraph}`)} {
    <https://example.test/input> ex:derived ?value .
  }
}`);
          const started = performance.now();
          expect(JSON.stringify(await read(definition.ledger))).toContain("first");
          expect(performance.now() - started).toBeLessThan(1_000);

          await client.upsert(
            {
              "@id": "https://example.test/input",
              "https://example.test/source": "second",
            },
            { tracked: true }
          );
          const second = await refreshSemanticMaterialization({
            client,
            definition,
            modelHash: "a".repeat(64),
            query,
          });
          expect(second.materializedT).toBeGreaterThan(first.materializedT);
          const current = JSON.stringify(await read(definition.ledger));
          expect(current).toContain("second");
          expect(current).not.toContain("first");
          const historicalStarted = performance.now();
          expect(
            JSON.stringify(await read(`${definition.ledger}@t:${String(first.materializedT)}`))
          ).toContain("first");
          expect(performance.now() - historicalStarted).toBeLessThan(1_000);
        }
      );
      expect(await readdir(cacheRoot)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);

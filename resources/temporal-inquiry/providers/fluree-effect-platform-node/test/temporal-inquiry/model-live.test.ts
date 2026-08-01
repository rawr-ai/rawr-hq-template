import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

import { FlureeHttpError } from "../../fluree-client";
import { integratedModelDocument } from "../../model";
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
  "admits cross-file reviewed facts as one shaped Fluree transaction",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "habitat-model-live-"));
    const cacheRoot = join(root, "cache");
    try {
      const port = await availablePort();
      await runTemporalInquiryOperation(
        {
          access: "write",
          cacheRoot,
          definition: {
            ...definitionFixture,
            ledger: "habitat/model-live:main",
            runtime: {
              ...definitionFixture.runtime,
              endpoint: `http://127.0.0.1:${port}`,
              storage: "storage",
            },
          },
          root,
        },
        async ({ client }) => {
          await client.createLedger();
          const shapeReceipt = await client.upsertTurtle(
            `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <https://example.test/> .
ex:BindingShape a sh:NodeShape ;
  sh:targetClass ex:Binding ;
  sh:property [
    sh:path ex:governedBy ;
    sh:minCount 1 ;
    sh:class ex:Authority
  ] .
`,
            true
          );
          const configReceipt = await client.upsertTrig(
            `@prefix f: <https://ns.flur.ee/db#> .
GRAPH <urn:fluree:habitat/model-live:main#config> {
  <urn:config> f:shaclEnabled true ;
    f:validationMode f:ValidationReject .
}
`,
            true
          );
          expect(shapeReceipt).toEqual(
            expect.objectContaining({
              commit: expect.any(String),
              t: expect.any(Number),
              transaction: expect.stringMatching(/^fluree:tx:/u),
            })
          );
          expect(configReceipt).toEqual(
            expect.objectContaining({
              commit: expect.any(String),
              t: expect.any(Number),
              transaction: expect.stringMatching(/^fluree:tx:/u),
            })
          );
          const configResult = await client.query({
            "@context": { f: "https://ns.flur.ee/db#" },
            from: {
              "@id": "habitat/model-live:main",
              graph: "urn:fluree:habitat/model-live:main#config",
            },
            select: ["?config"],
            where: {
              "@id": "?config",
              "f:shaclEnabled": "?enabled",
            },
          });
          expect(JSON.stringify(configResult)).toContain("urn:config");

          const binding = {
            "@context": {
              ex: "https://example.test/",
              id: "https://example.test/id/",
            },
            "@graph": [
              {
                "@id": "id:path/binding",
                "@type": "ex:Binding",
                "ex:governedBy": {
                  "@id": "id:path/authority",
                  "@annotation": {
                    "ex:reviewedBy": { "@id": "id:reviewer/product" },
                  },
                },
              },
            ],
          } as const;
          const authority = {
            "@context": {
              ex: "https://example.test/",
              id: "https://example.test/id/",
            },
            "@graph": [{ "@id": "id:path/authority", "@type": "ex:Authority" }],
          } as const;

          await expect(client.upsertJsonLd(binding)).rejects.toBeInstanceOf(FlureeHttpError);
          await client.upsertJsonLd(integratedModelDocument([binding, authority]));

          const result = await client.sparql(`SELECT (COUNT(?binding) AS ?count)
FROM <habitat/model-live:main>
WHERE {
  ?binding a <https://example.test/Binding> ;
    <https://example.test/governedBy> ?authority .
  ?authority a <https://example.test/Authority> .
}`);
          expect(JSON.stringify(result)).toContain('"value":"1"');
        }
      );
      expect(await readdir(cacheRoot)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);

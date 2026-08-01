import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { contextFor, inquiryIri } from "../../namespaces";
import { runTemporalInquiryOperation } from "../../operation";
import { assertProjectionGenerationImmutable } from "../../projection";
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
  "compares projection point expansions across exact Fluree time travel",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "habitat-projection-live-"));
    const cacheRoot = join(root, "cache");
    try {
      const port = await availablePort();
      const definition = {
        ...definitionFixture,
        ledger: "habitat/projection-live:main",
        runtime: {
          ...definitionFixture.runtime,
          endpoint: `http://127.0.0.1:${String(port)}`,
          storage: "storage",
        },
      };
      const generation = inquiryIri(definition, "model:projection-generation", "live-boundary");
      const node = "https://example.test/projection/live-node";

      await runTemporalInquiryOperation(
        {
          access: "write",
          cacheRoot,
          definition,
          root,
        },
        async ({ client }) => {
          await client.createLedger();
          await client.insert(
            [
              {
                "@id": node,
                "@type": "https://example.test/projection#Node",
                "https://example.test/projection#name": ["alpha", "beta"],
              },
              {
                "@id": generation,
                "@type": "model:ProjectionGeneration",
                "model:node": { "@id": node },
                "model:complete": true,
              },
            ],
            {
              context: contextFor(definition),
              metadata: {
                "f:message": "Admit live projection boundary",
                "meta:job": "projection-intake",
                "meta:generation": { "@id": generation },
              },
              tracked: true,
            }
          );

          await expect(
            assertProjectionGenerationImmutable({ client, definition, generation })
          ).resolves.toBeUndefined();

          await client.insert(
            {
              "@id": node,
              "https://example.test/projection#changed": true,
            },
            { tracked: true }
          );
          await expect(
            assertProjectionGenerationImmutable({ client, definition, generation })
          ).rejects.toThrow(/content changed after its intake transaction/u);
        }
      );
      expect(await readdir(cacheRoot)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);

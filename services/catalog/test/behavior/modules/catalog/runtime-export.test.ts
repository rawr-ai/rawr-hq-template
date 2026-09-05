import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import type { ServiceClientAssembly } from "@habitat-ai/sdk/service";
import { createEffectClient } from "@orpc/experimental-effect";
import { Context, Effect, FileSystem, Path } from "effect";
import { contract, definition, serviceRuntimeExport } from "../../../../src/client";

test("catalog complete export stays cold and uses supplied native client assembly", async () => {
  const root = await mkdtemp(join(tmpdir(), "catalog-runtime-export-"));
  try {
    let binds = 0;
    let operations = 0;
    const clients: ServiceClientAssembly = {
      bind: ({ context, createNativeClient }) => {
        binds++;
        return createEffectClient(
          createNativeClient({
            context: () => ({ ...context(), "effect/context": Context.empty() }),
          })
        );
      },
    };
    const filesystem = await Effect.runPromise(
      Effect.gen(function* () {
        return { fileSystem: yield* FileSystem.FileSystem, path: yield* Path.Path };
      }).pipe(Effect.provide(NodeServices.layer))
    );
    const client = serviceRuntimeExport.construct({
      clients,
      deps: {
        filesystem,
        ruleEvaluation: {
          evaluate: () => {
            operations++;
            return Effect.succeed({ results: [] });
          },
        },
        sourceInventory: {
          observe: () => {
            operations++;
            return Effect.succeed({ paths: [], trackedNonFilePaths: [] });
          },
        },
      },
      scope: { workspaceRoot: root },
      config: {
        policyPack: {
          name: "test-pack",
          packageJsonPath: join(root, "package.json"),
          manifestPath: join(root, "habitat-pack.json"),
        },
      },
    });
    expect(serviceRuntimeExport.definition).toBe(definition);
    expect(serviceRuntimeExport.contract).toBe(contract);
    expect(binds).toBe(0);
    expect(operations).toBe(0);
    const invocation = client.withInvocation({});
    expect(binds).toBe(1);
    expect(operations).toBe(0);
    const result = await Effect.runPromise(invocation.catalog.resolve({}));
    expect(result._tag).toBe("Rejected");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

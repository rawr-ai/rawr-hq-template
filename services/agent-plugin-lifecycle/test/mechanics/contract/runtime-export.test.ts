import type { ContentWorkspaceFailure } from "@habitat-ai/resource-content-workspace";
import type { ServiceClientAssembly } from "@habitat-ai/sdk/service";
import { createEffectClient } from "@orpc/experimental-effect";
import { Clock, Effect } from "effect";
import { expect, it } from "vitest";

import { contract, definition, serviceRuntimeExport } from "../../../src/client";
import { testRequest } from "../../support/modules/providers/fixture";
import {
  clockInvocation,
  unavailableContentWorkspace,
  unavailablePackageOutput,
  unavailableProviderResources,
  unavailableVersionedContent,
} from "../../support/service/client";

it("retains supplied native assembly and distinct per-invocation Effect contexts through service construction", async () => {
  let bindings = 0;
  let wraps = 0;
  let finalizers = 0;
  const contexts: object[] = [];
  const readings: { before: number; after?: number }[] = [];
  const entered = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  const failure: ContentWorkspaceFailure = {
    _tag: "ContentWorkspaceFailure",
    operation: "inspect-git-workspace",
    reason: "GitFailed",
    detail: "No native provider mutation is needed for the context proof",
  };
  const contentWorkspace = {
    ...unavailableContentWorkspace(),
    inspectGitWorkspace: () =>
      Effect.gen(function* () {
        const reading: { before: number; after?: number } = {
          before: yield* Clock.currentTimeMillis,
        };
        readings.push(reading);
        if (readings.length === 2) entered.resolve();
        yield* Effect.promise(() => resume.promise);
        reading.after = yield* Clock.currentTimeMillis;
        return yield* Effect.fail(failure);
      }),
  };
  // This is a constructor-contract proof using native options, not process acquisition.
  const clients: ServiceClientAssembly = {
    bind: ({ context, createNativeClient }) => {
      const instant = ++bindings * 1_000;
      const effectContext = clockInvocation(() => new Date(instant)).context["effect/context"];
      return createEffectClient(
        createNativeClient({
          context: () => {
            const lanes = context();
            contexts.push(lanes);
            return {
              ...lanes,
              "effect/context": effectContext,
              "effect/wrap": (program) => {
                wraps++;
                return Effect.ensuring(
                  program,
                  Effect.sync(() => {
                    finalizers++;
                  })
                );
              },
            };
          },
        })
      );
    },
  };
  const { nativeProviders } = unavailableProviderResources();
  const bound = serviceRuntimeExport.construct({
    clients,
    deps: {
      contentWorkspace,
      versionedContent: unavailableVersionedContent(),
      packageOutput: unavailablePackageOutput(),
      codex: nativeProviders.codex,
      claude: nativeProviders.claude,
    },
  });
  expect(serviceRuntimeExport.definition).toBe(definition);
  expect(serviceRuntimeExport.contract).toBe(contract);
  expect(Object.keys(definition.deps).sort()).toEqual([
    "claude",
    "codex",
    "contentWorkspace",
    "packageOutput",
    "versionedContent",
  ]);
  expect(bindings).toBe(0);
  expect(readings).toEqual([]);
  const first = bound.withInvocation({}).providers.test(testRequest);
  const second = bound.withInvocation({}).providers.test(testRequest);
  expect(Effect.isEffect(first)).toBe(true);
  expect(Effect.isEffect(second)).toBe(true);
  expect(bindings).toBe(2);
  expect(contexts).toEqual([]);
  expect(wraps).toBe(0);
  expect(readings).toEqual([]);

  const callerContext = clockInvocation(() => new Date(9_000)).context["effect/context"];
  const completion = Promise.all([
    Effect.runPromise(Effect.provide(first, callerContext)),
    Effect.runPromise(Effect.provide(second, callerContext)),
  ]);
  let results: Awaited<typeof completion>;
  try {
    await Promise.race([
      entered.promise,
      completion.then(() => {
        throw new Error("The native calls settled before entering the gated resource");
      }),
    ]);
    expect(readings).toEqual([{ before: 1_000 }, { before: 2_000 }]);
    expect(wraps).toBe(2);
    expect(finalizers).toBe(0);
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).not.toBe(contexts[1]);
    expect(contexts[0]).toMatchObject({
      deps: { contentWorkspace, nativeProviders },
      scope: {},
      config: {},
      invocation: {},
      provided: {},
    });
  } finally {
    resume.resolve();
    results = await completion;
  }
  expect(results.map(({ classification }) => classification)).toEqual(["Blocked", "Blocked"]);
  expect(readings).toEqual([
    { before: 1_000, after: 1_000 },
    { before: 2_000, after: 2_000 },
  ]);
  expect(finalizers).toBe(2);
});

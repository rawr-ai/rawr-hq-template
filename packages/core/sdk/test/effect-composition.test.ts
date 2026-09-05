import { type as schemaType } from "@orpc/contract";
import { createRouterClient, implement } from "@orpc/server";
import { Effect as NativeEffect } from "effect";
import { expect, test } from "vitest";

import * as effectFace from "../src/effect";
import { defineService, sealService } from "../src/service";

test("curated effects compose natively through a complete service without early execution", async () => {
  const calls = { construct: 0, body: 0, authored: 0 };
  const definition = defineService({ id: "native-composition", deps: {} });
  const contract = definition.oc.router({
    read: definition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const implementation = implement(contract);
  const router = implementation.router({
    read: implementation.read.handler(({ input }) => {
      calls.body += 1;
      return `native:${input}`;
    }),
  });
  const service = sealService(definition, {
    contract,
    construct: () => {
      calls.construct += 1;
      const client = createRouterClient(router);
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () => ({
          // Test-owned native boundary, not the future runtime service binder.
          read: (input, options) =>
            effectFace.Effect.tryPromise({
              try: () => client.read(input, options),
              catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
            }),
        }),
      };
    },
  });
  expect(calls).toEqual({ construct: 0, body: 0, authored: 0 });
  const client = service.construct({ deps: {} }).withInvocation({});
  const authored = effectFace.Effect.gen(function* () {
    calls.authored += 1;
    const input = yield* NativeEffect.succeed("input");
    return yield* client.read(input);
  });
  const native: NativeEffect.Effect<string, Error> = NativeEffect.map(authored, (value) =>
    value.toUpperCase()
  );
  const publicValue: effectFace.HabitatEffect<string, Error> = native;
  expect(NativeEffect.isEffect(authored)).toBe(true);
  expect(NativeEffect.isEffect(publicValue)).toBe(true);
  expect(calls).toEqual({ construct: 1, body: 0, authored: 0 });
  expect(await NativeEffect.runPromise(publicValue)).toBe("NATIVE:INPUT");
  expect(calls).toEqual({ construct: 1, body: 1, authored: 1 });
  expect(Object.keys(effectFace).sort()).toEqual(["Effect", "TaggedError"]);
  for (const name of [
    "runPromise",
    "runSync",
    "runFork",
    "Runtime",
    "ManagedRuntime",
    "Layer",
    "Scope",
  ]) {
    expect(name in effectFace).toBe(false);
    expect(name in effectFace.Effect).toBe(false);
  }
});

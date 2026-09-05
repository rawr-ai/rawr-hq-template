import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect as NativeEffect } from "effect";
import { expect, test } from "vitest";

import { createInvocationTracker } from "../../runtime/process-runtime/src/invocation-tracker";
import { createServiceClientAssembly } from "../../runtime/process-runtime/src/service-client-assembly";

import * as effectFace from "../src/effect";
import { defineService, sealService } from "../src/service";

test("curated effects compose natively through a complete service without early execution", async () => {
  const calls = { construct: 0, body: 0, authored: 0 };
  const definition = defineService({ id: "native-composition", deps: {} });
  const contract = definition.oc.router({
    read: definition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const implementation = implement(contract).$context<WithEffectContext<never>>();
  const router = implementation.router({
    read: implementation.read.handler(({ input }) => {
      calls.body += 1;
      return `native:${input}`;
    }),
  });
  const service = sealService(definition, {
    contract,
    construct: ({ clients }) => {
      calls.construct += 1;
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  expect(calls).toEqual({ construct: 0, body: 0, authored: 0 });
  const client = service
    .construct({
      deps: {},
      clients: createServiceClientAssembly(createInvocationTracker()),
    })
    .withInvocation({});
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

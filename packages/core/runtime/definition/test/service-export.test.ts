import { expect, test } from "bun:test";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { Type } from "typebox";
import { RuntimeSchema, standard } from "../../schema/src";
import {
  defineRuntimeResource,
  defineService,
  readServiceUse,
  resourceDep,
  type ServiceOf,
  type ServiceUse,
  sealService,
  serviceDep,
  useService,
} from "../src";

test("preserves absent lanes and the public contract/declaration generic meanings", () => {
  const definition = defineService({ id: "no-lanes", deps: {} });
  const sameDefinition: ServiceOf<typeof definition> = definition;
  const contract = definition.oc.router({});
  const service = sealService(definition, {
    contract,
    construct: () => ({
      kind: "service.client.construction-bound",
      serviceId: definition.id,
      withInvocation: () => ({}),
    }),
  });
  const selected: ServiceUse<typeof contract> = useService(service);
  const erased: ServiceUse<unknown> = selected;
  expect(sameDefinition).toBe(definition);
  expect(readServiceUse(erased).service === service).toBe(true);
  service.construct({ deps: {} }).withInvocation({});
  if (false) {
    // @ts-expect-error No scope schema permits only absence, not an invented lane.
    service.construct({ deps: {}, scope: "invented" });
    // @ts-expect-error No config schema permits only absence, not an invented lane.
    service.construct({ deps: {}, config: 1 });
    // @ts-expect-error No invocation schema permits only absence, not an invented value.
    service.construct({ deps: {} }).withInvocation({ invocation: "invented" });
  }
});

test("retains a complete typed native service after its producer scope leaves", async () => {
  let constructions = 0;
  let invocations = 0;
  const selected = (() => {
    const resource = defineRuntimeResource<"clock", { now(): number }>({
      id: "clock",
      title: "Clock",
      purpose: "Time",
    });
    const definition = defineService({
      id: "typed-service",
      deps: { clock: resourceDep(resource) },
      scope: RuntimeSchema.fromTypeBox(Type.Object({ tenant: Type.String() })),
      config: RuntimeSchema.fromTypeBox(Type.Object({ prefix: Type.String() })),
      invocation: RuntimeSchema.fromTypeBox(Type.Object({ trace: Type.String() })),
    });
    const contract = definition.oc.router({
      read: definition.oc.input(standard(Type.String())).output(standard(Type.String())),
    });
    const native = implement(contract).$context<{ trace: string }>();
    const service = sealService(definition, {
      contract,
      construct: ({ deps, scope, config }) => {
        constructions += 1;
        const router = native.router({
          read: native.read.handler(({ input, context }) => {
            invocations += 1;
            return `${config.prefix}:${scope.tenant}:${deps.clock.now()}:${context.trace}:${input}`;
          }),
        });
        return {
          kind: "service.client.construction-bound",
          serviceId: definition.id,
          withInvocation: ({ invocation }) => {
            const client = createRouterClient(router, {
              context: { trace: invocation.trace },
            });
            // Test-only native boundary adaptation, not the future runtime binding implementation.
            return {
              read: (input, options) =>
                Effect.tryPromise({
                  try: (signal) => client.read(input, { ...options, signal }),
                  catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
                }),
            };
          },
        };
      },
    });
    const parent = defineService({
      id: "parent",
      deps: { child: serviceDep(service) },
    });
    sealService(parent, {
      contract: {},
      construct: ({ deps }) => {
        deps.child.withInvocation({ invocation: { trace: "parent" } });
        return {
          kind: "service.client.construction-bound",
          serviceId: parent.id,
          withInvocation: () => ({}),
        };
      },
    });
    return useService(service);
  })();
  expect(constructions).toBe(0);
  expect(invocations).toBe(0);
  const { service } = readServiceUse(selected);
  expect(readServiceUse(useService(service)).service).toBe(service);
  expect(Object.isFrozen(service)).toBe(true);
  expect(() => useService(service, { instance: "" })).toThrow(TypeError);
  const parent = sealService(
    defineService({ id: "parent", deps: { child: serviceDep(service) } }),
    {
      contract: {},
      construct: () => ({
        kind: "service.client.construction-bound",
        serviceId: "parent",
        withInvocation: () => ({}),
      }),
    }
  );
  expect(() =>
    useService(parent, { binding: { dependencies: { child: { instance: "" } } } })
  ).toThrow(TypeError);
  const client = service.construct({
    deps: { clock: { now: () => 7 } },
    scope: { tenant: "a" },
    config: { prefix: "b" },
  });
  expect(constructions).toBe(1);
  const first = client.withInvocation({ invocation: { trace: "one" } }).read("x");
  const second = client.withInvocation({ invocation: { trace: "two" } }).read("y");
  expect(invocations).toBe(0);
  expect(await Effect.runPromise(first)).toBe("b:a:7:one:x");
  expect(await Effect.runPromise(second)).toBe("b:a:7:two:y");
  expect(constructions).toBe(1);
  expect(invocations).toBe(2);
  if (false) {
    // @ts-expect-error A declaration alone is not a complete service dependency.
    serviceDep(service.definition);
    // @ts-expect-error A declaration and caller-paired contract cannot form a service use.
    useService(service.definition, { contract: service.contract });
    service.construct({
      // @ts-expect-error Ready resource dependencies retain their capability type.
      deps: { clock: {} },
      scope: { tenant: "a" },
      config: { prefix: "b" },
    });
    // @ts-expect-error Invocation schema output remains exact.
    client.withInvocation({ invocation: { trace: 1 } });
    // @ts-expect-error Native contract input remains exact.
    client.withInvocation({ invocation: { trace: "a" } }).read(1);
    sealService(service.definition, {
      contract: service.contract,
      // @ts-expect-error A Promise is not a construction-bound managed client.
      construct: async () => client,
    });
    sealService(service.definition, {
      contract: service.contract,
      construct: () => ({
        kind: "service.client.construction-bound",
        serviceId: "typed-service",
        // @ts-expect-error A Promise procedure is not an Effect-facing procedure.
        withInvocation: () => ({ read: async () => "x" }),
      }),
    });
    sealService(service.definition, {
      contract: service.contract,
      construct: () => ({
        kind: "service.client.construction-bound",
        serviceId: "typed-service",
        // @ts-expect-error A wrong Effect success value does not implement the native output contract.
        withInvocation: () => ({ read: () => Effect.succeed(1) }),
      }),
    });
  }
});

import { expect, test } from "bun:test";
import { Effect as NativeEffect } from "effect";
import { type Static, Type } from "typebox";
import {
  defineAgentToolPlugin,
  defineTool,
  type ToolDescriptor,
  type ToolExecutionContext,
} from "../src/agent";
import {
  type DesktopBackgroundDescriptor,
  type DesktopBackgroundExecutionContext,
  defineDesktopBackground,
  defineDesktopBackgroundPlugin,
} from "../src/desktop";
import { defineService, type ServiceClients, sealService, useService } from "../src/service";
import { toolSchema } from "../src/tool-schema";

declare const requiredNativeProgram: NativeEffect.Effect<
  number,
  { readonly _tag: "NativeFailure" },
  { readonly nativeDependency: true }
>;

test("no-yield tool and background generators retain exact success and empty failure/environment channels", () => {
  const tool = defineTool({
    id: "constant",
    description: "Constant",
    input: toolSchema.object({}),
    effect: function* () {
      return 1;
    },
  });
  const background = defineDesktopBackground({
    id: "constant",
    cadence: "1 seconds",
    effect: function* () {
      return "ready" as const;
    },
  });
  type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
  type ToolChannels<T> =
    T extends ToolDescriptor<infer _I, infer A, infer E, infer R, infer _C> ? [A, E, R] : never;
  type BackgroundChannels<T> =
    T extends DesktopBackgroundDescriptor<infer A, infer E, infer R, infer _C> ? [A, E, R] : never;
  const toolChannels: Equal<ToolChannels<typeof tool>, [number, never, never]> = true;
  const backgroundChannels: Equal<
    BackgroundChannels<typeof background>,
    ["ready", never, never]
  > = true;
  expect([toolChannels, backgroundChannels]).toEqual([true, true]);
});

test("unannotated leaf contexts expose no undeclared service clients", () => {
  const tool = defineTool({
    id: "empty-context",
    description: "No ambient clients",
    input: toolSchema.object({ title: toolSchema.string() }),
    effect: function* (context) {
      // @ts-expect-error Named clients require an explicit shared ServiceUses context.
      context.clients.notDeclared;
      return yield* NativeEffect.succeed(context.input.title);
    },
  });
  const background = defineDesktopBackground({
    id: "empty-context",
    cadence: "1 seconds",
    effect: (context) => {
      // @ts-expect-error Desktop contexts do not infer arbitrary clients from a later plugin.
      context.clients.notDeclared;
      return NativeEffect.succeed("ready" as const);
    },
  });
  const agent = defineAgentToolPlugin.factory()({
    capability: "empty",
    services: {},
    tools: [tool],
  })();
  const desktop = defineDesktopBackgroundPlugin.factory()({
    capability: "empty",
    services: {},
    backgrounds: [background],
  })();
  expect(agent.tools[0]).toBe(tool);
  expect(desktop.backgrounds[0]).toBe(background);
});

test("agent and desktop declarations are cold and retain native schema and executable identities", () => {
  let runs = 0;
  const input = toolSchema.object({
    title: toolSchema.string({ minLength: 1 }),
    note: toolSchema.optional(toolSchema.string()),
  });
  const services = {};
  const effect = function* (context: ToolExecutionContext<Static<typeof input>, typeof services>) {
    runs++;
    return yield* NativeEffect.succeed(context.input.title);
  };
  const tool = defineTool({ id: "read", description: "Read an item", input, effect });
  const background = defineDesktopBackground({
    id: "refresh",
    cadence: "60 seconds",
    effect: (_context: DesktopBackgroundExecutionContext<typeof services>) => {
      runs++;
      return NativeEffect.succeed("ready" as const);
    },
  });
  const agent = defineAgentToolPlugin.factory()({
    capability: "items",
    services,
    tools: [tool] as const,
  })();
  const desktop = defineDesktopBackgroundPlugin.factory<{ instance: string }>()((options) => ({
    capability: "items",
    instance: options.instance,
    services,
    backgrounds: [background] as const,
  }))({ instance: "tray" });
  expect(agent).toMatchObject({ role: "agent", surface: "agent/tools", id: "agent.tools.items" });
  expect(desktop).toMatchObject({
    role: "desktop",
    surface: "desktop/background",
    instance: "tray",
  });
  expect(agent.tools[0]).toBe(tool);
  expect(tool.effect).toBe(effect);
  expect(desktop.backgrounds[0]).toBe(background);
  expect(toolSchema.object).toBe(Type.Object);
  expect(toolSchema.string).toBe(Type.String);
  expect(toolSchema.optional).toBe(Type.Optional);
  expect(tool.inputSchema.decode({ title: "ready" })).toEqual({
    success: true,
    value: { title: "ready" },
  });
  expect(tool.inputSchema.decode({ title: "" }).success).toBe(false);
  expect(Object.isFrozen(agent.tools)).toBe(true);
  expect(Object.isFrozen(background.policy)).toBe(true);
  expect(Object.keys(tool).sort()).toEqual([
    "description",
    "effect",
    "id",
    "inputSchema",
    "kind",
    "policy",
  ]);
  expect(runs).toBe(0);
});

test("clients retain exact service invocation requirements and programs retain native error/environment inference", () => {
  const definition = defineService({ id: "typed", deps: {} });
  const contract = definition.oc.router({ read: definition.oc });
  const service = sealService(definition, {
    contract,
    construct: () => {
      throw new Error("cold");
    },
  });
  const services = { typed: useService(service) };
  const otherDefinition = defineService({ id: "other", deps: {} });
  const otherService = sealService(otherDefinition, {
    contract: otherDefinition.oc.router({ write: otherDefinition.oc }),
    construct: () => {
      throw new Error("cold");
    },
  });
  const input = toolSchema.object({ count: Type.Number() });
  const requiredTool = defineTool({
    id: "required",
    description: "Native channels",
    input,
    effect: function* (_context: ToolExecutionContext<Static<typeof input>, typeof services>) {
      return yield* requiredNativeProgram;
    },
  });
  const exactChannels: ToolDescriptor<
    Static<typeof input>,
    number,
    { readonly _tag: "NativeFailure" },
    { readonly nativeDependency: true },
    ToolExecutionContext<Static<typeof input>, typeof services>
  > = requiredTool;
  expect(exactChannels.kind).toBe("agent.tool");
  const tool = defineTool({
    id: "typed",
    description: "Typed",
    input,
    effect: function* (context: ToolExecutionContext<Static<typeof input>, typeof services>) {
      const clients: ServiceClients<typeof services> = context.clients;
      if (false) {
        clients.typed.withInvocation({});
        // @ts-expect-error No invocation schema means no invented invocation value.
        clients.typed.withInvocation({ invocation: "invented" });
        // @ts-expect-error Undeclared clients are not projected.
        clients.missing;
      }
      return yield* NativeEffect.fail({ _tag: "ToolError" as const });
    },
  });
  type Program = ReturnType<typeof tool.effect>;
  type Yielded = Program extends Generator<infer Y, unknown, unknown> ? Y : Program;
  type ErrorOf<T> = T extends NativeEffect.Effect<unknown, infer E, unknown> ? E : never;
  const error: ErrorOf<Yielded> = { _tag: "ToolError" };
  expect(error._tag).toBe("ToolError");
  const background = defineDesktopBackground({
    id: "typed",
    cadence: "1 seconds",
    effect: (_context: DesktopBackgroundExecutionContext<typeof services>) =>
      NativeEffect.succeed("ready"),
  });
  defineAgentToolPlugin.factory()({ capability: "typed", services, tools: [tool] });
  defineDesktopBackgroundPlugin.factory()({
    capability: "typed",
    services,
    backgrounds: [background],
  });
  if (false) {
    defineAgentToolPlugin.factory()({
      capability: "incompatible",
      services: { typed: useService(otherService) },
      // @ts-expect-error Matching local names do not erase native service contract compatibility.
      tools: [tool],
    });
    // @ts-expect-error The plugin must supply the client's declared local name.
    defineAgentToolPlugin.factory()({ capability: "missing", services: {}, tools: [tool] });
    defineAgentToolPlugin.factory()({
      capability: "wrong",
      services: { other: useService(service) },
      // @ts-expect-error Renaming a supplied service does not satisfy the leaf context.
      tools: [tool],
    });
    defineDesktopBackgroundPlugin.factory()({
      capability: "missing",
      services: {},
      // @ts-expect-error Desktop leaf clients must also be supplied by plugin membership.
      backgrounds: [background],
    });
    // @ts-expect-error Promise bodies are not local Effect programs.
    defineTool({ id: "promise", description: "No Promise", input, effect: async () => "wrong" });
    // @ts-expect-error Projection lane is builder-owned.
    defineAgentToolPlugin.factory()({ capability: "x", services, tools: [tool], role: "server" });
  }
});

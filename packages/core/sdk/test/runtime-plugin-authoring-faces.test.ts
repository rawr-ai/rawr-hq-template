import { oc } from "@orpc/contract";
import { handlerGen as nativeHandlerGen } from "@orpc/experimental-effect";
import { Type } from "typebox";
import { describe, expect, test } from "vitest";
import { standard } from "../../runtime/schema/src";
import { Effect } from "../src/effect";
import { defineEffectExecution } from "../src/execution";
import {
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineSchedule,
  defineWorkflow,
} from "../src/plugins/async";
import { defineAsyncStepEffect } from "../src/plugins/async/effect";
import {
  defineServerApiPlugin,
  defineServerInternalPlugin,
  implementServerApiPlugin,
} from "../src/plugins/server";
import { handlerGen } from "../src/plugins/server/effect";
import {
  defineMcpPrompt,
  defineMcpResource,
  defineMcpServerPlugin,
  defineMcpTool,
  type McpPromptResult,
  type McpResourceContent,
  type McpToolResult,
} from "../src/plugins/server/mcp";
import { RuntimeSchema } from "../src/runtime/schema";

describe("runtime plugin authoring faces", () => {
  test("classifies server projection from the lane-specific builder", () => {
    let projected = 0;
    const createApi = defineServerApiPlugin.factory()({
      capability: "catalog",
      routeBase: "/catalog",
      services: {},
      api: () => {
        projected += 1;
        return { router: "api" };
      },
    });
    const createInternal = defineServerInternalPlugin.factory()({
      capability: "catalog-ops",
      services: {},
      internal: () => ({ router: "internal" }),
    });
    const api = createApi();
    const internal = createInternal();

    expect(projected).toBe(0);
    expect(api).toMatchObject({ role: "server", surface: "server.api" });
    expect(internal).toMatchObject({ role: "server", surface: "server.internal" });
    expect(api).not.toHaveProperty("visibility");
    expect(api.project({ pluginId: api.id }).facts).toHaveProperty(
      "projection.routeBase",
      "/catalog"
    );
    expect(projected).toBe(1);
  });

  test("uses the native oRPC implementer and official Effect bridge", () => {
    const contract = oc.router({ ping: oc.output(standard(Type.String())) });
    expect(implementServerApiPlugin(contract, { pluginId: "server.api.ping" })).toHaveProperty(
      "ping"
    );
    expect(handlerGen).toBe(nativeHandlerGen);
  });

  test("keeps MCP as one cold server surface", () => {
    const input = RuntimeSchema.fromTypeBox(Type.Object({ id: Type.String() }));
    const toolExecution = defineEffectExecution<
      { id: string },
      McpToolResult,
      never,
      unknown,
      "plugin.server-mcp-tool"
    >({
      executionId: "catalog.get",
      boundary: "plugin.server-mcp-tool",
      policy: {},
      run: () => Effect.succeed({ content: [] }),
    });
    const tool = defineMcpTool({
      name: "catalog_get",
      description: "Read a catalog item.",
      input,
      execution: toolExecution,
    });
    const resourceExecution = defineEffectExecution<
      { id: string },
      McpResourceContent,
      never,
      unknown,
      "plugin.server-mcp-resource"
    >({
      executionId: "catalog.resource",
      boundary: "plugin.server-mcp-resource",
      policy: {},
      run: () =>
        Effect.succeed({
          type: "resource",
          resource: { uri: "catalog://items/1", text: "item" },
        }),
    });
    const resource = defineMcpResource({
      name: "catalog_item",
      uriTemplate: "catalog://items/{id}",
      input,
      execution: resourceExecution,
    });
    const promptExecution = defineEffectExecution<
      { id: string },
      McpPromptResult,
      never,
      unknown,
      "plugin.server-mcp-prompt"
    >({
      executionId: "catalog.prompt",
      boundary: "plugin.server-mcp-prompt",
      policy: {},
      run: () => Effect.succeed({ messages: [] }),
    });
    const prompt = defineMcpPrompt({
      name: "catalog_summary",
      input,
      execution: promptExecution,
    });
    const createPlugin = defineMcpServerPlugin.factory()({
      capability: "catalog-mcp",
      services: {},
      members: () => [tool, resource, prompt],
    });
    const plugin = createPlugin();

    expect(plugin).toMatchObject({ role: "server", surface: "server.mcp" });
    expect(plugin).not.toHaveProperty("transport");
    expect(plugin.project({ pluginId: plugin.id }).facts).toHaveProperty("members", [
      tool,
      resource,
      prompt,
    ]);
  });

  test("authors host-neutral workflow, schedule, and consumer lanes", () => {
    const payload = RuntimeSchema.fromTypeBox(Type.Object({ id: Type.String() }));
    const workflow = defineWorkflow({
      id: "catalog.refresh",
      event: { name: "catalog/refresh.requested", payload },
      run: async ({ event }) => event.data.id,
    });
    const schedule = defineSchedule({
      id: "catalog.refresh-daily",
      cron: "0 0 * * *",
      run: async () => "scheduled",
    });
    const consumer = defineConsumer({
      id: "catalog.updated",
      event: { name: "catalog/updated", payload },
      run: async ({ event }) => event.data.id,
    });
    const workflowPlugin = defineAsyncWorkflowPlugin.factory()({
      capability: "catalog-refresh",
      services: {},
      workflows: [workflow],
    })();
    const schedulePlugin = defineAsyncSchedulePlugin.factory()({
      capability: "catalog-schedule",
      services: {},
      schedules: [schedule],
    })();
    const consumerPlugin = defineAsyncConsumerPlugin.factory()({
      capability: "catalog-consumer",
      services: {},
      consumers: [consumer],
    })();

    expect([workflowPlugin.surface, schedulePlugin.surface, consumerPlugin.surface]).toEqual([
      "async.workflow",
      "async.schedule",
      "async.consumer",
    ]);
    expect(workflowPlugin).not.toHaveProperty("inngest");
  });

  test("keeps async Effect bodies as cold step descriptors", () => {
    let executions = 0;
    const descriptor = defineAsyncStepEffect({
      id: "catalog.step",
      effect: () => {
        executions += 1;
        return {} as never;
      },
    });
    expect(descriptor).toMatchObject({
      id: "catalog.step",
      kind: "async.step-effect",
    });
    expect(executions).toBe(0);
  });
});

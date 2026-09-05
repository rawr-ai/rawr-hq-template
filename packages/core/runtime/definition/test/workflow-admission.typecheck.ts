import { os } from "@orpc/server";
import type { Inngest } from "inngest";
import { Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/runtime-schema";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "../src/async-plugin";
import {
  defineServerApiPlugin,
  defineServerInternalPlugin,
  type ServerPluginContext,
} from "../src/plugin";
import { defineRuntimeResource, requireResource } from "../src/resource";
import type {
  WorkflowDispatcherTarget,
  WorkflowDispatchResult,
  WorkflowEventSender,
} from "../src/workflow-admission";
import { useWorkflowDispatcher } from "../src/workflow-dispatcher-use";

export function assertWorkflowAdmissionTypes(native: Inngest): void {
  const sender: WorkflowEventSender = native;
  void sender;
  const nativeResource = defineRuntimeResource<"native.events", Inngest>({
    id: "native.events",
    title: "Native events",
    purpose: "Type proof only",
  });
  const client = requireResource({ resource: nativeResource, reason: "Admit workflow events" });
  const sync = defineWorkflow({
    id: "sync",
    eventName: "items/sync",
    inputSchema: RuntimeSchema.fromTypeBox(Type.Object({ itemId: Type.String() })),
    steps: [],
    run: () => undefined,
  });
  const count = defineWorkflow({
    id: "count",
    eventName: "items/count",
    inputSchema: RuntimeSchema.fromTypeBox(Type.Object({ count: Type.Number() })),
    steps: [],
    run: () => undefined,
  });
  const foreign = defineWorkflow({ ...sync, id: "foreign" });
  const plugin = defineAsyncWorkflowPlugin.factory()({
    capability: "admission",
    services: {},
    workflows: [sync, count],
  })();
  const target: WorkflowDispatcherTarget = plugin;
  void target;
  const workflows = {
    sync: useWorkflowDispatcher(plugin, { workflows: [sync], client }),
    all: useWorkflowDispatcher(plugin, { workflows: [sync, count], client }),
  };
  const router = {
    admit: os.$context<ServerPluginContext<{}, typeof workflows>>().handler(async ({ context }) => {
      const result: WorkflowDispatchResult = await context.workflows.sync.send(
        sync,
        { itemId: "item" },
        { id: "source-event" }
      );
      const ids: readonly string[] = result.eventIds;
      await context.workflows.all.send(count, { count: 1 });
      // @ts-expect-error Payload cannot widen the selected workflow into another member.
      context.workflows.all.send(sync, { count: 1 });
      // @ts-expect-error Membership is per named group, not every workflow in the target plugin.
      context.workflows.sync.send(count, { count: 1 });
      // @ts-expect-error An undeclared same-shaped workflow is not a member.
      context.workflows.all.send(foreign, { itemId: "item" });
      // @ts-expect-error A dispatcher is a named declared capability, not an ambient lookup.
      context.workflows.other;
      // @ts-expect-error Returned event IDs are not workflow run IDs.
      result.runIds;
      // @ts-expect-error Native event identity is the only admitted send option.
      context.workflows.sync.send(sync, { itemId: "item" }, { env: "other" });
      // @ts-expect-error Native event IDs are strings.
      context.workflows.sync.send(sync, { itemId: "item" }, { id: 1 });
      return ids;
    }),
  };
  defineServerApiPlugin.factory()({
    capability: "admission",
    services: {},
    routeBase: "/admission",
    workflows,
    api: () => router,
  });
  defineServerInternalPlugin.factory<{ prefix: string }>()((options) => ({
    capability: "admission",
    services: {},
    routeBase: `/rpc/${options.prefix}`,
    workflows,
    internal: () => router,
  }));
  defineServerApiPlugin.factory()({
    capability: "undeclared",
    services: {},
    routeBase: "/undeclared",
    // @ts-expect-error The router cannot require undeclared dispatcher groups.
    api: () => router,
  });
  const noWorkflowRouter = {
    admit: os.$context<ServerPluginContext<{}>>().handler(({ context }) => {
      // @ts-expect-error The omitted workflow generic grants neither names nor send capability.
      return context.workflows.undeclared.send(sync, { itemId: "item" });
    }),
  };
  defineServerApiPlugin.factory()({
    capability: "no-workflows",
    services: {},
    routeBase: "/no-workflows",
    api: () => noWorkflowRouter,
  });
  defineServerInternalPlugin.factory()({
    capability: "no-workflows",
    services: {},
    routeBase: "/rpc/no-workflows",
    internal: () => noWorkflowRouter,
  });
  // @ts-expect-error Admission cannot infer membership from an empty selection.
  useWorkflowDispatcher(plugin, { workflows: [], client });
  // @ts-expect-error A same-shaped workflow outside the exact target is not a member.
  useWorkflowDispatcher(plugin, { workflows: [foreign], client });
  useWorkflowDispatcher(plugin, {
    workflows: [sync],
    // @ts-expect-error The native client backing an admission capability must be required.
    client: requireResource({ resource: nativeResource, reason: "Optional", optional: true }),
  });
  const file = defineRuntimeResource<"file", { readonly path: string }>({
    id: "file",
    title: "File",
    purpose: "Not an event sender",
  });
  useWorkflowDispatcher(plugin, {
    workflows: [sync],
    // @ts-expect-error An arbitrary file resource cannot satisfy the native event send capability.
    client: requireResource({ resource: file, reason: "Wrong client" }),
  });
}

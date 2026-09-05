import { describe, expect, test } from "bun:test";
import { Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/runtime-schema";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "../src/async-plugin";
import { defineServerApiPlugin, defineServerInternalPlugin } from "../src/plugin";
import { defineRuntimeResource, requireResource } from "../src/resource";
import type { WorkflowEventSender } from "../src/workflow-admission";
import { readWorkflowDispatcherUse, useWorkflowDispatcher } from "../src/workflow-dispatcher-use";

function fixture() {
  const calls: string[] = [];
  const baseSchema = RuntimeSchema.fromTypeBox(Type.Object({ itemId: Type.String() }));
  const schema: RuntimeSchema<{ itemId: string }> = {
    ...baseSchema,
    decode(input) {
      calls.push("decode");
      return baseSchema.decode(input);
    },
    validate(input) {
      calls.push("validate");
      return baseSchema.validate(input);
    },
  };
  const run = () => calls.push("run");
  const selected = defineWorkflow({
    id: "selected",
    eventName: "items/selected",
    inputSchema: schema,
    steps: [],
    run,
  });
  const other = defineWorkflow({ ...selected, id: "other", eventName: "items/other" });
  const plugin = defineAsyncWorkflowPlugin.factory()({
    capability: "admission",
    services: {},
    workflows: [selected, other],
  })();
  const resource = defineRuntimeResource<"events", WorkflowEventSender>({
    id: "events",
    title: "Native events",
    purpose: "Workflow admission",
  });
  const client = requireResource({ resource, instance: "primary", reason: "Workflow admission" });
  return { calls, client, other, plugin, resource, run, schema, selected };
}

describe("cold workflow admission authoring", () => {
  test("freezes only owned shells and retains exact target, workflow, schema and client refs", () => {
    const { calls, client, plugin, run, schema, selected } = fixture();
    const members: [typeof selected] = [selected];
    const use = useWorkflowDispatcher(plugin, { workflows: members, client });
    const source = readWorkflowDispatcherUse(use)!;
    expect(Object.keys(use)).toEqual(["kind"]);
    expect(use.kind).toBe("workflow.dispatcher-use");
    expect(Object.isFrozen(use)).toBe(true);
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.workflows)).toBe(true);
    expect(source.plugin).toBe(plugin);
    expect(source.client).toBe(client);
    expect(source.workflows[0]).toBe(selected);
    expect(source.workflows[0].inputSchema).toBe(schema);
    expect(selected.run).toBe(run);
    members.pop();
    expect(source.workflows).toEqual([selected]);
    expect(Object.isFrozen(schema)).toBe(false);
    expect(calls).toEqual([]);
  });

  test("rejects empty, duplicate, unlisted and copied workflow selections", () => {
    const { client, plugin, selected } = fixture();
    expect(() =>
      // @ts-expect-error Runtime callers still cannot submit an empty subset.
      useWorkflowDispatcher(plugin, { workflows: [], client })
    ).toThrow(TypeError);
    expect(() =>
      useWorkflowDispatcher(plugin, { workflows: [selected, selected], client })
    ).toThrow(TypeError);
    const unlisted = defineWorkflow({ ...selected, id: "unlisted" });
    expect(() =>
      // @ts-expect-error Runtime membership also refuses untyped foreign targets.
      useWorkflowDispatcher(plugin, { workflows: [unlisted], client })
    ).toThrow(TypeError);
    expect(() => useWorkflowDispatcher(plugin, { workflows: [{ ...selected }], client })).toThrow(
      TypeError
    );
  });

  test("refuses optional clients without invoking any workflow or schema callback", () => {
    const { calls, client, plugin, selected } = fixture();
    expect(() =>
      useWorkflowDispatcher(plugin, {
        workflows: [selected],
        // @ts-expect-error Untyped callers cannot weaken the required backing client.
        client: { ...client, optional: true },
      })
    ).toThrow(TypeError);
    expect(calls).toEqual([]);
  });

  test("both server lanes project named uses and add each exact client requirement only once", () => {
    const { calls, client, other, plugin, selected } = fixture();
    const secondClient = requireResource({ ...client, instance: "secondary" });
    const workflows = {
      selected: useWorkflowDispatcher(plugin, { workflows: [selected], client }),
      other: useWorkflowDispatcher(plugin, { workflows: [other], client }),
      second: useWorkflowDispatcher(plugin, { workflows: [selected], client: secondClient }),
    };
    const api = () => {
      calls.push("api");
      return {};
    };
    const publicPlugin = defineServerApiPlugin.factory()({
      capability: "admission",
      services: {},
      routeBase: "/admission",
      workflows,
      resourceRequirements: [client],
      api,
    })();
    const internalPlugin = defineServerInternalPlugin.factory()({
      capability: "admission",
      services: {},
      routeBase: "/rpc",
      workflows,
      internal: api,
    })();
    for (const definition of [publicPlugin, internalPlugin]) {
      expect(Object.isFrozen(definition.workflows)).toBe(true);
      expect(Object.isFrozen(definition.resourceRequirements)).toBe(true);
      expect(definition.workflows).not.toBe(workflows);
      expect(definition.workflows.selected).toBe(workflows.selected);
      expect(definition.resourceRequirements).toEqual([client, secondClient]);
      expect(definition.resourceRequirements[0]).toBe(client);
      expect(definition.resourceRequirements[1]).toBe(secondClient);
    }
    expect(publicPlugin.api).toBe(api);
    expect(internalPlugin.internal).toBe(api);
    expect(calls).toEqual([]);
  });

  test("retains distinct requirement references so ordinary derivation can refuse conflicts", () => {
    const { client, plugin, selected } = fixture();
    const conflicting = requireResource({ ...client, reason: "Separately authored requirement" });
    const server = defineServerApiPlugin.factory()({
      capability: "conflict",
      services: {},
      routeBase: "/conflict",
      resourceRequirements: [conflicting],
      workflows: { selected: useWorkflowDispatcher(plugin, { workflows: [selected], client }) },
      api: () => ({}),
    })();
    expect(server.resourceRequirements).toHaveLength(2);
    expect(server.resourceRequirements[0]).toBe(conflicting);
    expect(server.resourceRequirements[1]).toBe(client);
  });

  test("default server maps are frozen and forged use shells have no admission source", () => {
    const empty = defineServerInternalPlugin.factory()({
      capability: "empty",
      services: {},
      routeBase: "/rpc",
      internal: () => ({}),
    })();
    expect(empty.workflows).toEqual({});
    expect(Object.isFrozen(empty.workflows)).toBe(true);
    const { client, plugin, selected } = fixture();
    const forged = { ...useWorkflowDispatcher(plugin, { workflows: [selected], client }) };
    expect(readWorkflowDispatcherUse(forged)).toBeUndefined();
    expect(() =>
      defineServerApiPlugin.factory()({
        capability: "forged",
        services: {},
        routeBase: "/forged",
        workflows: { forged },
        api: () => ({}),
      })()
    ).toThrow(TypeError);
  });
});

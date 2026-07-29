import { describe, expect, expectTypeOf, test } from "vitest";
import {
  composeWorkflowPlugins,
  defineWorkflowPlugin,
  type WorkflowRuntimeInput,
} from "../../src/workflows";

type FixtureClient = Readonly<{
  publish: (name: string) => string;
}>;

type FixtureRuntime = Readonly<{
  environment: "test";
}>;

describe("workflow runtime client contract", () => {
  test("preserves a plugin's concrete client requirement through composition", () => {
    const client: FixtureClient = {
      publish: (name) => `published:${name}`,
    };
    const runtime: FixtureRuntime = {
      environment: "test",
    };
    const plugin = defineWorkflowPlugin({
      capability: "fixture",
      runtime: {
        createInngestFunctions(input: WorkflowRuntimeInput<FixtureRuntime, FixtureClient>) {
          return [
            {
              clientResult: input.client.publish("fixture"),
              environment: input.runtime.environment,
            },
          ] as const;
        },
      },
    });
    const workflows = composeWorkflowPlugins([plugin] as const);

    expectTypeOf<
      Parameters<typeof workflows.createInngestFunctions>[0]["client"]
    >().toMatchTypeOf<FixtureClient>();

    expect(workflows.createInngestFunctions({ client, runtime })).toEqual([
      {
        clientResult: "published:fixture",
        environment: "test",
      },
    ]);

    if (false) {
      // @ts-expect-error The composed runtime retains the plugin's client capability.
      workflows.createInngestFunctions({ client: {}, runtime });
    }
  });
});

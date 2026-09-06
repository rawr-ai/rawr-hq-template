import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Flags } from "@oclif/core";
import { absolutePathFlag, cleanFlags, pluginFlag, targetFlag } from "../flags.js";
import { cleanWorkspace, required } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

const testFlags = {
  json: Flags.boolean(),
  ...cleanFlags,
  plugin: pluginFlag({
    multiple: true,
    multipleNonGreedy: true,
    exactlyOne: ["plugin", "complete-set"],
  }),
  "complete-set": Flags.boolean({ exactlyOne: ["plugin", "complete-set"] }),
  "disposable-root": absolutePathFlag({ required: true }),
  target: targetFlag({ required: true, multiple: true, multipleNonGreedy: true }),
};

/** Runs the service-owned disposable native test without constructing provider sessions here. */
export const testCommand = createOclifCommand({
  id: "agent:plugins:test",
  description: "Test explicit content in disposable provider homes",
  args: {},
  flags: testFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof testFlags, typeof services>) {
    return {
      operation: "providers.test" as const,
      json: flags.json === true,
      result: yield* clients.lifecycle.withInvocation({ invocation: undefined }).providers.test({
        contentWorkspace: cleanWorkspace(flags),
        mode:
          flags["complete-set"] === true
            ? { kind: "complete-set" }
            : { kind: "targeted", pluginIds: required(flags.plugin) },
        disposableRoot: flags["disposable-root"],
        targets: flags.target,
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});

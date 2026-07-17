import { RawrCommand } from "@rawr/core";

import {
  invokeAgentPluginUndo,
  LifecycleAuthorityBindingError,
  parseControllerProjectionBinding,
  undoResultExitCode,
} from "../../../lib/agent-plugins/commands/projection";
import { providerExecutableFlag } from "../../../lib/agent-plugins/commands/flags";
import { LifecycleInputError } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsUndo extends RawrCommand {
  static description = "Replay the controller-owned last agent-plugin operation capsule";

  static flags = {
    json: RawrCommand.baseFlags.json,
    "provider-executable": providerExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsUndo);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    if (baseFlags.dryRun || baseFlags.yes) {
      this.outputResult(this.fail("--dry-run and --yes are not part of the closed undo contract", {
        code: "LIFECYCLE_INPUT_INVALID",
      }), { flags: baseFlags });
      this.exit(2);
      return;
    }
    let exitCode: 0 | 1;
    try {
      const binding = parseControllerProjectionBinding(flags, {
        admittedProviders: ["claude", "codex"],
      });
      const result = await invokeAgentPluginUndo(binding);
      this.outputResult(this.ok({ operation: "controller.undo", result }), {
        flags: baseFlags,
        human: () => this.log(`controller.undo: ${result.kind}`),
      });
      exitCode = undoResultExitCode(result);
    } catch (error) {
      const input = error instanceof LifecycleInputError;
      const binding = error instanceof LifecycleAuthorityBindingError;
      this.outputResult(this.fail(
        input || binding ? error.message : "Agent-plugin undo failed",
        {
          code: input || binding ? error.code : "LIFECYCLE_UNDO_FAILED",
          ...(input || binding ? {} : { details: { message: error instanceof Error ? error.message : String(error) } }),
        },
      ), { flags: baseFlags });
      this.exit(input || binding ? 2 : 1);
    }
    if (exitCode !== 0) this.exit(exitCode);
  }
}

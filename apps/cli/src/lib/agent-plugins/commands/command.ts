import type { RawrBaseFlags } from "@rawr/core";
import { RawrCommand } from "@rawr/core";

import { LifecycleInputError } from "./input";
import {
  LifecycleAuthorityBindingError,
  lifecycleResultExitCode,
  parseControllerProjectionBinding,
  projectLifecycleOperation,
  type LifecycleOperationRequest,
} from "./projection";

export abstract class AgentPluginLifecycleCommand extends RawrCommand {
  protected parseInput<T>(
    flags: Readonly<Record<string, unknown>>,
    parser: (flags: Readonly<Record<string, unknown>>) => T,
  ): T | undefined {
    try {
      return parser(flags);
    } catch (error) {
      if (error instanceof LifecycleInputError) {
        this.rejectInput(error.message, RawrCommand.extractBaseFlags(flags as Record<string, unknown>), error.code);
        return undefined;
      }
      throw error;
    }
  }

  protected async project(
    request: LifecycleOperationRequest,
    flags: Readonly<Record<string, unknown>>,
    requirements: Readonly<{
      git?: boolean;
      hostedGovernance?: boolean;
      providers?: readonly ("claude" | "codex")[];
    }> = {},
  ): Promise<void> {
    const baseFlags = RawrCommand.extractBaseFlags(flags as Record<string, unknown>);
    if (baseFlags.dryRun || baseFlags.yes) {
      this.rejectInput("--dry-run and --yes are not part of the closed lifecycle procedure contract", baseFlags);
      return;
    }
    try {
      const binding = parseControllerProjectionBinding(flags, requirements);
      const result = await projectLifecycleOperation(request, binding);
      const exitCode = lifecycleResultExitCode(request.operation, result);
      this.outputResult(this.ok({ operation: request.operation, result }), { flags: baseFlags });
      if (exitCode !== 0) this.exit(exitCode);
    } catch (error) {
      if (error instanceof LifecycleInputError || error instanceof LifecycleAuthorityBindingError) {
        this.rejectInput(error.message, baseFlags, error.code);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.outputResult(this.fail("Lifecycle procedure failed", {
        code: "LIFECYCLE_PROCEDURE_FAILED",
        details: { operation: request.operation, message },
      }), { flags: baseFlags });
      this.exit(1);
    }
  }

  protected rejectInput(
    message: string,
    flags: RawrBaseFlags,
    code = "LIFECYCLE_INPUT_INVALID",
  ): void {
    this.outputResult(this.fail(message, { code }), { flags });
    this.exit(2);
  }
}

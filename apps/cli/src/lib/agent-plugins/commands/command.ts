import type { RawrBaseFlags } from "@rawr/core";
import { RawrCommand } from "@rawr/core";

import { LifecycleInputError } from "./input";
import {
  LifecycleAuthorityBindingError,
  lifecycleResultExitCode,
  parseControllerProjectionBinding,
  projectLifecycleResultForOutput,
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
      providers?: readonly ("claude" | "codex")[];
    }> = {},
  ): Promise<void> {
    const baseFlags = RawrCommand.extractBaseFlags(flags as Record<string, unknown>);
    if (baseFlags.dryRun || baseFlags.yes) {
      this.rejectInput("--dry-run and --yes are not part of the closed lifecycle procedure contract", baseFlags);
      return;
    }
    let exitCode: 0 | 1 | 2;
    try {
      const binding = parseControllerProjectionBinding(flags, requirements);
      const result = await projectLifecycleOperation(request, binding);
      exitCode = lifecycleResultExitCode(request.operation, result);
      const projectedResult = projectLifecycleResultForOutput(request.operation, result);
      this.outputResult(this.ok({ operation: request.operation, result: projectedResult }), {
        flags: baseFlags,
        human: () => {
          for (const line of lifecycleHumanLines(request.operation, projectedResult)) this.log(line);
        },
      });
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
    if (exitCode !== 0) this.exit(exitCode);
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

function lifecycleHumanLines(operation: LifecycleOperationRequest["operation"], result: unknown): readonly string[] {
  const record = asRecord(result);
  if (
    (operation === "releases.releaseInputRecord" || operation === "governance.currentMainRecord")
    && record.ok === true
  ) {
    const envelopeText = asRecord(record.value).envelopeText;
    if (typeof envelopeText === "string" && envelopeText.endsWith("\n")) {
      return [envelopeText.slice(0, -1)];
    }
  }
  if (operation === "providers.canonicalStatus" && record.ok === true && Array.isArray(record.value)) {
    return [
      `${operation}:`,
      ...record.value.map((value) => {
        const outcome = asRecord(value);
        const target = asRecord(outcome.target);
        return `${String(target.provider)} ${String(target.home)}: ${String(outcome.status)}`;
      }),
    ];
  }
  if (typeof record.kind === "string") return [`${operation}: ${record.kind}`];
  if (record.ok === true) {
    const value = asRecord(record.value);
    if (typeof value.status === "string") return [`${operation}: ${value.status}`];
  }
  return [`${operation}: ${JSON.stringify(result)}`];
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

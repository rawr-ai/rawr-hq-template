import type { RawrBaseFlags } from "@habitat-ai/rawr-core";
import { RawrCommand } from "@habitat-ai/rawr-core";
import { productionLifecycleProfile } from "../profiles/production";
import { bindProductionLifecycleService } from "../service-runtime/client";
import { LifecycleInputError } from "./input";
import {
  invokeLifecycleProcedure,
  type LifecycleOperationRequest,
  type LifecycleProjectedOperationOutcome,
  lifecycleResultExitCode,
  projectLifecycleResultForOutput,
} from "./projection";

export abstract class AgentPluginLifecycleCommand extends RawrCommand {
  protected parseInput<T>(
    flags: Readonly<Record<string, unknown>>,
    parser: (flags: Readonly<Record<string, unknown>>) => T
  ): T | undefined {
    try {
      return parser(flags);
    } catch (error) {
      if (error instanceof LifecycleInputError) {
        this.rejectInput(
          error.message,
          RawrCommand.extractBaseFlags(flags as Record<string, unknown>),
          error.code
        );
        return undefined;
      }
      throw error;
    }
  }

  protected async project(
    request: LifecycleOperationRequest,
    flags: Readonly<Record<string, unknown>>
  ): Promise<void> {
    const baseFlags = RawrCommand.extractBaseFlags(flags as Record<string, unknown>);
    if (baseFlags.dryRun || baseFlags.yes) {
      this.rejectInput(
        "--dry-run and --yes are not part of the closed lifecycle procedure contract",
        baseFlags
      );
      return;
    }
    let exitCode: 0 | 1 | 2;
    try {
      const selectClient = bindProductionLifecycleService(productionLifecycleProfile);
      const outcome = await invokeLifecycleProcedure(request, selectClient);
      exitCode = lifecycleResultExitCode(outcome);
      const projectedOutcome = projectLifecycleResultForOutput(outcome);
      this.outputResult(this.ok(projectedOutcome), {
        flags: baseFlags,
        human: () => {
          for (const line of lifecycleHumanLines(projectedOutcome)) this.log(line);
        },
      });
    } catch (error) {
      if (error instanceof LifecycleInputError) {
        this.rejectInput(error.message, baseFlags, error.code);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.outputResult(
        this.fail("Lifecycle procedure failed", {
          code: "LIFECYCLE_PROCEDURE_FAILED",
          details: { operation: request.operation, message },
        }),
        { flags: baseFlags }
      );
      this.exit(1);
    }
    if (exitCode !== 0) this.exit(exitCode);
  }

  protected rejectInput(
    message: string,
    flags: RawrBaseFlags,
    code = "LIFECYCLE_INPUT_INVALID"
  ): void {
    this.outputResult(this.fail(message, { code }), { flags });
    this.exit(2);
  }
}

function lifecycleHumanLines(outcome: LifecycleProjectedOperationOutcome): readonly string[] {
  switch (outcome.operation) {
    case "releases.releaseInputRecord":
      if (outcome.result.ok && outcome.result.value.envelopeText.endsWith("\n")) {
        return [outcome.result.value.envelopeText.slice(0, -1)];
      }
      return [`${outcome.operation}: ${JSON.stringify(outcome.result)}`];
    case "releases.refreshReleaseInput":
      if (
        (outcome.result.kind === "ReleaseInputCandidateReady" ||
          outcome.result.kind === "ReleaseInputReadOnlyConverged") &&
        outcome.result.envelopeText.endsWith("\n")
      ) {
        return [outcome.result.envelopeText.slice(0, -1)];
      }
      return [`${outcome.operation}: ${outcome.result.kind}`];
    case "governance.currentMainRecord":
      if (outcome.result.ok && outcome.result.value.recordText.endsWith("\n")) {
        return [outcome.result.value.recordText.slice(0, -1)];
      }
      return [`${outcome.operation}: ${JSON.stringify(outcome.result)}`];
    case "providers.status":
      return [
        `${outcome.operation}:`,
        ...outcome.result.targets.map(
          (result) => `${result.target.provider} ${result.target.home}: ${result.classification}`
        ),
      ];
    case "providers.test":
    case "providers.sync":
      return [`${outcome.operation}: ${outcome.result.classification}`];
    case "releases.check":
    case "releases.checkRepository":
    case "vendors.status":
    case "vendors.update":
    case "packaging.package":
    case "governance.currentMainSelection":
      return [`${outcome.operation}: ${outcome.result.kind}`];
    default:
      return assertNever(outcome);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unreachable projected lifecycle outcome: ${String(value)}`);
}

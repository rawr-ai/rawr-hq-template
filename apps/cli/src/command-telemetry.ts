import { randomUUID } from "node:crypto";
import type {
  FinishNativeOperationInput,
  NativeOperationTelemetryScope,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Errors } from "@oclif/core";
import { Effect } from "effect";

type RawrCliCommandOutcome = FinishNativeOperationInput["outcome"];

/** Native command identity admitted after Oclif resolves the command class. */
export type RawrCliCommandStart = Readonly<{
  argvCount: number;
  commandId: string;
  pluginName?: string;
}>;

/** One command-event owner derived from the process telemetry resource. */
export type RawrCliCommandTelemetry = Readonly<{
  begin(input: RawrCliCommandStart): Promise<void>;
  finish(outcome: RawrCliCommandOutcome): Promise<void>;
}>;

type ActiveCommand = Readonly<{
  commandId: string;
  scope: NativeOperationTelemetryScope;
  startedAt: number;
}>;

/** Classifies the native Oclif terminal value without replacing its exit policy. */
export function classifyRawrCliCommandOutcome(error: Error | undefined): RawrCliCommandOutcome {
  if (error === undefined) return "succeeded";
  if (error.message === "SIGINT") return "cancelled";
  if (error instanceof Errors.ExitError && error.oclif?.exit === 0) return "succeeded";
  return "failed";
}

/** Creates the single command observer used by native Oclif lifecycle hooks. */
export function createRawrCliCommandTelemetry(
  telemetry: TelemetryResource
): RawrCliCommandTelemetry {
  let activeCommand: ActiveCommand | undefined;

  return Object.freeze({
    async begin(input) {
      if (activeCommand !== undefined) return;
      const operationId = randomUUID();
      const attributes = Object.freeze({
        "cli.command.id": input.commandId,
        ...(input.pluginName === undefined ? {} : { "cli.command.plugin": input.pluginName }),
        "cli.argv.count": input.argvCount,
      });

      try {
        const scope = await Effect.runPromise(
          telemetry.beginNativeOperation({
            surface: "oclif",
            kind: "command",
            operation: "oclif.command",
            operationId,
            attributes,
          })
        );
        activeCommand = Object.freeze({
          commandId: input.commandId,
          scope,
          startedAt: performance.now(),
        });
        await Effect.runPromise(
          telemetry.emitTechnicalLog({
            severity: "info",
            eventName: "oclif.command.started",
            message: "Oclif command started",
            attributes,
          })
        );
      } catch {
        // Telemetry is observational and cannot block native command execution.
      }
    },
    async finish(outcome) {
      const command = activeCommand;
      if (command === undefined) return;
      activeCommand = undefined;
      const attributes = Object.freeze({
        "cli.command.id": command.commandId,
        "duration.ms": Math.max(0, performance.now() - command.startedAt),
      });

      try {
        await Effect.runPromise(command.scope.finish({ outcome, attributes }));
        await Effect.runPromise(
          telemetry.emitTechnicalLog({
            severity: outcome === "failed" ? "error" : "info",
            eventName: "oclif.command.completed",
            message: "Oclif command completed",
            attributes,
          })
        );
      } catch {
        // Telemetry is observational and cannot replace native command completion.
      }
    },
  });
}

import type {
  BeginNativeOperationInput,
  EmitTechnicalLogInput,
  FinishNativeOperationInput,
  NativeOperationTelemetryScope,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Errors } from "@oclif/core";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  classifyRawrCliCommandOutcome,
  createRawrCliCommandTelemetry,
} from "../src/command-telemetry";

function makeTelemetry(options?: { beginDefect?: unknown; finishDefect?: unknown }) {
  const begins: BeginNativeOperationInput[] = [];
  const finishes: FinishNativeOperationInput[] = [];
  const technicalLogs: EmitTechnicalLogInput[] = [];
  const scope: NativeOperationTelemetryScope = Object.freeze({
    enrich: () => Effect.void,
    finish: (input: FinishNativeOperationInput) =>
      options?.finishDefect === undefined
        ? Effect.sync(() => finishes.push(input)).pipe(Effect.asVoid)
        : Effect.die(options.finishDefect),
  });
  const telemetry: TelemetryResource = Object.freeze({
    processIdentity: {
      serviceName: "rawr-cli-test",
      processRole: "cli-test",
      processInstanceId: "cli-test-1",
    },
    availability: "available",
    beginNativeOperation: (input: BeginNativeOperationInput) =>
      options?.beginDefect === undefined
        ? Effect.sync(() => begins.push(input)).pipe(Effect.as(scope))
        : Effect.die(options.beginDefect),
    emitTechnicalLog: (input: EmitTechnicalLogInput) =>
      Effect.sync(() => technicalLogs.push(input)).pipe(Effect.asVoid),
    readDiagnostics: () => Effect.succeed(Object.freeze([])),
    flush: () => Effect.succeed({ outcome: "flushed" as const, diagnostics: Object.freeze([]) }),
  });
  return { begins, finishes, technicalLogs, telemetry };
}

describe("Oclif command telemetry", () => {
  it("opens and finalizes one native command event with bounded technical records", async () => {
    const { begins, finishes, technicalLogs, telemetry } = makeTelemetry();
    const command = createRawrCliCommandTelemetry(telemetry);

    await command.begin({
      argvCount: 2,
      commandId: "agent:plugins:status",
      pluginName: "@habitat-ai/rawr",
    });
    await command.finish("succeeded");
    await command.finish("failed");

    expect(begins).toHaveLength(1);
    expect(begins[0]).toMatchObject({
      surface: "oclif",
      kind: "command",
      operation: "oclif.command",
      attributes: {
        "cli.command.id": "agent:plugins:status",
        "cli.command.plugin": "@habitat-ai/rawr",
        "cli.argv.count": 2,
      },
    });
    expect(finishes).toHaveLength(1);
    expect(finishes[0]?.outcome).toBe("succeeded");
    expect(finishes[0]?.attributes["cli.command.id"]).toBe("agent:plugins:status");
    expect(finishes[0]?.attributes["duration.ms"]).toEqual(expect.any(Number));
    expect(technicalLogs.map(({ eventName }) => eventName)).toEqual([
      "oclif.command.started",
      "oclif.command.completed",
    ]);
  });

  it("contains observer defects without changing command control flow", async () => {
    const begin = createRawrCliCommandTelemetry(
      makeTelemetry({ beginDefect: new Error("begin defect") }).telemetry
    );
    const finish = createRawrCliCommandTelemetry(
      makeTelemetry({ finishDefect: new Error("finish defect") }).telemetry
    );

    await expect(begin.begin({ argvCount: 0, commandId: "doctor" })).resolves.toBeUndefined();
    await finish.begin({ argvCount: 0, commandId: "doctor" });
    await expect(finish.finish("failed")).resolves.toBeUndefined();
  });

  it("preserves Oclif success, failure, and cancellation classification", () => {
    expect(classifyRawrCliCommandOutcome(undefined)).toBe("succeeded");
    expect(classifyRawrCliCommandOutcome(new Errors.ExitError(0))).toBe("succeeded");
    expect(classifyRawrCliCommandOutcome(new Error("declared failure"))).toBe("failed");
    expect(classifyRawrCliCommandOutcome(new Error("SIGINT"))).toBe("cancelled");
  });
});

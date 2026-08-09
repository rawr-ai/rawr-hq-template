import { describe, expect, test } from "bun:test";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import {
  EmitTechnicalLogInputSchema,
  FlushTelemetryInputSchema,
  FlushTelemetryResultSchema,
  MAX_TELEMETRY_ATTRIBUTES,
  type TelemetryAttributes,
  TelemetryAttributesSchema,
  type TelemetryDiagnostic,
  TelemetryDiagnosticSchema,
  type TelemetryExportCallbackAccounting,
  TelemetryExportCallbackAccountingSchema,
  type TelemetryProcessIdentity,
  TelemetryProcessIdentitySchema,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

export type IdentityComesFromTypeBox = Expect<
  Equal<TelemetryProcessIdentity, Static<typeof TelemetryProcessIdentitySchema>>
>;
export type AttributesComeFromTypeBox = Expect<
  Equal<TelemetryAttributes, Static<typeof TelemetryAttributesSchema>>
>;
export type DiagnosticComesFromTypeBox = Expect<
  Equal<TelemetryDiagnostic, Static<typeof TelemetryDiagnosticSchema>>
>;
export type AccountingComesFromTypeBox = Expect<
  Equal<TelemetryExportCallbackAccounting, Static<typeof TelemetryExportCallbackAccountingSchema>>
>;

describe("telemetry resource contract", () => {
  test("admits only bounded flat technical attributes", () => {
    expect(
      Value.Check(TelemetryAttributesSchema, {
        "request.id": "request-1",
        "retry.count": 2,
        cached: true,
      })
    ).toBe(true);
    expect(Value.Check(TelemetryAttributesSchema, { nested: { value: true } })).toBe(false);
    expect(Value.Check(TelemetryAttributesSchema, { "Bad Key": "value" })).toBe(false);
    expect(
      Value.Check(
        TelemetryAttributesSchema,
        Object.fromEntries(
          Array.from({ length: MAX_TELEMETRY_ATTRIBUTES + 1 }, (_, index) => [
            `attribute.${index}`,
            index,
          ])
        )
      )
    ).toBe(false);
  });

  test("closes process identity and technical log inputs", () => {
    expect(
      Value.Check(TelemetryProcessIdentitySchema, {
        serviceName: "habitat",
        processRole: "cli",
        processInstanceId: "process-1",
      })
    ).toBe(true);
    expect(
      Value.Check(EmitTechnicalLogInputSchema, {
        severity: "info",
        eventName: "command.completed",
        message: "Command completed",
        attributes: { "command.id": "command-1" },
        rawPayload: "not admitted",
      })
    ).toBe(false);
  });

  test("requires one finite monotonic deadline and nonnegative exporter-callback counts", () => {
    expect(
      Value.Check(FlushTelemetryInputSchema, {
        deadlineMonotonicMilliseconds: performance.now() + 1_000,
      })
    ).toBe(true);
    expect(
      Value.Check(FlushTelemetryInputSchema, {
        deadlineMonotonicMilliseconds: Number.POSITIVE_INFINITY,
      })
    ).toBe(false);
    expect(
      Value.Check(FlushTelemetryResultSchema, {
        outcome: "degraded",
        accounting: {
          traces: { successItems: 1, failureItems: 0 },
          metrics: { successItems: 1, failureItems: 0 },
          logs: { successItems: 0, failureItems: 1 },
        },
        diagnostics: [
          {
            stage: "export",
            code: "LOG_EXPORT_FAILED",
            detail: "OpenTelemetry Node provider operation failed and was contained",
          },
        ],
      })
    ).toBe(true);
  });
});

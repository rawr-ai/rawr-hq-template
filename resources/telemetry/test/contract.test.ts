import { describe, expect, test } from "bun:test";
import type { Effect } from "effect";
import type { Static } from "typebox";
import { Validator } from "typebox/schema";

import {
  type BeginNativeOperationInput,
  BeginNativeOperationInputSchema,
  type EmitTechnicalLogInput,
  EmitTechnicalLogInputSchema,
  type EnrichNativeOperationInput,
  EnrichNativeOperationInputSchema,
  type FinishNativeOperationInput,
  FinishNativeOperationInputSchema,
  type FlushTelemetryInput,
  FlushTelemetryInputSchema,
  type FlushTelemetryResult,
  FlushTelemetryResultSchema,
  MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH,
  MAX_TELEMETRY_ATTRIBUTES,
  MAX_TELEMETRY_DIAGNOSTIC_DETAIL_LENGTH,
  MAX_TELEMETRY_DIAGNOSTICS,
  type NativeOperationTelemetryScope,
  type TelemetryAvailability,
  TelemetryAvailabilitySchema,
  type TelemetryCorrelationAttributes,
  TelemetryCorrelationAttributesSchema,
  type TelemetryDiagnostic,
  TelemetryDiagnosticSchema,
  type TelemetryDiagnosticStage,
  TelemetryDiagnosticStageSchema,
  type TelemetryDiagnostics,
  TelemetryDiagnosticsSchema,
  type TelemetryLogSeverity,
  TelemetryLogSeveritySchema,
  type TelemetryProcessIdentity,
  TelemetryProcessIdentitySchema,
  type TelemetryResource,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
interface TestRequirement {
  readonly _tag: "TestRequirement";
}
type TestResource = TelemetryResource<TestRequirement>;
type TestScope = NativeOperationTelemetryScope<TestRequirement>;

const structuresComeFromTypeBox: readonly true[] = [
  true satisfies Expect<
    Equal<TelemetryProcessIdentity, Static<typeof TelemetryProcessIdentitySchema>>
  >,
  true satisfies Expect<
    Equal<TelemetryCorrelationAttributes, Static<typeof TelemetryCorrelationAttributesSchema>>
  >,
  true satisfies Expect<Equal<TelemetryAvailability, Static<typeof TelemetryAvailabilitySchema>>>,
  true satisfies Expect<
    Equal<BeginNativeOperationInput, Static<typeof BeginNativeOperationInputSchema>>
  >,
  true satisfies Expect<
    Equal<EnrichNativeOperationInput, Static<typeof EnrichNativeOperationInputSchema>>
  >,
  true satisfies Expect<
    Equal<FinishNativeOperationInput, Static<typeof FinishNativeOperationInputSchema>>
  >,
  true satisfies Expect<Equal<EmitTechnicalLogInput, Static<typeof EmitTechnicalLogInputSchema>>>,
  true satisfies Expect<Equal<TelemetryLogSeverity, Static<typeof TelemetryLogSeveritySchema>>>,
  true satisfies Expect<
    Equal<TelemetryDiagnosticStage, Static<typeof TelemetryDiagnosticStageSchema>>
  >,
  true satisfies Expect<Equal<TelemetryDiagnostic, Static<typeof TelemetryDiagnosticSchema>>>,
  true satisfies Expect<Equal<TelemetryDiagnostics, Static<typeof TelemetryDiagnosticsSchema>>>,
  true satisfies Expect<Equal<FlushTelemetryInput, Static<typeof FlushTelemetryInputSchema>>>,
  true satisfies Expect<Equal<FlushTelemetryResult, Static<typeof FlushTelemetryResultSchema>>>,
];

const resourceHasOnlyAdmittedKeys: Expect<
  Equal<
    keyof TelemetryResource,
    | "processIdentity"
    | "availability"
    | "beginNativeOperation"
    | "emitTechnicalLog"
    | "readDiagnostics"
    | "flush"
  >
> = true;
const eventScopeHasOnlyAdmittedKeys: Expect<
  Equal<keyof NativeOperationTelemetryScope, "enrich" | "finish">
> = true;
const resourceOperationEffectsAreExact: readonly true[] = [
  true satisfies Expect<
    Equal<
      ReturnType<TestResource["beginNativeOperation"]>,
      Effect.Effect<TestScope, never, TestRequirement>
    >
  >,
  true satisfies Expect<
    Equal<ReturnType<TestResource["emitTechnicalLog"]>, Effect.Effect<void, never, TestRequirement>>
  >,
  true satisfies Expect<
    Equal<
      ReturnType<TestResource["readDiagnostics"]>,
      Effect.Effect<TelemetryDiagnostics, never, TestRequirement>
    >
  >,
  true satisfies Expect<
    Equal<
      ReturnType<TestResource["flush"]>,
      Effect.Effect<FlushTelemetryResult, never, TestRequirement>
    >
  >,
  true satisfies Expect<
    Equal<ReturnType<TestScope["enrich"]>, Effect.Effect<void, never, TestRequirement>>
  >,
  true satisfies Expect<
    Equal<ReturnType<TestScope["finish"]>, Effect.Effect<void, never, TestRequirement>>
  >,
];

const processIdentityValidator = new Validator({}, TelemetryProcessIdentitySchema);
const attributesValidator = new Validator({}, TelemetryCorrelationAttributesSchema);
const beginNativeOperationValidator = new Validator({}, BeginNativeOperationInputSchema);
const finishNativeOperationValidator = new Validator({}, FinishNativeOperationInputSchema);
const technicalLogValidator = new Validator({}, EmitTechnicalLogInputSchema);
const diagnosticsValidator = new Validator({}, TelemetryDiagnosticsSchema);
const flushInputValidator = new Validator({}, FlushTelemetryInputSchema);
const flushResultValidator = new Validator({}, FlushTelemetryResultSchema);

describe("telemetry resource contract", () => {
  test("derives every structural public type from a TypeBox schema", () => {
    expect(structuresComeFromTypeBox).toEqual(Array(structuresComeFromTypeBox.length).fill(true));
  });

  test("exposes only the admitted never-failing capability surface", () => {
    expect([resourceHasOnlyAdmittedKeys, eventScopeHasOnlyAdmittedKeys]).toEqual([true, true]);
    expect(resourceOperationEffectsAreExact).toEqual(
      Array(resourceOperationEffectsAreExact.length).fill(true)
    );
  });

  test("admits one closed process identity and bounded flat scalar attributes", () => {
    expect(
      processIdentityValidator.Check({
        serviceName: "rawr-hq",
        serviceVersion: "0.1.0",
        processRole: "server",
        processInstanceId: "receipt-123",
      })
    ).toBe(true);
    expect(
      processIdentityValidator.Check({
        serviceName: "rawr-hq",
        processRole: "server",
        processInstanceId: "receipt-123",
        exporter: "otlp",
      })
    ).toBe(false);

    expect(
      attributesValidator.Check({
        "operation.id": "operation-1",
        "retry.attempt": 2,
        "request.matched": true,
      })
    ).toBe(true);
    for (const candidate of [
      { nested: { value: "not-flat" } },
      { nullable: null },
      { list: ["not", "atomic"] },
      { "UPPER.case": "not-canonical" },
      { [`a${"b".repeat(MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH)}`]: "too-long" },
      { oversized: "x".repeat(MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH + 1) },
      Object.fromEntries(
        Array.from({ length: MAX_TELEMETRY_ATTRIBUTES + 1 }, (_, index) => [`key.${index}`, index])
      ),
    ]) {
      expect(attributesValidator.Check(candidate)).toBe(false);
    }
  });

  test("admits fallback native-operation scopes only for closed native host variants", () => {
    const input: BeginNativeOperationInput = Object.freeze({
      surface: "oclif",
      kind: "command",
      operation: "agent.plugins.sync",
      operationId: "operation-1",
      attributes: Object.freeze({ "command.id": "agent:plugins:sync" }),
    });
    expect(beginNativeOperationValidator.Check(input)).toBe(true);
    expect(beginNativeOperationValidator.Check({ ...input, surface: "orpc" })).toBe(false);
    expect(beginNativeOperationValidator.Check({ ...input, kind: "attempt" })).toBe(false);
    expect(beginNativeOperationValidator.Check({ ...input, eventName: "duplicate" })).toBe(false);

    expect(finishNativeOperationValidator.Check({ outcome: "succeeded", attributes: {} })).toBe(
      true
    );
    expect(finishNativeOperationValidator.Check({ outcome: "unmatched", attributes: {} })).toBe(
      false
    );
    expect(
      finishNativeOperationValidator.Check({
        outcome: "succeeded",
        attributes: {},
        durationMs: 1,
      })
    ).toBe(false);
  });

  test("admits bounded technical logs and bounded contained diagnostics", () => {
    expect(
      technicalLogValidator.Check({
        severity: "info",
        eventName: "http.request.completed",
        message: "request completed",
        attributes: { "request.id": "request-1" },
      })
    ).toBe(true);
    expect(
      technicalLogValidator.Check({
        severity: "notice",
        eventName: "http.request.completed",
        message: "request completed",
        attributes: {},
      })
    ).toBe(false);

    expect(
      diagnosticsValidator.Check([
        {
          stage: "construction",
          code: "PROVIDER_CONSTRUCTION_FAILED",
          detail: "provider construction degraded",
        },
        {
          stage: "flush",
          code: "EXPORTER_FLUSH_FAILED",
          detail: "one exporter did not flush before the deadline",
        },
      ])
    ).toBe(true);
    expect(
      diagnosticsValidator.Check([
        {
          stage: "flush",
          code: "EXPORTER_FLUSH_FAILED",
          detail: "x".repeat(MAX_TELEMETRY_DIAGNOSTIC_DETAIL_LENGTH + 1),
        },
      ])
    ).toBe(false);
    expect(
      diagnosticsValidator.Check(
        Array.from({ length: MAX_TELEMETRY_DIAGNOSTICS + 1 }, () => ({
          stage: "flush",
          code: "EXPORTER_FLUSH_FAILED",
          detail: "bounded",
        }))
      )
    ).toBe(false);
  });

  test("admits a bounded monotonic deadline and observable never-failing flush result", () => {
    expect(flushInputValidator.Check({ deadlineMonotonicMilliseconds: 1_000 })).toBe(true);
    for (const candidate of [
      { deadlineMonotonicMilliseconds: -1 },
      { deadlineMonotonicMilliseconds: Number.POSITIVE_INFINITY },
      { deadlineMonotonicMilliseconds: 1_000, timeoutMs: 500 },
    ]) {
      expect(flushInputValidator.Check(candidate)).toBe(false);
    }
    expect(flushResultValidator.Check({ outcome: "flushed", diagnostics: [] })).toBe(true);
    expect(flushResultValidator.Check({ outcome: "failed", diagnostics: [] })).toBe(false);
  });
});

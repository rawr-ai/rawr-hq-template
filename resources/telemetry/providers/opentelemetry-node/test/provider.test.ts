import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Static } from "typebox";
import Schema from "typebox/schema";

import {
  type DisabledOpenTelemetryNodeConfig,
  DisabledOpenTelemetryNodeConfigSchema,
  makeDisabledOpenTelemetryNodeResource,
} from "../index";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

const configComesFromTypeBox: Expect<
  Equal<DisabledOpenTelemetryNodeConfig, Static<typeof DisabledOpenTelemetryNodeConfigSchema>>
> = true;
const configValidator = Schema.Compile(DisabledOpenTelemetryNodeConfigSchema);

const config: DisabledOpenTelemetryNodeConfig = Object.freeze({
  enabled: false,
  processIdentity: Object.freeze({
    serviceName: "rawr-hq",
    processRole: "server",
    processInstanceId: "disabled-test",
  }),
});

describe("disabled OpenTelemetry Node provider", () => {
  test("derives its closed inert configuration from TypeBox", () => {
    expect(configComesFromTypeBox).toBe(true);
    expect(configValidator.Check(config)).toBe(true);
    expect(configValidator.Check({ ...config, enabled: true })).toBe(false);
    expect(configValidator.Check({ ...config, endpoint: "https://collector.test" })).toBe(false);
  });

  test("constructs one disabled resource with no provider machinery", () => {
    const resource = makeDisabledOpenTelemetryNodeResource(config);

    expect(resource.processIdentity).toBe(config.processIdentity);
    expect(resource.availability).toBe("disabled");
    expect(Object.keys(resource)).toEqual([
      "processIdentity",
      "availability",
      "beginNativeOperation",
      "emitTechnicalLog",
      "readDiagnostics",
      "flush",
    ]);
  });

  test("settles every inert operation and idempotent scope finalization", async () => {
    const resource = makeDisabledOpenTelemetryNodeResource(config);
    const scope = await Effect.runPromise(
      resource.beginNativeOperation({
        surface: "oclif",
        kind: "command",
        operation: "agent.plugins.sync",
        operationId: "operation-1",
        attributes: { "command.id": "agent:plugins:sync" },
      })
    );

    await Effect.runPromise(scope.enrich({ attributes: { "receipt.id": "receipt-1" } }));
    await Effect.runPromise(scope.finish({ outcome: "succeeded", attributes: {} }));
    await Effect.runPromise(scope.finish({ outcome: "succeeded", attributes: {} }));
    await Effect.runPromise(
      resource.emitTechnicalLog({
        severity: "info",
        eventName: "command.completed",
        message: "command completed",
        attributes: { "operation.id": "operation-1" },
      })
    );

    expect(await Effect.runPromise(resource.readDiagnostics())).toEqual([]);
    expect(
      await Effect.runPromise(resource.flush({ deadlineMonotonicMilliseconds: 1_000 }))
    ).toEqual({ outcome: "flushed", diagnostics: [] });
  });
});

import { describe, expect, test } from "bun:test";
import {
  TypeBoxRuntimeSchemaProbe,
  validateTypeBoxInput,
} from "../../src/vendor/boundaries/typebox";
import { describeOrpcProbe } from "../../src/vendor/boundaries/orpc";
import { describeInngestProbe } from "../../src/vendor/boundaries/inngest";

describe("runtime realization boundary vendor lane", () => {
  test("validates TypeBox-backed runtime schema values", () => {
    const valid = {
      name: "runtime-profile",
      redaction: "none",
    };

    expect(validateTypeBoxInput(valid)).toEqual({
      valueCheck: true,
      compiledCheck: true,
      errorCount: 0,
    });
    expect(TypeBoxRuntimeSchemaProbe.parse(valid)).toEqual(valid);

    const invalid = { name: "" };
    const invalidResult = validateTypeBoxInput(invalid);
    expect(invalidResult.valueCheck).toBe(false);
    expect(invalidResult.compiledCheck).toBe(false);
    expect(invalidResult.errorCount).toBeGreaterThan(0);
  });

  test("constructs oRPC contract/server shape smoke artifacts", () => {
    expect(describeOrpcProbe()).toEqual({
      contractKeys: ["create"],
      routerKeys: ["create"],
      serverPayloadKind: "object",
    });
  });

  test("constructs Inngest function and Bun serve handoff shape without durable scheduling claims", () => {
    expect(describeInngestProbe()).toEqual({
      clientId: "rawr-runtime-realization-lab",
      functionCount: 1,
      serveHandlerType: "function",
    });
  });
});

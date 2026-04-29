import { describe, expect, test } from "bun:test";
import {
  TypeBoxRuntimeSchemaProbe,
  validateTypeBoxInput,
} from "../../src/vendor/boundaries/typebox";
import { describeOrpcProbe } from "../../src/vendor/boundaries/orpc";
import { describeInngestProbe } from "../../src/vendor/boundaries/inngest";

describe("runtime realization boundary vendor lane", () => {
  test("runs under Bun without adding Bun globals to the base typecheck", () => {
    expect(Bun.version).toBeTruthy();
    expect(typeof Bun.serve).toBe("function");
  });

  test("validates TypeBox-backed runtime schema values", () => {
    const valid = {
      title: "Typed item",
      description: "From TypeBox",
    };

    expect(validateTypeBoxInput(valid)).toEqual({
      valueCheck: true,
      compiledCheck: true,
      errorCount: 0,
    });
    expect(TypeBoxRuntimeSchemaProbe.parse(valid)).toEqual(valid);

    const invalid = { title: "" };
    const invalidResult = validateTypeBoxInput(invalid);
    expect(invalidResult.valueCheck).toBe(false);
    expect(invalidResult.compiledCheck).toBe(false);
    expect(invalidResult.errorCount).toBeGreaterThan(0);
  });

  test("constructs oRPC contract/server shapes without claiming RAWR .effect is native", () => {
    expect(describeOrpcProbe()).toEqual({
      contractKeys: ["create"],
      routerKeys: ["create"],
      serverHasNativeHandler: false,
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

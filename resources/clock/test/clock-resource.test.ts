import { describe, expect, test } from "vitest";
import { ClockResource, SystemClockProvider, clock } from "../src";

describe("@rawr/resource-clock", () => {
  test("declares the clock resource and system provider selection", () => {
    const selection = clock.system({ role: "server" });

    expect(ClockResource.id).toBe("clock");
    expect(SystemClockProvider.provides).toBe(ClockResource);
    expect(selection.kind).toBe("provider.selection");
    expect(selection.provider.id).toBe("clock.system");
    expect(selection.resource.id).toBe("clock");
    expect(selection.role).toBe("server");
  });

  test("builds a public provider effect plan without importing a host runtime", () => {
    const plan = SystemClockProvider.build({
      config: undefined as never,
      resources: new Map(),
      scope: { processId: "clock-process", role: "server" },
      telemetry: { event() {} },
      diagnostics: { report() {} },
    });

    expect(plan.kind).toBe("provider.effect-plan");
    expect(plan.boundary).toBe("provider.acquire");
  });
});

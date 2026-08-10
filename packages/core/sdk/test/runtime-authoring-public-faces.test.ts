import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const expectedRuntimeExports = [
  "./app",
  "./effect",
  "./execution",
  "./runtime/profiles",
  "./runtime/providers",
  "./runtime/resources",
  "./runtime/schema",
];

describe("runtime authoring public faces", () => {
  test("cold-imports only the task 4.1 runtime authoring operations", async () => {
    const [app, effect, execution, profiles, providers, resources, runtimeSchema, service] =
      await Promise.all([
        import("../src/app"),
        import("../src/effect"),
        import("../src/execution"),
        import("../src/runtime/profiles"),
        import("../src/runtime/providers"),
        import("../src/runtime/resources"),
        import("../src/runtime/schema"),
        import("../src/service"),
      ]);

    expect(Object.keys(app).sort()).toEqual([
      "defineApp",
      "defineEntrypoint",
      "defineProcessCatalog",
      "runtimeLaunchIdentity",
    ]);
    expect(Object.keys(effect).sort()).toEqual(["Effect", "TaggedError"]);
    expect(Object.keys(execution)).toEqual([]);
    expect(Object.keys(profiles)).toEqual(["defineRuntimeProfile"]);
    expect(Object.keys(providers)).toEqual(["defineRuntimeProvider"]);
    expect(Object.keys(resources).sort()).toEqual(["defineRuntimeResource", "requireResource"]);
    expect(Object.keys(runtimeSchema).sort()).toEqual([
      "RuntimeLifecyclePhaseSchema",
      "RuntimeObservationRecordSchema",
      "RuntimeSchema",
    ]);
    expect(Object.keys(service).sort()).toEqual([
      "createAnalyticsMiddlewareCallback",
      "createObservabilityMiddlewareCallback",
      "defineService",
      "getProcedureMetadata",
      "procedureMetadata",
      "resourceDep",
      "semanticDep",
      "serviceDep",
      "useService",
    ]);

    for (const face of [app, effect, execution, profiles, providers, resources, runtimeSchema]) {
      expect(face).not.toHaveProperty("startApp");
      expect(face).not.toHaveProperty("providerSelection");
      expect(face).not.toHaveProperty("ProviderEffectPlan");
      expect(face).not.toHaveProperty("providerFx");
      expect(face).not.toHaveProperty("build");
      expect(face).not.toHaveProperty("ManagedRuntime");
      expect(face).not.toHaveProperty("runPromise");
    }
  });

  test("declares the exact task 4.1 package subpaths without future empty faces", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { exports: Record<string, unknown> };
    const runtimeExports = Object.keys(packageJson.exports)
      .filter(
        (subpath) =>
          ["./app", "./effect", "./execution"].includes(subpath) || subpath.startsWith("./runtime/")
      )
      .sort();

    expect(runtimeExports).toEqual(expectedRuntimeExports);
    expect(packageJson.exports).not.toHaveProperty("./runtime/providers/effect");
    expect(packageJson.exports).not.toHaveProperty("./runtime/harnesses");
    expect(
      Object.keys(packageJson.exports).some((subpath) => subpath.startsWith("./plugins/"))
    ).toBe(false);
  });
});

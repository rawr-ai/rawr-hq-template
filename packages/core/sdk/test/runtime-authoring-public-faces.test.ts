import { describe, expect, test } from "vitest";
import * as app from "../src/app";
import * as effect from "../src/effect";
import * as execution from "../src/execution";
import * as profiles from "../src/runtime/profiles";
import * as providers from "../src/runtime/providers";
import * as providerEffect from "../src/runtime/providers/effect";
import * as resources from "../src/runtime/resources";
import * as runtimeSchema from "../src/runtime/schema";

describe("runtime authoring public faces", () => {
  test("exports only implemented cold definition operations", () => {
    expect(Object.keys(app).sort()).toEqual([
      "defineApp",
      "defineEntrypoint",
      "defineProcessCatalog",
      "defineRuntimeProfile",
      "runtimeLaunchIdentity",
    ]);
    expect(Object.keys(effect).sort()).toEqual(["Effect", "TaggedError"]);
    expect(Object.keys(execution)).toEqual(["defineEffectExecution"]);
    expect(Object.keys(resources).sort()).toEqual(["defineRuntimeResource", "requireResource"]);
    expect(Object.keys(providers)).toEqual(["defineRuntimeProvider"]);
    expect(Object.keys(providerEffect)).toEqual(["providerFx"]);
    expect(Object.keys(profiles)).toEqual(["defineRuntimeProfile"]);
    expect(Object.keys(runtimeSchema)).toEqual(["RuntimeSchema"]);
  });

  test("does not expose live runtime or raw Effect authority", () => {
    for (const face of [app, effect, execution, profiles, providers, providerEffect, resources]) {
      expect(face).not.toHaveProperty("startApp");
      expect(face).not.toHaveProperty("ManagedRuntime");
      expect(face).not.toHaveProperty("runPromise");
      expect(face).not.toHaveProperty("providerSelection");
    }
  });
});

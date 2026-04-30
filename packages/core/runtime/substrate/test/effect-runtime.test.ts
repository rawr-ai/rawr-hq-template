import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import { Effect } from "@rawr/sdk/effect";
import {
  Exit,
  createManagedEffectRuntimeAccess,
} from "../src";

const require = createRequire(import.meta.url);
const effectPackage = require("effect/package.json") as { readonly version: string };

describe("@rawr/core-runtime-substrate", () => {
  test("resolves the runtime substrate through Effect 4", () => {
    expect(effectPackage.version).toBe("4.0.0-beta.59");
  });

  test("runs RAWR effects through the private Effect 4 runtime access", async () => {
    const runtime = createManagedEffectRuntimeAccess();

    try {
      const success = await runtime.runPromiseExit(Effect.succeed("ok"));
      const failure = await runtime.runPromiseExit(Effect.fail("nope"));

      expect(runtime.kind).toBe("effect.runtime-access");
      expect(Exit.isSuccess(success) && success.value).toBe("ok");
      expect(Exit.isFailure(failure)).toBe(true);
    } finally {
      await runtime.dispose();
    }
  });
});

import { describe, expect, test } from "vitest";
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";
import {
  assertSameExecutionRef,
  createRuntimeDiagnostic,
  executionRefKey,
  hasBlockingDiagnostics,
} from "../src";

const ref = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.cli-command",
  executionId: "hq.cli.sync",
  appId: "hq",
  role: "cli",
  surface: "cli",
  capability: "sync",
  commandId: "sync",
} as const satisfies ExecutionDescriptorRef;

describe("@rawr/core-runtime-topology", () => {
  test("keeps execution ref identity and diagnostics deterministic", () => {
    expect(executionRefKey(ref)).toBe("plugin.cli-command:hq.cli.sync");
    expect(() => assertSameExecutionRef(ref, ref, "same")).not.toThrow();
    expect(() =>
      assertSameExecutionRef(ref, { ...ref, executionId: "other" }, "different"),
    ).toThrow("different mismatch");

    expect(
      hasBlockingDiagnostics([
        createRuntimeDiagnostic({
          code: "runtime.bad",
          message: "bad",
        }),
      ]),
    ).toBe(true);
  });
});

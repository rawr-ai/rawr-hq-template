import { describe, expect, test } from "vitest";
import { Effect } from "@rawr/sdk/effect";
import type {
  ExecutionDescriptor,
  ExecutionDescriptorRef,
} from "@rawr/sdk/execution";
import { compileRuntimeSpine } from "../src";

const ref = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.async-step",
  executionId: "hq.async.sync.step",
  appId: "hq",
  role: "async",
  surface: "workflow",
  capability: "sync",
  workflowId: "sync.workflow",
  stepId: "sync.step",
} as const satisfies ExecutionDescriptorRef;

describe("@rawr/core-runtime-compiler", () => {
  test("compiles refs, descriptor table entries, and refs-only portable artifacts", () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: () => Effect.succeed(undefined),
    } satisfies ExecutionDescriptor;
    const compilation = compileRuntimeSpine({
      executions: [{ ref, descriptor, policy: { timeoutMs: 1000 } }],
    });

    expect(compilation.kind).toBe("runtime.spine-compilation");
    expect(compilation.plans).toHaveLength(1);
    expect(compilation.descriptorTableEntries).toHaveLength(1);
    expect(compilation.portableArtifact.executionRefs).toEqual([ref]);
    const portableJson = JSON.stringify(compilation.portableArtifact);
    expect(portableJson).not.toContain("\"descriptor\"");
    expect(portableJson).not.toContain("\"run\"");
  });

  test("diagnoses duplicate execution refs without producing duplicate plans", () => {
    const compilation = compileRuntimeSpine({
      executions: [{ ref }, { ref }],
    });

    expect(compilation.plans).toHaveLength(1);
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.execution.duplicate-ref",
    );
  });
});

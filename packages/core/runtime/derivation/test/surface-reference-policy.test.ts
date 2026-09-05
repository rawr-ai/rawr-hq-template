import { expect, test } from "bun:test";

import type { ExecutionDescriptorRef } from "../src/execution-descriptor-ref";
import { assertSurfaceReferenceRelation } from "../src/surface-reference-policy";

const base = {
  kind: "execution.descriptor-ref" as const,
  ownerId: `plugin-owner:sha256:${"a".repeat(64)}`,
  executionId: `execution-descriptor:sha256:${"b".repeat(64)}`,
};

test("requires the exact admitted async parent lane and a distinct web loader lane", () => {
  const cases: readonly (readonly [string, ExecutionDescriptorRef])[] = [
    [
      "async/workflow",
      { ...base, boundary: "plugin.async-step", workflowId: "workflow", stepId: "step" },
    ],
    [
      "async/schedule",
      { ...base, boundary: "plugin.async-step", scheduleId: "schedule", stepId: "step" },
    ],
    [
      "async/consumer",
      { ...base, boundary: "plugin.async-step", consumerId: "consumer", stepId: "step" },
    ],
  ];
  for (const [surface, ref] of cases) {
    expect(() => assertSurfaceReferenceRelation({ role: "async", surface }, ref)).not.toThrow();
    expect(() =>
      assertSurfaceReferenceRelation({ role: "server", surface: "server/api" }, ref)
    ).toThrow(TypeError);
    expect(() => assertSurfaceReferenceRelation({ role: "server", surface }, ref)).toThrow(
      TypeError
    );
    for (const [other] of cases) {
      if (other === surface) continue;
      expect(() => assertSurfaceReferenceRelation({ role: "async", surface: other }, ref)).toThrow(
        TypeError
      );
    }
  }
  const web = {
    kind: "web.route-module-ref" as const,
    ownerId: base.ownerId,
    routeId: "index",
    path: "/",
  };
  expect(() =>
    assertSurfaceReferenceRelation({ role: "web", surface: "web/app" }, web)
  ).not.toThrow();
  expect(() => assertSurfaceReferenceRelation({ role: "server", surface: "web/app" }, web)).toThrow(
    TypeError
  );
  expect(() => assertSurfaceReferenceRelation({ role: "web", surface: "server/api" }, web)).toThrow(
    TypeError
  );
});

test("closed ref vocabulary alone does not admit executable lane membership", () => {
  const refs: readonly ExecutionDescriptorRef[] = [
    { ...base, boundary: "plugin.cli-command", commandId: "command" },
    { ...base, boundary: "plugin.web-surface", surfaceId: "surface" },
    { ...base, boundary: "plugin.agent-tool", toolId: "tool" },
    { ...base, boundary: "plugin.desktop-background", backgroundId: "background" },
  ];
  for (const ref of refs) {
    expect(() =>
      assertSurfaceReferenceRelation({ role: "server", surface: "server/api" }, ref)
    ).toThrow(TypeError);
  }
});

test("requires exact agent tool and desktop background role/surface relations", () => {
  const tool = { ...base, boundary: "plugin.agent-tool" as const, toolId: "tool" };
  const background = {
    ...base,
    boundary: "plugin.desktop-background" as const,
    backgroundId: "background",
  };
  expect(() =>
    assertSurfaceReferenceRelation({ role: "agent", surface: "agent/tools" }, tool)
  ).not.toThrow();
  expect(() =>
    assertSurfaceReferenceRelation({ role: "desktop", surface: "desktop/background" }, background)
  ).not.toThrow();
  for (const ref of [tool, background]) {
    for (const surface of [
      { role: "agent" as const, surface: "desktop/background" },
      { role: "desktop" as const, surface: "agent/tools" },
      { role: "server" as const, surface: "server/api" },
    ]) {
      expect(() => assertSurfaceReferenceRelation(surface, ref)).toThrow(TypeError);
    }
  }
});

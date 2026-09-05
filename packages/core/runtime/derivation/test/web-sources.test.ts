import { expect, test } from "bun:test";
import { Effect as NativeEffect } from "effect";

import {
  type ProcedureExecutionContext,
  readExecutionProjection,
} from "../../definition/src/index";
import { readRuntimeDerivationHandoff } from "../src/derivation-handoff";
import { deriveWebExecutionEntry } from "../src/derive-execution-descriptor-table";
import { executionDescriptorId } from "../src/identity-policy";
import { deriveServerFixture } from "./helpers/server-source-fixture";
import { webSourceFixture, zeroWebCalls } from "./helpers/web-source-fixture";

test("one selected web route union preserves disjoint Effect and module channels cold", () => {
  const fixture = webSourceFixture();
  const { derivation } = fixture;
  const handoff = readRuntimeDerivationHandoff(derivation);
  expect(derivation.graph.plugins).toHaveLength(2);
  expect(derivation.graph.plugins.every((plugin) => plugin.role === "web")).toBe(true);
  expect(derivation.graph.serviceUses).toEqual([]);
  expect(derivation.graph.serviceBindingPlans).toEqual([]);
  expect(handoff.asyncSources).toEqual([]);
  expect(handoff.serverSources).toEqual([]);
  expect(handoff.workflowAdmissions).toEqual([]);
  expect(derivation.graph.resourceRequirements).toHaveLength(2);
  expect(derivation.graph.profile.providerSelections).toHaveLength(1);
  const entries = derivation.executionDescriptorTable.entries();
  const modules = derivation.webRouteModuleTable.entries();
  expect(entries).toHaveLength(4);
  expect(modules).toHaveLength(2);
  expect(derivation.portableArtifact.executionDescriptorRefs).toHaveLength(4);
  for (const [ref, descriptor] of entries) {
    if (ref.boundary !== "plugin.web-surface") throw new Error("Expected web occurrence.");
    expect(ref.executionId).toBe(
      executionDescriptorId({
        boundary: "plugin.web-surface",
        ownerId: ref.ownerId,
        surfaceId: ref.surfaceId,
      })
    );
    expect(ref.surfaceId === "request" || ref.surfaceId === "reuse").toBe(true);
    expect(descriptor.kind).toBe("execution.effect");
    expect(descriptor.policy).toBe(fixture.effect.policy);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(readExecutionProjection(descriptor)).toEqual({
      kind: "web.route",
      path: ref.surfaceId === "request" ? "/request" : "/reuse",
    });
    expect(derivation.executionDescriptorTable.get({ ...ref })).toBe(descriptor);
  }
  expect(new Set(entries.map(([, descriptor]) => descriptor)).size).toBe(4);
  expect(new Set(entries.map(([ref]) => ref.ownerId)).size).toBe(2);
  for (const { ref, load } of modules) {
    expect(ref.routeId).toBe("page");
    expect(ref.path).toBe("/");
    expect(load).toBe(fixture.module);
    expect(derivation.webRouteModuleTable.get({ ...ref })).toBe(fixture.module);
    expect(() => derivation.webRouteModuleTable.get({ ...ref, path: "/changed" })).toThrow(
      TypeError
    );
  }
  expect(Object.keys(derivation)).toHaveLength(6);
  expect(JSON.stringify(derivation.graph)).not.toContain("web.effect");
  expect(JSON.stringify(derivation.portableArtifact)).not.toContain("/request");
  expect(fixture.calls).toEqual(zeroWebCalls);
});

test("web route IDs and plugin instances define occurrences; Effect paths stay private", () => {
  const original = webSourceFixture();
  const reordered = webSourceFixture({ reverse: true });
  const moved = webSourceFixture({ effectPath: "/moved" });
  expect(original.derivation.graph).toEqual(reordered.derivation.graph);
  expect(original.derivation.graph.executionDescriptorRefs).toEqual(
    moved.derivation.graph.executionDescriptorRefs
  );
  const ref = original.derivation.graph.executionDescriptorRefs.find(
    (item) => item.boundary === "plugin.web-surface" && item.surfaceId === "request"
  )!;
  expect(readExecutionProjection(original.derivation.executionDescriptorTable.get(ref))).toEqual({
    kind: "web.route",
    path: "/request",
  });
  expect(readExecutionProjection(moved.derivation.executionDescriptorTable.get(ref))).toEqual({
    kind: "web.route",
    path: "/moved",
  });
  expect(original.calls).toEqual(zeroWebCalls);
  expect(reordered.calls).toEqual(zeroWebCalls);
  expect(moved.calls).toEqual(zeroWebCalls);
});

test("web operational bodies remain lazy and retain native Request, Response and procedure context", async () => {
  const fixture = webSourceFixture();
  const [ref, descriptor] = fixture.derivation.executionDescriptorTable.entries()[0]!;
  const request = new Request("http://localhost/request", { method: "POST", body: "original" });
  const resources = Object.freeze({ has: () => true, get: () => ({ source: "native-host" }) });
  const invocation: ProcedureExecutionContext<unknown, unknown> = {
    input: request,
    context: { resources },
    execution: {
      appId: "web",
      processId: "web",
      entrypointId: "web",
      profileId: "web",
      role: "web",
      surface: "web/app",
      ownerId: ref.ownerId,
      executionId: ref.executionId,
      traceId: "native-web-trace",
    },
    telemetry: { span: (_name, program) => program, event: () => NativeEffect.void },
  };
  const program = descriptor.run(invocation);
  expect(fixture.calls).toEqual(zeroWebCalls);
  const result = await NativeEffect.runPromise(program as NativeEffect.Effect<unknown, unknown>);
  expect(result).toBe(fixture.response);
  expect(fixture.contexts[0]!.input).toBe(request);
  expect(fixture.contexts[0]!.context.resources).toBe(resources);
  expect(fixture.contexts[0]!.execution).toBe(invocation.execution);
  expect(fixture.contexts[0]!.telemetry).toBe(invocation.telemetry);
  expect(fixture.calls).toEqual({ ...zeroWebCalls, body: 1 });
});

test("unselected web routes select neither their Effects, modules nor host resources", () => {
  const fixture = webSourceFixture();
  const unselected = deriveServerFixture([fixture.first], ["cli"], fixture.providers);
  expect(unselected.executionDescriptorTable.entries()).toEqual([]);
  expect(unselected.webRouteModuleTable.entries()).toEqual([]);
  expect(unselected.graph.resourceRequirements).toEqual([]);
  expect(unselected.graph.profile.providerSelections).toEqual([]);
  expect(fixture.calls).toEqual(zeroWebCalls);
});

test("cold web lowering refuses a non-web descriptor without invoking its body", () => {
  const fixture = webSourceFixture();
  const malformed = { ...fixture.effect };
  Reflect.set(malformed, "kind", "execution.effect");
  expect(() =>
    deriveWebExecutionEntry("plugin-owner:sha256:" + "a".repeat(64), {
      id: "invalid",
      path: "/invalid",
      effect: malformed,
    })
  ).toThrow(TypeError);
  expect(fixture.calls).toEqual(zeroWebCalls);
});

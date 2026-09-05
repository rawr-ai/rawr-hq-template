import { expect, test } from "bun:test";
import type { CompiledSurfacePlan } from "../../compiler/src/index";
import { runtimeLaunchIdentity } from "../../definition/src/index";
import type { HarnessDescriptor, HarnessHealthReport, HarnessMountInput } from "../src/index";
import * as publicContract from "../src/index";
import {
  assertHarnessHealthReport,
  assertRequiredResourcesReady,
  createOwnerStop,
} from "../src/native-contract";

const identity = runtimeLaunchIdentity({
  app: "app",
  process: "process",
  entrypoint: "main",
  deployment: "test",
  source: "fixture",
});
const ready = Object.freeze({
  ready: true,
  resources: Object.freeze([
    { resource: "file:primary", ready: true, findings: Object.freeze([]) },
  ]),
});
const report: HarnessHealthReport = Object.freeze({
  launchIdentity: identity,
  harnessId: "test-host",
  kind: "readiness",
  status: "not-applicable",
  findings: Object.freeze([]),
});

test("public harness companion is type-only and does not accept a compiled plan as a lowered callback", () => {
  expect(Object.keys(publicContract)).toEqual([]);
  const rejectCompiled = (plan: CompiledSurfacePlan) => {
    // @ts-expect-error A compiler plan is not a lowered tool callback payload.
    const payload: HarnessMountInput<{ invoke(): Promise<unknown> }>["mountReadyPayloads"][number] =
      plan;
    return payload;
  };
  expect(typeof rejectCompiled).toBe("function");
});

test("required-resource readiness is read-only and cannot be promoted by a health report", () => {
  assertRequiredResourcesReady(ready);
  expect(Object.isFrozen(ready.resources)).toBe(true);
  expect(() => assertRequiredResourcesReady({ ...ready, ready: false })).toThrow(TypeError);
  expect(() =>
    assertRequiredResourcesReady({
      ready: true,
      resources: [{ resource: "file:primary", ready: false, findings: [] }],
    })
  ).toThrow(TypeError);
  expect(() =>
    assertRequiredResourcesReady({
      ready: true,
      resources: [
        {
          resource: "file:primary",
          ready: true,
          findings: [{ code: "failed", message: "failed", severity: "error" }],
        },
      ],
    })
  ).toThrow(TypeError);
});

test("health preserves exact identity and distinct probe evidence, including explicit no-op status", () => {
  const expected = { launchIdentity: identity, harnessId: "test-host", kind: "readiness" as const };
  assertHarnessHealthReport(report, expected);
  assertHarnessHealthReport({ ...report, status: "unknown" }, expected);
  expect(report.status).toBe("not-applicable");
  expect(() =>
    assertHarnessHealthReport({ ...report, launchIdentity: { ...identity } }, expected)
  ).toThrow(TypeError);
  expect(() => assertHarnessHealthReport({ ...report, kind: "liveness" }, expected)).toThrow(
    TypeError
  );
  expect(() => assertHarnessHealthReport({ ...report, harnessId: "other" }, expected)).toThrow(
    TypeError
  );
  expect(() =>
    assertHarnessHealthReport(
      {
        ...report,
        status: "passing",
        findings: [{ code: "failed", message: "failed", severity: "error" }],
      },
      expected
    )
  ).toThrow(TypeError);
});

test("one owner's stop shares its promise and waits for cleanup before rejecting", async () => {
  const cleanup = Promise.withResolvers<void>();
  const failure = new Error("native stop failed");
  let calls = 0;
  let settled = false;
  const stop = createOwnerStop(async () => {
    calls++;
    await cleanup.promise;
    throw failure;
  });
  const first = stop();
  const observed = first.catch((error) => {
    settled = true;
    return error;
  });
  expect(stop()).toBe(first);
  await Promise.resolve();
  expect(calls).toBe(1);
  expect(settled).toBe(false);
  cleanup.resolve();
  expect(await observed).toBe(failure);
  expect(stop()).toBe(first);
});

test("a test-owned failed mount settles its partial native cleanup before rejecting", async () => {
  const cleanup = Promise.withResolvers<void>();
  let allocated = false;
  let settled = false;
  const descriptor: HarnessDescriptor = {
    id: "test-host",
    roles: ["agent"],
    surfaces: ["agent/tools"],
    async mount(input) {
      assertRequiredResourcesReady(input.requiredResources);
      allocated = true;
      try {
        throw new Error("partial native mount");
      } finally {
        await cleanup.promise;
        allocated = false;
      }
    },
  };
  const mount = descriptor.mount;
  const input: HarnessMountInput = {
    launchIdentity: identity,
    roles: ["agent"],
    mountReadyPayloads: [],
    requiredResources: ready,
    reports: { report() {} },
    processAccess: {
      appId: "app",
      processId: "process",
      entrypointId: "main",
      profileId: "test",
      roles: ["agent"],
      resource() {
        throw new Error("No resource is selected in this contract fixture.");
      },
      optionalResource() {
        return undefined;
      },
    },
  };
  const result = mount(input).catch((error) => {
    settled = true;
    return error;
  });
  await Promise.resolve();
  expect(allocated).toBe(true);
  expect(settled).toBe(false);
  cleanup.resolve();
  expect(await result).toBeInstanceOf(Error);
  expect(allocated).toBe(false);
});

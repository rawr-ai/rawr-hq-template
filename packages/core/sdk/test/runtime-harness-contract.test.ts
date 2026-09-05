import { expect, test } from "vitest";

import type { RuntimeLaunchIdentity as DefinitionIdentity } from "../../runtime/definition/src/index";
import type { ProcessRuntimeAccess as PrivateProcessAccess } from "../../runtime/process-runtime/src/index";
import type {
  HarnessDescriptor,
  HarnessHealthReport,
  HarnessMountInput,
  NativeHarnessHandle,
  ProcessRuntimeAccess,
  RuntimeLaunchIdentity,
} from "../src/runtime/harnesses/index";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const exactContract: readonly [
  Equal<RuntimeLaunchIdentity, DefinitionIdentity>,
  Equal<ProcessRuntimeAccess, PrivateProcessAccess>,
  Equal<ReturnType<HarnessDescriptor["mount"]>, Promise<NativeHarnessHandle>>,
  Equal<ReturnType<NativeHarnessHandle["stop"]>, Promise<void>>,
  Equal<ReturnType<NonNullable<NativeHarnessHandle["readiness"]>>, Promise<HarnessHealthReport>>,
  Equal<ReturnType<NonNullable<NativeHarnessHandle["liveness"]>>, Promise<HarnessHealthReport>>,
  Equal<HarnessMountInput["launchIdentity"], DefinitionIdentity>,
  Equal<
    HarnessMountInput<{ invoke(): Promise<string> }>["mountReadyPayloads"],
    readonly { invoke(): Promise<string> }[]
  >,
] = [true, true, true, true, true, true, true, true];

test("projects exact companion types with no runtime host or lifecycle exports", async () => {
  expect(exactContract.every(Boolean)).toBe(true);
  expect(Object.keys(await import("../src/runtime/harnesses/index"))).toEqual([]);
});

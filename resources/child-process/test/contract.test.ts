import { expect, expectTypeOf, test } from "bun:test";
import type { Effect, PlatformError, Scope } from "effect";
import type {
  ChildProcessHandle,
  ChildProcessSpawner,
} from "effect/unstable/process/ChildProcessSpawner";
import type { ChildProcessResource } from "../contract";
import { ChildProcessRuntimeResource } from "../runtime";

test("child-process is one cold process-lifetime identity with the exact native capability", () => {
  expect(ChildProcessRuntimeResource.id).toBe("child-process");
  expect(ChildProcessRuntimeResource.defaultLifetime).toBe("process");
  expect(ChildProcessRuntimeResource.allowedLifetimes).toEqual(["process"]);
  expect(Object.isFrozen(ChildProcessRuntimeResource)).toBe(true);
  expect(Object.isFrozen(ChildProcessRuntimeResource.allowedLifetimes)).toBe(true);
  expectTypeOf<ChildProcessResource>().toEqualTypeOf<ChildProcessSpawner["Service"]>();
  expectTypeOf<ReturnType<ChildProcessResource["spawn"]>>().toEqualTypeOf<
    Effect.Effect<ChildProcessHandle, PlatformError.PlatformError, Scope.Scope>
  >();
});

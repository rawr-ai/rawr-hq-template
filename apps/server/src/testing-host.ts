import { createRawrHqManifest } from "@rawr/hq-app/manifest";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import { createRawrHostBoundRolePlan } from "./host-seam";
import { materializeRawrHostBoundRolePlan } from "./host-realization";

const noopLogger = {
  info() {},
  error() {},
} as const;

export function createTestingRawrHostSeam() {
  const manifest = createRawrHqManifest({
    hostLogger: noopLogger,
  });
  const boundRolePlan = createRawrHostBoundRolePlan({ manifest });
  const realization = materializeRawrHostBoundRolePlan(boundRolePlan);

  return {
    manifest,
    boundRolePlan,
    realization,
  } as const;
}

export function createTestingExampleTodoClient(repoRoot: string): ExampleTodoClient {
  return createTestingRawrHostSeam().manifest.fixtures.exampleTodo.resolveClient(repoRoot);
}

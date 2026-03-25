import { createRawrHqManifest } from "@rawr/hq-app/manifest";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import { createRawrHostBoundRolePlan } from "./host-seam";
import { createRawrHostSatisfiers } from "./host-satisfiers";
import { materializeRawrHostBoundRolePlan } from "./host-realization";

const noopLogger = {
  info() {},
  error() {},
} as const;
const testingRawrHqManifest = createRawrHqManifest();
const testingRawrHostSatisfiers = createRawrHostSatisfiers({
  hostLogger: noopLogger,
});

/**
 * @agents-style canonical host-owned proof seam
 *
 * Owns:
 * - test-only realization of the canonical host seam
 *
 * Must not own:
 * - app-side executable bridge compatibility
 * - alternate binding rules
 *
 * Canonical:
 * - `manifest -> host-seam -> host-realization`
 */
export function createTestingRawrHostSeam() {
  const boundRolePlan = createRawrHostBoundRolePlan({
    manifest: testingRawrHqManifest,
    satisfiers: testingRawrHostSatisfiers,
  });
  const realization = materializeRawrHostBoundRolePlan(boundRolePlan);

  return {
    manifest: testingRawrHqManifest,
    boundRolePlan,
    realization,
  } as const;
}

export function createTestingExampleTodoServiceClient(repoRoot: string): ExampleTodoClient {
  return testingRawrHostSatisfiers.exampleTodo.resolveClient(repoRoot);
}

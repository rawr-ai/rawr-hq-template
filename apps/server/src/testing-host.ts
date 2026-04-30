import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import type { Client as HqOpsClient } from "@rawr/hq-ops";
import { createTestingRawrHqRuntimeAuthority } from "./runtime-authority";

/**
 * @agents-style canonical HQ runtime proof seam
 *
 * Owns:
 * - test-only realization of the sanctioned HQ runtime authority
 *
 * Must not own:
 * - app-side runtime host compatibility
 * - alternate binding rules
 *
 * Canonical:
 * - `runtime-authority -> host-seam -> host-realization`
 */
let cachedSeam: ReturnType<typeof createTestingRawrHqRuntimeAuthority> | null = null;

export function createTestingRawrHostSeam() {
  if (!cachedSeam) cachedSeam = createTestingRawrHqRuntimeAuthority();
  return cachedSeam;
}

export function resetTestingRawrHostSeam() {
  cachedSeam = null;
}

/**
 * @agents-style mixed-path proof helper
 *
 * Owns:
 * - direct service-package access used by one legacy proof leg
 *
 * Must not own:
 * - the decisive realized host-seam proof
 * - canonical route/contract/publication drift authority
 *
 * Note:
 * - this helper remains acceptable only as supporting evidence while
 *   `proof.api.example-todo.surface` is explicitly marked mixed-path
 */
export function createTestingExampleTodoServiceClient(repoRoot: string): ExampleTodoClient {
  return createTestingRawrHostSeam().satisfiers.exampleTodo.resolveClient(repoRoot);
}

export function createTestingHqOpsServiceClient(repoRoot: string): HqOpsClient {
  return createTestingRawrHostSeam().satisfiers.state.resolveClient(repoRoot);
}

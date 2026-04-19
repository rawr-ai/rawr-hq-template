import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import { createRawrHostComposition } from "./host-composition";

const noopLogger = {
  info() {},
  error() {},
} as const;
const testingRawrHostComposition = createRawrHostComposition({
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
 * - `host-composition -> host-seam -> host-realization`
 */
export function createTestingRawrHostSeam() {
  return {
    manifest: testingRawrHostComposition.manifest,
    declarations: testingRawrHostComposition.declarations,
    boundRolePlan: testingRawrHostComposition.boundRolePlan,
    realization: testingRawrHostComposition.realization,
  } as const;
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
  return testingRawrHostComposition.satisfiers.exampleTodo.resolveClient(repoRoot);
}

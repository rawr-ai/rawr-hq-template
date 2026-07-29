import type { Client as ExampleTodoClient } from "@rawr/example-todo/client";
import { registerExampleTodoApiPlugin } from "../../../plugins/server/api/example-todo/src/api";
import { createRawrHostComposition } from "./host-composition";

const testingHostLogger = {
  info() {},
  error() {},
} as const;

/**
 * @agents-style canonical server-owned proof seam
 *
 * Owns:
 * - test-only realization of the canonical host composition
 *
 * Must not own:
 * - app-side executable host compatibility
 * - alternate binding rules
 *
 * Canonical:
 * - `host-composition -> host-seam -> host-realization`
 */
let cachedSeam: ReturnType<typeof createRawrHostComposition> | null = null;

export function createTestingRawrHostSeam() {
  if (!cachedSeam) {
    cachedSeam = createRawrHostComposition({
      declarations: {
        api: {
          exampleTodo: registerExampleTodoApiPlugin(),
        },
        workflows: {},
      },
      hostLogger: testingHostLogger,
    });
  }
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

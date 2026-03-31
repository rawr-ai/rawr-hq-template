import { registerExampleTodoApiPlugin } from "@rawr/plugin-server-api-example-todo/server";
import { registerStateApiPlugin } from "@rawr/plugin-server-api-state/server";

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical app composition authority
 *
 * Owns:
 * - which plugin registrations exist for HQ
 * - app-local composition facts only
 *
 * Must not own:
 * - host satisfier construction
 * - bound plugin contributions
 * - ORPC/workflow router materialization
 * - request-scoped or process-scoped executable runtime surfaces
 *
 * Canonical:
 * - `plugins`
 *
 * Transitional:
 * - narrow server-side consumption of `@rawr/hq-app/manifest` as composition input
 *   may remain while the split-project topology exists
 */
export function createRawrHqManifest() {
  const apiPlugins = {
    state: registerStateApiPlugin(),
    exampleTodo: registerExampleTodoApiPlugin(),
  } as const;

  // The HQ app defines which plugin registrations exist. Binding and runtime
  // realization happen in the host-owned server seam.
  return {
    plugins: {
      api: apiPlugins,
      workflows: {} as const,
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;

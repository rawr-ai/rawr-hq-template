import { defineApp } from "@rawr/sdk/app";
import { defineRuntimeProfile } from "@rawr/sdk/runtime/profiles";
import { registerExampleTodoApiPlugin } from "@rawr/plugin-server-api-example-todo/server";
import { registerStateApiPlugin } from "@rawr/plugin-server-api-state/server";

export const rawrHqRuntimeProfile = defineRuntimeProfile({
  id: "hq.default",
  providers: [],
});

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical app composition authority
 *
 * Owns:
 * - app identity
 * - role/surface membership for the Phase 1 HQ shell
 * - declaration-only plugin selection
 *
 * Must not own:
 * - host satisfier construction
 * - bound plugin contributions
 * - ORPC/workflow router materialization
 * - request-scoped or process-scoped executable runtime surfaces
 */
export function createRawrHqManifest() {
  const api = {
    state: registerStateApiPlugin(),
    exampleTodo: registerExampleTodoApiPlugin(),
  } as const;

  return {
    id: "hq",
    roles: {
      server: {
        api: api,
      },
      async: {
        workflows: {} as const,
        schedules: {} as const,
      },
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;

export function createRawrHqApp() {
  const manifest = createRawrHqManifest();
  return defineApp({
    id: manifest.id,
    plugins: Object.values(manifest.roles.server.api),
    profiles: [rawrHqRuntimeProfile],
  });
}

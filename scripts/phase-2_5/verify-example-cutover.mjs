#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("apps/hq/rawr.hq.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("plugins/server/api/example-todo/src/index.ts"),
  mustExist("plugins/server/api/example-todo/src/server.ts"),
  mustExist("plugins/server/api/example-todo/src/router.ts"),
  mustExist("apps/server/test/rawr.test.ts"),
  mustExist("apps/server/test/api-plugin-example-surface.test.ts"),
  mustExist("scripts/phase-2_5/verify-example-cutover.mjs"),
]);

const [scripts, shellSource, manifestCompatSource, pluginSource, pluginServerSource, pluginRouterSource, rawrTestSource, apiSurfaceTestSource] = await Promise.all([
  readPackageScripts(),
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("plugins/server/api/example-todo/src/index.ts"),
  readFile("plugins/server/api/example-todo/src/server.ts"),
  readFile("plugins/server/api/example-todo/src/router.ts"),
  readFile("apps/server/test/rawr.test.ts"),
  readFile("apps/server/test/api-plugin-example-surface.test.ts"),
]);

assertCondition(
  shellSource.includes("registerExampleTodoApiPlugin"),
  "apps/hq/rawr.hq.ts must compose the canonical example-todo API plugin from the package seam",
);
assertCondition(
  shellSource.includes("@rawr/plugin-server-api-example-todo/server"),
  "apps/hq/rawr.hq.ts must import the example-todo host registration from the plugin server surface",
);
assertCondition(
  !shellSource.includes("./plugins/api/support-example") && !shellSource.includes("registerSupportExampleApiPlugin"),
  "apps/hq/rawr.hq.ts must remove support-example from the canonical ORPC API surface",
);
assertCondition(
  manifestCompatSource.includes('export { createRawrHqManifest } from "../rawr.hq";'),
  "apps/hq/src/manifest.ts must remain a thin compatibility forwarder to rawr.hq.ts",
);
assertCondition(
  pluginSource.includes("exampleTodoApiContract") && !pluginSource.includes("registerExampleTodoApiPlugin"),
  "plugins/server/api/example-todo/src/index.ts must stay app-safe and must not register the host ORPC surface",
);
assertCondition(
  pluginServerSource.includes("defineApiPlugin")
    && pluginServerSource.includes("exampleTodoApiContract")
    && pluginServerSource.includes("published: {")
    && pluginServerSource.includes("published: internal"),
  "plugins/server/api/example-todo/src/server.ts must register the example-todo API plugin through defineApiPlugin over the canonical contract",
);
assertCondition(
  pluginRouterSource.includes("resolveClient(context.repoRoot).tasks.create")
    && pluginRouterSource.includes("resolveClient(context.repoRoot).tasks.get"),
  "plugins/server/api/example-todo/src/router.ts must stay a thin projection over the host-owned example-todo client",
);
assertCondition(
  apiSurfaceTestSource.includes("/rpc/exampleTodo/tasks/create")
    && apiSurfaceTestSource.includes("/api/orpc/exampleTodo/tasks/create"),
  "apps/server/test/api-plugin-example-surface.test.ts must prove both first-party and external example-todo entrypoints",
);
assertCondition(
  apiSurfaceTestSource.includes("INVALID_TASK_TITLE") && apiSurfaceTestSource.includes("RESOURCE_NOT_FOUND"),
  "apps/server/test/api-plugin-example-surface.test.ts must assert typed example-todo errors across both caller surfaces",
);
assertCondition(
  rawrTestSource.includes("Object.keys(realization.orpc.published.router)).toEqual([\"exampleTodo\"])")
    && rawrTestSource.includes("Object.keys(realization.workflows.published.router)).toEqual([])"),
  "apps/server/test/rawr.test.ts must guard the canonical published API/workflow composition against legacy support-example reintroduction",
);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:example-cutover",
  "bun scripts/phase-2_5/verify-example-cutover.mjs && bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/api-plugin-example-surface.test.ts",
);

console.log("phase-2_5 example cutover contract verified");

#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("rawr.hq.ts"),
  mustExist("plugins/api/example-todo/src/index.ts"),
  mustExist("plugins/api/example-todo/src/router.ts"),
  mustExist("apps/server/test/rawr.test.ts"),
  mustExist("apps/server/test/api-plugin-example-surface.test.ts"),
  mustExist("scripts/phase-2_5/verify-example-cutover.mjs"),
]);

const [scripts, manifestSource, pluginSource, pluginRouterSource, rawrTestSource, apiSurfaceTestSource] = await Promise.all([
  readPackageScripts(),
  readFile("rawr.hq.ts"),
  readFile("plugins/api/example-todo/src/index.ts"),
  readFile("plugins/api/example-todo/src/router.ts"),
  readFile("apps/server/test/rawr.test.ts"),
  readFile("apps/server/test/api-plugin-example-surface.test.ts"),
]);

assertCondition(
  manifestSource.includes("@rawr/example-todo") && manifestSource.includes("registerExampleTodoApiPlugin"),
  "rawr.hq.ts must compose the canonical example-todo API plugin from the package seam",
);
assertCondition(
  !manifestSource.includes("./plugins/api/support-example") && !manifestSource.includes("registerSupportExampleApiPlugin"),
  "rawr.hq.ts must remove support-example from the canonical ORPC API surface",
);
assertCondition(
  manifestSource.includes("createClient as createExampleTodoClient"),
  "rawr.hq.ts must build example-todo clients from the package-root client factory",
);
assertCondition(
  pluginSource.includes('namespace: "orpc"') && pluginSource.includes("exampleTodoApiContract"),
  "plugins/api/example-todo/src/index.ts must register an ORPC plugin over the example-todo contract",
);
assertCondition(
  pluginRouterSource.includes("resolveClient(context.repoRoot).tasks.create")
    && pluginRouterSource.includes("resolveClient(context.repoRoot).tasks.get"),
  "plugins/api/example-todo/src/router.ts must stay a thin projection over the host-owned example-todo client",
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
  rawrTestSource.includes("registerExampleTodoApiPlugin")
    && rawrTestSource.includes("not.toContain(\"./plugins/api/support-example\")"),
  "apps/server/test/rawr.test.ts must guard the host manifest against legacy support-example API composition",
);

assertScriptEquals(
  scripts,
  "phase-2_5:gate:example-cutover",
  "bun scripts/phase-2_5/verify-example-cutover.mjs && bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/api-plugin-example-surface.test.ts",
);

console.log("phase-2_5 example cutover contract verified");

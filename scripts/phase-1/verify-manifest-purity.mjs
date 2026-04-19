#!/usr/bin/env bun
import {
  assertCondition,
  pathExists,
  readFile,
  readPackageJson,
} from "./_verify-utils.mjs";

function normalizeSemanticSource(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

assertCondition(await pathExists("apps/hq/rawr.hq.ts"), "apps/hq/rawr.hq.ts must exist");

const [pkg, manifestSource, manifestCompatSource] = await Promise.all([
  readPackageJson("apps/hq/package.json"),
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
]);

assertCondition(pkg.exports?.["./manifest"]?.default === "./rawr.hq.ts", "@rawr/hq-app/manifest must resolve to rawr.hq.ts");
assertCondition(manifestSource.includes('id: "hq"'), "rawr.hq.ts must author the HQ app identity");
assertCondition(manifestSource.includes("roles:"), "rawr.hq.ts must author role membership");
assertCondition(manifestSource.includes("server:"), "rawr.hq.ts must author the server role");
assertCondition(manifestSource.includes("async:"), "rawr.hq.ts must author the async role");
assertCondition(manifestSource.includes("api:"), "rawr.hq.ts must author explicit server API surface membership");
assertCondition(manifestSource.includes("workflows:"), "rawr.hq.ts must author explicit async workflow surface membership");
assertCondition(!manifestSource.includes("createRawrHostSatisfiers"), "rawr.hq.ts must not construct host satisfiers");
assertCondition(!manifestSource.includes("createRawrHostBoundRolePlan"), "rawr.hq.ts must not bind host declarations");
assertCondition(!manifestSource.includes("materializeRawrHostBoundRolePlan"), "rawr.hq.ts must not materialize host runtime surfaces");
assertCondition(!manifestSource.includes("registerOrpcRoutes"), "rawr.hq.ts must not mount ORPC routes");
assertCondition(!manifestSource.includes("new Inngest("), "rawr.hq.ts must not create Inngest clients");
assertCondition(!manifestSource.includes("createWorkflowRouteHarness"), "rawr.hq.ts must not own workflow route harnesses");
assertCondition(
  normalizeSemanticSource(manifestCompatSource) === 'export{createRawrHqManifest}from"../rawr.hq";exporttype{RawrHqManifest}from"../rawr.hq";',
  "apps/hq/src/manifest.ts must remain a thin compatibility forwarder to rawr.hq.ts",
);

console.log("manifest purity verified");

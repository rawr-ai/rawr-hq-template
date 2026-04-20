#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  asObjectLiteral,
  getObjectPropertyInitializer,
  hasIdentifierCall,
  hasNamedImport,
  hasPropertyAccessChain,
  hasRouteRegistration,
  hasStringLiteral,
  matchesPropertyAccessChain,
  parseTypeScript,
  unwrapExpression,
  visit,
} from "./ts-ast-utils.mjs";

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = (modeArg?.split("=", 2)[1] ?? "baseline").trim();

if (mode !== "baseline" && mode !== "completion") {
  console.error(`Unsupported mode: ${mode}. Use --mode=baseline|completion.`);
  process.exit(2);
}

const root = process.cwd();
const rawrFile = path.join(root, "apps", "server", "src", "rawr.ts");
const orpcFile = path.join(root, "apps", "server", "src", "orpc.ts");
const openApiFile = path.join(root, "apps", "server", "scripts", "write-orpc-openapi.ts");
const testingHostFile = path.join(root, "apps", "server", "src", "testing-host.ts");
const supportProofFile = path.join(root, "apps", "server", "test", "support", "example-todo-proof-clients.ts");
const manifestFile = path.join(root, "apps", "hq", "src", "manifest.ts");
const rawrHqManifestFile = path.join(root, "apps", "hq", "rawr.hq.ts");
const legacyCutoverFile = path.join(root, "apps", "hq", "legacy-cutover.ts");

const rawrSource = await fs.readFile(rawrFile, "utf8");
const orpcSource = await fs.readFile(orpcFile, "utf8");
const openApiSource = await fs.readFile(openApiFile, "utf8");
const testingHostSource = await fs.readFile(testingHostFile, "utf8");
const supportProofSource = await fs.readFile(supportProofFile, "utf8");
const legacyCutoverSource = mode === "completion" ? await fs.readFile(legacyCutoverFile, "utf8") : "";
const manifestEntrySource = mode === "completion" ? await fs.readFile(manifestFile, "utf8") : "";
const manifestSource = mode === "completion" && manifestEntrySource.includes("../rawr.hq")
  ? `${manifestEntrySource}\n${await fs.readFile(rawrHqManifestFile, "utf8")}`
  : manifestEntrySource;
const rawrAst = parseTypeScript(rawrFile, rawrSource);
const orpcAst = parseTypeScript(orpcFile, orpcSource);
const manifestAst = mode === "completion" ? parseTypeScript(manifestFile, manifestSource) : null;

const hasPackageOwnedPluginDeclarations =
  (
    manifestSource.includes("plugins: {") &&
    manifestSource.includes("api: apiPlugins") &&
    manifestSource.includes("workflows: {} as const")
  ) ||
  (
    manifestSource.includes("const api =") &&
    manifestSource.includes("server:") &&
    manifestSource.includes("api: api") &&
    manifestSource.includes("async:") &&
    manifestSource.includes("workflows: {} as const")
  );

function hasRegisterOrpcRoutesHostSeamRouter(rawrSourceFile) {
  let matched = false;
  visit(rawrSourceFile, (node) => {
    if (matched || !ts.isCallExpression(node)) return;
    if (!ts.isIdentifier(node.expression) || node.expression.text !== "registerOrpcRoutes") return;
    if (node.arguments.length < 2) return;
    const optionsObject = asObjectLiteral(node.arguments[1]);
    if (!optionsObject) return;
    const routerInitializer = getObjectPropertyInitializer(optionsObject, "router");
    if (!routerInitializer) return;
    if (matchesPropertyAccessChain(routerInitializer, ["rawrHostSeam", "orpc", "router"])) {
      matched = true;
    }
  });
  return matched;
}

function isFunctionLikeExpression(node) {
  const unwrapped = unwrapExpression(node);
  return Boolean(unwrapped && (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)));
}

const requiredChecks = [
  { label: "/api/inngest mount registration", ok: hasRouteRegistration(rawrAst, "/api/inngest") },
  { label: "/rpc routing registration", ok: hasRouteRegistration(orpcAst, "/rpc") },
  { label: "/api/orpc routing registration", ok: hasRouteRegistration(orpcAst, "/api/orpc") },
];

if (mode === "completion") {
  requiredChecks.push({
    label: "manifest declares package-owned composition seams",
    ok:
      manifestSource.includes("export function createRawrHqManifest") &&
      hasPackageOwnedPluginDeclarations &&
      !manifestSource.includes("createInngestServeHandler") &&
      !manifestSource.includes("new Inngest(") &&
      !manifestSource.includes("createWorkflowRouteHarness"),
  });
  requiredChecks.push({
    label: "host consumes HQ-owned legacy cutover composition bridge",
    ok: hasNamedImport(rawrAst, "@rawr/hq-app/legacy-cutover", "createRawrHqLegacyRouteAuthority"),
  });
  requiredChecks.push({
    label: "host wires /api/workflows capability-family routing",
    ok:
      hasRouteRegistration(rawrAst, "/api/workflows/*") &&
      hasIdentifierCall(rawrAst, "createWorkflowRouteHarness") &&
      !hasIdentifierCall(rawrAst, "resolveWorkflowCapability"),
  });
  requiredChecks.push({
    label: "manifest exposes declaration-only plugin groups instead of path-prefix authority",
    ok:
      !manifestSource.includes("rawrHqWorkflowCapabilities") &&
      hasPackageOwnedPluginDeclarations,
  });
  requiredChecks.push({
    label: "host consumes host-owned workflow route seam",
    ok:
      hasIdentifierCall(rawrAst, "createWorkflowRouteHarness") &&
      hasPropertyAccessChain(rawrAst, ["rawrHostSeam", "workflows", "published", "router"]),
  });
  requiredChecks.push({
    label: "host composes workflow runtime from host-owned realization shells instead of host-local capability imports",
    ok:
      hasPropertyAccessChain(rawrAst, ["rawrHostAuthority", "realization", "workflows", "createInngestFunctions"]) &&
      hasIdentifierCall(rawrAst, "createHostInngestBundle") &&
      !rawrSource.includes("rawrHqManifest.inngest"),
  });
  requiredChecks.push({
    label: "host consumes manifest-owned ORPC router seam",
    ok:
      hasRegisterOrpcRoutesHostSeamRouter(rawrAst) &&
      hasIdentifierCall(rawrAst, "createRawrHqLegacyRouteAuthority") &&
      legacyCutoverSource.includes("../server/src/host-composition"),
  });
  requiredChecks.push({
    label: "host avoids bypassing manifest orpc authority while owning runtime ingress composition",
    ok:
      !hasNamedImport(rawrAst, "./orpc", "createOrpcRouter") &&
      !hasIdentifierCall(rawrAst, "createOrpcRouter"),
  });
  requiredChecks.push({
    label: "proof and openapi helpers avoid HQ testing and direct manifest fixture bypass",
    ok:
      !orpcSource.includes("@rawr/hq-app/testing") &&
      !openApiSource.includes("@rawr/hq-app/testing") &&
      !testingHostSource.includes("manifest.fixtures") &&
      !supportProofSource.includes("createTestingRawrHqManifest") &&
      !supportProofSource.includes("manifest.fixtures"),
  });
  requiredChecks.push({
    label: "no dedicated /rpc/workflows route leakage",
    ok:
      !hasStringLiteral(rawrAst, (value) => value.includes("/rpc/workflows")) &&
      !hasStringLiteral(orpcAst, (value) => value.includes("/rpc/workflows")),
  });
}

const failures = requiredChecks.filter((item) => !item.ok);

if (failures.length === 0) {
  console.log(`manifest-smoke (${mode}) passed.`);
  process.exit(0);
}

console.error(`manifest-smoke (${mode}) failed:`);
for (const failure of failures) {
  console.error(`  - missing ${failure.label}`);
}
process.exit(1);

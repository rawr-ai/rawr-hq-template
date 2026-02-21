#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  asObjectLiteral,
  findVariableObjectLiteral,
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
const manifestFile = path.join(root, "rawr.hq.ts");

const rawrSource = await fs.readFile(rawrFile, "utf8");
const orpcSource = await fs.readFile(orpcFile, "utf8");
const manifestSource = mode === "completion" ? await fs.readFile(manifestFile, "utf8") : "";
const rawrAst = parseTypeScript(rawrFile, rawrSource);
const orpcAst = parseTypeScript(orpcFile, orpcSource);
const manifestAst = mode === "completion" ? parseTypeScript(manifestFile, manifestSource) : null;

function hasRegisterOrpcRoutesManifestRouter(rawrSourceFile) {
  let matched = false;
  visit(rawrSourceFile, (node) => {
    if (matched || !ts.isCallExpression(node)) return;
    if (!ts.isIdentifier(node.expression) || node.expression.text !== "registerOrpcRoutes") return;
    if (node.arguments.length < 2) return;
    const optionsObject = asObjectLiteral(node.arguments[1]);
    if (!optionsObject) return;
    const routerInitializer = getObjectPropertyInitializer(optionsObject, "router");
    if (!routerInitializer) return;
    if (matchesPropertyAccessChain(routerInitializer, ["rawrHqManifest", "orpc", "router"])) {
      matched = true;
    }
  });
  return matched;
}

function isFunctionLikeExpression(node) {
  const unwrapped = unwrapExpression(node);
  return Boolean(unwrapped && (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)));
}

function capabilitiesAreStructured(manifestObject) {
  const workflowsObject = asObjectLiteral(getObjectPropertyInitializer(manifestObject, "workflows"));
  if (!workflowsObject) return false;
  const capabilitiesObject = asObjectLiteral(getObjectPropertyInitializer(workflowsObject, "capabilities"));
  if (!capabilitiesObject) return false;

  const capabilityEntries = capabilitiesObject.properties.filter(ts.isPropertyAssignment);
  if (capabilityEntries.length === 0) return false;

  return capabilityEntries.every((entry) => {
    const capabilityObject = asObjectLiteral(entry.initializer);
    if (!capabilityObject) return false;
    const pathPrefixInit = getObjectPropertyInitializer(capabilityObject, "pathPrefix");
    return Boolean(pathPrefixInit && ts.isStringLiteral(pathPrefixInit) && pathPrefixInit.text.startsWith("/"));
  });
}

function hasManifestCompositionSeams(manifestObject) {
  const orpcObject = asObjectLiteral(getObjectPropertyInitializer(manifestObject, "orpc"));
  const workflowsObject = asObjectLiteral(getObjectPropertyInitializer(manifestObject, "workflows"));
  const inngestObject = asObjectLiteral(getObjectPropertyInitializer(manifestObject, "inngest"));
  if (!orpcObject || !workflowsObject || !inngestObject) return false;

  const hasOrpcRouter = Boolean(getObjectPropertyInitializer(orpcObject, "router"));
  const hasTriggerRouter = Boolean(getObjectPropertyInitializer(workflowsObject, "triggerRouter"));
  const bundleFactory = getObjectPropertyInitializer(inngestObject, "bundleFactory");
  const serveHandlerFactory = getObjectPropertyInitializer(inngestObject, "serveHandlerFactory");
  return hasOrpcRouter && hasTriggerRouter && isFunctionLikeExpression(bundleFactory) && isFunctionLikeExpression(serveHandlerFactory);
}

const requiredChecks = [
  { label: "/api/inngest mount registration", ok: hasRouteRegistration(rawrAst, "/api/inngest") },
  { label: "/rpc routing registration", ok: hasRouteRegistration(orpcAst, "/rpc") },
  { label: "/api/orpc routing registration", ok: hasRouteRegistration(orpcAst, "/api/orpc") },
];

if (mode === "completion") {
  const manifestObject = manifestAst ? findVariableObjectLiteral(manifestAst, "rawrHqManifest") : undefined;

  requiredChecks.push({
    label: "manifest exports structured workflow capability mapping",
    ok: Boolean(manifestObject && capabilitiesAreStructured(manifestObject)),
  });
  requiredChecks.push({
    label: "manifest declares package-owned composition seams",
    ok: Boolean(manifestObject && hasManifestCompositionSeams(manifestObject)),
  });
  requiredChecks.push({
    label: "host imports manifest authority seam",
    ok: hasNamedImport(rawrAst, "../../../rawr.hq", "rawrHqManifest"),
  });
  requiredChecks.push({
    label: "host wires /api/workflows capability-family routing",
    ok: hasRouteRegistration(rawrAst, "/api/workflows/*") && hasIdentifierCall(rawrAst, "resolveWorkflowCapability"),
  });
  requiredChecks.push({
    label: "host consumes manifest workflow capability map",
    ok: hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows", "capabilities"]),
  });
  requiredChecks.push({
    label: "host consumes manifest workflow trigger router seam",
    ok: hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows", "triggerRouter"]),
  });
  requiredChecks.push({
    label: "host consumes manifest inngest seams",
    ok:
      hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "bundleFactory"]) &&
      hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "serveHandlerFactory"]),
  });
  requiredChecks.push({
    label: "host consumes manifest-owned ORPC router seam",
    ok: hasRegisterOrpcRoutesManifestRouter(rawrAst),
  });
  requiredChecks.push({
    label: "host avoids app-internal ad-hoc seam composition",
    ok:
      !hasNamedImport(rawrAst, "@rawr/coordination-inngest", "createCoordinationInngestFunction") &&
      !hasNamedImport(rawrAst, "@rawr/coordination-inngest", "createInngestServeHandler") &&
      !hasNamedImport(rawrAst, "./orpc", "createOrpcRouter") &&
      !hasIdentifierCall(rawrAst, "createCoordinationInngestFunction") &&
      !hasIdentifierCall(rawrAst, "createInngestServeHandler") &&
      !hasIdentifierCall(rawrAst, "createOrpcRouter"),
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

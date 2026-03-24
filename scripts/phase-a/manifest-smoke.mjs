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
const manifestFile = path.join(root, "apps", "hq", "src", "manifest.ts");

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
      manifestSource.includes("router: composedOrpcRouter") &&
      manifestSource.includes("surfaces: composedWorkflowSurface.surfaces") &&
      manifestSource.includes("triggerContract: composedWorkflowSurface.triggerContract") &&
      manifestSource.includes("triggerRouter: composedWorkflowSurface.triggerRouter") &&
      manifestSource.includes("registerCoordinationWorkflowPlugin") &&
      manifestSource.includes("composeWorkflowPlugins") &&
      !manifestSource.includes("createInngestServeHandler") &&
      !manifestSource.includes("new Inngest("),
  });
  requiredChecks.push({
    label: "host imports manifest authority seam",
    ok: hasNamedImport(rawrAst, "@rawr/hq-app/manifest", "createRawrHqManifest"),
  });
  requiredChecks.push({
    label: "host wires /api/workflows capability-family routing",
    ok:
      hasRouteRegistration(rawrAst, "/api/workflows/*") &&
      hasIdentifierCall(rawrAst, "createWorkflowRouteHarness") &&
      !hasIdentifierCall(rawrAst, "resolveWorkflowCapability"),
  });
  requiredChecks.push({
    label: "manifest exposes workflow surface metadata instead of path-prefix authority",
    ok:
      !manifestSource.includes("rawrHqWorkflowCapabilities") &&
      manifestSource.includes("surfaces: composedWorkflowSurface.surfaces"),
  });
  requiredChecks.push({
    label: "host consumes manifest workflow trigger router seam",
    ok:
      hasIdentifierCall(rawrAst, "createWorkflowRouteHarness") &&
      hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows"]),
  });
  requiredChecks.push({
    label: "host composes workflow runtime from manifest workflow shells instead of host-local capability imports",
    ok:
      hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows", "createInngestFunctions"]) &&
      hasIdentifierCall(rawrAst, "createHostInngestBundle") &&
      !rawrSource.includes("rawrHqManifest.inngest"),
  });
  requiredChecks.push({
    label: "host consumes manifest-owned ORPC router seam",
    ok: hasRegisterOrpcRoutesManifestRouter(rawrAst) && hasIdentifierCall(rawrAst, "createRawrHqManifest"),
  });
  requiredChecks.push({
    label: "host avoids bypassing manifest orpc authority while owning runtime ingress composition",
    ok:
      !hasNamedImport(rawrAst, "./orpc", "createOrpcRouter") &&
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

#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  hasIdentifierCall,
  hasImport,
  hasNamedImport,
  hasPropertyAccessChain,
  hasRouteRegistration,
  importModuleSet,
  matchesPropertyAccessChain,
  namedImportInfo,
  parseTypeScript,
  propertyNameText,
  unwrapExpression,
  visit,
} from "./ts-ast-utils.mjs";

const gateId = process.argv[2];

if (!gateId) {
  console.error("Usage: bun scripts/phase-a/verify-gate-scaffold.mjs <gate-id>");
  process.exit(2);
}

const root = process.cwd();

async function mustExist(relPath) {
  const abs = path.join(root, relPath);
  try {
    const st = await fs.stat(abs);
    if (!st.isFile()) throw new Error("not-a-file");
  } catch {
    throw new Error(`missing file: ${relPath}`);
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readTypeScriptFile(relPath) {
  const abs = path.join(root, relPath);
  const source = await fs.readFile(abs, "utf8");
  return {
    source,
    ast: parseTypeScript(abs, source),
  };
}

function findExportedFunction(sourceFile, functionName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement)) continue;
    if (!statement.name || statement.name.text !== functionName) continue;
    const modifiers = statement.modifiers ?? [];
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      return statement;
    }
  }
  return undefined;
}

function hasExportedFunction(sourceFile, functionName) {
  return Boolean(findExportedFunction(sourceFile, functionName));
}

function findExportedTypeNames(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      names.add(element.name.text);
    }
  }
  return names;
}

function functionReturnsCallTo(functionDecl, calleeIdentifier) {
  if (!functionDecl.body) return false;
  let matched = false;

  visit(functionDecl.body, (node) => {
    if (matched || !ts.isReturnStatement(node) || !node.expression) return;
    let expression = unwrapExpression(node.expression);
    if (!expression) return;
    if (ts.isAwaitExpression(expression)) {
      expression = unwrapExpression(expression.expression);
    }
    if (!expression || !ts.isCallExpression(expression)) return;
    if (ts.isIdentifier(expression.expression) && expression.expression.text === calleeIdentifier) {
      matched = true;
    }
  });

  return matched;
}

function hasRegisterOrpcRoutesManifestRouter(sourceFile) {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node)) return;
    if (!ts.isIdentifier(node.expression) || node.expression.text !== "registerOrpcRoutes") return;
    if (node.arguments.length < 2) return;
    const optionsArg = unwrapExpression(node.arguments[1]);
    if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return;
    for (const property of optionsArg.properties) {
      if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "router") continue;
      if (matchesPropertyAccessChain(property.initializer, ["rawrHostSeam", "orpc", "router"])) {
        matched = true;
      }
    }
  });
  return matched;
}

function hasFunctionDeclaration(sourceFile, functionName) {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === functionName) {
      return true;
    }
  }
  return false;
}

async function verifyMetadataContract() {
  const pluginWorkspaceOwnerPath = "packages/plugin-workspace/src/plugins.ts";
  const pluginWorkspacePath = "plugins/cli/plugins/src/lib/workspace-plugins.ts";
  const [{ ast: ownerAst }, { ast: pluginAst }] = await Promise.all([
    readTypeScriptFile(pluginWorkspaceOwnerPath),
    readTypeScriptFile(pluginWorkspacePath),
  ]);

  assertCondition(
    hasNamedImport(ownerAst, "./plugin-manifest-contract", "parseWorkspacePluginManifest"),
    "plugin-workspace owner must import parseWorkspacePluginManifest from local contract owner",
  );

  for (const functionName of ["findWorkspaceRoot", "listWorkspacePlugins", "filterPluginsByKind", "resolvePluginId"]) {
    assertCondition(hasExportedFunction(ownerAst, functionName), `plugin-workspace owner must export ${functionName}`);
  }

  const pluginImportAliases = namedImportInfo(pluginAst, "@rawr/plugin-workspace");
  const requiredAliases = {
    findWorkspaceRoot: "findWorkspaceRootFromWorkspace",
    listWorkspacePlugins: "listWorkspacePluginsFromWorkspace",
    filterPluginsByKind: "filterPluginsByKindFromWorkspace",
    resolvePluginId: "resolvePluginIdFromWorkspace",
  };

  for (const [importedName, aliasName] of Object.entries(requiredAliases)) {
    assertCondition(
      pluginImportAliases.get(importedName) === aliasName,
      `plugin workspace adapter must alias ${importedName} as ${aliasName} from @rawr/plugin-workspace`,
    );
  }

  const exportedTypeNames = findExportedTypeNames(pluginAst);
  assertCondition(exportedTypeNames.has("WorkspacePlugin"), "plugin workspace adapter must re-export WorkspacePlugin type");
  assertCondition(exportedTypeNames.has("WorkspacePluginKind"), "plugin workspace adapter must re-export WorkspacePluginKind type");

  for (const [functionName, aliasName] of Object.entries(requiredAliases)) {
    const functionDecl = findExportedFunction(pluginAst, functionName);
    assertCondition(Boolean(functionDecl), `plugin workspace adapter must export ${functionName}`);
    assertCondition(
      Boolean(functionDecl && functionReturnsCallTo(functionDecl, aliasName)),
      `plugin workspace adapter ${functionName} must forward to ${aliasName}`,
    );
  }
}

async function verifyImportBoundary() {
  const pluginWorkspaceOwnerPath = "packages/plugin-workspace/src/plugins.ts";
  const pluginWorkspacePath = "plugins/cli/plugins/src/lib/workspace-plugins.ts";
  const [{ ast: ownerAst }, { ast: pluginAst }] = await Promise.all([
    readTypeScriptFile(pluginWorkspaceOwnerPath),
    readTypeScriptFile(pluginWorkspacePath),
  ]);

  const pluginImports = importModuleSet(pluginAst);
  assertCondition(
    pluginImports.size === 1 && pluginImports.has("@rawr/plugin-workspace"),
    "plugin workspace adapter must only import @rawr/plugin-workspace",
  );
  assertCondition(!hasNamedImport(pluginAst, "./plugin-manifest-contract", "parseWorkspacePluginManifest"), "plugin workspace adapter must not import local parser contract");
  assertCondition(!hasImport(pluginAst, "node:fs"), "plugin workspace adapter must not import node:fs");
  assertCondition(!hasImport(pluginAst, "node:path"), "plugin workspace adapter must not import node:path");
  assertCondition(!hasImport(pluginAst, "node:url"), "plugin workspace adapter must not import node:url");
  assertCondition(
    !hasFunctionDeclaration(pluginAst, "listWorkspacePluginPackageDirs") && !hasFunctionDeclaration(pluginAst, "listLeafPluginDirsUnder"),
    "plugin workspace adapter must not re-implement workspace directory traversal",
  );
  assertCondition(
    !hasNamedImport(ownerAst, "@rawr/plugin-plugins", "findWorkspaceRoot") &&
      !hasImport(ownerAst, "plugins/cli/plugins/src/lib/workspace-plugins"),
    "plugin-workspace owner must not import plugin workspace adapter",
  );
}

async function verifyHostCompositionGuard() {
  const { source, ast: rawrAst } = await readTypeScriptFile("apps/server/src/rawr.ts");
  const { source: hostCompositionSource, ast: hostCompositionAst } = await readTypeScriptFile("apps/server/src/host-composition.ts");
  const { source: hostSeamSource, ast: hostSeamAst } = await readTypeScriptFile("apps/server/src/host-seam.ts");
  const { source: testingHostSource, ast: testingHostAst } = await readTypeScriptFile("apps/server/src/testing-host.ts");
  const { source: hostRealizationSource, ast: hostRealizationAst } = await readTypeScriptFile("apps/server/src/host-realization.ts");
  const { source: workflowRuntimeSource, ast: workflowRuntimeAst } = await readTypeScriptFile("apps/server/src/workflows/runtime.ts");
  const { source: orpcSource } = await readTypeScriptFile("apps/server/src/orpc.ts");
  const { source: openApiSource } = await readTypeScriptFile("apps/server/scripts/write-orpc-openapi.ts");
  const { source: supportProofSource } = await readTypeScriptFile("apps/server/test/support/example-todo-proof-clients.ts");

  assertCondition(
    hasNamedImport(rawrAst, "./host-composition", "createRawrHostComposition"),
    "rawr host must consume one server-owned executable composition entrypoint",
  );
  assertCondition(
    hasNamedImport(testingHostAst, "./host-composition", "createRawrHostComposition") &&
      hasNamedImport(hostCompositionAst, "@rawr/hq-app/manifest", "createRawrHqManifest") &&
      hasNamedImport(hostCompositionAst, "./host-satisfiers", "createRawrHostSatisfiers") &&
      hasNamedImport(hostCompositionAst, "./host-seam", "createRawrHostBoundRolePlan") &&
      hasNamedImport(hostCompositionAst, "./host-realization", "materializeRawrHostBoundRolePlan") &&
      !hostSeamSource.includes('from "../../../rawr.hq"') &&
      !testingHostSource.includes('from "../../../rawr.hq"') &&
      !hostSeamSource.includes("@rawr/hq-app/manifest") &&
      !testingHostSource.includes("@rawr/hq-app/manifest"),
    "host composition must localize the narrow @rawr/hq-app/manifest input instead of letting rawr, host-seam, and testing-host each consume it directly",
  );
  assertCondition(hasRouteRegistration(rawrAst, "/api/inngest"), "rawr host must register /api/inngest route");
  assertCondition(hasRouteRegistration(rawrAst, "/api/workflows/*"), "rawr host must register /api/workflows/* route");
  assertCondition(hasIdentifierCall(rawrAst, "registerOrpcRoutes"), "rawr host must register ORPC routes through registerOrpcRoutes");
  assertCondition(hasRegisterOrpcRoutesManifestRouter(rawrAst), "rawr host must pass host-materialized ORPC seam to registerOrpcRoutes");
  assertCondition(
    hasIdentifierCall(rawrAst, "createRawrHostComposition") &&
      hasIdentifierCall(hostCompositionAst, "createRawrHqManifest") &&
      hasIdentifierCall(hostCompositionAst, "createRawrHostSatisfiers") &&
      hasIdentifierCall(hostCompositionAst, "createRawrHostBoundRolePlan") &&
      hasIdentifierCall(hostCompositionAst, "materializeRawrHostBoundRolePlan"),
    "host composition must be the only place that consumes declarations, constructs satisfiers, binds registrations, and materializes realized host surfaces",
  );
  assertCondition(
    hasIdentifierCall(rawrAst, "createWorkflowRouteHarness") &&
      /publishedRouter:\s*rawrHostSeam\.workflows\.published\.router/s.test(source) &&
      /contextFactory:\s*\(request,\s*deps\)\s*=>\s*createWorkflowBoundaryContext\(request,\s*deps\)/s.test(source),
    "rawr host must consume host-materialized published workflow router seam through createWorkflowRouteHarness",
  );
  assertCondition(
    hasPropertyAccessChain(rawrAst, ["rawrHostComposition", "realization", "workflows", "createInngestFunctions"]) &&
      !source.includes("rawrHqManifest.inngest"),
    "rawr host must compose runtime workflow functions from host-materialized workflow seams instead of manifest-owned inngest seams",
  );
  assertCondition(
    hasNamedImport(rawrAst, "inngest/bun", "serve") &&
      hasPropertyAccessChain(rawrAst, ["rawrHostComposition", "realization", "workflows", "createInngestFunctions"]) &&
      hasIdentifierCall(rawrAst, "inngestServe") &&
      hasNamedImport(rawrAst, "./workflows/runtime", "createRawrWorkflowRuntime") &&
      !hasImport(rawrAst, "@rawr/plugin-api-coordination/server") &&
      !hasImport(rawrAst, "@rawr/plugin-workflows-support-example/server") &&
      !hasImport(rawrAst, "@rawr/plugin-workflows-coordination/server"),
    "rawr host must compose the runtime-owned inngest bundle through host-materialized workflow seams",
  );
  assertCondition(
    /contextFactory:\s*\(request,\s*deps\)\s*=>\s*createRequestScopedBoundaryContext\(request,\s*deps\)/s.test(source) &&
      !source.includes("rawrHqManifest.orpc.enrichContext"),
    "rawr host must keep workflow context enrichment out of canonical ORPC registration",
  );
  assertCondition(
    !hasNamedImport(rawrAst, "./orpc", "createOrpcRouter") && !hasIdentifierCall(rawrAst, "createOrpcRouter"),
    "rawr host must not bypass the manifest-owned ORPC router seam",
  );
  assertCondition(
    !orpcSource.includes("@rawr/hq-app/testing") &&
      !openApiSource.includes("@rawr/hq-app/testing") &&
      !testingHostSource.includes("manifest.fixtures") &&
      testingHostSource.includes("createRawrHostComposition") &&
      !testingHostSource.includes("createRawrHostSatisfiers") &&
      !supportProofSource.includes("createTestingRawrHqManifest") &&
      !supportProofSource.includes("manifest.fixtures"),
    "proof and openapi helpers must not bypass host realization through HQ testing or direct manifest fixtures",
  );
  assertCondition(
    hasNamedImport(hostRealizationAst, "./host-surface-merge", "mergeRawrHostSurfaceTrees") &&
      !hasImport(hostRealizationAst, "@rawr/hq-sdk/composition") &&
      hostRealizationSource.includes("implement(contract).$context<BoundaryRequestSupportContext>()"),
    "host realization must own executable surface merging instead of reaching through @rawr/hq-sdk/composition",
  );
  assertCondition(
    hasExportedFunction(workflowRuntimeAst, "createRawrWorkflowRuntime") &&
      workflowRuntimeSource.includes("resolveRawrWorkflowInngestBaseUrl") &&
      !workflowRuntimeSource.includes("createCoordinationWorkflowRuntimeAdapter") &&
      !source.includes("createCoordinationWorkflowRuntimeAdapter"),
    "workflow runtime adapter construction must live in the host-owned workflow runtime home instead of inline in rawr.ts",
  );
}

async function verifyRouteNegativeAssertions() {
  const { source, ast } = await readTypeScriptFile("apps/server/test/route-boundary-matrix.test.ts");
  assertCondition(
    source.includes("assertion:reject-rpc-from-external-callers"),
    "route boundary matrix must include external caller RPC rejection assertion key",
  );
  assertCondition(
    source.includes("assertion:reject-rpc-workflows-route-family"),
    "route boundary matrix must include /rpc/workflows route-family rejection assertion key",
  );
  assertCondition(
    hasRouteRegistration(ast, "/rpc/workflows/state/getRuntimeState") || source.includes("/rpc/workflows/state/getRuntimeState"),
    "route boundary matrix must explicitly cover /rpc/workflows route family",
  );
}

async function verifyObservabilityContract() {
  await mustExist("apps/server/test/ingress-signature-observability.test.ts");
  await mustExist("apps/server/test/logging-correlation.test.ts");
}

async function verifyTelemetryContract() {
  await Promise.all([
    mustExist("scripts/phase-c/verify-telemetry-contract.mjs"),
    mustExist("apps/server/test/ingress-signature-observability.test.ts"),
    mustExist("apps/server/test/logging-correlation.test.ts"),
  ]);

  const [phaseCTelemetryVerifierSource, packageJsonRaw] = await Promise.all([
    fs.readFile(path.join(root, "scripts/phase-c/verify-telemetry-contract.mjs"), "utf8"),
    fs.readFile(path.join(root, "package.json"), "utf8"),
  ]);
  const packageJson = JSON.parse(packageJsonRaw);
  const scripts = packageJson.scripts ?? {};
  assertCondition(
    phaseCTelemetryVerifierSource.includes("phase-c telemetry contract verified"),
    "phase-c telemetry verifier must remain the source-of-truth structural gate",
  );
  assertCondition(
    scripts["phase-a:gate:telemetry-contract"] === "bun scripts/phase-a/verify-gate-scaffold.mjs telemetry",
    "package.json must hard-wire phase-a telemetry contract gate",
  );
  assertCondition(
    !Object.prototype.hasOwnProperty.call(scripts, "phase-a:telemetry:optional"),
    "package.json must not expose optional phase-a telemetry gate semantics",
  );
}

const gateChecksById = {
  "metadata-contract": verifyMetadataContract,
  "import-boundary": verifyImportBoundary,
  "host-composition-guard": verifyHostCompositionGuard,
  "route-negative-assertions": verifyRouteNegativeAssertions,
  "observability-contract": verifyObservabilityContract,
  telemetry: verifyTelemetryContract,
};

const check = gateChecksById[gateId];
if (!check) {
  console.error(`Unknown gate scaffold id: ${gateId}`);
  process.exit(2);
}

try {
  await check();
  console.log(`Gate scaffold check passed: ${gateId}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Gate scaffold check failed (${gateId}): ${message}`);
  process.exit(1);
}

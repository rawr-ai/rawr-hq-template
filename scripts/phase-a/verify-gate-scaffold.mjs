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
      if (matchesPropertyAccessChain(property.initializer, ["rawrHqManifest", "orpc", "router"])) {
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
  const hqWorkspacePath = "packages/hq/src/workspace/plugins.ts";
  const pluginWorkspacePath = "plugins/cli/plugins/src/lib/workspace-plugins.ts";
  const [{ ast: hqAst }, { ast: pluginAst }] = await Promise.all([
    readTypeScriptFile(hqWorkspacePath),
    readTypeScriptFile(pluginWorkspacePath),
  ]);

  assertCondition(
    hasNamedImport(hqAst, "./plugin-manifest-contract", "parseWorkspacePluginManifest"),
    "hq workspace parser must import parseWorkspacePluginManifest from local contract owner",
  );

  for (const functionName of ["findWorkspaceRoot", "listWorkspacePlugins", "filterPluginsByKind", "resolvePluginId"]) {
    assertCondition(hasExportedFunction(hqAst, functionName), `hq workspace parser must export ${functionName}`);
  }

  const pluginImportAliases = namedImportInfo(pluginAst, "@rawr/hq/workspace");
  const requiredAliases = {
    findWorkspaceRoot: "findWorkspaceRootFromWorkspace",
    listWorkspacePlugins: "listWorkspacePluginsFromWorkspace",
    filterPluginsByKind: "filterPluginsByKindFromWorkspace",
    resolvePluginId: "resolvePluginIdFromWorkspace",
  };

  for (const [importedName, aliasName] of Object.entries(requiredAliases)) {
    assertCondition(
      pluginImportAliases.get(importedName) === aliasName,
      `plugin workspace adapter must alias ${importedName} as ${aliasName} from @rawr/hq/workspace`,
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
  const hqWorkspacePath = "packages/hq/src/workspace/plugins.ts";
  const pluginWorkspacePath = "plugins/cli/plugins/src/lib/workspace-plugins.ts";
  const [{ ast: hqAst }, { ast: pluginAst }] = await Promise.all([
    readTypeScriptFile(hqWorkspacePath),
    readTypeScriptFile(pluginWorkspacePath),
  ]);

  const pluginImports = importModuleSet(pluginAst);
  assertCondition(pluginImports.size === 1 && pluginImports.has("@rawr/hq/workspace"), "plugin workspace adapter must only import @rawr/hq/workspace");
  assertCondition(!hasNamedImport(pluginAst, "./plugin-manifest-contract", "parseWorkspacePluginManifest"), "plugin workspace adapter must not import local parser contract");
  assertCondition(!hasImport(pluginAst, "node:fs"), "plugin workspace adapter must not import node:fs");
  assertCondition(!hasImport(pluginAst, "node:path"), "plugin workspace adapter must not import node:path");
  assertCondition(!hasImport(pluginAst, "node:url"), "plugin workspace adapter must not import node:url");
  assertCondition(
    !hasFunctionDeclaration(pluginAst, "listWorkspacePluginPackageDirs") && !hasFunctionDeclaration(pluginAst, "listLeafPluginDirsUnder"),
    "plugin workspace adapter must not re-implement workspace directory traversal",
  );
  assertCondition(
    !hasNamedImport(hqAst, "@rawr/plugin-plugins", "findWorkspaceRoot") &&
      !hasImport(hqAst, "plugins/cli/plugins/src/lib/workspace-plugins"),
    "hq workspace owner must not import plugin workspace adapter",
  );
}

async function verifyHostCompositionGuard() {
  const { ast: rawrAst } = await readTypeScriptFile("apps/server/src/rawr.ts");

  assertCondition(hasNamedImport(rawrAst, "../../../rawr.hq", "rawrHqManifest"), "rawr host must import rawrHqManifest authority");
  assertCondition(hasRouteRegistration(rawrAst, "/api/inngest"), "rawr host must register /api/inngest route");
  assertCondition(hasRouteRegistration(rawrAst, "/api/workflows/*"), "rawr host must register /api/workflows/* route");
  assertCondition(hasIdentifierCall(rawrAst, "registerOrpcRoutes"), "rawr host must register ORPC routes through registerOrpcRoutes");
  assertCondition(hasRegisterOrpcRoutesManifestRouter(rawrAst), "rawr host must pass manifest-owned ORPC router seam to registerOrpcRoutes");
  assertCondition(
    hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows", "triggerRouter"]),
    "rawr host must consume manifest-owned workflow trigger router seam",
  );
  assertCondition(
    hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "bundleFactory"]) &&
      hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "serveHandlerFactory"]),
    "rawr host must consume manifest-owned inngest seams",
  );
  assertCondition(
    !hasNamedImport(rawrAst, "@rawr/coordination-inngest", "createCoordinationInngestFunction") &&
      !hasNamedImport(rawrAst, "@rawr/coordination-inngest", "createInngestServeHandler") &&
      !hasNamedImport(rawrAst, "./orpc", "createOrpcRouter") &&
      !hasIdentifierCall(rawrAst, "createCoordinationInngestFunction") &&
      !hasIdentifierCall(rawrAst, "createInngestServeHandler") &&
      !hasIdentifierCall(rawrAst, "createOrpcRouter"),
    "rawr host must not compose ad-hoc app-internal seams",
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
    hasRouteRegistration(ast, "/rpc/workflows/coordination/workflows") || source.includes("/rpc/workflows/coordination/workflows"),
    "route boundary matrix must explicitly cover /rpc/workflows route family",
  );
}

async function verifyObservabilityContract() {
  await mustExist("packages/coordination-observability/package.json");
  await mustExist("packages/coordination-observability/test/observability.test.ts");
}

async function verifyTelemetryContract() {
  await Promise.all([
    mustExist("scripts/phase-c/verify-telemetry-contract.mjs"),
    mustExist("packages/coordination-observability/src/events.ts"),
    mustExist("packages/coordination-observability/test/storage-lock-telemetry.test.ts"),
    mustExist("apps/server/test/ingress-signature-observability.test.ts"),
  ]);

  const [eventsSource, phaseCTelemetryVerifierSource, packageJsonRaw] = await Promise.all([
    fs.readFile(path.join(root, "packages/coordination-observability/src/events.ts"), "utf8"),
    fs.readFile(path.join(root, "scripts/phase-c/verify-telemetry-contract.mjs"), "utf8"),
    fs.readFile(path.join(root, "package.json"), "utf8"),
  ]);
  const packageJson = JSON.parse(packageJsonRaw);
  const scripts = packageJson.scripts ?? {};

  assertCondition(
    /export\s+type\s+CreateDeskEventInput\s*=/.test(eventsSource),
    "events.ts must export CreateDeskEventInput",
  );
  assertCondition(
    /export\s+type\s+TraceLinkOptions\s*=/.test(eventsSource),
    "events.ts must export TraceLinkOptions",
  );
  assertCondition(
    /assertRunLifecycleStatusContract\s*\(\s*input\.type\s*,\s*input\.status\s*\)/.test(eventsSource),
    "events.ts must enforce lifecycle status contract",
  );
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

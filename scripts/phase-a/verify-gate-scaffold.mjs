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

async function mustNotExist(relPath) {
  const abs = path.join(root, relPath);
  try {
    await fs.stat(abs);
  } catch {
    return;
  }
  throw new Error(`obsolete file must not exist: ${relPath}`);
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

async function listSourceFilesUnder(relPath) {
  const files = [];
  const absRoot = path.join(root, relPath);

  async function walk(absPath) {
    const entries = await fs.readdir(absPath, { withFileTypes: true });
    for (const entry of entries) {
      const childAbs = path.join(absPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dist" || entry.name === "node_modules" || entry.name === "coverage") continue;
        await walk(childAbs);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(entry.name)) continue;
      files.push(path.relative(root, childAbs).split(path.sep).join("/"));
    }
  }

  await walk(absRoot);
  return files.sort();
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
  const requiredPaths = [
    "services/hq-ops/src/service/modules/plugin-catalog/contract.ts",
    "services/hq-ops/src/service/modules/plugin-catalog/entities.ts",
    "services/hq-ops/src/service/modules/plugin-catalog/helpers/discovery.ts",
    "services/hq-ops/src/service/modules/plugin-catalog/helpers/manifest.ts",
    "services/hq-ops/src/service/modules/plugin-catalog/router.ts",
    "services/hq-ops/src/service/contract.ts",
    "services/hq-ops/src/service/router.ts",
    "services/hq-ops/test/plugin-catalog.test.ts",
  ];
  await Promise.all(requiredPaths.map(mustExist));
  await mustNotExist("packages/plugin-workspace/src/plugins.ts");
  await mustNotExist("plugins/cli/plugins/src/lib/workspace-plugins.ts");

  const [
    { source: contractSource },
    { source: entitiesSource },
    { source: discoverySource },
    { source: manifestSource },
    { source: routerSource },
    { source: rootContractSource },
    { source: rootRouterSource },
    pluginPluginsPackageJson,
  ] = await Promise.all([
    readTypeScriptFile("services/hq-ops/src/service/modules/plugin-catalog/contract.ts"),
    readTypeScriptFile("services/hq-ops/src/service/modules/plugin-catalog/entities.ts"),
    readTypeScriptFile("services/hq-ops/src/service/modules/plugin-catalog/helpers/discovery.ts"),
    readTypeScriptFile("services/hq-ops/src/service/modules/plugin-catalog/helpers/manifest.ts"),
    readTypeScriptFile("services/hq-ops/src/service/modules/plugin-catalog/router.ts"),
    readTypeScriptFile("services/hq-ops/src/service/contract.ts"),
    readTypeScriptFile("services/hq-ops/src/service/router.ts"),
    fs.readFile(path.join(root, "plugins/cli/plugins/package.json"), "utf8"),
  ]);

  assertCondition(
    rootContractSource.includes('from "./modules/plugin-catalog/contract"') &&
      rootContractSource.includes("pluginCatalog,"),
    "hq-ops root contract must own pluginCatalog",
  );
  assertCondition(
    rootRouterSource.includes('from "./modules/plugin-catalog/router"') &&
      rootRouterSource.includes("pluginCatalog,"),
    "hq-ops root router must own pluginCatalog",
  );
  for (const procedureName of ["listWorkspacePlugins", "resolveWorkspacePlugin"]) {
    assertCondition(contractSource.includes(`${procedureName}:`), `plugin-catalog contract must define ${procedureName}`);
    assertCondition(
      routerSource.includes(`const ${procedureName} = module.${procedureName}.handler`),
      `plugin-catalog router must implement ${procedureName} directly`,
    );
  }
  for (const catalogFragment of [
    "WORKSPACE_PLUGIN_DISCOVERY_ROOTS",
    "FORBIDDEN_LEGACY_RAWR_KEYS",
    "WorkspacePluginCatalogEntrySchema",
    "WorkspacePluginKindSchema",
  ]) {
    assertCondition(entitiesSource.includes(catalogFragment), `plugin-catalog entities must include ${catalogFragment}`);
  }
  for (const manifestFragment of [
    "parseWorkspacePluginManifest",
    "commandPluginEligibility",
    "runtimeWebEligibility",
    "forbidden rawr.",
    "rawr.kind must be",
  ]) {
    assertCondition(manifestSource.includes(manifestFragment), `plugin-catalog manifest helper must include ${manifestFragment}`);
  }
  assertCondition(discoverySource.includes("discoverWorkspacePluginCatalog"), "plugin-catalog discovery helper must expose catalog discovery");
  assertCondition(!pluginPluginsPackageJson.includes("@rawr/plugin-workspace"), "plugin-plugins must not depend on @rawr/plugin-workspace");
}

async function verifyImportBoundary() {
  await mustNotExist("packages/plugin-workspace/package.json");
  await mustNotExist("plugins/cli/plugins/src/lib/workspace-plugins.ts");

  const projectionFiles = await listSourceFilesUnder("plugins/cli/plugins/src");
  const findings = [];
  for (const relPath of projectionFiles) {
    const source = await fs.readFile(path.join(root, relPath), "utf8");
    if (source.includes("@rawr/plugin-workspace")) findings.push(`${relPath} imports @rawr/plugin-workspace`);
    if (source.includes("workspace-plugins")) findings.push(`${relPath} references obsolete workspace-plugins adapter`);
    if (source.includes("services/hq-ops/src/service/modules/plugin-catalog")) {
      findings.push(`${relPath} imports hq-ops plugin-catalog internals`);
    }
    if (source.includes("plugin-catalog/helpers/")) findings.push(`${relPath} imports hq-ops plugin-catalog helper internals`);
  }
  assertCondition(findings.length === 0, `plugin projection import boundary failed:\n${findings.map((finding) => `- ${finding}`).join("\n")}`);

  const [webList, webEnableAll, installAll, sweep] = await Promise.all([
    fs.readFile(path.join(root, "plugins/cli/plugins/src/commands/plugins/web/list.ts"), "utf8"),
    fs.readFile(path.join(root, "plugins/cli/plugins/src/commands/plugins/web/enable/all.ts"), "utf8"),
    fs.readFile(path.join(root, "plugins/cli/plugins/src/commands/plugins/cli/install/all.ts"), "utf8"),
    fs.readFile(path.join(root, "plugins/cli/plugins/src/commands/plugins/sweep.ts"), "utf8"),
  ]);
  assertCondition(webList.includes(".pluginCatalog.listWorkspacePlugins"), "web list must call hq-ops pluginCatalog");
  assertCondition(webEnableAll.includes(".pluginCatalog.listWorkspacePlugins"), "web enable all must call hq-ops pluginCatalog");
  assertCondition(installAll.includes(".pluginCatalog.listWorkspacePlugins"), "cli install all must call hq-ops pluginCatalog");
  assertCondition(sweep.includes("planSweepCandidates"), "sweep must get lifecycle candidates from hq-ops pluginLifecycle");
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

#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const projectPath = path.join(root, "plugins", "server", "api", "state", "project.json");
const packagePath = path.join(root, "plugins", "server", "api", "state", "package.json");
const rootIndexPath = path.join(root, "plugins", "server", "api", "state", "index.ts");
const contextPath = path.join(root, "plugins", "server", "api", "state", "src", "context.ts");
const indexPath = path.join(root, "plugins", "server", "api", "state", "src", "index.ts");
const serverPath = path.join(root, "plugins", "server", "api", "state", "src", "server.ts");
const routerPath = path.join(root, "plugins", "server", "api", "state", "src", "router.ts");

const [projectRaw, packageRaw, rootIndexSource, contextSource, indexSource, serverSource, routerSource] = await Promise.all([
  fs.readFile(projectPath, "utf8"),
  fs.readFile(packagePath, "utf8"),
  fs.readFile(rootIndexPath, "utf8"),
  fs.readFile(contextPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(serverPath, "utf8"),
  fs.readFile(routerPath, "utf8"),
]);

const project = JSON.parse(projectRaw);
const pkg = JSON.parse(packageRaw);

const requiredTags = ["type:plugin", "migration-slice:structural-tranche", "role:server", "surface:api", "capability:state"];
for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`plugin-server-api-state structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (pkg.name !== "@rawr/plugin-server-api-state") {
  console.error("plugin-server-api-state structural failed: package name drifted.");
  process.exit(1);
}

if (pkg.exports?.["."]?.default !== "./index.ts" || pkg.exports?.["./server"]?.default !== "./server.ts") {
  console.error("plugin-server-api-state structural failed: package export map drifted.");
  process.exit(1);
}

if (!rootIndexSource.includes('export * from "./src";')) {
  console.error("plugin-server-api-state structural failed: package root must continue re-exporting the browser-safe src surface.");
  process.exit(1);
}

if (!indexSource.includes("createStateApiClient") || !indexSource.includes("stateApiContract") || indexSource.includes("registerStateApiPlugin")) {
  console.error("plugin-server-api-state structural failed: plugin root must stay app-safe and must not register the host ORPC state surface.");
  process.exit(1);
}

if (
  !serverSource.includes("defineApiPlugin")
  || !serverSource.includes("internal:")
  || !serverSource.includes("stateApiContract")
  || !serverSource.includes("createStateRouter(bound.resolveClient)")
) {
  console.error("plugin-server-api-state structural failed: plugin server surface must register the ORPC state surface.");
  process.exit(1);
}

if (!contextSource.includes("type StateClientResolver")) {
  console.error("plugin-server-api-state structural failed: plugin must declare an explicit runtime client resolver seam.");
  process.exit(1);
}

if (
  !serverSource.includes("resolveClient") ||
  !routerSource.includes("resolveClient(context.repoRoot).repoState.getState") ||
  !routerSource.includes("createApiTraceForwardingOptions(context)") ||
  routerSource.includes("@rawr/hq-app")
) {
  console.error("plugin-server-api-state structural failed: router must remain a thin service projection.");
  process.exit(1);
}

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.base.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
const visited = new Set();
const findings = [];

function collectRuntimeDependencies(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const runtimeSpecifiers = [];

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      !node.importClause?.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      runtimeSpecifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      runtimeSpecifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      runtimeSpecifiers.push(node.arguments[0].text);
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "process"
    ) {
      findings.push(`${path.relative(root, filePath)} uses process.${node.name.text} in the browser-facing root graph`);
    }

    if (ts.isIdentifier(node) && node.text === "Bun") {
      findings.push(`${path.relative(root, filePath)} uses Bun in the browser-facing root graph`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return runtimeSpecifiers;
}

async function walkRuntimeGraph(filePath) {
  const normalizedPath = path.resolve(filePath);
  if (visited.has(normalizedPath)) return;
  visited.add(normalizedPath);

  const source = await fs.readFile(normalizedPath, "utf8");
  const runtimeSpecifiers = collectRuntimeDependencies(normalizedPath, source);

  for (const specifier of runtimeSpecifiers) {
    if (specifier.startsWith("node:") || specifier.startsWith("bun:")) {
      findings.push(`${path.relative(root, normalizedPath)} reaches runtime-only module ${specifier}`);
      continue;
    }

    if (specifier === "child_process" || specifier === "node:child_process") {
      findings.push(`${path.relative(root, normalizedPath)} reaches child-process runtime module ${specifier}`);
      continue;
    }

    const resolution = ts.resolveModuleName(specifier, normalizedPath, parsedConfig.options, ts.sys).resolvedModule;
    if (!resolution?.resolvedFileName) continue;

    const resolvedFile = resolution.resolvedFileName;
    if (!resolvedFile.startsWith(root)) continue;
    if (resolvedFile.endsWith(".d.ts")) continue;

    await walkRuntimeGraph(resolvedFile);
  }
}

await walkRuntimeGraph(rootIndexPath);

if (findings.length > 0) {
  console.error("plugin-server-api-state structural failed: browser root is not runtime-safe.");
  for (const finding of findings.sort()) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("plugin-server-api-state structural verified");

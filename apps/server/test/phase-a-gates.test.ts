import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function parseTypeScript(filePath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function visit(node: ts.Node, fn: (node: ts.Node) => void): void {
  fn(node);
  node.forEachChild((child) => visit(child, fn));
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current: ts.Expression = expression;
  while (true) {
    if (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function propertyNameText(nameNode: ts.PropertyName | ts.PrivateIdentifier | undefined): string | undefined {
  if (!nameNode) return undefined;
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) return nameNode.text;
  return undefined;
}

function hasNamedImport(sourceFile: ts.SourceFile, moduleName: string, importName: string): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== moduleName) continue;
    const clause = statement.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    if (clause.namedBindings.elements.some((element) => (element.propertyName?.text ?? element.name.text) === importName)) {
      return true;
    }
  }
  return false;
}

function collectPropertyAccessSegments(expression: ts.Expression): string[] {
  const segments: string[] = [];
  let current: ts.Expression = unwrapExpression(expression);

  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = unwrapExpression(current.expression);
  }

  if (ts.isIdentifier(current)) {
    segments.unshift(current.text);
  }
  return segments;
}

function matchesPropertyAccessChain(expression: ts.Expression, segments: string[]): boolean {
  const found = collectPropertyAccessSegments(expression);
  if (found.length !== segments.length) return false;
  return segments.every((segment, idx) => segment === found[idx]);
}

function hasPropertyAccessChain(sourceFile: ts.SourceFile, segments: string[]): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isPropertyAccessExpression(node)) return;
    if (matchesPropertyAccessChain(node, segments)) {
      matched = true;
    }
  });
  return matched;
}

function hasRouteRegistration(sourceFile: ts.SourceFile, routeLiteral: string): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node) || node.arguments.length === 0) return;
    const [firstArg] = node.arguments;
    if (!ts.isStringLiteral(firstArg) || firstArg.text !== routeLiteral) return;
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    const methodName = node.expression.name.text;
    if (methodName === "all" || methodName === "get" || methodName === "post") {
      matched = true;
    }
  });
  return matched;
}

function hasIdentifierCall(sourceFile: ts.SourceFile, identifierName: string): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text === identifierName) {
      matched = true;
    }
  });
  return matched;
}

function hasRegisterOrpcRoutesHostSeamRouter(sourceFile: ts.SourceFile): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text !== "registerOrpcRoutes" || node.arguments.length < 2) return;
    const optionsArg = unwrapExpression(node.arguments[1]);
    if (!ts.isObjectLiteralExpression(optionsArg)) return;
    for (const property of optionsArg.properties) {
      if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "router") continue;
      if (matchesPropertyAccessChain(property.initializer, ["rawrHostSeam", "orpc", "router"])) {
        matched = true;
      }
    }
  });
  return matched;
}

function findConstStringArray(sourceFile: ts.SourceFile, variableName: string): string[] {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName || !declaration.initializer) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) continue;
      return initializer.elements.flatMap((element) => {
        const unwrapped = unwrapExpression(element);
        return ts.isStringLiteral(unwrapped) ? [unwrapped.text] : [];
      });
    }
  }
  return [];
}

function normalizeSemanticSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

async function readIfPresent(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

describe("phase-a gate scaffold (server)", () => {
  it("host composition guard gate scaffold verifies the explicit HQ composition bridge and host-owned runtime seams", async () => {
    const rawrSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), "utf8");
    const rawrAst = parseTypeScript(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), rawrSource);
    const hostCompositionSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "src", "host-composition.ts"),
      "utf8",
    );
    const hostCompositionAst = parseTypeScript(
      path.join(repoRoot, "apps", "server", "src", "host-composition.ts"),
      hostCompositionSource,
    );
    const hostSeamSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-seam.ts"), "utf8");
    const hostSeamAst = parseTypeScript(path.join(repoRoot, "apps", "server", "src", "host-seam.ts"), hostSeamSource);
    const testingHostSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "testing-host.ts"), "utf8");
    const testingHostAst = parseTypeScript(path.join(repoRoot, "apps", "server", "src", "testing-host.ts"), testingHostSource);
    const hostRealizationSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-realization.ts"), "utf8");
    const hostRealizationAst = parseTypeScript(
      path.join(repoRoot, "apps", "server", "src", "host-realization.ts"),
      hostRealizationSource,
    );
    const workflowRuntimeSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "workflows", "runtime.ts"), "utf8");
    const workflowRuntimeAst = parseTypeScript(
      path.join(repoRoot, "apps", "server", "src", "workflows", "runtime.ts"),
      workflowRuntimeSource,
    );

    expect(hasNamedImport(rawrAst, "./host-composition", "createRawrHostComposition")).toBe(true);
    expect(hasNamedImport(testingHostAst, "./host-composition", "createRawrHostComposition")).toBe(true);
    expect(hasNamedImport(hostCompositionAst, "../../../rawr.hq", "createRawrHqManifest")).toBe(true);
    expect(hasNamedImport(hostCompositionAst, "./host-satisfiers", "createRawrHostSatisfiers")).toBe(true);
    expect(hasNamedImport(hostCompositionAst, "./host-seam", "createRawrHostBoundRolePlan")).toBe(true);
    expect(hasNamedImport(hostCompositionAst, "./host-realization", "materializeRawrHostBoundRolePlan")).toBe(true);
    expect(hasNamedImport(hostSeamAst, "../../../rawr.hq", "RawrHqManifest")).toBe(false);
    expect(hostSeamSource).not.toContain('from "../../../rawr.hq"');
    expect(testingHostSource).not.toContain('from "../../../rawr.hq"');
    expect(hostSeamSource).not.toContain("@rawr/hq-app/manifest");
    expect(testingHostSource).not.toContain("@rawr/hq-app/manifest");
    expect(hasRouteRegistration(rawrAst, "/api/inngest")).toBe(true);
    expect(hasRouteRegistration(rawrAst, "/api/workflows/*")).toBe(true);
    expect(hasRegisterOrpcRoutesHostSeamRouter(rawrAst)).toBe(true);
    expect(hasIdentifierCall(rawrAst, "createRawrHostComposition")).toBe(true);
    expect(hasIdentifierCall(hostCompositionAst, "createRawrHqManifest")).toBe(true);
    expect(hasIdentifierCall(hostCompositionAst, "createRawrHostSatisfiers")).toBe(true);
    expect(hasIdentifierCall(hostCompositionAst, "createRawrHostBoundRolePlan")).toBe(true);
    expect(hasIdentifierCall(hostCompositionAst, "materializeRawrHostBoundRolePlan")).toBe(true);
    expect(hasIdentifierCall(rawrAst, "createWorkflowRouteHarness")).toBe(true);
    expect(hasNamedImport(rawrAst, "inngest/bun", "serve")).toBe(true);
    expect(hasPropertyAccessChain(rawrAst, ["rawrHostComposition", "realization", "workflows", "createInngestFunctions"])).toBe(
      true,
    );
    expect(hasIdentifierCall(rawrAst, "inngestServe")).toBe(true);
    expect(rawrSource).not.toContain("rawrHqManifest.inngest");
    expect(rawrSource).not.toContain("@rawr/plugin-api-coordination/server");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-support-example/server");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-coordination/server");
    expect(rawrSource).not.toContain("./coordination");
    expect(rawrSource).toContain('from "./workflows/runtime"');
    expect(rawrSource).toContain("createRawrWorkflowRuntime");
    expect(rawrSource).not.toContain("resolveWorkflowCapability");
    expect(rawrSource).toContain("contextFactory: (request, deps) => createRequestScopedBoundaryContext(request, deps)");
    expect(rawrSource).not.toContain("rawrHqManifest.orpc.enrichContext");
    expect(hasNamedImport(hostRealizationAst, "./host-surface-merge", "mergeRawrHostSurfaceTrees")).toBe(true);
    expect(hostRealizationSource).not.toContain("@rawr/hq-sdk/composition");
    expect(hostRealizationSource).toContain("implement(contract).$context<BoundaryRequestSupportContext>()");
    expect(hasNamedImport(workflowRuntimeAst, "@rawr/plugin-workflows-coordination/server", "createCoordinationWorkflowRuntimeAdapter")).toBe(
      true,
    );
    expect(workflowRuntimeSource).toContain("resolveRawrWorkflowInngestBaseUrl");
  });

  it("host composition guard rejects proof-helper bypass through HQ testing and manifest fixtures", async () => {
    const orpcSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "orpc.ts"), "utf8");
    const openApiSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "scripts", "write-orpc-openapi.ts"),
      "utf8",
    );
    const testingHostSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "testing-host.ts"), "utf8");
    const hostCompositionSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "src", "host-composition.ts"),
      "utf8",
    );
    const hqTestingSource = await readIfPresent(path.join(repoRoot, "apps", "hq", "src", "testing.ts"));
    const rawrHqBridgeSource = await fs.readFile(path.join(repoRoot, "rawr.hq.ts"), "utf8");
    const supportProofSource = await fs.readFile(
      path.join(repoRoot, "apps", "server", "test", "support", "example-todo-proof-clients.ts"),
      "utf8",
    );

    expect(orpcSource).not.toContain("@rawr/hq-app/testing");
    expect(openApiSource).not.toContain("@rawr/hq-app/testing");
    expect(testingHostSource).not.toContain("manifest.fixtures");
    expect(testingHostSource).toContain("createRawrHostComposition");
    expect(testingHostSource).not.toContain("createRawrHostSatisfiers");
    expect(testingHostSource).not.toContain("createRawrHostBoundRolePlan");
    expect(testingHostSource).not.toContain("materializeRawrHostBoundRolePlan");
    expect(normalizeSemanticSource(hostCompositionSource)).toContain(
      'import{createRawrHqManifest,typeRawrHqManifest}from"../../../rawr.hq";',
    );
    expect(hqTestingSource === null || normalizeSemanticSource(hqTestingSource) === "export{};").toBe(true);
    expect(normalizeSemanticSource(rawrHqBridgeSource)).toBe(
      'export{createRawrHqManifest,typeRawrHqManifest}from"@rawr/hq-app/manifest";',
    );
    expect(supportProofSource).not.toContain("manifest.fixtures");
    expect(supportProofSource).toContain("createTestingExampleTodoServiceClient");
  });

  it("host composition guard keeps canonical plugin registrations on declaration-plus-contribute law only", async () => {
    const [
      stateServerSource,
      coordinationApiServerSource,
      exampleTodoApiServerSource,
      supportExampleWorkflowServerSource,
      coordinationWorkflowServerSource,
    ] = await Promise.all([
      fs.readFile(path.join(repoRoot, "plugins", "api", "state", "src", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "plugins", "api", "coordination", "src", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "plugins", "api", "example-todo", "src", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "plugins", "workflows", "support-example", "src", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "plugins", "workflows", "coordination", "src", "server.ts"), "utf8"),
    ]);

    expect(stateServerSource).toMatch(/export function registerStateApiPlugin\(\s*\)/);
    expect(coordinationApiServerSource).toMatch(/export function registerCoordinationApiPlugin\(\s*\)/);
    expect(exampleTodoApiServerSource).toMatch(/export function registerExampleTodoApiPlugin\(\s*\)/);
    expect(supportExampleWorkflowServerSource).toMatch(/export function registerSupportExampleWorkflowPlugin\(\s*\)/);
    expect(coordinationWorkflowServerSource).toMatch(/export function registerCoordinationWorkflowPlugin\(\s*\)/);

    for (const source of [
      stateServerSource,
      coordinationApiServerSource,
      exampleTodoApiServerSource,
      supportExampleWorkflowServerSource,
      coordinationWorkflowServerSource,
    ]) {
      expect(source).toContain("declaration:");
      expect(source).toContain("contribute:");
      expect(source).not.toContain("legacy");
      expect(source).not.toContain("interop");
      expect(source).not.toContain("manifest.fixtures");
    }
  });

  it("route negative assertions gate scaffold keeps D-015 negatives explicit", async () => {
    const routeMatrixPath = path.join(repoRoot, "apps", "server", "test", "route-boundary-matrix.test.ts");
    const routeMatrixSource = await fs.readFile(routeMatrixPath, "utf8");
    const routeMatrixAst = parseTypeScript(routeMatrixPath, routeMatrixSource);
    const negativeKeys = new Set(findConstStringArray(routeMatrixAst, "REQUIRED_NEGATIVE_ASSERTION_KEYS"));

    expect(negativeKeys.has("assertion:reject-api-inngest-from-caller-paths")).toBe(true);
    expect(negativeKeys.has("assertion:reject-ingress-spoofed-caller-headers")).toBe(true);
    expect(negativeKeys.has("assertion:reject-rpc-from-external-callers")).toBe(true);
    expect(negativeKeys.has("assertion:reject-rpc-from-runtime-ingress")).toBe(true);
    expect(negativeKeys.has("assertion:reject-rpc-workflows-route-family")).toBe(true);
    expect(routeMatrixSource.includes("/rpc/workflows/support-example/triage/status")).toBe(true);
  });

  it("observability contract gate scaffold keeps canonical coordination telemetry proofs present", async () => {
    const telemetryProbe = await fs.access(
      path.join(repoRoot, "services", "coordination", "test", "run-lifecycle-telemetry.test.ts"),
    );
    const workflowProbe = await fs.access(
      path.join(repoRoot, "plugins", "workflows", "coordination", "test", "observability.test.ts"),
    );

    expect(telemetryProbe == null).toBe(true);
    expect(workflowProbe == null).toBe(true);
  });
});

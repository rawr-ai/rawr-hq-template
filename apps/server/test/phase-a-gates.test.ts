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

function hasRegisterOrpcRoutesManifestRouter(sourceFile: ts.SourceFile): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text !== "registerOrpcRoutes" || node.arguments.length < 2) return;
    const optionsArg = unwrapExpression(node.arguments[1]);
    if (!ts.isObjectLiteralExpression(optionsArg)) return;
    for (const property of optionsArg.properties) {
      if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "router") continue;
      if (matchesPropertyAccessChain(property.initializer, ["rawrHqManifest", "orpc", "router"])) {
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

describe("phase-a gate scaffold (server)", () => {
  it("host composition guard gate scaffold verifies manifest-owned runtime seams", async () => {
    const rawrSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), "utf8");
    const rawrAst = parseTypeScript(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), rawrSource);

    expect(hasNamedImport(rawrAst, "../../../rawr.hq", "rawrHqManifest")).toBe(true);
    expect(hasRouteRegistration(rawrAst, "/api/inngest")).toBe(true);
    expect(hasRouteRegistration(rawrAst, "/api/workflows/*")).toBe(true);
    expect(hasRegisterOrpcRoutesManifestRouter(rawrAst)).toBe(true);
    expect(hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "workflows", "triggerRouter"])).toBe(true);
    expect(hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "bundleFactory"])).toBe(true);
    expect(hasPropertyAccessChain(rawrAst, ["rawrHqManifest", "inngest", "serveHandlerFactory"])).toBe(true);
  });

  it("route negative assertions gate scaffold keeps D-015 negatives explicit", async () => {
    const routeMatrixPath = path.join(repoRoot, "apps", "server", "test", "route-boundary-matrix.test.ts");
    const routeMatrixSource = await fs.readFile(routeMatrixPath, "utf8");
    const routeMatrixAst = parseTypeScript(routeMatrixPath, routeMatrixSource);
    const negativeKeys = new Set(findConstStringArray(routeMatrixAst, "REQUIRED_NEGATIVE_ASSERTION_KEYS"));

    expect(negativeKeys.has("assertion:reject-api-inngest-from-caller-paths")).toBe(true);
    expect(negativeKeys.has("assertion:reject-rpc-from-external-callers")).toBe(true);
    expect(negativeKeys.has("assertion:reject-rpc-workflows-route-family")).toBe(true);
    expect(routeMatrixSource.includes("/rpc/workflows/coordination/workflows")).toBe(true);
  });

  it("observability contract gate scaffold keeps observability package path present", async () => {
    await expect(
      fs.access(path.join(repoRoot, "packages", "coordination-observability", "test", "observability.test.ts")),
    ).resolves.toBeUndefined();
  });
});

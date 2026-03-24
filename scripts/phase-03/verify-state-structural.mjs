#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const packagePath = path.join(root, "services", "state", "package.json");
const basePath = path.join(root, "services", "state", "src", "service", "base.ts");
const implPath = path.join(root, "services", "state", "src", "service", "impl.ts");
const observabilityMiddlewarePath = path.join(root, "services", "state", "src", "service", "middleware", "observability.ts");
const analyticsMiddlewarePath = path.join(root, "services", "state", "src", "service", "middleware", "analytics.ts");
const routerPath = path.join(root, "services", "state", "src", "service", "router.ts");
const contractPath = path.join(root, "services", "state", "src", "service", "contract.ts");
const modulePath = path.join(root, "services", "state", "src", "service", "modules", "state", "module.ts");
const moduleMiddlewarePath = path.join(root, "services", "state", "src", "service", "modules", "state", "middleware.ts");
const moduleRouterPath = path.join(root, "services", "state", "src", "service", "modules", "state", "router.ts");
const moduleContractPath = path.join(root, "services", "state", "src", "service", "modules", "state", "contract.ts");
const indexPath = path.join(root, "services", "state", "src", "index.ts");
const repoStateIndexPath = path.join(root, "services", "state", "src", "repo-state", "index.ts");
const typingProofPath = path.join(root, "services", "state", "test", "context-typing.ts");

const [pkgRaw, baseSource, implSource, observabilityMiddlewareSource, analyticsMiddlewareSource, routerSource, contractSource, moduleSource, moduleMiddlewareSource, moduleRouterSource, moduleContractSource, indexSource, repoStateIndexSource, typingProofSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(basePath, "utf8"),
  fs.readFile(implPath, "utf8"),
  fs.readFile(observabilityMiddlewarePath, "utf8"),
  fs.readFile(analyticsMiddlewarePath, "utf8"),
  fs.readFile(routerPath, "utf8"),
  fs.readFile(contractPath, "utf8"),
  fs.readFile(modulePath, "utf8"),
  fs.readFile(moduleMiddlewarePath, "utf8"),
  fs.readFile(moduleRouterPath, "utf8"),
  fs.readFile(moduleContractPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(repoStateIndexPath, "utf8"),
  fs.readFile(typingProofPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
const tags = pkg.nx?.tags ?? [];

function fail(message) {
  console.error(`state structural failed: ${message}`);
  process.exit(1);
}

function createSourceFile(filePath, source) {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
}

function visit(node, visitor) {
  visitor(node);
  ts.forEachChild(node, (child) => visit(child, visitor));
}

function findVariableInitializer(sourceFile, name) {
  let initializer;
  visit(sourceFile, (node) => {
    if (
      initializer === undefined
      && ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === name
    ) {
      initializer = node.initializer;
    }
  });
  return initializer;
}

function getObjectProperty(objectLiteral, name) {
  return objectLiteral.properties.find((property) => {
    if (!("name" in property) || property.name === undefined) {
      return false;
    }

    return ts.isIdentifier(property.name) && property.name.text === name;
  });
}

function propertyName(property) {
  if (!("name" in property) || property.name === undefined || !ts.isIdentifier(property.name)) {
    return null;
  }

  return property.name.text;
}

const implAst = createSourceFile(implPath, implSource);
const moduleContractAst = createSourceFile(moduleContractPath, moduleContractSource);

if (!tags.includes("migration-slice:structural-tranche")) {
  fail("missing tranche tag.");
}

if (!tags.includes("type:service")) {
  fail("missing service tag.");
}

if (!tags.includes("role:servicepackage")) {
  fail("missing servicepackage role tag.");
}

if (tags.includes("type:package")) {
  fail("state must be tagged as a service, not a package.");
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    fail(`missing ${scriptName} script.`);
  }
}

if (!routerSource.includes("export const router")) {
  fail("service-owned router seam missing.");
}

if (
  !routerSource.includes('from "./modules/state/router"')
  || !routerSource.includes("state,")
  || routerSource.includes("...state")
) {
  fail("root router seam must stay composition-only over the state module.");
}

if (
  !baseSource.includes("type InvocationContext = {") ||
  !baseSource.includes("traceId: string;") ||
  !baseSource.includes("export const createServiceMiddleware = service.createMiddleware;") ||
  !baseSource.includes("export const createServiceProvider = service.createProvider;")
) {
  fail("service base seam must expose the golden authoring surface and invocation trace lane.");
}

if (
  !implSource.includes('from "./middleware/analytics"') ||
  !implSource.includes('from "./middleware/observability"') ||
  !observabilityMiddlewareSource.includes("createRequiredServiceObservabilityMiddleware") ||
  !analyticsMiddlewareSource.includes("createRequiredServiceAnalyticsMiddleware")
) {
  fail("required service middleware must live in dedicated middleware files.");
}

if (
  !contractSource.includes('from "./modules/state/contract"')
  || !contractSource.includes("state,")
  || contractSource.includes("GetStateOutputSchema")
) {
  fail("authority metadata contract missing.");
}

if (!pkg.exports?.["./service/modules/state/contract"]) {
  fail("module contract export missing.");
}

if (
  routerSource.includes("@rawr/core")
  || routerSource.includes("apps/server/src")
  || moduleRouterSource.includes("@rawr/core")
  || moduleRouterSource.includes("apps/server/src")
) {
  fail("router seam must not depend on core or host implementation.");
}

if (!indexSource.includes('export { router, type Router } from "./router"')) {
  fail("router seam not exported.");
}

if (indexSource.includes("getRepoState") || indexSource.includes("enablePlugin") || indexSource.includes("RepoState")) {
  fail("package root must stay thin and not export repo-state support helpers.");
}

if (!repoStateIndexSource.includes("getRepoState") || !repoStateIndexSource.includes("enablePlugin")) {
  fail("repo-state support subpath is incomplete.");
}

const outputSchemaInitializer = findVariableInitializer(moduleContractAst, "GetStateOutputSchema");
if (
  !outputSchemaInitializer
  || !ts.isCallExpression(outputSchemaInitializer)
  || outputSchemaInitializer.arguments.length === 0
  || !ts.isObjectLiteralExpression(outputSchemaInitializer.arguments[0])
) {
  fail("unable to inspect GetStateOutputSchema.");
}

const outputSchemaShape = outputSchemaInitializer.arguments[0];
const authorityRepoRootProperty = getObjectProperty(outputSchemaShape, "authorityRepoRoot");
if (
  !authorityRepoRootProperty
  || !ts.isPropertyAssignment(authorityRepoRootProperty)
  || !ts.isCallExpression(authorityRepoRootProperty.initializer)
) {
  fail("authorityRepoRoot output property missing.");
}

if (authorityRepoRootProperty.initializer.expression.getText(moduleContractAst) !== "Type.String") {
  fail("authorityRepoRoot must be a required string output.");
}

const implInitializer = findVariableInitializer(implAst, "impl");
if (
  !implInitializer
  || !ts.isCallExpression(implInitializer)
  || implInitializer.expression.getText(implAst) !== "createServiceImplementer"
  || implInitializer.arguments.length < 2
  || !ts.isObjectLiteralExpression(implInitializer.arguments[1])
) {
  fail("unable to inspect required service middleware attachment.");
}

const requiredExtensions = implInitializer.arguments[1];
const extensionNames = requiredExtensions.properties
  .map((property) => propertyName(property))
  .filter((name) => name !== null);

if (requiredExtensions.properties.length !== 2) {
  fail("service impl must attach exactly one required observability middleware and one required analytics middleware.");
}

if (extensionNames.filter((name) => name === "observability").length !== 1) {
  fail("service impl must attach required observability exactly once.");
}

if (extensionNames.filter((name) => name === "analytics").length !== 1) {
  fail("service impl must attach required analytics exactly once.");
}

if (
  !moduleMiddlewareSource.includes("repo: ReturnType<typeof createRepository>;")
  || !moduleMiddlewareSource.includes("repo: createRepository(context.scope.repoRoot),")
  || moduleMiddlewareSource.includes("repository: ReturnType<typeof createRepository>;")
  || moduleMiddlewareSource.includes("repository: createRepository(context.scope.repoRoot),")
) {
  fail("state module provider must widen provided.repo and reject provided.repository residue.");
}

if (
  !moduleSource.includes("repo: context.provided.repo,")
  || moduleSource.includes("context.provided.repository")
  || moduleSource.includes("repository: context.provided")
) {
  fail("state module narrowing must project context.repo from context.provided.repo.");
}

if (
  !moduleRouterSource.includes("context.repo.getStateWithAuthority()")
  || moduleRouterSource.includes("context.repository")
) {
  fail("state handlers must author against context.repo.");
}

if (
  !typingProofSource.includes("context.provided.repo.getStateWithAuthority()")
  || !typingProofSource.includes("context.repo.getStateWithAuthority()")
  || !typingProofSource.includes("required service middleware must not depend on provided context")
) {
  fail("state-local typing proof is missing the canonical repo seam coverage.");
}

console.log("state structural verified");

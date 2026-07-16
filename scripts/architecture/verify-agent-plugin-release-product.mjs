import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const primaryPersonalCheckout = "/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq";
const compareCanonicalText = (left, right) => Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"));
const integrationProofPath = path.join(root, "scripts/architecture/prove-agent-plugin-release-product.ts");
const nodeStorePath = path.join(root, "apps/cli/src/lib/agent-plugins/undo/node-store.ts");
const failures = [];

const projects = {
  "@rawr/agent-plugin-release": {
    root: "packages/agent-plugin-release",
    tags: ["type:package", "role:agent-plugin-release"],
    runtimeDependencies: [],
    workspaceDependencies: [],
    workspaceDependents: [
      "@rawr/agent-plugin-build",
      "@rawr/agent-plugin-export",
      "@rawr/agent-plugin-packaging",
    ],
  },
  "@rawr/agent-plugin-build": {
    root: "services/agent-plugin-build",
    tags: ["type:service", "role:agent-plugin-build"],
    runtimeDependencies: ["@rawr/agent-plugin-release"],
    workspaceDependencies: ["@rawr/agent-plugin-release"],
    workspaceDependents: [],
  },
  "@rawr/agent-plugin-export": {
    root: "services/agent-plugin-export",
    tags: ["type:service", "role:agent-plugin-export"],
    runtimeDependencies: ["@rawr/agent-plugin-release"],
    workspaceDependencies: ["@rawr/agent-plugin-release"],
    workspaceDependents: ["@rawr/cli"],
  },
  "@rawr/agent-plugin-packaging": {
    root: "services/agent-plugin-packaging",
    tags: ["type:service", "role:agent-plugin-packaging"],
    runtimeDependencies: ["@rawr/agent-plugin-release", "yazl"],
    workspaceDependencies: ["@rawr/agent-plugin-release"],
    workspaceDependents: [],
  },
};

const nodeFsModuleSpecifiers = new Set(["fs", "fs/promises", "node:fs", "node:fs/promises"]);
const recursiveOperations = new Set(["rm", "rmSync"]);
const recursiveFixtureFiles = new Set([
  "apps/cli/test/agent-plugins/undo/owned-fixture-root.ts",
  "services/agent-plugin-build/test/owned-fixture-root.ts",
  "services/agent-plugin-export/test/owned-fixture-root.ts",
  "services/agent-plugin-packaging/test/owned-fixture-root.ts",
]);
const cliControllerRuntimePackages = new Set(["@rawr/agent-plugin-export"]);
const cliControllerDynamicModules = new Set(["bun:ffi"]);
const cliControllerRuntimeBuiltins = new Set([
  "node:crypto",
  "node:fs",
  "node:fs/promises",
  "node:path",
]);

validateProjectManifests();
validateNxGraph();
validatePureReleaseBoundary();
validateOwnerBoundaries();
validateOwnerRelativeImportBoundaries();
validateCliControllerImportBoundary();
validateGitObjectByteBoundary();

const c2Files = [...new Set([
  ...Object.values(projects).flatMap((project) => walk(path.join(root, project.root))),
  ...walk(path.join(root, "apps/cli/src/lib/agent-plugins")),
  ...walk(path.join(root, "apps/cli/test/agent-plugins")),
  integrationProofPath,
])];

validateProtectedBoundaries(c2Files);
validateRecursiveRemovalBoundary(c2Files);
validateCapsuleAdmissionNonMutation(nodeStorePath);
validateActivationBoundary();

if (failures.length > 0) {
  throw new Error(`AGENT_PLUGIN_RELEASE_PRODUCT_ARCHITECTURE_VIOLATION\n${failures.join("\n")}`);
}

console.log("agent plugin release product: owners, graph, activation, and deletion rails verified");

function validateProjectManifests() {
  for (const [projectName, expected] of Object.entries(projects)) {
    const packagePath = path.join(root, expected.root, "package.json");
    if (!fs.existsSync(packagePath)) {
      failures.push(`${projectName} package manifest is missing`);
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (manifest.name !== projectName) failures.push(`${projectName} manifest name differs`);
    if (manifest.main !== "./src/index.ts" || manifest.types !== "./src/index.ts") {
      failures.push(`${projectName} main and types must both name ./src/index.ts`);
    }

    const publicEntryPath = path.join(root, expected.root, "src", "index.ts");
    if (!fs.existsSync(publicEntryPath) || !fs.statSync(publicEntryPath).isFile()) {
      failures.push(`${projectName} curated public entry src/index.ts is missing`);
    }

    const tags = new Set(manifest.nx?.tags ?? []);
    for (const tag of expected.tags) {
      if (!tags.has(tag)) failures.push(`${projectName} is missing tag ${tag}`);
    }
    for (const script of ["build", "lint", "typecheck", "test"]) {
      if (typeof manifest.scripts?.[script] !== "string") failures.push(`${projectName} is missing ${script} target`);
    }

    const workspaceDependencies = Object.entries({
      ...(manifest.dependencies ?? {}),
      ...(manifest.peerDependencies ?? {}),
    })
      .filter(([name, version]) => name.startsWith("@rawr/") || String(version).startsWith("workspace:"))
      .map(([name]) => name)
      .sort(compareCanonicalText);
    if (JSON.stringify(workspaceDependencies) !== JSON.stringify(expected.workspaceDependencies)) {
      failures.push(`${projectName} workspace dependencies differ: ${JSON.stringify(workspaceDependencies)}`);
    }
    const runtimeDependencies = Object.keys(manifest.dependencies ?? {}).sort(compareCanonicalText);
    if (JSON.stringify(runtimeDependencies) !== JSON.stringify(expected.runtimeDependencies)) {
      failures.push(`${projectName} runtime dependencies differ: ${JSON.stringify(runtimeDependencies)}`);
    }
    for (const dependencyKind of ["peerDependencies", "optionalDependencies"]) {
      const names = Object.keys(manifest[dependencyKind] ?? {}).sort(compareCanonicalText);
      if (names.length > 0) failures.push(`${projectName} ${dependencyKind} must remain empty: ${JSON.stringify(names)}`);
    }

    const exportsKeys = Object.keys(manifest.exports ?? {}).sort(compareCanonicalText);
    if (JSON.stringify(exportsKeys) !== JSON.stringify(["."])) {
      failures.push(`${projectName} must expose one curated root export, got ${JSON.stringify(exportsKeys)}`);
    }
    const rootExport = manifest.exports?.["."];
    if (
      !rootExport
      || typeof rootExport !== "object"
      || Array.isArray(rootExport)
      || rootExport.types !== "./src/index.ts"
      || rootExport.default !== "./src/index.ts"
      || JSON.stringify(Object.keys(rootExport).sort(compareCanonicalText)) !== JSON.stringify(["default", "types"])
    ) failures.push(`${projectName} root export must expose only types/default at ./src/index.ts`);
  }
}

function validateNxGraph() {
  const graphResult = Bun.spawnSync(["bunx", "nx", "graph", "--print"], {
    cwd: root,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (graphResult.exitCode !== 0) {
    failures.push(`Nx graph failed: ${graphResult.stderr.toString().trim()}`);
    return;
  }

  const graph = JSON.parse(graphResult.stdout.toString());
  const workspaceProjectNames = new Set(Object.keys(graph.graph?.nodes ?? {}));
  const reverseDependencies = new Map(Object.keys(projects).map((projectName) => [projectName, []]));
  for (const [source, edges] of Object.entries(graph.graph?.dependencies ?? {})) {
    for (const edge of edges) {
      if (reverseDependencies.has(edge.target) && workspaceProjectNames.has(source)) {
        reverseDependencies.get(edge.target).push(source);
      }
    }
  }

  for (const [projectName, expected] of Object.entries(projects)) {
    const actual = (graph.graph?.dependencies?.[projectName] ?? [])
      .map((edge) => edge.target)
      .filter((target) => workspaceProjectNames.has(target))
      .sort(compareCanonicalText);
    if (JSON.stringify(actual) !== JSON.stringify(expected.workspaceDependencies)) {
      failures.push(`${projectName} Nx edges differ: ${JSON.stringify(actual)}`);
    }
    const actualDependents = [...(reverseDependencies.get(projectName) ?? [])].sort(compareCanonicalText);
    if (JSON.stringify(actualDependents) !== JSON.stringify(expected.workspaceDependents)) {
      failures.push(`${projectName} Nx reverse edges differ: ${JSON.stringify(actualDependents)}`);
    }
  }
}

function validatePureReleaseBoundary() {
  const pureRoot = path.join(root, projects["@rawr/agent-plugin-release"].root, "src");
  for (const sourcePath of walk(pureRoot)) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const sourceFile = parseSource(sourcePath, source);
    for (const { declaration, specifier, loading } of collectModuleReferences(sourceFile)) {
      if (loading === "dynamic") {
        failures.push(`pure release uses dynamic module loading for ${specifier} in ${relative(sourcePath)}`);
        continue;
      }
      if (!specifier.startsWith(".") && !["node:buffer", "node:crypto"].includes(specifier)) {
        failures.push(`pure release imports ${specifier} in ${relative(sourcePath)}`);
      }
      if (
        specifier === "node:crypto"
        && (!ts.isImportDeclaration(declaration) || !hasOnlyNamedImports(declaration, ["createHash"]))
      ) failures.push(`pure release may import only createHash from node:crypto in ${relative(sourcePath)}`);
      if (
        specifier === "node:buffer"
        && (!ts.isImportDeclaration(declaration) || !hasOnlyNamedImports(declaration, ["Buffer"]))
      ) failures.push(`pure release may import only Buffer from node:buffer in ${relative(sourcePath)}`);
    }

    for (const globalName of [
      "Bun",
      "process.",
      "Date.",
      "new Date",
      "performance.",
      "Math.random",
      "randomBytes",
      "randomUUID",
      "webcrypto",
      "globalThis",
    ]) {
      if (source.includes(globalName)) failures.push(`pure release uses ambient global ${globalName} in ${relative(sourcePath)}`);
    }
  }
}

function validateOwnerBoundaries() {
  const forbiddenOwnerImports = [
    "@rawr/agent-config-sync",
    "@rawr/agent-config-sync-node",
    "@rawr/plugin-plugins",
    "@rawr/hq-sdk",
    "services/agent-config-sync",
    "plugins/cli/plugins",
    "apps/",
  ];
  for (const expected of Object.values(projects)) {
    for (const sourcePath of walk(path.join(root, expected.root, "src"))) {
      const source = fs.readFileSync(sourcePath, "utf8");
      const sourceFile = parseSource(sourcePath, source);
      for (const forbidden of forbiddenOwnerImports) {
        if (source.includes(forbidden)) failures.push(`${relative(sourcePath)} references forbidden owner ${forbidden}`);
      }
      for (const { specifier } of collectModuleReferences(sourceFile)) {
        if (
          !Object.hasOwn(projects, specifier)
          && Object.keys(projects).some((projectName) => specifier.startsWith(`${projectName}/`))
        ) failures.push(`${relative(sourcePath)} bypasses a curated C2 package root with ${specifier}`);
      }
    }
  }

  const productionFiles = [
    ...walk(path.join(root, "apps")),
    ...walk(path.join(root, "packages")),
    ...walk(path.join(root, "services")),
    ...walk(path.join(root, "plugins")),
  ].filter((sourcePath) => !isTestPath(sourcePath));
  const artifactReaderConstructors = productionFiles.filter((sourcePath) => (
    collectDefinedNames(parseSource(sourcePath, fs.readFileSync(sourcePath, "utf8")))
      .includes("createFilesystemArtifactReader")
  ));
  if (
    artifactReaderConstructors.length !== 1
    || !relative(artifactReaderConstructors[0]).startsWith("services/agent-plugin-build/src/")
  ) {
    failures.push(
      `filesystem artifact reader must have one build-owned constructor: ${JSON.stringify(artifactReaderConstructors.map(relative))}`,
    );
  }

  for (const sourcePath of productionFiles) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const sourceFile = parseSource(sourcePath, source);
    if (/\b(?:FakeArtifactReader|FakeKnownNativeHomesReader|createFakeKnownNativeHomesReader)\b/u.test(source)) {
      failures.push(`test fake escaped into production: ${relative(sourcePath)}`);
    }
    for (const definedName of collectDefinedNames(sourceFile)) {
      if (/create.*ArtifactReader$/u.test(definedName) && definedName !== "createFilesystemArtifactReader") {
        failures.push(`alternate production artifact reader factory ${definedName} in ${relative(sourcePath)}`);
      }
    }
    for (const exportedName of collectExportedDefinedNames(sourceFile)) {
      if (/^(?:create|parse|verify).*ArtifactSnapshot/u.test(exportedName)) {
        failures.push(`public artifact snapshot constructor ${exportedName} in ${relative(sourcePath)}`);
      }
    }
    if (hasArtifactSnapshotAssertion(sourceFile)) {
      failures.push(`production artifact snapshot cast is forbidden in ${relative(sourcePath)}`);
    }
    if (
      /\b(?:createFilesystemCapsuleStore|FilesystemCapsuleStore)\b/u.test(source)
      && !relative(sourcePath).startsWith("apps/cli/src/lib/agent-plugins/undo/")
    ) failures.push(`capsule persistence escaped the CLI owner: ${relative(sourcePath)}`);
  }
}

function validateOwnerRelativeImportBoundaries() {
  for (const [projectName, project] of Object.entries(projects)) {
    const ownerRoot = path.join(root, project.root);
    for (const sourcePath of walk(ownerRoot)) {
      const sourceFile = parseSource(sourcePath, fs.readFileSync(sourcePath, "utf8"));
      for (const issue of relativeRuntimeContainmentIssues(sourceFile, sourcePath, ownerRoot)) {
        failures.push(`${projectName} ${relative(sourcePath)} ${issue}`);
      }
    }
  }

  const probeRoot = path.join(root, ".agent-plugin-owner-boundary-probe");
  const probePath = path.join(probeRoot, "src/index.ts");
  const probe = parseSource(probePath, `
    export { removeTree } from "../../outside-delete.js";
    export async function loadRemoveTree() {
      return import("../../outside-delete.js");
    }
  `);
  if (relativeRuntimeContainmentIssues(probe, probePath, probeRoot).length !== 2) {
    failures.push("C2 owner relative-import containment self-check differs");
  }
}

function relativeRuntimeContainmentIssues(sourceFile, sourcePath, ownerRoot) {
  const issues = [];
  for (const reference of collectModuleReferences(sourceFile)) {
    if (
      !reference.specifier.startsWith(".")
      || !isRuntimeModuleReference(reference.declaration)
    ) continue;
    const candidate = path.resolve(path.dirname(sourcePath), reference.specifier);
    if (!isContainedPath(ownerRoot, candidate)) {
      issues.push(`runtime relative import escapes owner root through ${reference.specifier}`);
    }
  }
  return issues;
}

function validateProtectedBoundaries(sourcePaths) {
  const protectedAuthorityTokens = [
    primaryPersonalCheckout,
    "rawr plugins sync",
    "orpc-ingest-domain-packages",
    "orpc-ingest-workflows-spec",
    "codex-rawr-full-tier-inngest-proof",
    "bfa0eac652d3200af3edcf8afffd91cc995ae096ca786dd2d919484919d2981f",
    "888f81684ce1d3d8c805298023089d8619b6e1b79d7ba3465875caa1af3d9e17",
    "64ad4e7143054e896fe9a0d271c1530e23be69427def7ceaee4caaa2de1393fe",
    "81db52240d3c7fe493f0bd22b685aa0736ac443b04d09b50f5c6dee95cdae2ca",
  ];
  for (const sourcePath of sourcePaths) {
    const source = fs.readFileSync(sourcePath, "utf8");
    if (source.includes("localeCompare(")) failures.push(`${relative(sourcePath)} uses locale-dependent ordering`);
    for (const token of protectedAuthorityTokens) {
      if (source.includes(token)) failures.push(`${relative(sourcePath)} references protected authority token ${token}`);
    }
    if (!isTestPath(sourcePath)) {
      for (const { specifier } of collectModuleReferences(parseSource(sourcePath, source))) {
        if (specifier.includes("/test/") || specifier.includes("owned-fixture-root")) {
          failures.push(`${relative(sourcePath)} imports test-only cleanup capability ${specifier}`);
        }
      }
    }
  }
}

function validateGitObjectByteBoundary() {
  const gitRoot = path.join(root, "services/agent-plugin-build/src/git");
  const permittedRuntimeModules = new Map([
    ["services/agent-plugin-build/src/git/object-snapshot.ts", new Set([
      "../payload-bounds",
      "@rawr/agent-plugin-release",
      "node:crypto",
      "node:fs/promises",
      "node:path",
    ])],
    ["services/agent-plugin-build/src/git/process.ts", new Set([
      "node:child_process",
      "node:fs",
      "node:fs/promises",
      "node:path",
    ])],
  ]);
  const permittedBuiltinImports = new Map([
    ["services/agent-plugin-build/src/git/object-snapshot.ts", new Map([
      ["node:crypto", ["createHash"]],
      ["node:fs/promises", ["lstat", "realpath"]],
      ["node:path", ["posix", "resolve"]],
    ])],
    ["services/agent-plugin-build/src/git/process.ts", new Map([
      ["node:child_process", ["spawn"]],
      ["node:fs", ["constants"]],
      ["node:fs/promises", ["lstat", "open", "realpath"]],
      ["node:path", ["resolve"]],
    ])],
  ]);

  for (const sourcePath of walk(gitRoot)) {
    const relPath = relative(sourcePath);
    const source = fs.readFileSync(sourcePath, "utf8");
    const sourceFile = parseSource(sourcePath, source);
    for (const reference of collectModuleReferences(sourceFile)) {
      if (!isRuntimeModuleReference(reference.declaration)) continue;
      if (!(permittedRuntimeModules.get(relPath)?.has(reference.specifier) ?? false)) {
        failures.push(`${relPath} imports undeclared Git-owner runtime capability ${reference.specifier}`);
      }
    }
    for (const issue of gitObjectByteBoundaryIssues(sourceFile, relPath)) {
      failures.push(`${relPath} ${issue}`);
    }
    for (const declaration of sourceFile.statements.filter(ts.isImportDeclaration)) {
      if (!ts.isStringLiteral(declaration.moduleSpecifier)) continue;
      const specifier = declaration.moduleSpecifier.text;
      if (!specifier.startsWith("node:") || !isRuntimeModuleReference(declaration)) continue;
      const clause = declaration.importClause;
      const imported = clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
          .filter((element) => !element.isTypeOnly)
          .map((element) => element.propertyName?.text ?? element.name.text)
          .sort(compareCanonicalText)
        : [];
      const permitted = permittedBuiltinImports.get(relPath)?.get(specifier) ?? [];
      if (JSON.stringify(imported) !== JSON.stringify([...permitted].sort(compareCanonicalText))) {
        failures.push(`${relPath} builtin imports differ from the exact Git object-byte allowlist for ${specifier}`);
      }
    }
  }

  const probe = parseSource("git-object-byte-boundary-probe.ts", `
    import { readFile } from "node:fs/promises";
    export const readPayload = readFile;
  `);
  if (!gitObjectByteBoundaryIssues(probe, "services/agent-plugin-build/src/git/probe.ts")
    .some((issue) => issue.includes("filesystem payload-read capability"))) {
    failures.push("Git object-byte boundary self-check differs");
  }
}

function gitObjectByteBoundaryIssues(sourceFile, relPath) {
  const issues = [];
  for (const reference of collectModuleReferences(sourceFile)) {
    if (nodeFsModuleSpecifiers.has(reference.specifier)) {
      if (reference.loading === "dynamic" || !ts.isImportDeclaration(reference.declaration)) {
        issues.push(`loads filesystem capability through ${reference.loading} ${reference.specifier}`);
        continue;
      }
      const clause = reference.declaration.importClause;
      if (!clause || clause.isTypeOnly) continue;
      if (clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
        issues.push(`imports a filesystem namespace instead of exact Git metadata helpers from ${reference.specifier}`);
        continue;
      }
      for (const element of clause.namedBindings.elements) {
        if (element.isTypeOnly) continue;
        const importedName = element.propertyName?.text ?? element.name.text;
        if (["readFile", "readFileSync", "createReadStream"].includes(importedName)) {
          issues.push(`imports filesystem payload-read capability ${importedName}`);
        }
      }
    }
    if (
      isRuntimeModuleReference(reference.declaration)
      && reference.specifier.startsWith(".")
      && !isContainedPath(path.join(root, "services/agent-plugin-build/src/git"), path.resolve(
        path.dirname(path.join(root, relPath)),
        reference.specifier,
      ))
      && !(relPath.endsWith("/object-snapshot.ts") && reference.specifier === "../payload-bounds")
    ) issues.push(`runtime import escapes the Git object-byte owner through ${reference.specifier}`);
  }
  for (const token of ["Bun.file(", "Bun.openIn(", "Deno.readFile(", "Deno.open("]) {
    if (sourceFile.text.includes(token)) issues.push(`uses ambient filesystem payload-read capability ${token.slice(0, -1)}`);
  }
  return issues;
}

function validateRecursiveRemovalBoundary(sourcePaths) {
  const seenFixtures = new Set();
  for (const sourcePath of sourcePaths) {
    const relPath = relative(sourcePath);
    const sourceFile = parseSource(sourcePath, fs.readFileSync(sourcePath, "utf8"));
    const allowedFixture = recursiveFixtureFiles.has(relPath);
    const calls = collectDirectRecursiveCalls(sourceFile);
    if (!allowedFixture && calls.length > 0) {
      failures.push(`${relPath} contains direct recursive removal call(s)`);
    }
    const recursiveRmdirCalls = collectNodes(sourceFile, ts.isCallExpression).filter((call) => (
      ["rmdir", "rmdirSync"].includes(calledOperation(call.expression))
      && call.arguments.some((argument) => hasRecursiveTrueProperty(argument, sourceFile))
    ));
    if (recursiveRmdirCalls.length > 0) {
      failures.push(`${relPath} uses deprecated recursive rmdir; recursive removal is fixture-only`);
    }
    if (allowedFixture) {
      seenFixtures.add(relPath);
      if (
        calls.length !== 1
        || !hasExactRecursiveFixtureCall(calls[0], sourceFile)
        || !hasOnlyExactFixtureBindingUse(sourceFile, calls[0])
      ) {
        failures.push(`${relPath} must contain exactly one rm(path, { recursive: true, force: false }) cleanup call`);
      }
    }
  }

  for (const fixturePath of recursiveFixtureFiles) {
    if (!seenFixtures.has(fixturePath)) failures.push(`recursive fixture cleanup allowlist entry is missing: ${fixturePath}`);
  }
}

function validateCapsuleAdmissionNonMutation(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const sourceFile = parseSource(sourcePath, source);
  if (!source.includes('const ADMISSION_FILE = ".capsule-admission-v1.lock";')) {
    failures.push(`${relative(sourcePath)} stable admission identity is missing`);
  }
  if (
    (source.match(/constants\.O_CREAT/gu) ?? []).length !== 2
    || (source.match(/constants\.O_EXCL/gu) ?? []).length !== 2
    || !source.includes("create ? constants.O_CREAT | constants.O_EXCL : 0")
  ) {
    failures.push(`${relative(sourcePath)} admission creation must remain one exclusive initial-root exception`);
  }
  const destructive = new Set([
    "link",
    "linkSync",
    "rename",
    "renameSync",
    "rm",
    "rmSync",
    "rmdir",
    "rmdirSync",
    "unlink",
    "unlinkSync",
  ]);
  for (const call of collectNodes(sourceFile, ts.isCallExpression)) {
    const operation = calledOperation(call.expression);
    if (!destructive.has(operation)) continue;
    const argumentText = call.arguments.map((argument) => argument.getText(sourceFile)).join(" ");
    if (/\b(?:ADMISSION_FILE|admissionPath|admission)\b/u.test(argumentText)) {
      failures.push(`${relative(sourcePath)} ${operation} targets the stable admission identity`);
    }
  }
}

function validateCliControllerImportBoundary() {
  const cliControllerRoot = path.join(root, "apps/cli/src/lib/agent-plugins");
  for (const sourcePath of walk(cliControllerRoot)) {
    const sourceFile = parseSource(sourcePath, fs.readFileSync(sourcePath, "utf8"));
    for (const issue of cliControllerImportBoundaryIssues(sourceFile, sourcePath, cliControllerRoot)) {
      failures.push(`${relative(sourcePath)} ${issue}`);
    }
  }

  const probe = parseSource("agent-plugin-import-boundary-probe.ts", `
    import * as hiddenLegacyDelete from "@rawr/agent-config-sync-node";
    void hiddenLegacyDelete;
  `);
  if (!cliControllerImportBoundaryIssues(probe).some((issue) => issue.includes("@rawr/agent-config-sync-node"))) {
    failures.push("CLI agent-plugin import boundary self-check differs");
  }
}

function cliControllerImportBoundaryIssues(sourceFile, sourcePath, controllerRoot) {
  const issues = [];
  for (const reference of collectModuleReferences(sourceFile)) {
    if (!isRuntimeModuleReference(reference.declaration)) continue;
    if (reference.loading === "dynamic" && !cliControllerDynamicModules.has(reference.specifier)) {
      issues.push(`uses dynamic runtime import ${reference.specifier}`);
    } else if (
      reference.loading === "static"
      && reference.specifier.startsWith(".")
      && sourcePath !== undefined
      && controllerRoot !== undefined
      && !isContainedPath(controllerRoot, path.resolve(path.dirname(sourcePath), reference.specifier))
    ) {
      issues.push(`runtime relative import escapes CLI agent-plugin owner through ${reference.specifier}`);
    } else if (
      reference.loading === "static"
      && !reference.specifier.startsWith(".")
      && !cliControllerRuntimeBuiltins.has(reference.specifier)
      && !cliControllerRuntimePackages.has(reference.specifier)
    ) {
      issues.push(`imports runtime package ${reference.specifier}; C2 CLI controller code admits only declared C2 owners and builtins`);
    }
  }
  return issues;
}

function isRuntimeModuleReference(declaration) {
  if (ts.isImportDeclaration(declaration)) {
    const clause = declaration.importClause;
    if (clause?.isTypeOnly) return false;
    return !(
      clause
      && !clause.name
      && clause.namedBindings
      && ts.isNamedImports(clause.namedBindings)
      && clause.namedBindings.elements.length > 0
      && clause.namedBindings.elements.every((element) => element.isTypeOnly)
    );
  }
  if (ts.isExportDeclaration(declaration)) {
    if (declaration.isTypeOnly) return false;
    return !(
      declaration.exportClause
      && ts.isNamedExports(declaration.exportClause)
      && declaration.exportClause.elements.length > 0
      && declaration.exportClause.elements.every((element) => element.isTypeOnly)
    );
  }
  return true;
}

function validateActivationBoundary() {
  const commandRoot = path.join(root, "apps/cli/src/commands/agent/plugins");
  if (fs.existsSync(commandRoot)) failures.push("C2 agent-plugin commands became reachable");

  const cliManifest = JSON.parse(fs.readFileSync(path.join(root, "apps/cli/package.json"), "utf8"));
  const activationSources = [
    JSON.stringify(cliManifest.oclif ?? {}),
    fs.readFileSync(path.join(root, "apps/cli/src/lib/controller/classification.ts"), "utf8"),
  ].join("\n");
  for (const projectName of Object.keys(projects)) {
    if (activationSources.includes(projectName)) {
      failures.push(`${projectName} entered controller command discovery during C2`);
    }
  }

  const vitestRoot = fs.readFileSync(path.join(root, "vitest.config.ts"), "utf8");
  for (const expected of Object.values(projects)) {
    if (!vitestRoot.includes(`r("${expected.root}")`)) {
      failures.push(`${expected.root} is absent from root Vitest registration`);
    }
  }
}

function collectDirectRecursiveCalls(sourceFile) {
  return collectNodes(sourceFile, ts.isCallExpression).filter((call) => recursiveOperations.has(calledOperation(call.expression)));
}

function isExecutableIdentifierReference(identifier) {
  const parent = identifier.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
  if (ts.isQualifiedName(parent)) return false;
  if (
    ts.isImportSpecifier(parent)
    || ts.isExportSpecifier(parent)
    || ts.isNamespaceImport(parent)
    || ts.isImportClause(parent)
    || ts.isImportEqualsDeclaration(parent)
  ) return false;
  if (
    ts.isVariableDeclaration(parent)
    || ts.isParameter(parent)
    || ts.isBindingElement(parent)
    || ts.isFunctionDeclaration(parent)
    || ts.isFunctionExpression(parent)
    || ts.isClassDeclaration(parent)
    || ts.isClassExpression(parent)
    || ts.isInterfaceDeclaration(parent)
    || ts.isTypeAliasDeclaration(parent)
    || ts.isTypeParameterDeclaration(parent)
    || ts.isEnumDeclaration(parent)
    || ts.isModuleDeclaration(parent)
  ) return parent.name !== identifier;
  if (
    ts.isMethodDeclaration(parent)
    || ts.isMethodSignature(parent)
    || ts.isPropertyDeclaration(parent)
    || ts.isPropertySignature(parent)
    || ts.isGetAccessorDeclaration(parent)
    || ts.isSetAccessorDeclaration(parent)
    || ts.isPropertyAssignment(parent)
  ) return parent.name !== identifier;
  if (
    ts.isLabeledStatement(parent)
    || ts.isBreakStatement(parent)
    || ts.isContinueStatement(parent)
  ) return parent.label !== identifier;
  return true;
}

function calledOperation(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression)
    && expression.argumentExpression
    && ts.isStringLiteral(expression.argumentExpression)
  ) return expression.argumentExpression.text;
  return undefined;
}

function hasRecursiveTrueProperty(node, sourceFile) {
  return ts.isObjectLiteralExpression(node) && node.properties.some((property) => (
    ts.isPropertyAssignment(property)
    && property.name.getText(sourceFile) === "recursive"
    && property.initializer.kind === ts.SyntaxKind.TrueKeyword
  ));
}

function hasExactRecursiveFixtureCall(call, sourceFile) {
  if (calledOperation(call.expression) !== "rm" || call.arguments.length !== 2) return false;
  const options = call.arguments[1];
  if (!ts.isObjectLiteralExpression(options) || options.properties.length !== 2) return false;
  const values = new Map();
  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property)) return false;
    values.set(property.name.getText(sourceFile), property.initializer.kind);
  }
  return values.get("recursive") === ts.SyntaxKind.TrueKeyword
    && values.get("force") === ts.SyntaxKind.FalseKeyword;
}

function hasOnlyExactFixtureBindingUse(sourceFile, call) {
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "rm") return false;
  const references = collectNodes(sourceFile, (node) => (
    ts.isIdentifier(node)
    && node.text === "rm"
    && isExecutableIdentifierReference(node)
  ));
  return references.length === 1 && references[0] === call.expression;
}

function relative(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function isContainedPath(ownerRoot, candidate) {
  const offset = path.relative(ownerRoot, candidate);
  return offset === ""
    || (offset !== ".." && !offset.startsWith(`..${path.sep}`) && !path.isAbsolute(offset));
}

function isTestPath(sourcePath) {
  return sourcePath.includes(`${path.sep}test${path.sep}`);
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["coverage", "dist", "node_modules"].includes(entry.name)) return [];
      return walk(entryPath);
    }
    return /\.(?:cjs|js|mjs|ts|tsx)$/u.test(entry.name) ? [entryPath] : [];
  });
}

function parseSource(sourcePath, source) {
  return ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function collectModuleReferences(sourceFile) {
  const references = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      references.push({ declaration: node, specifier: node.moduleSpecifier.text, loading: "static" });
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression
      && ts.isStringLiteral(node.moduleReference.expression)
    ) {
      references.push({ declaration: node, specifier: node.moduleReference.expression.text, loading: "dynamic" });
    } else if (
      ts.isCallExpression(node)
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
      && (
        node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === "require")
      )
    ) {
      references.push({ declaration: node, specifier: node.arguments[0].text, loading: "dynamic" });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

function hasOnlyNamedImports(declaration, permittedNames) {
  const clause = declaration.importClause;
  if (!clause || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) return false;
  const importedNames = clause.namedBindings.elements.map((element) => element.propertyName?.text ?? element.name.text);
  return importedNames.length > 0 && importedNames.every((name) => permittedNames.includes(name));
}

function collectDefinedNames(sourceFile) {
  const names = [];
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) names.push(statement.name.text);
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
    }
  }
  return names;
}

function collectExportedDefinedNames(sourceFile) {
  const names = [];
  for (const statement of sourceFile.statements) {
    const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!exported) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name) names.push(statement.name.text);
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
    }
  }
  return names;
}

function hasArtifactSnapshotAssertion(sourceFile) {
  return collectNodes(sourceFile, (node) => (
    (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
    && /(?:Verified.*Artifact|Artifact.*Snapshot)/u.test(node.type.getText(sourceFile))
  )).length > 0;
}

function collectNodes(node, predicate) {
  const found = [];
  const visit = (current) => {
    if (predicate(current)) found.push(current);
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

const root = process.cwd();
const failures = [];

const projects = [
  {
    name: "@rawr/agent-plugin-promotion",
    directory: "services/agent-plugin-promotion",
    exports: [".", "./adapters/git", "./adapters/hosted"],
    topology: {
      domain: new Set(["domain"]),
      ports: new Set(["domain", "ports"]),
      applications: new Set(["domain", "ports", "applications"]),
      adapters: new Set(["domain", "ports", "adapters"]),
      index: new Set(["domain", "ports", "applications"]),
    },
  },
  {
    name: "@rawr/agent-provider-deployment",
    directory: "services/agent-provider-deployment",
    exports: [
      ".",
      "./adapters/claude",
      "./adapters/codex",
      "./adapters/node-claude",
      "./adapters/node-codex",
      "./node-state",
      "./owner-protocol",
    ],
    topology: {
      domain: new Set(["domain"]),
      ports: new Set(["domain", "ports"]),
      applications: new Set(["domain", "ports", "applications"]),
      adapters: new Set(["domain", "ports", "adapters"]),
      "node-state": new Set(["domain", "ports", "node-state"]),
      "owner-protocol": new Set(["domain", "ports", "owner-protocol"]),
      index: new Set(["domain", "ports", "applications"]),
    },
  },
];

for (const project of projects) {
  const packagePath = path.join(root, project.directory, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));
  const dependencies = Object.keys(packageJson.dependencies ?? {}).sort();
  if (dependencies.length !== 1 || dependencies[0] !== "@rawr/agent-plugin-release") {
    failures.push(`${project.name} runtime dependencies must contain only @rawr/agent-plugin-release`);
  }
  const exportKeys = Object.keys(packageJson.exports ?? {}).sort();
  const expectedExports = [...project.exports].sort();
  if (!sameArray(exportKeys, expectedExports)) {
    failures.push(`${project.name} exports differ: ${exportKeys.join(", ")}`);
  }

  const sourceRoot = path.join(root, project.directory, "src");
  const sourceFiles = await walkTypeScript(sourceRoot);
  for (const sourcePath of sourceFiles) {
    const source = await fs.readFile(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const category = moduleCategory(sourceRoot, sourcePath);
    const allowed = project.topology[category];
    if (allowed === undefined) {
      failures.push(`${relative(sourcePath)} has an unclassified module category ${category}`);
      continue;
    }
    for (const specifier of moduleSpecifiers(sourceFile)) {
      if (specifier.startsWith("@rawr/") && specifier !== "@rawr/agent-plugin-release") {
        failures.push(`${relative(sourcePath)} imports forbidden workspace owner ${specifier}`);
      }
      if (!specifier.startsWith(".")) continue;
      const targetCategory = relativeTargetCategory(sourceRoot, sourcePath, specifier);
      if (targetCategory !== undefined && !allowed.has(targetCategory)) {
        failures.push(`${relative(sourcePath)} imports outward ${targetCategory} module ${specifier}`);
      }
    }
    if (category === "index" && /["']\.\/(?:adapters|node-state|owner-protocol)(?:\/|["'])/u.test(source)) {
      failures.push(`${relative(sourcePath)} re-exports a node/adapter/owner implementation from the root barrel`);
    }
  }
}

const newOwnerRoots = projects.map((project) => path.join(root, project.directory, "src"));
const forbiddenOwnerImports = [
  "@rawr/agent-config-sync",
  "@rawr/agent-config-sync-node",
  "@rawr/plugin-plugins",
];
for (const sourceRoot of newOwnerRoots) {
  for (const sourcePath of await walkTypeScript(sourceRoot)) {
    const source = await fs.readFile(sourcePath, "utf8");
    for (const forbidden of forbiddenOwnerImports) {
      if (source.includes(forbidden)) failures.push(`${relative(sourcePath)} preserves legacy owner ${forbidden}`);
    }
    if (source.includes("createAgentProviderApplications")) {
      failures.push(`${relative(sourcePath)} exposes the forbidden umbrella provider application`);
    }
  }
}

const buildEvidencePath = path.join(
  root,
  "services/agent-plugin-build/src/artifact-store/evidence-store.ts",
);
const buildEvidenceSource = await fs.readFile(buildEvidencePath, "utf8");
for (const forbidden of ["agent-provider-deployment", "agent-plugin-promotion"]) {
  if (buildEvidenceSource.includes(forbidden)) {
    failures.push(`opaque build evidence store imports ${forbidden} semantics`);
  }
}

const cliSourceRoot = path.join(root, "apps/cli/src");
for (const sourcePath of await walkTypeScript(cliSourceRoot)) {
  const source = await fs.readFile(sourcePath, "utf8");
  if (
    /@rawr\/(?:agent-plugin-build|agent-plugin-promotion|agent-provider-deployment)/u.test(source)
    && !relative(sourcePath).startsWith("apps/cli/src/lib/agent-plugins/composition/")
  ) {
    failures.push(`${relative(sourcePath)} imports a C3 stateful owner outside the inert CLI composition root`);
  }
}

const statusApplicationsRoot = path.join(root, "services/agent-provider-deployment/src/applications");
for (const sourcePath of await walkTypeScript(statusApplicationsRoot)) {
  if (!path.basename(sourcePath).toLowerCase().includes("status")) continue;
  const source = await fs.readFile(sourcePath, "utf8");
  for (const forbidden of [
    "MechanicalEvidencePublisher",
    "ProviderCapsuleWriter",
    "ProviderTargetMutator",
    "TargetIdentityWriter",
    "TargetReceiptWriter",
  ]) {
    if (source.includes(forbidden)) {
      failures.push(`${relative(sourcePath)} gives read-only status the ${forbidden} capability`);
    }
  }
}

const commandRoot = path.join(root, "apps/cli/src/commands/agent/plugins");
if (await pathExists(commandRoot)) {
  const commandFiles = (await walkTypeScript(commandRoot)).map(relative);
  const premature = commandFiles.filter((candidate) =>
    candidate !== "apps/cli/src/commands/agent/plugins/create.ts");
  if (premature.length > 0) {
    failures.push(`C3 activated lifecycle commands before C5: ${premature.join(", ")}`);
  }
}

const inventory = JSON.parse(await fs.readFile(
  path.join(root, "tools/architecture-inventory/agent-plugin-native-convergence.json"),
  "utf8",
));
for (const project of projects) {
  if (inventory.projects?.[project.name]?.config !== `${project.directory}/package.json`) {
    failures.push(`architecture inventory omits exact ${project.name} configuration`);
  }
}

if (failures.length > 0) {
  console.error("agent-plugin-native-convergence architecture gate failed:");
  for (const failure of [...new Set(failures)].sort()) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("agent-plugin-native-convergence architecture gate passed");

function moduleCategory(sourceRoot, sourcePath) {
  const offset = path.relative(sourceRoot, sourcePath);
  if (offset === "index.ts") return "index";
  return offset.split(path.sep)[0];
}

function relativeTargetCategory(sourceRoot, sourcePath, specifier) {
  const target = path.resolve(path.dirname(sourcePath), specifier);
  const offset = path.relative(sourceRoot, target);
  if (offset === "" || offset.startsWith(`..${path.sep}`) || path.isAbsolute(offset)) return undefined;
  const first = offset.split(path.sep)[0];
  return first === "index" || first === "index.ts" ? "index" : first.replace(/\.ts$/u, "");
}

function moduleSpecifiers(sourceFile) {
  const values = [];
  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier !== undefined
      && ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      values.push(statement.moduleSpecifier.text);
    }
  }
  return values;
}

async function walkTypeScript(directory) {
  if (!await pathExists(directory)) return [];
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkTypeScript(candidate));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(candidate);
  }
  return files.sort();
}

async function pathExists(candidate) {
  try {
    await fs.lstat(candidate);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

function relative(candidate) {
  return path.relative(root, candidate).split(path.sep).join("/");
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

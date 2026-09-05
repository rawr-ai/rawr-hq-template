import { join } from "node:path";

import {
  addProjectConfiguration,
  type GeneratorCallback,
  generateFiles,
  getProjects,
  installPackagesTask,
  names,
  OverwriteStrategy,
  readJson,
  type Tree,
} from "@nx/devkit";
import {
  buildPackageJsonPatterns,
  buildPackageJsonWorkspacesMatcher,
} from "nx/src/plugins/package-json";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import { assertHabitatBunConsumer } from "../nx/repository-preset.js";
import { cliPackageRoot, installedSdkVersion } from "../product-version.js";

const PACKAGE_NAME_PATTERN = "^(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$";
const KEBAB_NAME_PATTERN = "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$";
const STRICT_IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Exact non-SDK dependency pins emitted into every constructed service package. */
export const SERVICE_GENERATOR_DEPENDENCY_VERSIONS = {
  "@orpc/contract": "2.0.0-beta.32",
  "@orpc/server": "2.0.0-beta.32",
  typebox: "1.3.8",
} as const;

const RESERVED_IDENTIFIERS = new Set([
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);
const ORPC_IMPLEMENTER_MEMBERS = new Set(["lazy", "middleware", "router", "use"]);
const SERVICE_CONTEXT_LANES = new Set(["config", "deps", "invocation", "provided", "scope"]);

const ServiceGeneratorOptionsSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 214, pattern: PACKAGE_NAME_PATTERN }),
    directory: Type.String({ minLength: 1 }),
    module: Type.String({ pattern: KEBAB_NAME_PATTERN }),
    operation: Type.String({ pattern: KEBAB_NAME_PATTERN }),
  },
  { additionalProperties: false }
);
const optionsValidator = new Validator({}, ServiceGeneratorOptionsSchema);

/** Options for constructing one closed Habitat service package. */
export interface ServiceGeneratorOptions {
  readonly name: string;
  readonly directory: string;
  readonly module: string;
  readonly operation: string;
}

/** Constructs a private service package through Nx and schedules Bun dependency installation. */
export default async function createService(
  tree: Tree,
  options: ServiceGeneratorOptions
): Promise<GeneratorCallback> {
  assertOptions(options);
  assertPortableDirectory(options.directory);
  assertHabitatBunConsumer(tree);
  assertWorkspaceDestination(tree, options.directory);

  const moduleNames = names(options.module);
  const operationNames = names(options.operation);
  assertStrictIdentifier("module", moduleNames.propertyName);
  assertStrictIdentifier("operation", operationNames.propertyName);
  assertAvailableModuleName(moduleNames.propertyName);

  const stagedProjects = getProjects(tree);
  if (stagedProjects.has(options.name)) {
    throw new Error(
      `Cannot generate service '${options.name}': an Nx project already uses that name.`
    );
  }
  const stagedRootCollision = [...stagedProjects.entries()].find(
    ([, project]) => project.root === options.directory
  );
  if (stagedRootCollision !== undefined) {
    throw new Error(
      `Cannot generate service '${options.name}': destination '${options.directory}' is already owned by staged Nx project '${stagedRootCollision[0]}'.`
    );
  }
  if (tree.exists(options.directory) || tree.children(options.directory).length > 0) {
    throw new Error(
      `Cannot generate service '${options.name}': destination '${options.directory}' is occupied.`
    );
  }

  const tsconfigBasePath = `${"../".repeat(options.directory.split("/").length)}tsconfig.base.json`;
  const templateRoot = join(cliPackageRoot(), "generators/service/files");
  const dependenciesJson = indentJson(
    {
      "@habitat-ai/sdk": installedSdkVersion(),
      ...SERVICE_GENERATOR_DEPENDENCY_VERSIONS,
    },
    2
  );

  generateFiles(
    tree,
    templateRoot,
    options.directory,
    {
      directory: options.directory,
      directoryLiteral: JSON.stringify(options.directory),
      dependenciesJson,
      moduleFileName: moduleNames.fileName,
      moduleName: moduleNames.propertyName,
      moduleLocalName: moduleNames.propertyName,
      name: options.name,
      nameLiteral: JSON.stringify(options.name),
      operationFileName: operationNames.fileName,
      operationName: operationNames.propertyName,
      tsconfigBasePath,
    },
    { overwriteStrategy: OverwriteStrategy.ThrowIfExisting }
  );

  addProjectConfiguration(tree, options.name, {
    root: options.directory,
    tags: ["type:service", "role:servicepackage"],
    targets: {
      check: {
        executor: "nx:noop",
      },
    },
  });

  return () => installPackagesTask(tree, true, "", "bun");
}

function assertOptions(options: ServiceGeneratorOptions): void {
  if (!optionsValidator.Check(options)) {
    throw new Error(
      "Service generator options require a valid package name, workspace-relative directory, and kebab-case module and operation."
    );
  }
}

function assertPortableDirectory(directory: string): void {
  const segments = directory.split("/");
  if (
    directory.startsWith("/") ||
    /^[A-Za-z]:/.test(directory) ||
    directory.includes("\\") ||
    directory.trim() !== directory ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(
      `Cannot generate service in '${directory}': directory must be a normalized workspace-relative path without traversal.`
    );
  }
}

function assertWorkspaceDestination(tree: Tree, directory: string): void {
  const patterns = buildPackageJsonPatterns(tree.root, (path) => readJson(tree, path));
  const isWorkspacePackage = buildPackageJsonWorkspacesMatcher(patterns);
  if (!isWorkspacePackage(`${directory}/package.json`)) {
    throw new Error(
      `Cannot generate service in '${directory}': destination must match a Bun workspace declared in package.json.`
    );
  }
}

function assertStrictIdentifier(kind: "module" | "operation", identifier: string): void {
  if (
    !STRICT_IDENTIFIER_PATTERN.test(identifier) ||
    RESERVED_IDENTIFIERS.has(identifier) ||
    ORPC_IMPLEMENTER_MEMBERS.has(identifier)
  ) {
    throw new Error(
      `Cannot generate service: ${kind} '${identifier}' collides with JavaScript or oRPC implementer syntax.`
    );
  }
}

function assertAvailableModuleName(identifier: string): void {
  if (SERVICE_CONTEXT_LANES.has(identifier)) {
    throw new Error(
      `Cannot generate service: module '${identifier}' is reserved for the service context.`
    );
  }
}

function indentJson(value: unknown, spaces: number): string {
  return JSON.stringify(value, null, 2).replaceAll("\n", `\n${" ".repeat(spaces)}`);
}

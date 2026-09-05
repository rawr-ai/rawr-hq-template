import { getProjects, names, readJson, type Tree } from "@nx/devkit";
import { parse as parseToml } from "smol-toml";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import ts from "typescript";
import { stageVerifiedWrites } from "./verified-writes.js";

const optionsValidator = new Validator(
  {},
  Type.Object(
    {
      topic: Type.String({ pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" }),
      name: Type.String({ pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" }),
    },
    { additionalProperties: false }
  )
);

export interface CliCommandGeneratorOptions {
  readonly topic: string;
  readonly name: string;
}

/** Adds one command to an existing Habitat topic without selecting or activating it. */
export default function createCliCommand(tree: Tree, options: CliCommandGeneratorOptions) {
  if (!optionsValidator.Check(options))
    throw new Error("Command options require safe topic and name identifiers.");
  const rootPackage = readJson(tree, "package.json");
  if (rootPackage.name !== "habitat-workspace" || rootPackage.private !== true) {
    throw new Error("Official commands require the Habitat repository.");
  }
  const root = `plugins/cli/topics/${options.topic}`;
  const projectName = `@habitat-ai/plugin-${options.topic}`;
  const projects = getProjects(tree);
  const appSelection = parseToml(requiredText(tree, "apps/habitat/habitat.toml"));
  if (
    projects.get("@habitat-ai/cli")?.root !== "apps/habitat" ||
    appSelection.ownerProject !== "@habitat-ai/cli" ||
    appSelection.blueprint !== "app" ||
    appSelection.blueprintVersion !== 2 ||
    (appSelection.roots as { project?: unknown } | undefined)?.project !== "apps/habitat"
  ) {
    throw new Error("Official commands require the admitted Habitat CLI app owner.");
  }
  const owners = [...projects].filter(([, project]) => project.root === root);
  const project = projects.get(projectName);
  if (owners.length !== 1 || owners[0][0] !== projectName || project?.root !== root) {
    throw new Error("Command destination requires the exact existing Habitat topic Nx owner.");
  }
  const manifest = readJson(tree, `${root}/package.json`);
  const projectFile = readJson(tree, `${root}/project.json`);
  const selection = parseToml(requiredText(tree, `${root}/habitat.toml`));
  if (
    manifest.name !== projectName ||
    projectFile.name !== projectName ||
    selection.ownerProject !== projectName ||
    selection.blueprint !== "plugin-cli-topic" ||
    selection.blueprintVersion !== 1 ||
    (selection.roots as { project?: unknown } | undefined)?.project !== root
  ) {
    throw new Error("Topic package, project, and Habitat selection must agree.");
  }
  const indexPath = `${root}/src/index.ts`;
  const before = requiredText(tree, indexPath);
  const symbol = `${names(options.name).propertyName}Command`;
  const id = `${options.topic}:${options.name}`;
  const sourcePath = `src/commands/${options.name}.ts`;
  const updated = registerCommand(before, symbol, `./commands/${options.name}.js`);
  for (const file of commandFiles(tree, `${root}/src/commands`)) {
    if (file === `${root}/${sourcePath}`) continue;
    const source = parseSource(file, requiredText(tree, file));
    if (declaresCommandId(source, id)) throw new Error(`Command ID '${id}' already exists.`);
  }
  const packageBefore = requiredText(tree, `${root}/package.json`);
  const packageAfter = packageWithTestContract(packageBefore);
  const testRunner = usesVitest(JSON.parse(packageBefore)) ? "vitest" : "bun:test";
  stageVerifiedWrites(tree, { root }, [
    { path: sourcePath, contents: commandSource(symbol, id) },
    {
      path: `test/commands/${options.name}.test.ts`,
      contents: commandTest(symbol, options.name, id, testRunner),
    },
    { path: "src/index.ts", contents: updated, before },
    { path: "package.json", contents: packageAfter, before: packageBefore },
  ]);
}

function usesVitest(manifest: Record<string, any>): boolean {
  return (
    manifest.devDependencies?.vitest !== undefined || manifest.dependencies?.vitest !== undefined
  );
}

function packageWithTestContract(contents: string): string {
  const manifest = JSON.parse(contents);
  for (const field of ["scripts", "dependencies", "devDependencies"]) {
    if (
      manifest[field] !== undefined &&
      (typeof manifest[field] !== "object" ||
        manifest[field] === null ||
        Array.isArray(manifest[field]))
    ) {
      throw new Error(`Topic package ${field} must be an object.`);
    }
  }
  const command = usesVitest(manifest) ? "vitest run test/commands" : "bun test test/commands";
  if (
    manifest.scripts?.["test:cli-commands"] !== undefined &&
    manifest.scripts["test:cli-commands"] !== command
  ) {
    throw new Error("The dedicated CLI command test script is already owned by another workflow.");
  }
  manifest.scripts = { ...manifest.scripts, "test:cli-commands": command };
  manifest.devDependencies = { ...manifest.devDependencies };
  for (const [name, version] of Object.entries({
    effect: "4.0.0-beta.101",
    "bun-types": "1.3.14",
  })) {
    const existing = manifest.dependencies?.[name] ?? manifest.devDependencies[name];
    if (existing === undefined) manifest.devDependencies[name] = version;
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function requiredText(tree: Tree, path: string): string {
  const value = tree.read(path, "utf8");
  if (value === null) throw new Error(`Required topic file is missing: ${path}`);
  return value;
}

function parseSource(path: string, contents: string): ts.SourceFile {
  const source = ts.createSourceFile(
    path,
    contents,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (
    (source as ts.SourceFile & { parseDiagnostics?: readonly unknown[] }).parseDiagnostics?.length
  ) {
    throw new Error(`Cannot update malformed TypeScript: ${path}`);
  }
  return source;
}

function registerCommand(contents: string, symbol: string, modulePath: string): string {
  const source = parseSource("index.ts", contents);
  const imports = source.statements.filter(ts.isImportDeclaration);
  const factoryImports = imports
    .filter(
      (node) =>
        !node.importClause?.isTypeOnly &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === "@habitat-ai/sdk/plugins/cli"
    )
    .flatMap((node) => {
      const bindings = node.importClause?.namedBindings;
      return bindings && ts.isNamedImports(bindings)
        ? bindings.elements.filter(
            (element) =>
              !element.isTypeOnly &&
              (element.propertyName ?? element.name).text === "defineCliTopicPlugin"
          )
        : [];
    });
  if (factoryImports.length !== 1)
    throw new Error("Topic requires one explicit SDK topic factory import.");
  const factoryName = factoryImports[0].name.text;
  const arrays: ts.ArrayLiteralExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isCallExpression(node.expression)) {
      const factory = node.expression.expression;
      if (
        ts.isPropertyAccessExpression(factory) &&
        ts.isIdentifier(factory.expression) &&
        factory.expression.text === factoryName &&
        factory.name.text === "factory"
      ) {
        const declaration = node.parent;
        const statement = declaration.parent?.parent;
        if (
          !ts.isVariableDeclaration(declaration) ||
          !ts.isIdentifier(declaration.name) ||
          declaration.name.text !== "createPlugin" ||
          !statement ||
          !ts.isVariableStatement(statement) ||
          !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          throw new Error(
            "Topic factory must directly initialize the exported createPlugin declaration."
          );
        }
        if (node.arguments.length !== 1 || !ts.isObjectLiteralExpression(node.arguments[0])) {
          throw new Error("Topic factory requires one explicit membership object.");
        }
        const properties = node.arguments[0].properties;
        const commands = properties.filter(
          (property) => literalPropertyName(property.name) === "commands"
        );
        if (
          commands.length !== 1 ||
          !ts.isPropertyAssignment(commands[0]) ||
          !ts.isArrayLiteralExpression(commands[0].initializer)
        ) {
          throw new Error("Topic commands must be one explicit array.");
        }
        if (
          properties
            .slice(properties.indexOf(commands[0]) + 1)
            .some(
              (property) =>
                ts.isSpreadAssignment(property) ||
                (property.name &&
                  ts.isComputedPropertyName(property.name) &&
                  literalPropertyName(property.name) === undefined)
            )
        ) {
          throw new Error("Later topic properties must not overwrite command membership.");
        }
        arrays.push(commands[0].initializer);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (arrays.length !== 1 || arrays[0].elements.some((element) => !ts.isIdentifier(element))) {
    throw new Error("Topic membership must have one unambiguous identifier-only array.");
  }
  const array = arrays[0];
  const entries = array.elements.map((element) => element.getText(source));
  if (new Set(entries).size !== entries.length)
    throw new Error("Topic membership contains duplicates.");
  const matching = imports.filter(
    (node) => ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === modulePath
  );
  const bindings = topLevelBindings(source).get(symbol) ?? [];
  if (matching.length > 0 || entries.includes(symbol)) {
    const binding = matching[0]?.importClause?.namedBindings;
    if (
      matching.length !== 1 ||
      !binding ||
      !ts.isNamedImports(binding) ||
      matching[0].importClause?.isTypeOnly ||
      binding.elements.length !== 1 ||
      binding.elements[0].isTypeOnly ||
      binding.elements[0].name.text !== symbol ||
      binding.elements[0].propertyName !== undefined ||
      matching[0].importClause?.name !== undefined ||
      !entries.includes(symbol)
    ) {
      throw new Error("Existing command import and registration disagree.");
    }
    if (bindings.length !== 1 || bindings[0] !== binding.elements[0].name) {
      throw new Error("Command name collides with an existing topic declaration.");
    }
    return contents;
  }
  if (bindings.length > 0)
    throw new Error("Command name collides with an existing topic declaration.");
  const insertion = array.elements.end;
  const addition =
    entries.length === 0 ? symbol : `${array.elements.hasTrailingComma ? "" : ","} ${symbol}`;
  const withMembership = contents.slice(0, insertion) + addition + contents.slice(insertion);
  return `import { ${symbol} } from "${modulePath}";\n${withMembership}`;
}

function literalPropertyName(name: ts.PropertyName | undefined): string | undefined {
  if (name === undefined) return undefined;
  if (ts.isComputedPropertyName(name)) {
    return ts.isStringLiteral(name.expression) ||
      ts.isNoSubstitutionTemplateLiteral(name.expression) ||
      ts.isNumericLiteral(name.expression)
      ? name.expression.text
      : undefined;
  }
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : undefined;
}

function topLevelBindings(source: ts.SourceFile): Map<string, ts.Identifier[]> {
  const bindings = new Map<string, ts.Identifier[]>();
  const add = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) {
      const declarations = bindings.get(name.text) ?? [];
      declarations.push(name);
      bindings.set(name.text, declarations);
    } else {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) add(element.name);
      }
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.name) add(node.importClause.name);
      const named = node.importClause?.namedBindings;
      if (named) {
        if (ts.isNamespaceImport(named)) add(named.name);
        else for (const element of named.elements) add(element.name);
      }
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      add(node.name);
      return;
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node)
    ) {
      if (node.parent === source && node.name && ts.isIdentifier(node.name)) add(node.name);
      return;
    }
    if (ts.isFunctionLike(node) || ts.isClassExpression(node)) return;
    if (ts.isVariableDeclarationList(node)) {
      // Module-level var declarations also bind through blocks and loop headers.
      if (
        (ts.isVariableStatement(node.parent) && node.parent.parent === source) ||
        !(node.flags & ts.NodeFlags.BlockScoped)
      ) {
        for (const declaration of node.declarations) add(declaration.name);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return bindings;
}

function declaresCommandId(source: ts.SourceFile, id: string): boolean {
  const factories = new Set<string>();
  const namespaces = new Map<string, string>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.isTypeOnly ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const factory =
      statement.moduleSpecifier.text === "@habitat-ai/sdk/plugins/cli/oclif"
        ? "createOclifCommand"
        : statement.moduleSpecifier.text === "@habitat-ai/sdk/plugins/cli/effect"
          ? "defineCommand"
          : undefined;
    const binding = statement.importClause?.namedBindings;
    if (factory === undefined || binding === undefined) continue;
    if (ts.isNamespaceImport(binding)) namespaces.set(binding.name.text, factory);
    else {
      for (const element of binding.elements) {
        if (!element.isTypeOnly && (element.propertyName ?? element.name).text === factory)
          factories.add(element.name.text);
      }
    }
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const call = declaration.initializer;
      if (call === undefined || !ts.isCallExpression(call)) continue;
      const callee = call.expression;
      if (
        !(ts.isIdentifier(callee) && factories.has(callee.text)) &&
        !(
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          namespaces.get(callee.expression.text) === callee.name.text
        )
      )
        continue;
      const metadata = call.arguments[0];
      if (metadata === undefined || !ts.isObjectLiteralExpression(metadata)) {
        throw new Error(`Cannot qualify an existing command ID in ${source.fileName}.`);
      }
      let declaredId: string | undefined;
      for (const property of metadata.properties) {
        const name = literalPropertyName(property.name);
        if (ts.isSpreadAssignment(property) || name === undefined) declaredId = undefined;
        else if (name === "id") {
          declaredId =
            ts.isPropertyAssignment(property) &&
            (ts.isStringLiteral(property.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(property.initializer))
              ? property.initializer.text
              : undefined;
        }
      }
      if (declaredId === undefined) {
        throw new Error(`Cannot qualify an existing command ID in ${source.fileName}.`);
      }
      if (declaredId === id) return true;
    }
  }
  return false;
}

function commandFiles(tree: Tree, root: string): string[] {
  return tree.children(root).flatMap((name) => {
    const path = `${root}/${name}`;
    return tree.isFile(path) ? (path.endsWith(".ts") ? [path] : []) : commandFiles(tree, path);
  });
}

function commandSource(symbol: string, id: string): string {
  return `import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Effect } from "@habitat-ai/sdk/effect";
import { Args, Flags } from "@oclif/core";

const args = { message: Args.string({ required: true }) };
const flags = { uppercase: Flags.boolean({ default: false }) };

/** Echoes one parsed message without acquiring or retaining capabilities. */
export const ${symbol} = createOclifCommand({
  id: "${id}",
  description: "Echo a message",
  args,
  flags,
  effect(context: OclifCommandContext<typeof args, typeof flags>) {
    return Effect.succeed({ message: context.flags.uppercase ? context.args.message.toUpperCase() : context.args.message });
  },
  present(result, command) { command.log(result.message); },
});
`;
}

function commandTest(symbol: string, name: string, id: string, testRunner: string): string {
  return `import assert from "node:assert/strict";
import { test } from "${testRunner}";
import { Effect } from "effect";
import { ${symbol} } from "../../src/commands/${name}.js";

test("${id} preserves input and applies uppercase only when selected", async () => {
  for (const uppercase of [false, true]) {
    const program = ${symbol}.effect({
      input: { args: { message: "Hello" }, flags: { uppercase, json: false } },
      clients: {},
      resources: { has: () => false, get: () => { throw new Error("No resource is declared"); } },
      telemetry: { span: (_name, effect) => effect, event: () => Effect.void },
      execution: { appId: "test", processId: "test", entrypointId: "test", profileId: "test", role: "cli", ownerId: "test", executionId: "test", traceId: "test" },
    });
    if (!Effect.isEffect(program)) throw new Error("The authored echo returns a native Effect value");
    const result = await Effect.runPromise(program);
    assert.deepEqual(result, { message: uppercase ? "HELLO" : "Hello" });
  }
});
`;
}

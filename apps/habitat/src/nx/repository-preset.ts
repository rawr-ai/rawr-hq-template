import { isDeepStrictEqual } from "node:util";

import {
  getProjects,
  type NxJsonConfiguration,
  type PluginConfiguration,
  readJson,
  readNxJson,
  type Tree,
  updateNxJson,
  writeJson,
} from "@nx/devkit";
import { type Static, Type } from "typebox";
import { Validator } from "typebox/schema";

import { type HabitatConsumerBinding, planHabitatNxRegistration } from "./initialization.js";

const PACKAGE_PATH = "package.json";
const HABITAT_PROJECT_PATH = "scripts/habitat/project.json";
const TYPESCRIPT_CONFIG_PATH = "tsconfig.base.json";
const ALTERNATE_PACKAGE_MANAGER_PATHS = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "yarn.lock",
] as const;
const BUN_VERSION = "1.3.14";
const BIOME_VERSION = "2.5.3";
const ESLINT_VERSION = "10.0.3";
const NX_VERSION = "23.1.1";
const TYPESCRIPT_ESLINT_PARSER_VERSION = "8.66.0";

const RootPackageSchema = Type.Object(
  {
    private: Type.Optional(
      Type.Boolean({ description: "Whether the repository root is excluded from publication." })
    ),
    type: Type.Optional(
      Type.String({ description: "Module system selected by the repository root." })
    ),
    packageManager: Type.Optional(
      Type.String({ description: "Package manager and version selected by the repository root." })
    ),
    workspaces: Type.Optional(
      Type.Array(Type.String(), { description: "Bun workspace roots owned by the repository." })
    ),
    scripts: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Root command faces delegated to the Nx scheduler.",
      })
    ),
    devDependencies: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Development tools installed at the repository root.",
      })
    ),
    dependencies: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Runtime dependencies installed at the repository root.",
      })
    ),
    optionalDependencies: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Optional dependencies installed at the repository root.",
      })
    ),
    peerDependencies: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Peer dependencies declared by the repository root.",
      })
    ),
    overrides: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), {
        description: "Root dependency versions overridden during Bun resolution.",
      })
    ),
    resolutions: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), {
        description: "Root dependency versions selected during Bun resolution.",
      })
    ),
    patchedDependencies: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: "Dependency patches applied by Bun during installation.",
      })
    ),
    nx: Type.Optional(
      Type.Object(
        {
          includedScripts: Type.Optional(
            Type.Array(Type.String(), {
              description: "Root scripts intentionally projected into the Nx project graph.",
            })
          ),
        },
        { additionalProperties: true, description: "Nx root package projection controls." }
      )
    ),
  },
  { additionalProperties: true, description: "Bun Nx repository package metadata." }
);

type RootPackage = Static<typeof RootPackageSchema>;

const TypeScriptConfigSchema = Type.Object(
  {
    compilerOptions: Type.Optional(
      Type.Object(
        {
          types: Type.Optional(
            Type.Array(Type.String(), {
              description: "Ambient type packages loaded by the repository compiler.",
            })
          ),
        },
        {
          additionalProperties: true,
          description: "Compiler foundation and consumer-specific TypeScript options.",
        }
      )
    ),
  },
  { additionalProperties: true }
);

type TypeScriptConfig = Static<typeof TypeScriptConfigSchema>;
type TypeScriptCompilerOptions = Readonly<Record<string, unknown> & { types?: readonly string[] }>;

const HabitatProjectSchema = Type.Object(
  {
    name: Type.Literal("habitat", {
      description: "Canonical Nx identity for repository-wide Habitat policy tasks.",
    }),
    root: Type.Literal("scripts/habitat", {
      description: "Canonical owner root for repository-wide Habitat policy tasks.",
    }),
    tags: Type.Tuple([Type.Literal("type:tool"), Type.Literal("role:architecture-policy")], {
      description: "Canonical Nx classification for the Habitat policy owner.",
    }),
    targets: Type.Record(Type.String(), Type.Unknown(), {
      description: "Nx tasks owned by the repository-wide Habitat policy project.",
    }),
  },
  { additionalProperties: true }
);

/** Nx options consumed by the portable Habitat repository preset. */
export type HabitatRepositoryPresetOptions = Readonly<{
  packageManager: string;
}>;

/** Reports whether dependency installation must follow repository generation. */
export type HabitatRepositoryPresetResult = Readonly<{
  packageChanged: boolean;
}>;

const packageValidator = new Validator({}, RootPackageSchema);
const habitatProjectValidator = new Validator({}, HabitatProjectSchema);
const typescriptConfigValidator = new Validator({}, TypeScriptConfigSchema);

const standardWorkspaces = [
  "apps/*",
  "services/*",
  "packages/*",
  "resources/*",
  "plugins/cli/topics/*",
  "plugins/web/*",
  "plugins/server/api/*",
  "plugins/async/workflows/*",
  "plugins/async/schedules/*",
] as const;

const standardScripts = {
  build: "nx run-many -t build",
  check: "nx run-many -t check",
  ci: "nx run-many -t build,check,test",
  "ci:affected": "nx affected -t build,check,test",
  format: "nx run habitat:format",
  lint: "nx run habitat:lint",
  test: "nx run-many -t test",
  typecheck: "nx run-many -t typecheck",
} as const;

const standardDevDependencies = {
  "@biomejs/biome": BIOME_VERSION,
  "@nx/eslint": NX_VERSION,
  "@nx/eslint-plugin": NX_VERSION,
  "@typescript-eslint/parser": TYPESCRIPT_ESLINT_PARSER_VERSION,
  "@types/node": "24.13.3",
  "bun-types": BUN_VERSION,
  eslint: ESLINT_VERSION,
  nx: NX_VERSION,
  typescript: "5.9.3",
} as const;

const standardNamedInputs: NonNullable<NxJsonConfiguration["namedInputs"]> = {
  default: ["{projectRoot}/**/*", "!{projectRoot}/dist/**", "!{projectRoot}/coverage/**"],
  production: [
    "default",
    "!{projectRoot}/test/**",
    "!{projectRoot}/**/*.test.*",
    "!{projectRoot}/**/*.spec.*",
  ],
  bunToolchain: ["{workspaceRoot}/package.json", "{workspaceRoot}/bun.lock"],
  typescriptRuntime: ["{workspaceRoot}/tsconfig.base.json", "{workspaceRoot}/bun.lock"],
};

const nativeNxPresetNamedInputs: Readonly<Record<string, unknown>> = {
  default: ["{projectRoot}/**/*", "sharedGlobals"],
  production: ["default"],
};

const nxEslintPlugin = {
  plugin: "@nx/eslint/plugin",
  options: { targetName: "check:boundaries" },
} as const satisfies PluginConfiguration;

const standardTargetDefaults: NonNullable<NxJsonConfiguration["targetDefaults"]> = {
  build: {
    cache: true,
    dependsOn: ["^build"],
    inputs: ["production", "^production", "typescriptRuntime"],
    outputs: ["{projectRoot}/dist"],
  },
  check: {
    cache: false,
    dependsOn: [
      { projects: ["habitat"], target: "lint" },
      "check:boundaries",
      "typecheck",
      "verify",
      "check:policy",
      "^check",
    ],
    outputs: [],
  },
  test: {
    cache: true,
    dependsOn: ["^build"],
    inputs: ["default", "^default", "typescriptRuntime"],
    outputs: [],
  },
  typecheck: {
    cache: true,
    dependsOn: ["^build"],
    inputs: ["default", "^default", "typescriptRuntime"],
    outputs: [],
  },
  verify: {
    cache: false,
    dependsOn: ["build", "^build"],
    outputs: [],
  },
};

const bunfig = `env = false

[install]
linker = "isolated"
# Registry versions remain registry consumers; source relationships opt in with workspace:*.
linkWorkspacePackages = false
`;

const eslintConfig = `import nxPlugin from "@nx/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  ...nxPlugin.configs["flat/base"],
  {
    files: ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.nx/**",
      "**/.habitat/cache/**",
      "**/.tmp/**",
    ],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: [],
          enforceBuildableLibDependency: false,
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
];
`;

const standardTypeScriptCompilerOptions = {
  target: "ES2022",
  module: "ESNext",
  moduleResolution: "Bundler",
  lib: ["ES2022"],
  strict: true,
  skipLibCheck: true,
  types: ["bun-types", "node"],
} as const;

/**
 * Admits package-owned initialization only for the canonical Bun consumer shape.
 * The check runs before the generator plans package, Nx, hook, or policy changes.
 */
export function assertHabitatBunConsumer(tree: Tree): void {
  assertBunRepositoryArtifacts(tree);
  const packageJson = readRootPackage(tree);
  const requiredManager = `bun@${BUN_VERSION}`;
  if (packageJson.packageManager !== requiredManager) {
    throw new Error(
      `Habitat initialization requires packageManager '${requiredManager}'; received '${packageJson.packageManager}'.`
    );
  }
  const nxPackageManager = requireNxJson(tree).cli?.packageManager;
  if (nxPackageManager !== undefined && nxPackageManager !== "bun") {
    throw new Error(
      `Habitat initialization requires Nx package manager 'bun'; received '${nxPackageManager}'.`
    );
  }
}

const biomeConfig = jsonDocument({
  $schema: `https://biomejs.dev/schemas/${BIOME_VERSION}/schema.json`,
  vcs: {
    enabled: true,
    clientKind: "git",
    useIgnoreFile: true,
  },
  files: {
    ignoreUnknown: true,
    includes: [
      "**",
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/coverage/**",
      "!.nx/**",
      "!.habitat/cache/**",
      "!**/.tmp/**",
    ],
  },
  formatter: {
    enabled: true,
    useEditorconfig: true,
    formatWithErrors: false,
    indentStyle: "space",
    indentWidth: 2,
    lineWidth: 100,
    lineEnding: "lf",
  },
  linter: {
    enabled: true,
    rules: {
      preset: "none",
      correctness: {
        noConstAssign: "error",
        noSelfAssign: "error",
        noUnreachable: "error",
        noUnreachableSuper: "error",
        noUnsafeFinally: "error",
        noUnsafeOptionalChaining: "error",
        useIsNan: "error",
        useValidTypeof: "error",
      },
      suspicious: {
        noDebugger: "error",
        noDuplicateCase: "error",
        noDuplicateClassMembers: "error",
        noDuplicateJsxProps: "error",
        noDuplicateObjectKeys: "error",
        noDuplicateParameters: "error",
        noFallthroughSwitchClause: "error",
        noGlobalIsFinite: "error",
        noGlobalIsNan: "error",
        noSparseArray: "error",
        noWith: "error",
        useGetterReturn: "error",
      },
    },
  },
  javascript: {
    formatter: {
      quoteStyle: "double",
      semicolons: "always",
      trailingCommas: "es5",
    },
  },
  assist: {
    enabled: true,
    actions: {
      source: {
        organizeImports: "on",
      },
    },
  },
});

const habitatProjectDocument = {
  $schema: "../../node_modules/nx/schemas/project-schema.json",
  name: "habitat",
  root: "scripts/habitat",
  tags: ["type:tool", "role:architecture-policy"],
  targets: {
    lint: {
      executor: "nx:run-commands",
      cache: true,
      inputs: [
        "{workspaceRoot}/**/*.{js,mjs,jsx,cjs,ts,mts,cts,tsx,json,jsonld,webapp,webmanifest,jsonc,code-snippets,code-workspace,sublime-build,sublime-commands,sublime-completions,sublime-keymap,sublime-macro,sublime-menu,sublime-mousemap,sublime-project,sublime-settings,sublime-theme,sublime-workspace,sublime_metrics,sublime_session,css,graphqls,graphql,gql,html,svg,astro,vue,svelte,grit}",
        "{workspaceRoot}/**/{.all-contributorsrc,.arcconfig,.auto-changelog,.bowerrc,.c8rc,.htmlhintrc,.imgbotconfig,.jslintrc,.nycrc,.tern-config,.tern-project,.vuerc,.watchmanconfig,.ember-cli,.jscsrc,.jshintrc,.babelrc,.hintrc,.swcrc,mcmod.info}",
        "{workspaceRoot}/.editorconfig",
        "{workspaceRoot}/.gitignore",
        "{workspaceRoot}/biome.json",
        "bunToolchain",
      ],
      outputs: [],
      options: {
        command: "biome lint --diagnostic-level=error .",
      },
    },
    format: {
      executor: "nx:run-commands",
      cache: false,
      options: {
        command: "biome format --write .",
      },
    },
    check: {
      executor: "nx:noop",
      cache: false,
      outputs: [],
    },
  },
} as const;

const habitatProject = jsonDocument(habitatProjectDocument);

type TextFilePlan = Readonly<{
  contents: string;
  path: string;
}>;

/**
 * Converges one repository on Habitat's portable Bun/Nx configuration.
 *
 * Product inventory, policy selections, documentation routers, aliases, release
 * policy, and hosted CI remain consumer-owned and are never generated here.
 */
export function initializeHabitatBunRepository(
  tree: Tree,
  binding: HabitatConsumerBinding,
  options: HabitatRepositoryPresetOptions
): HabitatRepositoryPresetResult {
  assertBunManager(options.packageManager);
  assertBunRepositoryArtifacts(tree);
  const packageJson = readRootPackage(tree);
  assertBunPackage(packageJson);
  assertCanonicalTextFoundation(tree);
  assertHabitatProjectAuthority(tree);
  const typescriptConfig = readTypeScriptConfig(tree);
  const nxJson = requireNxJson(tree);
  const nxRegistration = planHabitatNxRegistration(nxJson, binding);
  const nextPackage = planRootPackage(packageJson);
  const nextNx = planNxJson(nxRegistration.value);
  const nextTypeScriptConfig = planTypeScriptConfig(typescriptConfig);
  const files = plannedTextFiles(tree);

  if (!isDeepStrictEqual(packageJson, nextPackage)) writeJson(tree, PACKAGE_PATH, nextPackage);
  if (!isDeepStrictEqual(nxJson, nextNx)) updateNxJson(tree, nextNx);
  if (!isDeepStrictEqual(typescriptConfig, nextTypeScriptConfig)) {
    writeJson(tree, TYPESCRIPT_CONFIG_PATH, nextTypeScriptConfig);
  }
  for (const file of files) tree.write(file.path, file.contents);

  return { packageChanged: !isDeepStrictEqual(packageJson, nextPackage) };
}

function readRootPackage(tree: Tree): RootPackage {
  if (!tree.exists(PACKAGE_PATH)) {
    throw new Error("Habitat repository generation requires package.json.");
  }
  const input: unknown = readJson<Record<string, unknown>>(tree, PACKAGE_PATH);
  if (!packageValidator.Check(input)) {
    throw new Error("package.json is not a supported Bun Nx repository document.");
  }
  return input;
}

function requireNxJson(tree: Tree): NxJsonConfiguration {
  const nxJson = readNxJson(tree);
  if (nxJson === null) {
    throw new Error("Habitat repository generation requires nx.json.");
  }
  return nxJson;
}

function readTypeScriptConfig(tree: Tree): TypeScriptConfig | undefined {
  if (!tree.exists(TYPESCRIPT_CONFIG_PATH) || isEmptyTextFile(tree, TYPESCRIPT_CONFIG_PATH)) {
    return undefined;
  }
  const input: unknown = readJson<Record<string, unknown>>(tree, TYPESCRIPT_CONFIG_PATH);
  if (!typescriptConfigValidator.Check(input)) {
    throw new Error(`${TYPESCRIPT_CONFIG_PATH} is not a supported TypeScript configuration.`);
  }
  return input;
}

function assertBunManager(packageManager: string | undefined): void {
  if (packageManager !== "bun") {
    throw new Error(`Habitat repository preset requires Bun; received '${packageManager}'.`);
  }
}

function assertBunRepositoryArtifacts(tree: Tree): void {
  const alternate = ALTERNATE_PACKAGE_MANAGER_PATHS.find((path) => tree.exists(path));
  if (alternate !== undefined) {
    throw new Error(
      `Habitat repository preset refuses alternate package-manager artifact '${alternate}'.`
    );
  }
}

function assertCanonicalTextFoundation(tree: Tree): void {
  for (const [path, canonical] of [
    ["biome.json", biomeConfig],
    ["bunfig.toml", bunfig],
  ] as const) {
    if (!tree.exists(path) || isEmptyTextFile(tree, path)) continue;
    if (tree.read(path, "utf8") !== canonical) {
      throw new Error(`Habitat repository preset found incompatible foundation file '${path}'.`);
    }
  }
}

function assertBunPackage(packageJson: RootPackage): void {
  const requiredManager = `bun@${BUN_VERSION}`;
  if (packageJson.packageManager !== undefined && packageJson.packageManager !== requiredManager) {
    throw new Error(
      `Habitat repository preset requires packageManager '${requiredManager}'; received '${packageJson.packageManager}'.`
    );
  }
  if (packageJson.private === false) {
    throw new Error("Habitat repository preset requires a private workspace root.");
  }
  if (packageJson.type !== undefined && packageJson.type !== "module") {
    throw new Error("Habitat repository preset requires an ESM workspace root.");
  }
  const conflictingScript = packageJson.nx?.includedScripts?.find((script) =>
    Object.hasOwn(standardScripts, script)
  );
  if (conflictingScript !== undefined) {
    throw new Error(
      `Habitat repository preset requires nx.includedScripts to exclude scheduler script '${conflictingScript}'.`
    );
  }
  for (const [name, command] of Object.entries(standardScripts)) {
    const existing = packageJson.scripts?.[name];
    if (existing !== undefined && existing !== command) {
      throw new Error(
        `Habitat repository preset found incompatible root scheduler script '${name}'.`
      );
    }
  }
  for (const [name, version] of Object.entries(standardDevDependencies)) {
    for (const bucket of ["dependencies", "optionalDependencies", "peerDependencies"] as const) {
      if (packageJson[bucket]?.[name] !== undefined) {
        throw new Error(
          `Habitat repository preset requires tool dependency '${name}' in devDependencies.`
        );
      }
    }
    const existing = packageJson.devDependencies?.[name];
    if (existing !== undefined && existing !== version) {
      throw new Error(
        `Habitat repository preset found incompatible tool dependency '${name}@${existing}'.`
      );
    }
    for (const control of ["overrides", "resolutions"] as const) {
      const selected = packageJson[control]?.[name];
      if (selected !== undefined && selected !== version) {
        throw new Error(
          `Habitat repository preset found incompatible ${control} selection for tool '${name}'.`
        );
      }
    }
    const patched = Object.keys(packageJson.patchedDependencies ?? {}).find(
      (specifier) => specifier === name || specifier.startsWith(`${name}@`)
    );
    if (patched !== undefined) {
      throw new Error(`Habitat repository preset refuses patched foundation tool '${patched}'.`);
    }
  }
}

function assertHabitatProjectAuthority(tree: Tree): void {
  const emptyHabitatProject = isEmptyTextFile(tree, HABITAT_PROJECT_PATH);
  const projects = getProjects(emptyHabitatProject ? withoutHabitatProject(tree) : tree);
  const project = projects.get("habitat");
  if (project !== undefined && project.root !== "scripts/habitat") {
    throw new Error(
      `Habitat repository preset found project 'habitat' at incompatible root '${project.root}'.`
    );
  }
  const conflictingRootOwner = [...projects.entries()].find(
    ([name, configuration]) => name !== "habitat" && configuration.root === "scripts/habitat"
  );
  if (conflictingRootOwner !== undefined) {
    throw new Error(
      `Habitat repository preset found root 'scripts/habitat' owned by incompatible project '${conflictingRootOwner[0]}'.`
    );
  }
  if (!tree.exists(HABITAT_PROJECT_PATH) || emptyHabitatProject) return;

  const input: unknown = readJson<Record<string, unknown>>(tree, HABITAT_PROJECT_PATH);
  if (!habitatProjectValidator.Check(input)) {
    throw new Error(`${HABITAT_PROJECT_PATH} is not a compatible Habitat policy project.`);
  }
  if (Object.hasOwn(input, "projectType")) {
    throw new Error(`${HABITAT_PROJECT_PATH} must not declare projectType.`);
  }
  for (const target of ["check", "format", "lint"] as const) {
    if (!isDeepStrictEqual(input.targets[target], habitatProjectDocument.targets[target])) {
      throw new Error(`${HABITAT_PROJECT_PATH} has incompatible Habitat target '${target}'.`);
    }
  }
}

function planRootPackage(packageJson: RootPackage): RootPackage {
  return {
    ...packageJson,
    private: true,
    type: "module",
    packageManager: packageJson.packageManager ?? `bun@${BUN_VERSION}`,
    workspaces: [...new Set([...standardWorkspaces, ...(packageJson.workspaces ?? [])])],
    scripts: { ...standardScripts, ...packageJson.scripts },
    nx: { ...packageJson.nx, includedScripts: [...(packageJson.nx?.includedScripts ?? [])] },
    devDependencies: { ...packageJson.devDependencies, ...standardDevDependencies },
  };
}

function planNxJson(nxJson: NxJsonConfiguration): NxJsonConfiguration {
  assertReservedNxValues(
    "named input",
    nxJson.namedInputs,
    standardNamedInputs,
    nativeNxPresetNamedInputs
  );
  assertReservedNxValues("target default", nxJson.targetDefaults, standardTargetDefaults);
  const plugins = planNxEslintRegistration(nxJson.plugins);
  return {
    ...nxJson,
    plugins,
    namedInputs: { ...nxJson.namedInputs, ...standardNamedInputs },
    targetDefaults: { ...nxJson.targetDefaults, ...standardTargetDefaults },
  };
}

function planNxEslintRegistration(
  plugins: PluginConfiguration[] | undefined
): PluginConfiguration[] {
  const existing = plugins ?? [];
  const matches = existing.filter(
    (plugin) => (typeof plugin === "string" ? plugin : plugin.plugin) === nxEslintPlugin.plugin
  );
  if (matches.length > 1) {
    throw new Error("nx.json contains multiple Nx ESLint plugin registrations.");
  }
  const match = matches[0];
  if (match !== undefined && !isDeepStrictEqual(match, nxEslintPlugin)) {
    throw new Error("nx.json contains an incompatible Nx ESLint plugin registration.");
  }
  return match === undefined ? [...existing, nxEslintPlugin] : [...existing];
}

function assertReservedNxValues(
  kind: string,
  existing: Readonly<Record<string, unknown>> | undefined,
  canonical: Readonly<Record<string, unknown>>,
  admittedPredecessors: Readonly<Record<string, unknown>> = {}
): void {
  for (const [name, value] of Object.entries(canonical)) {
    const current = existing?.[name];
    const predecessor = admittedPredecessors[name];
    if (
      current !== undefined &&
      !isDeepStrictEqual(current, value) &&
      !isDeepStrictEqual(current, predecessor)
    ) {
      throw new Error(`Habitat repository preset found incompatible Nx ${kind} '${name}'.`);
    }
  }
}

function planTypeScriptConfig(config: TypeScriptConfig | undefined): TypeScriptConfig {
  const existing = (config?.compilerOptions ?? {}) as TypeScriptCompilerOptions;
  for (const [name, value] of Object.entries(standardTypeScriptCompilerOptions)) {
    if (name === "types") continue;
    const current = existing[name];
    if (current !== undefined && !isDeepStrictEqual(current, value)) {
      throw new Error(
        `Habitat repository preset found incompatible TypeScript compiler option '${name}'.`
      );
    }
  }
  return {
    ...config,
    compilerOptions: {
      ...standardTypeScriptCompilerOptions,
      ...existing,
      types: [...new Set([...standardTypeScriptCompilerOptions.types, ...(existing.types ?? [])])],
    },
  };
}

function plannedTextFiles(tree: Tree): readonly TextFilePlan[] {
  return [
    { path: "biome.json", contents: biomeConfig },
    { path: "bunfig.toml", contents: bunfig },
    { path: "eslint.config.mjs", contents: eslintConfig },
    { path: HABITAT_PROJECT_PATH, contents: habitatProject },
  ].filter((file) => !tree.exists(file.path) || isEmptyTextFile(tree, file.path));
}

function isEmptyTextFile(tree: Tree, path: string): boolean {
  return tree.exists(path) && tree.read(path, "utf8")?.trim().length === 0;
}

function withoutHabitatProject(tree: Tree): Tree {
  return new Proxy(tree, {
    get(target, property, receiver) {
      if (property === "listChanges") {
        return () => [
          ...target.listChanges().filter((change) => change.path !== HABITAT_PROJECT_PATH),
          { path: HABITAT_PROJECT_PATH, type: "DELETE" as const, content: null },
        ];
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function jsonDocument(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

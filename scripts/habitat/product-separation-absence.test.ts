import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectGraphAsync, readProjectsConfigurationFromProjectGraph } from "@nx/devkit";

type JsonObject = Record<string, unknown>;

type FrozenDocument = {
  readonly blobId: string;
  readonly destinationPath: string;
  readonly sourcePath: string;
};

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const FROZEN_DOCUMENT_COMMIT = "cc494354449465fa4178f36d4d5222b4d4072f5d";
const FROZEN_DOCUMENT_TREE = "2eacd194803e542a579b9c6c845605123fcb2bbb";
const FROZEN_DOCUMENT_SOURCE_ROOT = "docs/projects/rawr-final-architecture-migration";
const RETAINED_DOCUMENT_DESTINATION_ROOT =
  "docs/projects/_archive/rawr-final-architecture-migration";
const RETAINED_DOCUMENT_SEGMENTS = new Set(["archive", "_archive", "quarantine"]);
const EXPECTED_RETAINED_DOCUMENT_COUNT = 155;

const EXPECTED_PROJECT_ROOTS = {
  "provider-agent-plugin-package-output-cowork-v1-effect-platform-node":
    "resources/agent-plugin-package-output/providers/cowork-v1-effect-platform-node",
  "provider-native-agent-provider-claude-effect-platform-node":
    "resources/native-agent-provider/providers/claude-effect-platform-node",
  "provider-native-agent-provider-codex-effect-platform-node":
    "resources/native-agent-provider/providers/codex-effect-platform-node",
  "provider-content-workspace-git-effect-platform-node":
    "resources/content-workspace/providers/git-effect-platform-node",
  "provider-versioned-content-git-effect-platform-node":
    "resources/versioned-content/providers/git-effect-platform-node",
  "provider-rule-evaluation-grit-effect-platform-node":
    "resources/rule-evaluation/providers/grit-effect-platform-node",
  "provider-source-inventory-git-effect-platform-node":
    "resources/source-inventory/providers/git-effect-platform-node",
  "@habitat-ai/resource-agent-plugin-package-output": "resources/agent-plugin-package-output",
  "@habitat-ai/agent-plugin-lifecycle-service": "services/agent-plugin-lifecycle",
  "@habitat-ai/resource-native-agent-provider": "resources/native-agent-provider",
  "runtime-schema": "packages/core/runtime/schema",
  "workstream-plugin-pack": "tools/workstream-plugin-pack",
  "@habitat-ai/resource-content-workspace": "resources/content-workspace",
  "@habitat-ai/resource-versioned-content": "resources/versioned-content",
  "@habitat-ai/resource-source-inventory": "resources/source-inventory",
  "@habitat-ai/resource-rule-evaluation": "resources/rule-evaluation",
  "@habitat-ai/sdk": "packages/habitat-sdk",
  "@habitat-ai/catalog-service": "services/catalog",
  habitat: "scripts/habitat",
  "@habitat-ai/rawr-core": "packages/core",
  "@habitat-ai/cli": "apps/habitat",
  "habitat-workspace": ".",
} as const;

const FORBIDDEN_PROJECT_AND_PACKAGE_IDS = [
  "@habitat-ai/service",
  "rawr-hq-template",
  "@habitat-ai/rawr-agent-plugin-lifecycle",
  "@habitat-ai/rawr-resource-agent-plugin-package-output",
  "@habitat-ai/rawr-resource-content-workspace",
  "@habitat-ai/rawr-resource-native-agent-provider",
  "@habitat-ai/rawr-resource-versioned-content",
  "@habitat-ai/rawr-dev",
  "@habitat-ai/rawr-dev-node",
  "@habitat-ai/rawr-plugin-devops",
  "@habitat-ai/rawr-chatgpt-corpus",
  "@habitat-ai/rawr-plugin-chatgpt-corpus",
  "@habitat-ai/rawr-hyperresearch-codex",
  "@habitat-ai/rawr-plugin-hyperresearch",
  "@habitat-ai/rawr-session-intelligence",
  "@habitat-ai/rawr-plugin-session-tools",
  "@rawr/resource-agent-plugin-export-destination",
  "provider-agent-plugin-export-destination-effect-platform-node",
  "runtime-realization-type-env",
  "@rawr/example-todo",
  "plugin-server-api-example-todo",
  "@rawr/plugin-hello",
  "@rawr/hq-app",
  "@rawr/server",
  "@rawr/web",
  "@habitat-ai/rawr-hq-ops",
  "@rawr/ui-sdk",
  "@habitat-ai/rawr",
  "@habitat-ai/rawr-hq-sdk",
  "@rawr/runtime-context",
  "@rawr/test-utils",
  "@habitat-ai/typebox-adapter",
  "@rawr/bootgraph",
] as const;

const FORBIDDEN_SOURCE_ROOTS = [
  "apps/cli",
  "apps/hq",
  "apps/rawr",
  "apps/server",
  "apps/web",
  "services/dev",
  "packages/dev-node",
  "plugins/cli/commands/devops",
  "plugins/cli/commands/hello",
  "services/chatgpt-corpus",
  "services/hyperresearch-codex",
  "services/session-intelligence",
  "plugins/cli/commands/chatgpt-corpus",
  "plugins/cli/commands/hyperresearch",
  "plugins/cli/commands/session-tools",
  "services/hq-ops",
  "services/example-todo",
  "plugins/server/api/example-todo",
  "packages/ui-sdk",
  "packages/hq-sdk",
  "packages/runtime-context",
  "packages/test-utils",
  "packages/bootgraph",
  "packages/typebox-adapter",
  "packages/core/src/workspace-root.ts",
  "packages/core/test/workspace-root.test.ts",
  "resources/agent-plugin-export-destination",
  "tools/runtime-realization-type-env",
  "tools/semantica-workbench/ontologies/rawr-core-architecture",
  "scripts/chatgpt-corpus-template",
  ".habitat/rawr",
  ".habitat/blueprints/oclif-app",
  ".habitat/blueprints/oclif-command-plugin",
] as const;

const FORBIDDEN_DOCUMENT_ROOTS = [
  "docs/projects/rawr-final-architecture-migration",
  "docs/projects/orpc-ingest-domain-packages",
] as const;

const FORBIDDEN_DOCUMENT_PATHS = [
  "docs/process/DESIGN_DATA_INTEGRATION_PLAN.md",
  "docs/process/DESIGN_INTEGRATION_GOALS.md",
  "docs/process/HQ_OPERATIONS.md",
  "docs/process/HQ_USAGE.md",
  "docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md",
  "docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md",
  "docs/product/the-reactive-codebase.md",
  "docs/product/the-reactive-codebase.html",
  "docs/projects/spikes/SPIKE_AGENT_COORDINATION_CANVAS_V1.md",
  "rawr.config.ts",
] as const;

const RETAINED_OPENSPEC_PATHS = [
  "openspec/changes/realize-app-runtime-spine/.openspec.yaml",
  "openspec/changes/realize-app-runtime-spine/authority-amendment.md",
  "openspec/changes/realize-app-runtime-spine/classification-ledger.md",
  "openspec/changes/realize-app-runtime-spine/design.md",
  "openspec/changes/realize-app-runtime-spine/execution-queue.md",
  "openspec/changes/realize-app-runtime-spine/foundation-continuation-adoption-receipt.json",
  "openspec/changes/realize-app-runtime-spine/foundation-continuation-release-receipt.json",
  "openspec/changes/realize-app-runtime-spine/gate-b-release-receipt.json",
  "openspec/changes/realize-app-runtime-spine/proposal.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-channel-selection/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-command-lifecycle/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-lifecycle-mode-selection/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-lifecycle-service-topology/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-packaging/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-release-derivation/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-plugin-release-product/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/agent-provider-deployment/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/app-runtime-realization/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/blueprint-definition-composition/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/external-cli-extension-boundary/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/habitat-shared-blueprint-resolution/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/legacy-membership-retirement/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/mixed-plugin-lifecycle-retirement/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/qualified-artifact-authoring/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/rawr-cli-application/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/repository-ratchet-runtime/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/repository-separation/spec.md",
  "openspec/changes/realize-app-runtime-spine/specs/runtime-harness-boundary/spec.md",
  "openspec/changes/realize-app-runtime-spine/stack-cut-sheet.md",
  "openspec/changes/realize-app-runtime-spine/tasks.md",
  "openspec/specs/agent-plugin-channel-selection/spec.md",
  "openspec/specs/agent-plugin-command-lifecycle/spec.md",
  "openspec/specs/agent-plugin-lifecycle-mode-selection/spec.md",
  "openspec/specs/agent-plugin-lifecycle-service-topology/spec.md",
  "openspec/specs/agent-plugin-packaging/spec.md",
  "openspec/specs/agent-plugin-release-derivation/spec.md",
  "openspec/specs/agent-plugin-release-product/spec.md",
  "openspec/specs/agent-provider-deployment/spec.md",
  "openspec/specs/external-cli-extension-boundary/spec.md",
  "openspec/specs/habitat-shared-blueprint-resolution/spec.md",
  "openspec/specs/legacy-membership-retirement/spec.md",
  "openspec/specs/mixed-plugin-lifecycle-retirement/spec.md",
  "openspec/specs/qualified-artifact-authoring/spec.md",
  "openspec/specs/rawr-cli-application/spec.md",
  "openspec/specs/repository-ratchet-runtime/spec.md",
] as const;

const FORBIDDEN_COMMAND_IDS = [
  "agent:plugins",
  "dev",
  "doctor",
  "hq",
  "reflect",
  "routine",
  "tools:export",
  "workflow:harden",
  "config",
  "journal",
  "rawr",
  "security",
  "hello",
  "hyperresearch:codex-slice",
  "hyperresearch:codex:run-fixture",
] as const;

const FORBIDDEN_EXPORT_IDENTITIES = [
  ...FORBIDDEN_PROJECT_AND_PACKAGE_IDS,
  "RawrBaseFlags",
  "RawrCommand",
  "RawrError",
  "RawrResult",
  "findWorkspaceRoot",
  "parseRawr",
  "rawr-command",
  "workspace-root",
] as const;

const CONDEMNED_STATE_LOCATIONS = [
  { base: "home", label: "$HOME/.rawr/config.json", relativePath: ".rawr/config.json" },
  { base: "workspace", label: "<workspace>/rawr.config.ts", relativePath: "rawr.config.ts" },
  { base: "workspace", label: "<workspace>/.rawr/hq/**", relativePath: ".rawr/hq" },
  {
    base: "workspace",
    label: "<workspace>/.rawr/journal/**",
    relativePath: ".rawr/journal",
  },
  {
    base: "workspace",
    label: "<workspace>/.rawr/security/**",
    relativePath: ".rawr/security",
  },
  {
    base: "workspace",
    label: "<workspace>/.rawr/routines/**",
    relativePath: ".rawr/routines",
  },
] as const;

const dependencyFields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

function readJson(relativePath: string): JsonObject {
  const value: unknown = JSON.parse(readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${relativePath} must contain a JSON object.`);
  }
  return value as JsonObject;
}

function repositoryFiles(): ReadonlySet<string> {
  const listed = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    }
  )
    .split("\0")
    .filter((file) => file.length > 0);
  const deleted = new Set(
    execFileSync("git", ["ls-files", "--deleted", "-z"], {
      cwd: workspaceRoot,
      encoding: "utf8",
    })
      .split("\0")
      .filter((file) => file.length > 0)
  );
  return new Set(listed.filter((file) => !deleted.has(file)));
}

function filesAtRoot(files: ReadonlySet<string>, root: string): readonly string[] {
  return [...files].filter((file) => file === root || file.startsWith(`${root}/`)).sort();
}

function frozenDocumentInventory(): readonly FrozenDocument[] {
  const records = execFileSync(
    "git",
    [
      "ls-tree",
      "-r",
      "-z",
      "--format=%(objecttype)%x09%(objectname)%x09%(path)",
      FROZEN_DOCUMENT_COMMIT,
      "--",
      FROZEN_DOCUMENT_SOURCE_ROOT,
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    }
  )
    .split("\0")
    .filter((record) => record.length > 0);

  return records
    .map((record) => {
      const typeSeparator = record.indexOf("\t");
      const blobSeparator = record.indexOf("\t", typeSeparator + 1);
      if (typeSeparator === -1 || blobSeparator === -1) {
        throw new Error(`Unexpected git ls-tree record: ${record}`);
      }

      const objectType = record.slice(0, typeSeparator);
      const blobId = record.slice(typeSeparator + 1, blobSeparator);
      const sourcePath = record.slice(blobSeparator + 1);
      if (objectType !== "blob") {
        throw new Error(`Expected a blob at ${sourcePath}, received ${objectType}.`);
      }
      return { blobId, sourcePath };
    })
    .filter(({ sourcePath }) =>
      sourcePath.split("/").some((segment) => RETAINED_DOCUMENT_SEGMENTS.has(segment))
    )
    .map(({ blobId, sourcePath }) => ({
      blobId,
      destinationPath: `${RETAINED_DOCUMENT_DESTINATION_ROOT}/${sourcePath.slice(
        FROZEN_DOCUMENT_SOURCE_ROOT.length + 1
      )}`,
      sourcePath,
    }))
    .sort((left, right) => {
      if (left.destinationPath < right.destinationPath) return -1;
      if (left.destinationPath > right.destinationPath) return 1;
      return 0;
    });
}

function hashWorktreeFiles(relativePaths: readonly string[]): readonly string[] {
  if (relativePaths.length === 0) return [];

  return execFileSync("git", ["hash-object", "--no-filters", "--stdin-paths"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    input: `${relativePaths.join("\n")}\n`,
  })
    .trimEnd()
    .split(/\r?\n/);
}

function structuredStrings(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(structuredStrings);
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => [key, ...structuredStrings(child)]);
  }
  return [];
}

function referencesIdentity(value: string, identity: string): boolean {
  const normalized = value.startsWith("./") ? value.slice(2) : value;
  return normalized === identity || normalized.startsWith(`${identity}/`);
}

function condemnedState(homeRoot: string, fixtureWorkspaceRoot: string): readonly string[] {
  return CONDEMNED_STATE_LOCATIONS.filter(({ base, relativePath }) =>
    existsSync(path.join(base === "home" ? homeRoot : fixtureWorkspaceRoot, relativePath))
  ).map(({ label }) => label);
}

describe("task 2.11 product-separation absence", () => {
  it("has exactly the 22 retained Nx projects at their canonical roots", async () => {
    const graph = await createProjectGraphAsync({ exitOnError: true });
    const projects = readProjectsConfigurationFromProjectGraph(graph).projects;
    const actualProjectIds = Object.keys(projects).sort();
    const expectedProjectIds = Object.keys(EXPECTED_PROJECT_ROOTS).sort();

    expect(actualProjectIds).toEqual(expectedProjectIds);
    expect(FORBIDDEN_PROJECT_AND_PACKAGE_IDS.filter((identity) => identity in projects)).toEqual(
      []
    );
    expect(
      Object.fromEntries(
        expectedProjectIds.map((projectId) => [projectId, projects[projectId]?.root])
      )
    ).toEqual(EXPECTED_PROJECT_ROOTS);
  }, 30_000);

  it("has no tracked predecessor source or active product-document path", () => {
    const files = repositoryFiles();
    const forbiddenRoots = [...FORBIDDEN_SOURCE_ROOTS, ...FORBIDDEN_DOCUMENT_ROOTS];
    const rootResidue = forbiddenRoots.flatMap((root) => filesAtRoot(files, root));
    const exactResidue = FORBIDDEN_DOCUMENT_PATHS.filter((file) => files.has(file));

    expect([...rootResidue, ...exactResidue]).toEqual([]);
  });

  it("preserves the exact frozen archive and quarantine document inventory", () => {
    const frozenTree = execFileSync("git", ["rev-parse", `${FROZEN_DOCUMENT_COMMIT}^{tree}`], {
      cwd: workspaceRoot,
      encoding: "utf8",
    }).trim();
    expect(frozenTree).toBe(FROZEN_DOCUMENT_TREE);

    const frozenDocuments = frozenDocumentInventory();
    expect(frozenDocuments).toHaveLength(EXPECTED_RETAINED_DOCUMENT_COUNT);

    const destinationPaths = frozenDocuments.map(({ destinationPath }) => destinationPath);
    expect(filesAtRoot(repositoryFiles(), RETAINED_DOCUMENT_DESTINATION_ROOT)).toEqual(
      destinationPaths
    );

    const expectedBlobIds = frozenDocuments.map(({ blobId }) => blobId);
    expect(hashWorktreeFiles(destinationPaths)).toEqual(expectedBlobIds);
  });

  it("retains mixed rawr-core and the active OpenSpec removal authority", () => {
    const files = repositoryFiles();
    expect(files.has("packages/core/package.json")).toBe(true);
    expect(readJson("packages/core/package.json").name).toBe("@habitat-ai/rawr-core");
    expect(RETAINED_OPENSPEC_PATHS.filter((file) => !files.has(file))).toEqual([]);
  });

  it("uses the private root identity and exposes no predecessor package identity", () => {
    const files = repositoryFiles();
    const rootPackage = readJson("package.json");
    expect({ name: rootPackage.name, private: rootPackage.private }).toEqual({
      name: "habitat-workspace",
      private: true,
    });

    const findings: string[] = [];
    const packageManifests = [...files]
      .filter((file) => file === "package.json" || file.endsWith("/package.json"))
      .sort();
    for (const manifestPath of packageManifests) {
      const manifest = readJson(manifestPath);
      if (
        typeof manifest.name === "string" &&
        FORBIDDEN_PROJECT_AND_PACKAGE_IDS.includes(
          manifest.name as (typeof FORBIDDEN_PROJECT_AND_PACKAGE_IDS)[number]
        )
      ) {
        findings.push(`${manifestPath}#name=${manifest.name}`);
      }

      for (const field of dependencyFields) {
        const dependencies = manifest[field];
        if (
          typeof dependencies !== "object" ||
          dependencies === null ||
          Array.isArray(dependencies)
        ) {
          continue;
        }
        for (const dependencyId of Object.keys(dependencies)) {
          if (
            FORBIDDEN_EXPORT_IDENTITIES.some((identity) =>
              referencesIdentity(dependencyId, identity)
            )
          ) {
            findings.push(`${manifestPath}#${field}.${dependencyId}`);
          }
        }
      }

      for (const field of ["exports", "imports"] as const) {
        for (const value of structuredStrings(manifest[field])) {
          const identity = FORBIDDEN_EXPORT_IDENTITIES.find((candidate) =>
            referencesIdentity(value, candidate)
          );
          if (identity !== undefined) {
            findings.push(`${manifestPath}#${field}:${identity}`);
          }
        }
      }

      for (const field of ["bin", "scripts"] as const) {
        const commandMap = manifest[field];
        if (typeof commandMap !== "object" || commandMap === null || Array.isArray(commandMap)) {
          continue;
        }
        for (const commandName of Object.keys(commandMap)) {
          if (commandName === "rawr" || commandName.startsWith("rawr:")) {
            findings.push(`${manifestPath}#${field}.${commandName}`);
          }
        }
      }
    }

    expect(findings).toEqual([]);
  });

  it("omits every condemned command, alias, and owner from the built Oclif manifest", () => {
    const manifest = readJson("apps/habitat/oclif.manifest.json");
    const commands = manifest.commands;
    if (typeof commands !== "object" || commands === null || Array.isArray(commands)) {
      throw new Error("apps/habitat/oclif.manifest.json must contain a commands object.");
    }

    const ownerFindings: string[] = [];
    const commandIds = Object.entries(commands).flatMap(([manifestKey, value]) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Oclif command '${manifestKey}' must contain an object record.`);
      }
      const command = value as JsonObject;
      const aliases = Array.isArray(command.aliases) ? command.aliases : [];
      const hiddenAliases = Array.isArray(command.hiddenAliases) ? command.hiddenAliases : [];
      for (const field of ["pluginName", "pluginAlias"] as const) {
        const owner = command[field];
        if (typeof owner !== "string") continue;
        const forbiddenOwner = FORBIDDEN_PROJECT_AND_PACKAGE_IDS.find((identity) =>
          referencesIdentity(owner, identity)
        );
        if (forbiddenOwner !== undefined) {
          ownerFindings.push(`${manifestKey}#${field}:${forbiddenOwner}`);
        }
      }
      const declaredIds = [command.id, ...aliases, ...hiddenAliases];
      return [manifestKey, ...declaredIds]
        .filter((commandId): commandId is string => typeof commandId === "string")
        .map((commandId) => commandId.replaceAll(" ", ":"));
    });
    const residue = commandIds.filter((commandId) =>
      FORBIDDEN_COMMAND_IDS.some(
        (forbiddenId) => commandId === forbiddenId || commandId.startsWith(`${forbiddenId}:`)
      )
    );
    expect(residue).toEqual([]);
    expect(ownerFindings).toEqual([]);
  });

  it("detects condemned state only inside a disposable fixture", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "habitat-product-separation-"));
    const fixtureHome = path.join(fixtureRoot, "home");
    const fixtureWorkspace = path.join(fixtureRoot, "workspace");

    try {
      await Promise.all([
        mkdir(path.join(fixtureHome, ".rawr"), { recursive: true }),
        ...["hq", "journal", "security", "routines"].map((directory) =>
          mkdir(path.join(fixtureWorkspace, ".rawr", directory), { recursive: true })
        ),
      ]);
      await Promise.all([
        writeFile(path.join(fixtureHome, ".rawr/config.json"), "{}\n"),
        writeFile(path.join(fixtureWorkspace, "rawr.config.ts"), "export default {};\n"),
      ]);

      expect(condemnedState(fixtureHome, fixtureWorkspace)).toEqual(
        CONDEMNED_STATE_LOCATIONS.map(({ label }) => label)
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });
});

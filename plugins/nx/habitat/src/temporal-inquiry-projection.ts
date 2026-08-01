import { posix } from "node:path";

import type { CreateNodes, CreateNodesResultArray, TargetConfiguration } from "@nx/devkit";

const TEMPORAL_INQUIRY_DEFINITION_GLOB = "**/habitat-inquiry.json";

/** Definition facts required by Nx without importing a concrete provider. */
export type TemporalInquiryNxDefinition = Readonly<{
  ownerProject: string;
  inputs: readonly Readonly<{ kind: "directory" | "file"; path: string }>[];
  queryRoot: string;
}>;

type TargetInput = NonNullable<TargetConfiguration["inputs"]>[number];

/** App-owned parser and runtime facts required for sound inquiry projection. */
export type TemporalInquiryNxBinding = Readonly<{
  loadDefinition: (
    workspaceRoot: string,
    definitionPath: string
  ) => TemporalInquiryNxDefinition | Promise<TemporalInquiryNxDefinition>;
  runtimeInputs: readonly [TargetInput, ...TargetInput[]];
}>;

/**
 * Projects one explicit repository inquiry definition into foreground Nx targets.
 *
 * Graph construction reads declarations only. It never starts Fluree, refreshes a
 * ledger, executes a query, or creates repository state.
 */
export function createTemporalInquiryNxPlugin(
  binding: TemporalInquiryNxBinding
): Readonly<{ createNodes: CreateNodes<undefined> }> {
  const createNodes: CreateNodes<undefined> = [
    TEMPORAL_INQUIRY_DEFINITION_GLOB,
    async (configFiles, _options, context) =>
      projectDefinitions(
        [...new Set(configFiles.map(normalizeWorkspacePath))].sort(),
        context.workspaceRoot,
        binding
      ),
  ];

  return Object.freeze({ createNodes });
}

async function projectDefinitions(
  definitionPaths: readonly string[],
  workspaceRoot: string,
  binding: TemporalInquiryNxBinding
): Promise<CreateNodesResultArray> {
  const projected = await Promise.all(
    definitionPaths.map(async (definitionPath) => {
      const definition = await binding.loadDefinition(workspaceRoot, definitionPath);
      const root = projectRootFor(definitionPath);
      const refreshScript = normalizeWorkspacePath(posix.join(root, "refresh.mjs"));
      const queryScript = normalizeWorkspacePath(posix.join(definition.queryRoot, "inquiry.mjs"));
      const inputs = inquiryInputs(
        definitionPath,
        refreshScript,
        queryScript,
        definition.inputs,
        binding.runtimeInputs
      );
      return [
        definitionPath,
        {
          projects: {
            [root]: {
              targets: {
                plan: inquiryTarget(
                  `bun ${shellPath(refreshScript)} --plan`,
                  `Plan ${definition.ownerProject}'s temporal inquiry`,
                  inputs
                ),
                query: inquiryTarget(
                  `bun ${shellPath(queryScript)}`,
                  `Query ${definition.ownerProject}'s sealed temporal inquiry`,
                  inputs
                ),
                refresh: inquiryTarget(
                  `bun ${shellPath(refreshScript)}`,
                  `Refresh ${definition.ownerProject}'s temporal inquiry`,
                  inputs
                ),
              },
            },
          },
        },
      ] as const;
    })
  );
  return projected;
}

function inquiryTarget(
  command: string,
  description: string,
  inputs: TargetConfiguration["inputs"]
): TargetConfiguration {
  return {
    command,
    cache: false,
    inputs,
    outputs: [],
    options: { cwd: "{workspaceRoot}" },
    metadata: { description },
  };
}

function inquiryInputs(
  definitionPath: string,
  refreshScript: string,
  queryScript: string,
  declaredInputs: TemporalInquiryNxDefinition["inputs"],
  runtimeInputs: TemporalInquiryNxBinding["runtimeInputs"]
): TargetConfiguration["inputs"] {
  const inputs = new Set<string>([
    workspaceInput(definitionPath),
    workspaceInput(refreshScript),
    workspaceInput(queryScript),
  ]);
  for (const input of declaredInputs) {
    const exact = workspaceInput(input.path);
    inputs.add(exact);
    if (input.kind === "directory") inputs.add(`${exact}/**/*`);
  }
  return [...runtimeInputs, ...[...inputs].sort()];
}

function shellPath(path: string): string {
  return JSON.stringify(path);
}

function workspaceInput(path: string): string {
  const normalized = normalizeWorkspacePath(path);
  return normalized === "." ? "{workspaceRoot}" : `{workspaceRoot}/${normalized}`;
}

function projectRootFor(definitionPath: string): string {
  const root = posix.dirname(definitionPath);
  return root === "" ? "." : root;
}

function normalizeWorkspacePath(path: string): string {
  const slashPath = path.replaceAll("\\", "/");
  if (posix.isAbsolute(slashPath) || /^[A-Za-z]:\//.test(slashPath)) {
    throw new Error(
      `Temporal inquiry Nx projection requires a workspace-relative path: '${path}'.`
    );
  }
  const normalized = posix.normalize(slashPath).replace(/^\.\//, "");
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Temporal inquiry Nx projection path escapes the workspace: '${path}'.`);
  }
  return normalized === "" ? "." : normalized;
}

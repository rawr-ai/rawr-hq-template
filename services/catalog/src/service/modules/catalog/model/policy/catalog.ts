import type { Path } from "effect";
import picomatch from "picomatch";
import type { Static, TSchema } from "typebox";
import { Validator } from "typebox/schema";
import { Equal } from "typebox/value";
import {
  type AuthorityProvenance,
  type BlueprintDefinition,
  BlueprintDefinitionSchema,
  type CatalogIssue,
  type CompatibilityBaseline,
  CompatibilityBaselineSchema,
  type CompatibilityIndex,
  CompatibilityIndexSchema,
  type CompatibilityRuleSource,
  CompatibilityRuleSourceSchema,
  type HabitatCatalog,
  type HabitatInstanceManifest,
  HabitatInstanceManifestSchema,
  MAX_CATALOG_ISSUES,
  type PolicyPackBlueprintMember,
  type PolicyPackManifest,
  PolicyPackManifestSchema,
  type PolicyPackPackageJson,
  PolicyPackPackageJsonSchema,
  type ResolveCatalogResult,
} from "../dto/catalog.js";

const MEMBER_PLACEHOLDER = "{member}";
const GLOB_CHARACTERS = /[*?[\]!]/;
const CANONICAL_SUCCESSOR_VERSION = /^(?:[2-9]|[1-9][0-9]+)$/u;
const ROOT_PATTERN_UNSUPPORTED_SYNTAX = /[?\[\]{}()!|\\]/u;
const ROOT_PATTERN_BOUND_ROOT_UNSUPPORTED_SYNTAX = /[*?\[\]{}()!|\\]/u;
const ROOT_PATTERN_PICOMATCH_OPTIONS: Readonly<picomatch.PicomatchOptions> = Object.freeze({
  contains: false,
  dot: true,
  nonegate: true,
  strictBrackets: true,
  strictSlashes: true,
});
const blueprintValidator = new Validator({}, BlueprintDefinitionSchema);
const policyPackManifestValidator = new Validator({}, PolicyPackManifestSchema);
const policyPackPackageJsonValidator = new Validator({}, PolicyPackPackageJsonSchema);
const instanceValidator = new Validator({}, HabitatInstanceManifestSchema);
const compatibilityIndexValidator = new Validator({}, CompatibilityIndexSchema);
const compatibilityRuleValidator = new Validator({}, CompatibilityRuleSourceSchema);
const compatibilityBaselineValidator = new Validator({}, CompatibilityBaselineSchema);

/** One schema-admitted repository-owned blueprint source. */
export type LocalBlueprintSource = {
  readonly kind: "local";
  readonly definition: BlueprintDefinition;
  readonly relativePath: string;
};

/** One package runner asset admitted before catalog policy is evaluated. */
export type PolicyPackRunnerAssetSource = {
  readonly ruleId: string;
  readonly relativePath: string;
  readonly absolutePath: string;
};

/** One schema-admitted selected-package blueprint source. */
export type PolicyPackBlueprintSource = {
  readonly kind: "policy-pack";
  readonly definition: BlueprintDefinition;
  readonly relativePath: string;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly packageRoot: string;
  readonly runnerAssets: readonly PolicyPackRunnerAssetSource[];
};

/** One schema-admitted local or selected-package blueprint source. */
export type BlueprintSource = LocalBlueprintSource | PolicyPackBlueprintSource;

/** One admitted selected npm policy-pack envelope. */
export type PolicyPackSource = {
  readonly name: string;
  readonly version: string;
  readonly packageRoot: string;
  readonly protocolVersion: 1;
  readonly blueprints: readonly PolicyPackBlueprintMember[];
};

/** App-selected absolute package locators interpreted before filesystem I/O. */
export type PolicyPackSelection = {
  readonly name: string;
  readonly packageJsonPath: string;
  readonly manifestPath: string;
};

/** One schema-admitted local instance source. */
export type InstanceSource = {
  readonly manifest: HabitatInstanceManifest;
  readonly relativePath: string;
};

/** One schema-admitted compatibility rule source before support-file admission. */
export type CompatibilityRuleSourceDocument = {
  readonly rule: CompatibilityRuleSource;
  readonly relativePath: string;
};

/** One compatibility rule whose empty baseline has been admitted. */
export type CompatibilityRuleDocument = CompatibilityRuleSourceDocument & {
  readonly baseline: CompatibilityBaseline;
};

/** Schema-admitted authority documents observed by the resolve handler. */
export type CatalogDocuments = {
  readonly policyPack: PolicyPackSource;
  readonly blueprints: readonly BlueprintSource[];
  readonly manifests: readonly InstanceSource[];
  readonly compatibilityIndex?: CompatibilityIndex;
  readonly compatibilityRules: readonly CompatibilityRuleDocument[];
};

/** Validates the selected policy-pack filesystem locators. */
export function admitPolicyPackSelection(
  selection: PolicyPackSelection,
  path: Path.Path
):
  | { readonly ok: true; readonly selection: PolicyPackSelection }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const issues: CatalogIssue[] = [];
  if (!path.isAbsolute(selection.packageJsonPath)) {
    issues.push(
      issue(
        "authority-path-invalid",
        `${selection.name}/package.json`,
        "Selected policy-pack packageJsonPath must be absolute."
      )
    );
  }
  if (!path.isAbsolute(selection.manifestPath)) {
    issues.push(
      issue(
        "authority-path-invalid",
        `${selection.name}/habitat-pack.json`,
        "Selected policy-pack manifestPath must be absolute."
      )
    );
  }
  if (
    path.basename(selection.packageJsonPath) !== "package.json" ||
    path.resolve(selection.manifestPath) !==
      path.resolve(path.dirname(selection.packageJsonPath), "habitat-pack.json")
  ) {
    issues.push(
      issue(
        "authority-path-invalid",
        `${selection.name}/habitat-pack.json`,
        "Selected policy-pack locators must identify sibling package.json and habitat-pack.json files."
      )
    );
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, selection };
}

/** Admits selected package.json identity through the existing TypeBox validator pattern. */
export function admitPolicyPackPackageJson(
  value: unknown,
  expectedName: string,
  sourcePath: string
):
  | { readonly ok: true; readonly value: PolicyPackPackageJson }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(policyPackPackageJsonValidator, value, sourcePath);
  if (!admitted.ok) return admitted;
  return admitted.value.name === expectedName
    ? admitted
    : {
        ok: false,
        issues: [
          issue(
            "authority-package-name-mismatch",
            sourcePath,
            `Selected package name "${expectedName}" does not equal package.json name "${admitted.value.name}".`
          ),
        ],
      };
}

/** Admits the closed protocol envelope and its ordered unique member declarations. */
export function admitPolicyPackManifest(
  value: unknown,
  sourcePath: string,
  path: Path.Path
):
  | { readonly ok: true; readonly value: PolicyPackManifest }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(policyPackManifestValidator, value, sourcePath);
  if (!admitted.ok) return admitted;
  const issues = admitted.value.blueprints.flatMap((member) =>
    policyPackMemberPathIssues(member, sourcePath, path)
  );
  const expected = [...admitted.value.blueprints].sort(comparePolicyPackMembers);
  const identities = new Set(
    admitted.value.blueprints.map((member) => `${member.id}@${member.version}`)
  );
  const paths = new Set(admitted.value.blueprints.map((member) => member.path));
  if (
    identities.size !== admitted.value.blueprints.length ||
    paths.size !== admitted.value.blueprints.length ||
    !admitted.value.blueprints.every((member, index) => member === expected[index])
  ) {
    issues.push(
      issue(
        "authority-order-invalid",
        sourcePath,
        "Policy-pack blueprint members must be ordered by id, version, and path with unique identities and paths."
      )
    );
  }
  return issues.length === 0 ? admitted : { ok: false, issues };
}

/** Service-observed filesystem facts for one referenced repository path. */
export type CatalogPathFact = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly kind: "directory" | "file" | "missing" | "other";
  readonly realPath?: string;
  readonly detail?: string;
  readonly filesystemError?: boolean;
};

/** Admits unknown TOML output as one closed blueprint definition. */
export function admitBlueprintSource(
  value: unknown,
  relativePath: string
):
  | { readonly ok: true; readonly source: BlueprintSource }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(blueprintValidator, value, relativePath);
  return admitted.ok
    ? { ok: true, source: { kind: "local", definition: admitted.value, relativePath } }
    : admitted;
}

/** Admits a package blueprint and verifies its declared member identity. */
export function admitPolicyPackBlueprintSource(
  value: unknown,
  member: PolicyPackBlueprintMember,
  policyPack: Pick<PolicyPackSource, "name" | "version" | "packageRoot">,
  runnerAssets: readonly PolicyPackRunnerAssetSource[]
):
  | { readonly ok: true; readonly source: PolicyPackBlueprintSource }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const sourcePath = `${policyPack.name}/${member.path}`;
  const admitted = admit(blueprintValidator, value, sourcePath);
  if (!admitted.ok) return admitted;
  const issues: CatalogIssue[] = [];
  if (admitted.value.id !== member.id) {
    issues.push(
      issue(
        "authority-definition-kind-mismatch",
        sourcePath,
        `Policy-pack member id "${member.id}" does not equal blueprint id "${admitted.value.id}".`
      )
    );
  }
  if (admitted.value.version !== member.version) {
    issues.push(
      issue(
        "authority-version-mismatch",
        sourcePath,
        `Policy-pack member version ${member.version} does not equal blueprint version ${admitted.value.version}.`
      )
    );
  }
  return issues.length > 0
    ? { ok: false, issues }
    : {
        ok: true,
        source: {
          kind: "policy-pack",
          definition: admitted.value,
          relativePath: member.path,
          packageName: policyPack.name,
          packageVersion: policyPack.version,
          packageRoot: policyPack.packageRoot,
          runnerAssets,
        },
      };
}

/** Resolves normalized package-relative runner asset locators for one member. */
export function policyPackRunnerAssetPaths(
  definition: BlueprintDefinition,
  member: PolicyPackBlueprintMember,
  packageName: string,
  path: Path.Path
):
  | {
      readonly ok: true;
      readonly assets: readonly { readonly ruleId: string; readonly relativePath: string }[];
    }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const sourcePath = `${packageName}/${member.path}`;
  const assets: { readonly ruleId: string; readonly relativePath: string }[] = [];
  const issues: CatalogIssue[] = [];
  for (const rule of definition.rules) {
    const declared = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
    const declaredIssues = relativePathIssues(declared, `${sourcePath}#rule:${rule.id}`, path);
    if (declaredIssues.length > 0) {
      issues.push(...declaredIssues);
      continue;
    }
    const relativePath = toRepositoryPath(path.join(path.dirname(member.path), declared), path);
    const assetIssues = packageRelativePathIssues(
      relativePath,
      `${sourcePath}#rule:${rule.id}`,
      path
    );
    if (assetIssues.length > 0) issues.push(...assetIssues);
    else assets.push({ ruleId: rule.id, relativePath });
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, assets };
}

/** Admits unknown TOML output as one closed instance manifest. */
export function admitInstanceSource(
  value: unknown,
  relativePath: string
):
  | { readonly ok: true; readonly source: InstanceSource }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(instanceValidator, value, relativePath);
  return admitted.ok ? { ok: true, source: { manifest: admitted.value, relativePath } } : admitted;
}

/** Admits unknown JSON output as the closed legacy index. */
export function admitCompatibilityIndex(
  value: unknown,
  relativePath: string
):
  | { readonly ok: true; readonly value: CompatibilityIndex }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  return admit(compatibilityIndexValidator, value, relativePath);
}

/** Admits only the inert identity fields required from a legacy rule source. */
export function admitCompatibilityRule(
  value: unknown,
  relativePath: string
):
  | { readonly ok: true; readonly source: CompatibilityRuleSourceDocument }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(compatibilityRuleValidator, value, relativePath);
  return admitted.ok ? { ok: true, source: { rule: admitted.value, relativePath } } : admitted;
}

/** Admits the exact empty baseline supported by compatibility execution. */
export function admitCompatibilityBaseline(
  value: unknown,
  relativePath: string
):
  | { readonly ok: true; readonly value: CompatibilityBaseline }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  return admit(compatibilityBaselineValidator, value, relativePath);
}

/** Collects filesystem paths that schema-admitted documents require the service to observe. */
export function referencedRepositoryPaths(
  documents: CatalogDocuments,
  path: Path.Path
): readonly string[] {
  const references = new Set<string>();
  const blueprints = reconcileBlueprintSources(documents.blueprints).sources;
  for (const root of Object.values(documents.compatibilityIndex?.ownerRoots ?? {})) {
    if (relativePathIssues(root, ".habitat/index.json", path).length === 0) {
      references.add(toRepositoryPath(root, path));
    }
  }
  for (const source of documents.compatibilityRules) {
    const rule = source.rule;
    const paths = [
      rule.supportFiles.baseline,
      rule.runner.name === "grit" ? rule.runner.files.pattern : rule.runner.files.structure,
      ...(rule.runner.name === "grit" ? rule.runner.acquisition.roots : []),
    ];
    for (const referencedPath of paths) {
      if (relativePathIssues(referencedPath, source.relativePath, path).length === 0) {
        references.add(toRepositoryPath(referencedPath, path));
      }
    }
  }
  for (const source of blueprints) {
    if (source.kind === "policy-pack") continue;
    const directory = path.dirname(source.relativePath);
    for (const rule of source.definition.rules) {
      const asset = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
      if (relativePathIssues(asset, source.relativePath, path).length === 0) {
        references.add(toRepositoryPath(path.join(directory, asset), path));
      }
    }
  }
  for (const source of documents.manifests) {
    for (const rootPath of Object.values(source.manifest.roots)) {
      if (relativePathIssues(rootPath, source.relativePath, path).length === 0) {
        references.add(toRepositoryPath(rootPath, path));
      }
    }
  }

  const definitions = new Map(
    blueprints.map((source) => [blueprintIdentity(source.definition), source] as const)
  );
  for (const source of documents.manifests) {
    const definition = definitions.get(
      `${source.manifest.blueprint}@${source.manifest.blueprintVersion}`
    )?.definition;
    if (!definition) continue;
    for (const selection of definition.instance.selections) {
      const root = source.manifest.roots[selection.root];
      const members = source.manifest.selections[selection.id];
      if (root === undefined || members === undefined) continue;
      for (const member of members) {
        const memberPath = path.join(
          root,
          selection.pathTemplate.replace(MEMBER_PLACEHOLDER, member)
        );
        if (
          relativePathIssues(toRepositoryPath(memberPath, path), source.relativePath, path)
            .length === 0
        ) {
          references.add(toRepositoryPath(memberPath, path));
        }
      }
    }
  }
  return [...references].sort(textOrder);
}

/** Resolves admitted documents and observed paths into the closed public catalog union. */
export function resolveCatalog(
  documents: CatalogDocuments,
  pathFacts: ReadonlyMap<string, CatalogPathFact>,
  workspaceRoot: string,
  workspaceRealRoot: string,
  path: Path.Path
): ResolveCatalogResult {
  const issues: CatalogIssue[] = [];
  const reconciledBlueprints = reconcileBlueprintSources(documents.blueprints);
  const blueprints = reconciledBlueprints.sources;
  const manifests = [...documents.manifests].sort((left, right) =>
    textOrder(left.manifest.id, right.manifest.id)
  );

  issues.push(...reconciledBlueprints.issues);
  issues.push(
    ...duplicateIssues(
      manifests.map((source) => ({ identity: source.manifest.id, path: source.relativePath })),
      "authority-duplicate-instance",
      "instance"
    )
  );

  for (const source of documents.blueprints) {
    issues.push(...validateBlueprint(source, path));
  }

  const compatibility = resolveCompatibility(
    documents,
    issues,
    pathFacts,
    workspaceRoot,
    workspaceRealRoot,
    path
  );
  const ruleSources = [
    ...blueprints.flatMap((source) =>
      source.definition.rules.map((rule) => ({ identity: rule.id, path: source.relativePath }))
    ),
    ...compatibility.rules.map((rule) => ({ identity: rule.ruleId, path: rule.manifestPath })),
  ];
  issues.push(...duplicateIssues(ruleSources, "authority-duplicate-rule", "rule"));

  const definitions = new Map(
    blueprints.map((source) => [blueprintIdentity(source.definition), source])
  );
  const resolvedInstances: HabitatCatalog["instances"][number][] = [];
  for (const source of manifests) {
    const definitionSource = definitions.get(
      `${source.manifest.blueprint}@${source.manifest.blueprintVersion}`
    );
    if (!definitionSource) {
      const versions = blueprints
        .filter((candidate) => candidate.definition.id === source.manifest.blueprint)
        .map((candidate) => candidate.definition.version);
      issues.push(
        issue(
          versions.length > 0 ? "authority-version-mismatch" : "authority-blueprint-missing",
          source.relativePath,
          versions.length > 0
            ? `Blueprint "${source.manifest.blueprint}" has versions ${versions.join(", ")}, not requested version ${source.manifest.blueprintVersion}.`
            : `Blueprint "${source.manifest.blueprint}" is not registered.`
        )
      );
      continue;
    }
    const resolved = resolveInstance(
      definitionSource,
      source,
      pathFacts,
      workspaceRoot,
      workspaceRealRoot,
      path
    );
    issues.push(...resolved.issues);
    if (resolved.instance) resolvedInstances.push(resolved.instance);
  }

  for (const source of blueprints) {
    for (const rule of source.definition.rules) {
      const assetPath = ruleAssetPath(source, rule, path);
      if (source.kind === "policy-pack") {
        if (
          !source.runnerAssets.some(
            (asset) => asset.ruleId === rule.id && asset.relativePath === assetPath
          )
        ) {
          issues.push(
            issue(
              "authority-resolution-failed",
              blueprintSourcePath(source),
              `Policy-pack runner asset for rule "${rule.id}" was not admitted.`
            )
          );
        }
        continue;
      }
      issues.push(
        ...pathFactIssues(
          assetPath,
          "file",
          source.relativePath,
          pathFacts,
          workspaceRoot,
          workspaceRealRoot,
          path
        )
      );
    }
  }

  if (issues.length > 0) return rejected(issues);

  const instances = resolvedInstances.sort((left, right) => textOrder(left.id, right.id));
  const applications: HabitatCatalog["applications"][number][] = [];
  for (const instance of instances) {
    const definitionSource = definitions.get(`${instance.blueprint}@${instance.blueprintVersion}`);
    if (!definitionSource) continue;
    for (const rule of definitionSource.definition.rules) {
      const asset = resolvedRuleAsset(definitionSource, rule, workspaceRoot, path);
      if (asset === undefined) continue;
      const common = {
        ownerProject: instance.ownerProject,
        instanceId: instance.id,
        blueprint: instance.blueprint,
        blueprintVersion: instance.blueprintVersion,
        ruleId: rule.id,
        manifestPath: instance.manifestPath,
        lane: rule.lane,
        message: rule.message,
        remediate: rule.remediate,
        provenance: blueprintProvenance(definitionSource, workspaceRoot),
      };
      if (rule.runner.name === "habitat") {
        applications.push({
          ...common,
          runner: {
            name: "habitat",
            mode: "structure",
            structure: asset,
            rootBindings: definitionSource.definition.instance.roots.map((root) => {
              const binding = instance.roots.find((candidate) => candidate.id === root.id);
              return binding
                ? {
                    rootRole: root.id,
                    required: root.required,
                    kind: root.kind,
                    path: binding.path,
                  }
                : { rootRole: root.id, required: root.required, kind: root.kind };
            }),
          },
        });
        continue;
      }
      const entries: Extract<
        HabitatCatalog["applications"][number]["runner"],
        { name: "grit" }
      >["acquisition"]["entries"] = [];
      for (const rootRole of rule.runner.acquisition.rootRoles) {
        const root = instance.roots.find((candidate) => candidate.id === rootRole);
        if (root) {
          entries.push({
            source: { kind: "root-role", id: rootRole },
            kind: root.kind,
            path: root.path,
          });
        }
      }
      for (const selectionId of rule.runner.acquisition.selections) {
        const selection = instance.selections.find((candidate) => candidate.id === selectionId);
        for (const member of selection?.members ?? []) {
          entries.push({
            source: { kind: "selection", id: selectionId, member: member.id },
            kind: member.kind,
            path: member.path,
          });
        }
      }
      for (const declaration of rule.runner.acquisition.rootPatterns ?? []) {
        const root = instance.roots.find((candidate) => candidate.id === declaration.rootRole);
        if (root?.kind !== "directory") continue;
        for (const pattern of declaration.patterns) {
          entries.push({
            source: { kind: "root-pattern", id: declaration.rootRole, pattern },
            kind: "file",
            path: toRepositoryPath(path.join(root.path, pattern), path),
          });
        }
      }
      applications.push({
        ...common,
        runner: {
          name: "grit",
          pattern: asset,
          patternName: rule.runner.patternName,
          acquisition: { kind: rule.runner.acquisition.kind, entries },
        },
      });
    }
  }

  applications.sort(
    (left, right) =>
      textOrder(left.ruleId, right.ruleId) || textOrder(left.instanceId, right.instanceId)
  );
  return deepFreeze({
    _tag: "Resolved",
    catalog: {
      schemaVersion: 3,
      policyPack: {
        name: documents.policyPack.name,
        version: documents.policyPack.version,
        protocolVersion: documents.policyPack.protocolVersion,
        blueprints: [...documents.policyPack.blueprints],
      },
      blueprints: blueprints.map((source) => ({
        definition: source.definition,
        provenance: blueprintProvenance(source, workspaceRoot),
      })),
      instances,
      applications,
      compatibility,
    },
  });
}

/** Constructs a bounded, sorted rejected result for operational failures. */
export function rejected(issues: readonly CatalogIssue[]): ResolveCatalogResult {
  const stable = stableIssues(issues);
  return {
    _tag: "Rejected",
    issues:
      stable.length > 0
        ? stable
        : [issue("authority-resolution-failed", "", "Catalog resolution failed.")],
  };
}

function resolveCompatibility(
  documents: CatalogDocuments,
  issues: CatalogIssue[],
  pathFacts: ReadonlyMap<string, CatalogPathFact>,
  workspaceRoot: string,
  workspaceRealRoot: string,
  path: Path.Path
): HabitatCatalog["compatibility"] {
  if (!documents.compatibilityIndex) {
    return { schemaVersion: 2, ownerRoots: {}, rules: [] };
  }
  const ownerRoots = Object.fromEntries(
    Object.entries(documents.compatibilityIndex.ownerRoots).sort(([left], [right]) =>
      textOrder(left, right)
    )
  );
  for (const [owner, root] of Object.entries(ownerRoots)) {
    issues.push(...relativePathIssues(root, `.habitat/index.json#ownerRoots:${owner}`, path));
    issues.push(
      ...pathFactIssues(
        root,
        "directory",
        `.habitat/index.json#ownerRoots:${owner}`,
        pathFacts,
        workspaceRoot,
        workspaceRealRoot,
        path
      )
    );
  }
  const rules = [...documents.compatibilityRules]
    .sort(
      (left, right) =>
        textOrder(left.rule.id, right.rule.id) || textOrder(left.relativePath, right.relativePath)
    )
    .map((source) => {
      const rule = source.rule;
      if (!Object.hasOwn(ownerRoots, rule.ownerProject)) {
        issues.push(
          issue(
            "authority-compatibility-invalid",
            source.relativePath,
            `Legacy rule ownerProject "${rule.ownerProject}" has no owner root.`
          )
        );
      }
      const coveragePatterns = rule.pathCoverage.flatMap(({ patterns }) => patterns);
      for (const pattern of coveragePatterns) {
        issues.push(...repositoryPatternIssues(pattern, source.relativePath, path));
      }
      const baselinePath = rule.supportFiles.baseline;
      const runnerAssetPath =
        rule.runner.name === "grit" ? rule.runner.files.pattern : rule.runner.files.structure;
      issues.push(
        ...pathFactIssues(
          baselinePath,
          "file",
          source.relativePath,
          pathFacts,
          workspaceRoot,
          workspaceRealRoot,
          path
        ),
        ...pathFactIssues(
          runnerAssetPath,
          "file",
          source.relativePath,
          pathFacts,
          workspaceRoot,
          workspaceRealRoot,
          path
        )
      );

      const provenance = {
        kind: "local" as const,
        authorityRoot: workspaceRoot,
        relativePath: source.relativePath,
      };
      const asset = (relativePath: string) => ({
        provenance,
        relativePath,
        absolutePath: path.resolve(workspaceRoot, relativePath),
      });
      const common = {
        ruleId: rule.id,
        ownerProject: rule.ownerProject,
        manifestPath: source.relativePath,
        lane: rule.lane,
        message: rule.message,
        remediate: rule.remediate,
        provenance,
        coveragePatterns,
        baseline: asset(baselinePath),
      };
      if (rule.runner.name === "habitat") {
        return {
          ...common,
          runner: {
            name: "habitat" as const,
            mode: "structure" as const,
            structure: asset(runnerAssetPath),
          },
        };
      }

      const entries: { readonly kind: "directory" | "file"; readonly path: string }[] = [];
      for (const root of rule.runner.acquisition.roots) {
        const admission = pathFactAnyIssues(
          root,
          source.relativePath,
          pathFacts,
          workspaceRoot,
          workspaceRealRoot,
          path
        );
        issues.push(...admission.issues);
        if (admission.kind !== undefined) entries.push({ kind: admission.kind, path: root });
      }
      return {
        ...common,
        runner: {
          name: "grit" as const,
          pattern: asset(runnerAssetPath),
          patternName: rule.runner.patternName,
          acquisition: { kind: "check" as const, entries },
        },
      };
    });
  return { schemaVersion: 2, ownerRoots, rules };
}

function validateBlueprint(source: BlueprintSource, path: Path.Path): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const definitionPath = blueprintSourcePath(source);
  const locatorSegments = source.kind === "local" ? source.relativePath.split("/") : [];
  const kind = locatorSegments[2];
  if (source.kind === "local" && kind !== source.definition.id) {
    issues.push(
      issue(
        "authority-definition-kind-mismatch",
        definitionPath,
        `Blueprint path kind "${kind ?? ""}" does not equal definition id "${source.definition.id}".`
      )
    );
  }
  const locatorVersion = locatorSegments[3] === "versions" ? locatorSegments[4] : undefined;
  if (source.kind === "local" && locatorVersion !== undefined) {
    if (!CANONICAL_SUCCESSOR_VERSION.test(locatorVersion)) {
      issues.push(
        issue(
          "authority-path-invalid",
          definitionPath,
          `Blueprint locator version "${locatorVersion}" must be a canonical decimal integer greater than or equal to 2.`
        )
      );
    } else if (String(source.definition.version) !== locatorVersion) {
      issues.push(
        issue(
          "authority-version-mismatch",
          definitionPath,
          `Blueprint locator version ${locatorVersion} does not equal definition version ${source.definition.version}.`
        )
      );
    }
  }
  issues.push(
    ...sortedUniqueIssues(
      source.definition.instance.roots.map((root) => root.id),
      definitionPath,
      "root roles"
    ),
    ...sortedUniqueIssues(
      source.definition.instance.selections.map((selection) => selection.id),
      definitionPath,
      "selection axes"
    ),
    ...sortedUniqueIssues(
      source.definition.rules.map((rule) => rule.id),
      definitionPath,
      "rule ids"
    )
  );
  const roots = new Map(source.definition.instance.roots.map((root) => [root.id, root]));
  const anchor = roots.get(source.definition.instance.anchorRoot);
  if (!anchor || !anchor.required || anchor.kind !== "directory") {
    issues.push(
      issue(
        "authority-definition-invalid",
        definitionPath,
        `anchorRoot "${source.definition.instance.anchorRoot}" must name a required directory root role.`
      )
    );
  }
  for (const selection of source.definition.instance.selections) {
    const sourcePath = `${definitionPath}#selection:${selection.id}`;
    if (roots.get(selection.root)?.kind !== "directory") {
      issues.push(
        issue(
          "authority-definition-invalid",
          sourcePath,
          `Selection "${selection.id}" must name a known directory root role.`
        )
      );
    }
    try {
      new RegExp(selection.memberPattern);
    } catch (error) {
      issues.push(
        issue(
          "authority-definition-invalid",
          sourcePath,
          `Invalid memberPattern: ${renderCause(error)}`
        )
      );
    }
    issues.push(...pathTemplateIssues(selection.pathTemplate, sourcePath, path));
  }
  const selectionIds = new Set(
    source.definition.instance.selections.map((selection) => selection.id)
  );
  for (const rule of source.definition.rules) {
    const sourcePath = `${definitionPath}#rule:${rule.id}`;
    const asset = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
    issues.push(...relativePathIssues(asset, sourcePath, path));
    if (rule.runner.name === "habitat") continue;
    const rootPatterns = rule.runner.acquisition.rootPatterns ?? [];
    issues.push(
      ...sortedUniqueIssues(rule.runner.acquisition.rootRoles, sourcePath, "acquisition rootRoles"),
      ...sortedUniqueIssues(
        rule.runner.acquisition.selections,
        sourcePath,
        "acquisition selections"
      ),
      ...sortedUniqueIssues(
        rootPatterns.map((declaration) => declaration.rootRole),
        sourcePath,
        "acquisition rootPattern root roles"
      )
    );
    if (
      rule.runner.acquisition.rootRoles.length === 0 &&
      rule.runner.acquisition.selections.length === 0 &&
      rootPatterns.length === 0
    ) {
      issues.push(
        issue(
          "authority-rule-invalid",
          sourcePath,
          `Grit rule "${rule.id}" requires an acquisition source.`
        )
      );
    }
    for (const rootRole of rule.runner.acquisition.rootRoles) {
      if (!roots.has(rootRole)) {
        issues.push(
          issue(
            "authority-rule-invalid",
            sourcePath,
            `Unknown acquisition root role "${rootRole}".`
          )
        );
      }
    }
    for (const selectionId of rule.runner.acquisition.selections) {
      const selection = source.definition.instance.selections.find(
        (item) => item.id === selectionId
      );
      if (!selectionIds.has(selectionId)) {
        issues.push(
          issue(
            "authority-rule-invalid",
            sourcePath,
            `Unknown acquisition selection "${selectionId}".`
          )
        );
      } else if (selection?.kind !== "file") {
        issues.push(
          issue(
            "authority-rule-invalid",
            sourcePath,
            `Acquisition selection "${selectionId}" must resolve files.`
          )
        );
      }
    }
    for (const declaration of rootPatterns) {
      const root = roots.get(declaration.rootRole);
      if (root === undefined) {
        issues.push(
          issue(
            "authority-rule-invalid",
            sourcePath,
            `Unknown root-pattern root role "${declaration.rootRole}".`
          )
        );
      } else if (root.kind !== "directory") {
        issues.push(
          issue(
            "authority-rule-invalid",
            sourcePath,
            `Root-pattern root role "${declaration.rootRole}" must resolve a directory.`
          )
        );
      }
      issues.push(
        ...sortedUniqueIssues(
          declaration.patterns,
          sourcePath,
          `rootPatterns for "${declaration.rootRole}"`
        )
      );
      for (const pattern of declaration.patterns) {
        issues.push(...rootRelativePatternIssues(pattern, sourcePath, path));
      }
    }
  }
  return issues;
}

function resolveInstance(
  definitionSource: BlueprintSource,
  source: InstanceSource,
  pathFacts: ReadonlyMap<string, CatalogPathFact>,
  workspaceRoot: string,
  workspaceRealRoot: string,
  path: Path.Path
): {
  readonly instance?: HabitatCatalog["instances"][number];
  readonly issues: readonly CatalogIssue[];
} {
  const issues: CatalogIssue[] = [];
  const definition = definitionSource.definition;
  const roots = new Map(definition.instance.roots.map((root) => [root.id, root]));
  const selections = new Map(
    definition.instance.selections.map((selection) => [selection.id, selection])
  );
  for (const rootId of Object.keys(source.manifest.roots).sort(textOrder)) {
    if (!roots.has(rootId)) {
      issues.push(
        issue("authority-manifest-invalid", source.relativePath, `Unknown root role "${rootId}".`)
      );
    }
  }
  for (const root of definition.instance.roots) {
    if (root.required && !Object.hasOwn(source.manifest.roots, root.id)) {
      issues.push(
        issue(
          "authority-manifest-invalid",
          source.relativePath,
          `Missing required root role "${root.id}".`
        )
      );
    }
  }
  for (const selectionId of Object.keys(source.manifest.selections).sort(textOrder)) {
    if (!selections.has(selectionId)) {
      issues.push(
        issue(
          "authority-manifest-invalid",
          source.relativePath,
          `Unknown selection axis "${selectionId}".`
        )
      );
    }
  }
  const anchorPath = source.manifest.roots[definition.instance.anchorRoot];
  const manifestDirectory = toRepositoryPath(path.dirname(source.relativePath), path);
  if (anchorPath !== undefined && toRepositoryPath(anchorPath, path) !== manifestDirectory) {
    issues.push(
      issue(
        "authority-anchor-mismatch",
        source.relativePath,
        `dirname(habitat.toml) is "${manifestDirectory}", but anchor root binds "${anchorPath}".`
      )
    );
  }

  const resolvedRoots: HabitatCatalog["instances"][number]["roots"][number][] = [];
  for (const root of definition.instance.roots) {
    const boundPath = source.manifest.roots[root.id];
    if (boundPath === undefined) continue;
    issues.push(...relativePathIssues(boundPath, source.relativePath, path));
    issues.push(
      ...pathFactIssues(
        boundPath,
        root.kind,
        source.relativePath,
        pathFacts,
        workspaceRoot,
        workspaceRealRoot,
        path
      )
    );
    resolvedRoots.push({ ...root, path: toRepositoryPath(boundPath, path) });
  }

  const resolvedSelections: HabitatCatalog["instances"][number]["selections"][number][] = [];
  for (const selection of definition.instance.selections) {
    const members = source.manifest.selections[selection.id];
    if (members === undefined) continue;
    issues.push(
      ...sortedUniqueIssues(members, source.relativePath, `members of "${selection.id}"`)
    );
    const rootPath = source.manifest.roots[selection.root];
    if (rootPath === undefined) {
      issues.push(
        issue(
          "authority-manifest-invalid",
          source.relativePath,
          `Selection "${selection.id}" requires bound root role "${selection.root}".`
        )
      );
      continue;
    }
    let expression: RegExp | undefined;
    try {
      expression = new RegExp(selection.memberPattern);
    } catch {
      continue;
    }
    const resolvedMembers: HabitatCatalog["instances"][number]["selections"][number]["members"][number][] =
      [];
    for (const member of members) {
      if (!expression.test(member)) {
        issues.push(
          issue(
            "authority-manifest-invalid",
            source.relativePath,
            `Selection member "${member}" does not match ${selection.memberPattern}.`
          )
        );
        continue;
      }
      const memberPath = toRepositoryPath(
        path.join(rootPath, selection.pathTemplate.replace(MEMBER_PLACEHOLDER, member)),
        path
      );
      issues.push(...relativePathIssues(memberPath, source.relativePath, path));
      issues.push(
        ...pathFactIssues(
          memberPath,
          selection.kind,
          source.relativePath,
          pathFacts,
          workspaceRoot,
          workspaceRealRoot,
          path,
          rootPath
        )
      );
      resolvedMembers.push({ id: member, kind: selection.kind, path: memberPath });
    }
    resolvedSelections.push({ id: selection.id, root: selection.root, members: resolvedMembers });
  }
  for (const rule of definition.rules) {
    if (rule.runner.name !== "grit") continue;
    for (const rootRole of rule.runner.acquisition.rootRoles) {
      if (roots.has(rootRole) && !Object.hasOwn(source.manifest.roots, rootRole)) {
        issues.push(
          issue(
            "authority-manifest-invalid",
            source.relativePath,
            `Grit rule "${rule.id}" requires bound acquisition root role "${rootRole}".`
          )
        );
      }
    }
    for (const selectionId of rule.runner.acquisition.selections) {
      if (selections.has(selectionId) && !Object.hasOwn(source.manifest.selections, selectionId)) {
        issues.push(
          issue(
            "authority-manifest-invalid",
            source.relativePath,
            `Grit rule "${rule.id}" requires bound acquisition selection "${selectionId}".`
          )
        );
      }
    }
    for (const declaration of rule.runner.acquisition.rootPatterns ?? []) {
      if (roots.get(declaration.rootRole)?.kind !== "directory") continue;
      const boundPath = source.manifest.roots[declaration.rootRole];
      if (boundPath === undefined) {
        issues.push(
          issue(
            "authority-manifest-invalid",
            source.relativePath,
            `Grit rule "${rule.id}" requires bound root-pattern root role "${declaration.rootRole}".`
          )
        );
        continue;
      }
      if (ROOT_PATTERN_BOUND_ROOT_UNSUPPORTED_SYNTAX.test(boundPath)) {
        issues.push(
          issue(
            "authority-path-invalid",
            source.relativePath,
            `Grit rule "${rule.id}" binds root-pattern root role "${declaration.rootRole}" to a path containing glob-significant syntax: "${boundPath}".`
          )
        );
        continue;
      }
      for (const pattern of declaration.patterns) {
        if (toRepositoryPath(path.join(boundPath, pattern), path).length > 4_096) {
          issues.push(
            issue(
              "authority-path-invalid",
              source.relativePath,
              `Grit rule "${rule.id}" resolves root pattern beyond the maximum repository path length.`
            )
          );
        }
      }
    }
  }
  if (issues.length > 0) return { issues };
  return {
    issues: [],
    instance: {
      id: source.manifest.id,
      ownerProject: source.manifest.ownerProject,
      blueprint: source.manifest.blueprint,
      blueprintVersion: source.manifest.blueprintVersion,
      manifestPath: source.relativePath,
      roots: resolvedRoots,
      selections: resolvedSelections,
    },
  };
}

function pathFactIssues(
  relativePath: string,
  expectedKind: "directory" | "file",
  sourcePath: string,
  facts: ReadonlyMap<string, CatalogPathFact>,
  workspaceRoot: string,
  workspaceRealRoot: string,
  path: Path.Path,
  confinementRoot?: string
): CatalogIssue[] {
  const normalized = toRepositoryPath(relativePath, path);
  const lexicalIssues = relativePathIssues(normalized, sourcePath, path);
  if (lexicalIssues.length > 0) return lexicalIssues;
  const absolute = path.resolve(workspaceRoot, normalized);
  if (!isContained(workspaceRoot, absolute, path)) {
    return [
      issue("authority-path-escape", sourcePath, `Path "${normalized}" escapes the workspace.`),
    ];
  }
  if (confinementRoot !== undefined) {
    const confinementAbsolute = path.resolve(workspaceRoot, confinementRoot);
    if (!isContained(confinementAbsolute, absolute, path)) {
      return [
        issue(
          "authority-path-escape",
          sourcePath,
          `Path "${normalized}" escapes selection root "${confinementRoot}".`
        ),
      ];
    }
  }
  const fact = facts.get(normalized);
  if (!fact || fact.kind === "missing") {
    return [
      issue(
        "authority-path-missing",
        sourcePath,
        fact?.detail ?? `Admitted ${expectedKind} does not exist: "${normalized}".`
      ),
    ];
  }
  if (fact.filesystemError) {
    return [
      issue(
        "authority-filesystem-failed",
        sourcePath,
        fact.detail ?? `Unable to inspect admitted path "${normalized}".`
      ),
    ];
  }
  if (fact.kind !== expectedKind) {
    return [
      issue(
        "authority-path-kind-mismatch",
        sourcePath,
        `Admitted path "${normalized}" is ${fact.kind}, expected ${expectedKind}.`
      ),
    ];
  }
  if (!fact.realPath) {
    return [
      issue(
        "authority-path-missing",
        sourcePath,
        fact.detail ?? `Unable to resolve admitted path "${normalized}".`
      ),
    ];
  }
  if (!isContained(workspaceRealRoot, fact.realPath, path)) {
    return [
      issue(
        "authority-path-escape",
        sourcePath,
        `Path "${normalized}" escapes through a symbolic link.`
      ),
    ];
  }
  if (confinementRoot !== undefined) {
    const rootFact = facts.get(toRepositoryPath(confinementRoot, path));
    if (rootFact?.realPath && !isContained(rootFact.realPath, fact.realPath, path)) {
      return [
        issue(
          "authority-path-escape",
          sourcePath,
          `Path "${normalized}" escapes selection root through a symbolic link.`
        ),
      ];
    }
  }
  return [];
}

function pathFactAnyIssues(
  relativePath: string,
  sourcePath: string,
  facts: ReadonlyMap<string, CatalogPathFact>,
  workspaceRoot: string,
  workspaceRealRoot: string,
  path: Path.Path
): {
  readonly kind?: "directory" | "file";
  readonly issues: readonly CatalogIssue[];
} {
  const normalized = toRepositoryPath(relativePath, path);
  const fact = facts.get(normalized);
  const kind = fact?.kind === "directory" || fact?.kind === "file" ? fact.kind : undefined;
  return {
    kind,
    issues: pathFactIssues(
      normalized,
      kind ?? "directory",
      sourcePath,
      facts,
      workspaceRoot,
      workspaceRealRoot,
      path
    ),
  };
}

function ruleAssetPath(
  source: BlueprintSource,
  rule: BlueprintDefinition["rules"][number],
  path: Path.Path
): string {
  const asset = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
  return toRepositoryPath(path.join(path.dirname(source.relativePath), asset), path);
}

function resolvedRuleAsset(
  source: BlueprintSource,
  rule: BlueprintDefinition["rules"][number],
  workspaceRoot: string,
  path: Path.Path
):
  | Extract<
      HabitatCatalog["applications"][number]["runner"],
      { readonly name: "habitat" }
    >["structure"]
  | undefined {
  const relativePath = ruleAssetPath(source, rule, path);
  if (source.kind === "local") {
    return {
      provenance: {
        kind: "local",
        authorityRoot: workspaceRoot,
        relativePath: source.relativePath,
      },
      relativePath,
      absolutePath: path.resolve(workspaceRoot, relativePath),
    };
  }
  const admitted = source.runnerAssets.find(
    (asset) => asset.ruleId === rule.id && asset.relativePath === relativePath
  );
  if (admitted === undefined) return undefined;
  return {
    provenance: {
      kind: "policy-pack",
      packageName: source.packageName,
      packageVersion: source.packageVersion,
      packageRoot: source.packageRoot,
      packageRelativePath: admitted.relativePath,
    },
    relativePath: admitted.relativePath,
    absolutePath: admitted.absolutePath,
  };
}

function blueprintProvenance(source: BlueprintSource, workspaceRoot: string): AuthorityProvenance {
  return source.kind === "local"
    ? {
        kind: "local",
        authorityRoot: workspaceRoot,
        relativePath: source.relativePath,
      }
    : {
        kind: "policy-pack",
        packageName: source.packageName,
        packageVersion: source.packageVersion,
        packageRoot: source.packageRoot,
        packageRelativePath: source.relativePath,
      };
}

function blueprintSourcePath(source: BlueprintSource): string {
  return source.kind === "local"
    ? source.relativePath
    : `${source.packageName}/${source.relativePath}`;
}

function relativePathIssues(
  candidate: string,
  sourcePath: string,
  path: Path.Path
): CatalogIssue[] {
  const invalid =
    candidate.includes("\\") ||
    path.isAbsolute(candidate) ||
    candidate.includes("//") ||
    candidate.endsWith("/") ||
    (candidate !== "." && toRepositoryPath(path.normalize(candidate), path) !== candidate) ||
    candidate.split("/").some((segment) => segment === "" || segment === "..") ||
    GLOB_CHARACTERS.test(candidate) ||
    /[{}]/.test(candidate);
  return invalid
    ? [
        issue(
          "authority-path-invalid",
          sourcePath,
          `Path must be normalized, repository-relative, traversal-free, and non-glob: "${candidate}".`
        ),
      ]
    : [];
}

function packageRelativePathIssues(
  candidate: string,
  sourcePath: string,
  path: Path.Path
): CatalogIssue[] {
  const invalid =
    candidate.includes("\\") ||
    path.isAbsolute(candidate) ||
    candidate.includes("//") ||
    candidate.endsWith("/") ||
    toRepositoryPath(path.normalize(candidate), path) !== candidate ||
    candidate.split("/").some((segment) => segment === "" || segment === "..") ||
    GLOB_CHARACTERS.test(candidate) ||
    /[{}]/.test(candidate);
  return invalid
    ? [
        issue(
          "authority-path-invalid",
          sourcePath,
          `Path must be normalized, package-relative, traversal-free, and non-glob: "${candidate}".`
        ),
      ]
    : [];
}

function policyPackMemberPathIssues(
  member: PolicyPackBlueprintMember,
  sourcePath: string,
  path: Path.Path
): CatalogIssue[] {
  const issues = packageRelativePathIssues(member.path, sourcePath, path);
  if (path.basename(member.path) !== "blueprint.toml") {
    issues.push(
      issue(
        "authority-path-invalid",
        sourcePath,
        `Policy-pack member "${member.id}@${member.version}" must name a blueprint.toml file.`
      )
    );
  }
  return issues;
}

function repositoryPatternIssues(
  candidate: string,
  sourcePath: string,
  path: Path.Path
): CatalogIssue[] {
  const invalid =
    candidate.includes("\\") ||
    path.isAbsolute(candidate) ||
    candidate.includes("//") ||
    candidate.endsWith("/") ||
    candidate.split("/").some((segment) => segment === "" || segment === "..") ||
    /[\u0000-\u001f\u007f]/u.test(candidate);
  return invalid
    ? [
        issue(
          "authority-path-invalid",
          sourcePath,
          `Coverage pattern must be repository-relative and traversal-free: "${candidate}".`
        ),
      ]
    : [];
}

function rootRelativePatternIssues(
  candidate: string,
  sourcePath: string,
  path: Path.Path
): CatalogIssue[] {
  const segments = candidate.split("/");
  const globstarCount = segments.filter((segment) => segment === "**").length;
  let valid =
    candidate !== "." &&
    !ROOT_PATTERN_UNSUPPORTED_SYNTAX.test(candidate) &&
    !path.isAbsolute(candidate) &&
    !/^[A-Za-z]:\//u.test(candidate) &&
    !candidate.endsWith("/") &&
    !/[\u0000-\u001f\u007f]/u.test(candidate) &&
    globstarCount <= 1 &&
    !segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        (segment !== "**" && segment.split("*").length > 2)
    );
  if (valid) {
    try {
      picomatch(candidate, ROOT_PATTERN_PICOMATCH_OPTIONS);
    } catch {
      valid = false;
    }
  }
  return valid
    ? []
    : [
        issue(
          "authority-path-invalid",
          sourcePath,
          `Root pattern must be a safe root-relative literal/star glob: "${candidate}".`
        ),
      ];
}

function pathTemplateIssues(template: string, sourcePath: string, path: Path.Path): CatalogIssue[] {
  const placeholderCount = template.split(MEMBER_PLACEHOLDER).length - 1;
  const substituted = template.replaceAll(MEMBER_PLACEHOLDER, "member");
  const issues = relativePathIssues(substituted, sourcePath, path);
  if (placeholderCount !== 1 || /[{}]/.test(template.replace(MEMBER_PLACEHOLDER, ""))) {
    issues.push(
      issue(
        "authority-definition-invalid",
        sourcePath,
        `pathTemplate must contain exactly one ${MEMBER_PLACEHOLDER} placeholder.`
      )
    );
  }
  return issues;
}

function sortedUniqueIssues(
  values: readonly string[],
  sourcePath: string,
  label: string
): CatalogIssue[] {
  const expected = [...new Set(values)].sort(textOrder);
  return expected.length === values.length &&
    values.every((value, index) => value === expected[index])
    ? []
    : [issue("authority-order-invalid", sourcePath, `${label} must be sorted and unique.`)];
}

function duplicateIssues(
  entries: readonly { readonly identity: string; readonly path: string }[],
  code: CatalogIssue["code"],
  label: string
): CatalogIssue[] {
  const paths = new Map<string, string[]>();
  for (const entry of entries) {
    paths.set(entry.identity, [...(paths.get(entry.identity) ?? []), entry.path]);
  }
  return [...paths.entries()]
    .filter(([, sources]) => sources.length > 1)
    .sort(([left], [right]) => textOrder(left, right))
    .map(([identity, sources]) =>
      issue(
        code,
        [...sources].sort(textOrder)[0] ?? "",
        `Duplicate ${label} identity "${identity}" at ${[...sources].sort(textOrder).join(", ")}.`
      )
    );
}

function admit<T extends TSchema>(
  validator: Validator<T>,
  value: unknown,
  sourcePath: string
):
  | { readonly ok: true; readonly value: Static<T> }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  if (validator.Check(value)) {
    return { ok: true, value };
  }
  const [, errors] = validator.Errors(value);
  return {
    ok: false,
    issues: errors
      .slice(0, MAX_CATALOG_ISSUES)
      .map((error) => issue("authority-schema-invalid", sourcePath, error.message)),
  };
}

function reconcileBlueprintSources(sources: readonly BlueprintSource[]): {
  readonly sources: readonly BlueprintSource[];
  readonly issues: readonly CatalogIssue[];
} {
  const byIdentity = new Map<string, BlueprintSource[]>();
  for (const source of [...sources].sort(compareBlueprintSources)) {
    const identity = blueprintIdentity(source.definition);
    byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), source]);
  }

  const reconciled: BlueprintSource[] = [];
  const issues: CatalogIssue[] = [];
  for (const [identity, candidates] of byIdentity) {
    const packageSources = candidates.filter(
      (source): source is PolicyPackBlueprintSource => source.kind === "policy-pack"
    );
    const localSources = candidates.filter(
      (source): source is LocalBlueprintSource => source.kind === "local"
    );
    const packageSource = packageSources[0];
    if (packageSource === undefined) {
      reconciled.push(...localSources);
      issues.push(
        ...duplicateIssues(
          localSources.map((source) => ({
            identity,
            path: source.relativePath,
          })),
          "authority-duplicate-blueprint",
          "blueprint"
        )
      );
      continue;
    }
    reconciled.push(packageSource);
    if (packageSources.length > 1) {
      issues.push(
        ...duplicateIssues(
          packageSources.map((source) => ({
            identity,
            path: blueprintSourcePath(source),
          })),
          "authority-duplicate-blueprint",
          "policy-pack blueprint"
        )
      );
    }
    for (const local of localSources) {
      if (Equal(packageSource.definition, local.definition)) continue;
      issues.push(
        issue(
          "authority-duplicate-blueprint",
          local.relativePath,
          `Local blueprint identity "${identity}" conflicts with selected policy-pack definition "${blueprintSourcePath(packageSource)}".`
        )
      );
    }
  }
  return { sources: reconciled.sort(compareBlueprintSources), issues };
}

function compareBlueprintSources(left: BlueprintSource, right: BlueprintSource): number {
  return (
    textOrder(left.definition.id, right.definition.id) ||
    left.definition.version - right.definition.version ||
    textOrder(left.kind, right.kind) ||
    textOrder(blueprintSourcePath(left), blueprintSourcePath(right))
  );
}

function comparePolicyPackMembers(
  left: PolicyPackBlueprintMember,
  right: PolicyPackBlueprintMember
): number {
  return (
    textOrder(left.id, right.id) || left.version - right.version || textOrder(left.path, right.path)
  );
}

function blueprintIdentity(definition: BlueprintDefinition): string {
  return `${definition.id}@${definition.version}`;
}

function isContained(root: string, target: string, path: Path.Path): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function toRepositoryPath(value: string, path: Path.Path): string {
  return path.sep === "/" ? value : value.split(path.sep).join("/");
}

function stableIssues(issues: readonly CatalogIssue[]): CatalogIssue[] {
  const unique = new Map<string, CatalogIssue>();
  for (const candidate of issues) {
    const bounded = {
      code: candidate.code,
      path: candidate.path.slice(0, 4_096),
      message: candidate.message.slice(0, 8_192),
    };
    unique.set(`${bounded.code}\0${bounded.path}\0${bounded.message}`, bounded);
  }
  return [...unique.values()]
    .sort(
      (left, right) =>
        textOrder(left.path, right.path) ||
        textOrder(left.code, right.code) ||
        textOrder(left.message, right.message)
    )
    .slice(0, MAX_CATALOG_ISSUES);
}

function issue(code: CatalogIssue["code"], path: string, message: string): CatalogIssue {
  return { code, path, message };
}

function textOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function renderCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

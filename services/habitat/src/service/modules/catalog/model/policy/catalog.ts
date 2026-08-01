import type { Path } from "effect";
import type { Static, TSchema } from "typebox";
import { Validator } from "typebox/schema";
import {
  type BlueprintDefinition,
  BlueprintDefinitionSchema,
  type CatalogIssue,
  type CompatibilityIndex,
  CompatibilityIndexSchema,
  type CompatibilityRuleSource,
  CompatibilityRuleSourceSchema,
  type HabitatCatalog,
  type HabitatInstanceManifest,
  HabitatInstanceManifestSchema,
  MAX_CATALOG_ISSUES,
  type PolicyPackManifest,
  PolicyPackManifestSchema,
  type PolicyPackPackageJson,
  PolicyPackPackageJsonSchema,
  type ResolveCatalogResult,
} from "../dto/catalog.js";

const MEMBER_PLACEHOLDER = "{member}";
const GLOB_CHARACTERS = /[*?[\]!]/;
const blueprintValidator = new Validator({}, BlueprintDefinitionSchema);
const policyPackManifestValidator = new Validator({}, PolicyPackManifestSchema);
const policyPackPackageJsonValidator = new Validator({}, PolicyPackPackageJsonSchema);
const instanceValidator = new Validator({}, HabitatInstanceManifestSchema);
const compatibilityIndexValidator = new Validator({}, CompatibilityIndexSchema);
const compatibilityRuleValidator = new Validator({}, CompatibilityRuleSourceSchema);

/** One schema-admitted local blueprint source. */
export type BlueprintSource = {
  readonly definition: BlueprintDefinition;
  readonly relativePath: string;
};

/** One admitted selected npm policy-pack envelope. */
export type PolicyPackSource = {
  readonly name: string;
  readonly version: string;
  readonly protocolVersion: 1;
  readonly blueprints: readonly [];
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

/** One schema-admitted inert compatibility rule source. */
export type CompatibilityRuleDocument = {
  readonly rule: CompatibilityRuleSource;
  readonly relativePath: string;
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

/** Admits the closed protocol envelope and refuses future member activation explicitly. */
export function admitPolicyPackManifest(
  value: unknown,
  sourcePath: string
):
  | { readonly ok: true; readonly value: PolicyPackManifest }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(policyPackManifestValidator, value, sourcePath);
  if (!admitted.ok) return admitted;
  return admitted.value.blueprints.length === 0
    ? admitted
    : {
        ok: false,
        issues: [
          issue(
            "authority-policy-pack-members-unsupported",
            sourcePath,
            "Policy-pack blueprint members are not admitted by this service version."
          ),
        ],
      };
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
    ? { ok: true, source: { definition: admitted.value, relativePath } }
    : admitted;
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
  | { readonly ok: true; readonly source: CompatibilityRuleDocument }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] } {
  const admitted = admit(compatibilityRuleValidator, value, relativePath);
  return admitted.ok ? { ok: true, source: { rule: admitted.value, relativePath } } : admitted;
}

/** Collects filesystem paths that schema-admitted documents require the service to observe. */
export function referencedRepositoryPaths(
  documents: CatalogDocuments,
  path: Path.Path
): readonly string[] {
  const references = new Set<string>();
  for (const source of documents.blueprints) {
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
    documents.blueprints.map((source) => [blueprintIdentity(source.definition), source] as const)
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
  const blueprints = [...documents.blueprints].sort(compareBlueprintSources);
  const manifests = [...documents.manifests].sort((left, right) =>
    textOrder(left.manifest.id, right.manifest.id)
  );

  issues.push(
    ...duplicateIssues(
      blueprints.map((source) => ({
        identity: blueprintIdentity(source.definition),
        path: source.relativePath,
      })),
      "authority-duplicate-blueprint",
      "blueprint"
    )
  );
  issues.push(
    ...duplicateIssues(
      manifests.map((source) => ({ identity: source.manifest.id, path: source.relativePath })),
      "authority-duplicate-instance",
      "instance"
    )
  );

  for (const source of blueprints) {
    issues.push(...validateBlueprint(source, path));
  }

  const compatibility = resolveCompatibility(documents, issues, path);
  const ruleSources = [
    ...blueprints.flatMap((source) =>
      source.definition.rules.map((rule) => ({ identity: rule.id, path: source.relativePath }))
    ),
    ...compatibility.rules.map((rule) => ({ identity: rule.id, path: rule.manifestPath })),
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
      const assetPath = ruleAssetPath(definitionSource, rule, path);
      const asset = {
        provenance: {
          kind: "local" as const,
          authorityRoot: workspaceRoot,
          relativePath: definitionSource.relativePath,
        },
        relativePath: assetPath,
        absolutePath: path.resolve(workspaceRoot, assetPath),
      };
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
        provenance: asset.provenance,
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
        blueprints: [],
      },
      blueprints: blueprints.map((source) => ({
        definition: source.definition,
        provenance: {
          kind: "local",
          authorityRoot: workspaceRoot,
          relativePath: source.relativePath,
        },
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
  }
  const rules = [...documents.compatibilityRules]
    .sort(
      (left, right) =>
        textOrder(left.rule.id, right.rule.id) || textOrder(left.relativePath, right.relativePath)
    )
    .map((source) => {
      if (!Object.hasOwn(ownerRoots, source.rule.ownerProject)) {
        issues.push(
          issue(
            "authority-compatibility-invalid",
            source.relativePath,
            `Legacy rule ownerProject "${source.rule.ownerProject}" has no owner root.`
          )
        );
      }
      return {
        id: source.rule.id,
        ownerProject: source.rule.ownerProject,
        manifestPath: source.relativePath,
      };
    });
  return { schemaVersion: 2, ownerRoots, rules };
}

function validateBlueprint(source: BlueprintSource, path: Path.Path): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const kind = source.relativePath.split("/")[2];
  if (kind !== source.definition.id) {
    issues.push(
      issue(
        "authority-definition-kind-mismatch",
        source.relativePath,
        `Blueprint path kind "${kind ?? ""}" does not equal definition id "${source.definition.id}".`
      )
    );
  }
  issues.push(
    ...sortedUniqueIssues(
      source.definition.instance.roots.map((root) => root.id),
      source.relativePath,
      "root roles"
    ),
    ...sortedUniqueIssues(
      source.definition.instance.selections.map((selection) => selection.id),
      source.relativePath,
      "selection axes"
    ),
    ...sortedUniqueIssues(
      source.definition.rules.map((rule) => rule.id),
      source.relativePath,
      "rule ids"
    )
  );
  const roots = new Map(source.definition.instance.roots.map((root) => [root.id, root]));
  const anchor = roots.get(source.definition.instance.anchorRoot);
  if (!anchor || !anchor.required || anchor.kind !== "directory") {
    issues.push(
      issue(
        "authority-definition-invalid",
        source.relativePath,
        `anchorRoot "${source.definition.instance.anchorRoot}" must name a required directory root role.`
      )
    );
  }
  for (const selection of source.definition.instance.selections) {
    const sourcePath = `${source.relativePath}#selection:${selection.id}`;
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
    const sourcePath = `${source.relativePath}#rule:${rule.id}`;
    const asset = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
    issues.push(...relativePathIssues(asset, sourcePath, path));
    if (rule.runner.name === "habitat") continue;
    issues.push(
      ...sortedUniqueIssues(rule.runner.acquisition.rootRoles, sourcePath, "acquisition rootRoles"),
      ...sortedUniqueIssues(
        rule.runner.acquisition.selections,
        sourcePath,
        "acquisition selections"
      )
    );
    if (
      rule.runner.acquisition.rootRoles.length === 0 &&
      rule.runner.acquisition.selections.length === 0
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

function ruleAssetPath(
  source: BlueprintSource,
  rule: BlueprintDefinition["rules"][number],
  path: Path.Path
): string {
  const asset = rule.runner.name === "habitat" ? rule.runner.structure : rule.runner.pattern;
  return toRepositoryPath(path.join(path.dirname(source.relativePath), asset), path);
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

function compareBlueprintSources(left: BlueprintSource, right: BlueprintSource): number {
  return (
    textOrder(left.definition.id, right.definition.id) ||
    left.definition.version - right.definition.version
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

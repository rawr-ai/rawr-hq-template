import { Effect, type FileSystem, type Path, type PlatformError } from "effect";
import { parse as parseToml } from "smol-toml";
import { base } from "../../../base.js";
import type { CatalogIssue } from "../model/dto/catalog.js";
import {
  admitBlueprintSource,
  admitCompatibilityBaseline,
  admitCompatibilityIndex,
  admitCompatibilityRule,
  admitInstanceSource,
  admitPolicyPackBlueprintSource,
  admitPolicyPackManifest,
  admitPolicyPackPackageJson,
  admitPolicyPackSelection,
  type BlueprintSource,
  type CatalogDocuments,
  type CatalogPathFact,
  type CompatibilityRuleDocument,
  type InstanceSource,
  type PolicyPackRunnerAssetSource,
  type PolicyPackSource,
  policyPackRunnerAssetPaths,
  referencedRepositoryPaths,
  rejected,
  resolveCatalog,
} from "../model/policy/catalog.js";
import { excludedRepositoryDirectorySegments } from "../model/policy/repository-paths.js";

const authorityGlobs = [
  { kind: "blueprint" as const, pattern: ".habitat/blueprints/*/blueprint.toml" },
  {
    kind: "blueprint" as const,
    pattern: ".habitat/blueprints/*/versions/*/blueprint.toml",
  },
  { kind: "rule" as const, pattern: ".habitat/**/rule.json" },
];
const compatibilityIndexAuthorityPath = ".habitat/index.json";

const excludedRepositoryGlobs = [...excludedRepositoryDirectorySegments].map(
  (segment) => `**/${segment}/**`
);
const MAX_MANIFEST_DIRECTORIES = 50_000;

/** Derives the request-local catalog resolution Effect from the complete service context. */
export const middleware = base.middleware(async ({ context, next }) => {
  const { fileSystem, path } = context.deps;
  const workspaceRoot = context.scope.workspaceRoot;
  const policyPackSelection = context.config.policyPack;
  const currentCatalog = Effect.gen(function* () {
    const selectedPolicyPack = admitPolicyPackSelection(policyPackSelection, path);
    if (!selectedPolicyPack.ok) return rejected(selectedPolicyPack.issues);

    const selection = selectedPolicyPack.selection;
    const packageSourcePath = `${selection.name}/package.json`;
    const manifestSourcePath = `${selection.name}/habitat-pack.json`;
    const packageRead = yield* Effect.result(fileSystem.readFileString(selection.packageJsonPath));
    const manifestRead = yield* Effect.result(fileSystem.readFileString(selection.manifestPath));
    const policyPackIssues: CatalogIssue[] = [];
    if (packageRead._tag === "Failure") {
      policyPackIssues.push(
        filesystemIssue(
          packageRead.failure,
          packageSourcePath,
          "read selected policy-pack package.json",
          "Selected policy-pack package.json does not exist."
        )
      );
    }
    if (manifestRead._tag === "Failure") {
      policyPackIssues.push(
        filesystemIssue(
          manifestRead.failure,
          manifestSourcePath,
          "read selected policy-pack manifest",
          "Selected policy-pack manifest does not exist."
        )
      );
    }
    if (packageRead._tag === "Failure" || manifestRead._tag === "Failure") {
      return rejected(policyPackIssues);
    }

    const parsedPackage = yield* Effect.result(
      Effect.try({ try: (): unknown => JSON.parse(packageRead.success), catch: (cause) => cause })
    );
    const parsedManifest = yield* Effect.result(
      Effect.try({
        try: (): unknown => JSON.parse(manifestRead.success),
        catch: (cause) => cause,
      })
    );
    if (parsedPackage._tag === "Failure") {
      policyPackIssues.push({
        code: "authority-json-invalid",
        path: packageSourcePath,
        message: "Selected policy-pack package.json is not valid JSON.",
      });
    }
    if (parsedManifest._tag === "Failure") {
      policyPackIssues.push({
        code: "authority-json-invalid",
        path: manifestSourcePath,
        message: "Selected policy-pack manifest is not valid JSON.",
      });
    }
    if (parsedPackage._tag === "Failure" || parsedManifest._tag === "Failure") {
      return rejected(policyPackIssues);
    }

    const admittedPackage = admitPolicyPackPackageJson(
      parsedPackage.success,
      selection.name,
      packageSourcePath
    );
    const admittedManifest = admitPolicyPackManifest(
      parsedManifest.success,
      manifestSourcePath,
      path
    );
    if (!admittedPackage.ok) policyPackIssues.push(...admittedPackage.issues);
    if (!admittedManifest.ok) policyPackIssues.push(...admittedManifest.issues);
    if (!admittedPackage.ok || !admittedManifest.ok) return rejected(policyPackIssues);
    const selectedPackageRoot = path.dirname(selection.packageJsonPath);
    const packageRealPathAttempt = yield* Effect.result(fileSystem.realPath(selectedPackageRoot));
    if (packageRealPathAttempt._tag === "Failure") {
      return rejected([
        filesystemIssue(
          packageRealPathAttempt.failure,
          selection.name,
          "resolve selected policy-pack root",
          "Selected policy-pack root does not exist."
        ),
      ]);
    }
    const packageRoot = packageRealPathAttempt.success;
    const policyPack: PolicyPackSource = {
      name: admittedPackage.value.name,
      version: admittedPackage.value.version,
      packageRoot,
      protocolVersion: admittedManifest.value.protocolVersion,
      blueprints: admittedManifest.value.blueprints,
    };
    const packageBlueprints: BlueprintSource[] = [];
    for (const member of policyPack.blueprints) {
      const memberSourcePath = `${policyPack.name}/${member.path}`;
      const memberRead = yield* readPolicyPackFile({
        fileSystem,
        path,
        packageRoot: selectedPackageRoot,
        packageRealRoot: packageRoot,
        relativePath: member.path,
        sourcePath: memberSourcePath,
        label: "blueprint member",
      });
      if (!memberRead.ok) {
        policyPackIssues.push(memberRead.issue);
        continue;
      }
      const parsedMember = yield* Effect.result(
        Effect.try({ try: () => parseToml(memberRead.contents), catch: (cause) => cause })
      );
      if (parsedMember._tag === "Failure") {
        policyPackIssues.push({
          code: "authority-toml-invalid",
          path: memberSourcePath,
          message: "Policy-pack blueprint member is not valid TOML.",
        });
        continue;
      }
      const admittedMember = admitPolicyPackBlueprintSource(
        parsedMember.success,
        member,
        policyPack,
        []
      );
      if (!admittedMember.ok) {
        policyPackIssues.push(...admittedMember.issues);
        continue;
      }
      const declaredAssets = policyPackRunnerAssetPaths(
        admittedMember.source.definition,
        member,
        policyPack.name,
        path
      );
      if (!declaredAssets.ok) {
        policyPackIssues.push(...declaredAssets.issues);
        continue;
      }

      const admittedAssetsByPath = new Map<
        string,
        { readonly relativePath: string; readonly absolutePath: string }
      >();
      const runnerAssets: PolicyPackRunnerAssetSource[] = [];
      for (const asset of declaredAssets.assets) {
        let admittedAsset = admittedAssetsByPath.get(asset.relativePath);
        if (admittedAsset === undefined) {
          const assetRead = yield* readPolicyPackFile({
            fileSystem,
            path,
            packageRoot: selectedPackageRoot,
            packageRealRoot: packageRoot,
            relativePath: asset.relativePath,
            sourcePath: `${memberSourcePath}#rule:${asset.ruleId}`,
            label: "runner asset",
          });
          if (!assetRead.ok) {
            policyPackIssues.push(assetRead.issue);
            continue;
          }
          admittedAsset = {
            relativePath: assetRead.relativePath,
            absolutePath: assetRead.absolutePath,
          };
          admittedAssetsByPath.set(asset.relativePath, admittedAsset);
        }
        runnerAssets.push({ ruleId: asset.ruleId, ...admittedAsset });
      }
      if (runnerAssets.length !== declaredAssets.assets.length) continue;
      packageBlueprints.push({ ...admittedMember.source, runnerAssets });
    }
    if (policyPackIssues.length > 0) return rejected(policyPackIssues);

    if (!path.isAbsolute(workspaceRoot)) {
      return rejected([
        {
          code: "authority-workspace-root-invalid",
          path: workspaceRoot,
          message: "workspaceRoot must be absolute.",
        },
      ]);
    }

    const workspaceRealPathAttempt = yield* Effect.result(fileSystem.realPath(workspaceRoot));
    if (workspaceRealPathAttempt._tag === "Failure") {
      return rejected([
        filesystemIssue(
          workspaceRealPathAttempt.failure,
          workspaceRoot,
          "resolve workspaceRoot",
          "workspaceRoot does not exist."
        ),
      ]);
    }
    const workspaceRealRoot = workspaceRealPathAttempt.success;
    const excludes = excludedRepositoryGlobs.map((pattern) => path.resolve(workspaceRoot, pattern));
    const globResults = yield* Effect.all(
      authorityGlobs.map(({ kind, pattern }) =>
        Effect.result(
          fileSystem.glob(path.resolve(workspaceRoot, pattern), { exclude: excludes })
        ).pipe(Effect.map((result) => ({ kind, result })))
      )
    );

    const enumerationIssues: CatalogIssue[] = [];
    const pathsByKind = {
      blueprint: [] as string[],
      index: [] as string[],
      rule: [] as string[],
    };
    for (const { kind, result } of globResults) {
      if (result._tag === "Failure") {
        if (isNotFound(result.failure)) continue;
        enumerationIssues.push(
          filesystemIssue(
            result.failure,
            authorityGlobs.find((candidate) => candidate.kind === kind)?.pattern ?? kind,
            "enumerate authority",
            "Authority enumeration root does not exist."
          )
        );
        continue;
      }
      for (const candidate of result.success) {
        const absolutePath = path.resolve(workspaceRoot, candidate);
        const relativePath = toRepositoryPath(path.relative(workspaceRoot, absolutePath), path.sep);
        pathsByKind[kind].push(relativePath);
      }
    }

    const compatibilityIndexStat = yield* Effect.result(
      fileSystem.stat(path.resolve(workspaceRoot, compatibilityIndexAuthorityPath))
    );
    if (compatibilityIndexStat._tag === "Success") {
      pathsByKind.index.push(compatibilityIndexAuthorityPath);
    } else if (!isNotFound(compatibilityIndexStat.failure)) {
      enumerationIssues.push(
        filesystemIssue(
          compatibilityIndexStat.failure,
          compatibilityIndexAuthorityPath,
          "inspect compatibility index",
          "Compatibility index does not exist."
        )
      );
    }

    // The installed glob provider skips hidden directories, so manifests use a confined traversal.
    const manifestCandidates: string[] = [];
    const pendingDirectories = [{ relativePath: "", realPath: workspaceRealRoot }];
    const visitedDirectories = new Set([workspaceRealRoot]);
    let manifestDirectoryIndex = 0;
    let manifestDirectoryBoundReached = false;
    while (manifestDirectoryIndex < pendingDirectories.length && !manifestDirectoryBoundReached) {
      const directory = pendingDirectories[manifestDirectoryIndex];
      manifestDirectoryIndex += 1;
      if (directory === undefined) break;
      const readDirectoryAttempt = yield* Effect.result(
        fileSystem.readDirectory(directory.realPath)
      );
      if (readDirectoryAttempt._tag === "Failure") {
        if (directory.relativePath !== "" && isNotFound(readDirectoryAttempt.failure)) continue;
        enumerationIssues.push(
          filesystemIssue(
            readDirectoryAttempt.failure,
            directory.relativePath || ".",
            "enumerate instance authority",
            "Manifest enumeration directory does not exist."
          )
        );
        continue;
      }
      for (const entry of stablePaths(readDirectoryAttempt.success)) {
        if (excludedRepositoryDirectorySegments.has(entry)) continue;
        const relativePath = toRepositoryPath(
          directory.relativePath === "" ? entry : `${directory.relativePath}/${entry}`,
          path.sep
        );
        const absolutePath = path.resolve(workspaceRoot, relativePath);
        const statAttempt = yield* Effect.result(fileSystem.stat(absolutePath));
        if (statAttempt._tag === "Failure") {
          if (isNotFound(statAttempt.failure)) continue;
          enumerationIssues.push(
            filesystemIssue(
              statAttempt.failure,
              relativePath,
              "inspect manifest enumeration entry",
              "Manifest enumeration entry does not exist."
            )
          );
          continue;
        }
        if (statAttempt.success.type === "File") {
          if (entry === "habitat.toml" && !relativePath.startsWith(".habitat/blueprints/")) {
            manifestCandidates.push(relativePath);
          }
          continue;
        }
        if (statAttempt.success.type !== "Directory") continue;
        const realPathAttempt = yield* Effect.result(fileSystem.realPath(absolutePath));
        if (realPathAttempt._tag === "Failure") {
          if (isNotFound(realPathAttempt.failure)) continue;
          enumerationIssues.push(
            filesystemIssue(
              realPathAttempt.failure,
              relativePath,
              "resolve manifest enumeration directory",
              "Manifest enumeration directory does not exist."
            )
          );
          continue;
        }
        if (!isContained(workspaceRealRoot, realPathAttempt.success, path)) continue;
        if (visitedDirectories.has(realPathAttempt.success)) continue;
        if (pendingDirectories.length >= MAX_MANIFEST_DIRECTORIES) {
          enumerationIssues.push({
            code: "authority-resolution-failed",
            path: relativePath,
            message: `Manifest enumeration exceeded ${MAX_MANIFEST_DIRECTORIES} directories.`,
          });
          manifestDirectoryBoundReached = true;
          break;
        }
        visitedDirectories.add(realPathAttempt.success);
        pendingDirectories.push({ relativePath, realPath: realPathAttempt.success });
      }
    }
    if (enumerationIssues.length > 0) return rejected(enumerationIssues);

    const blueprintPaths = stablePaths(pathsByKind.blueprint);
    const manifestPaths = stablePaths(manifestCandidates);
    const indexPaths = stablePaths(pathsByKind.index).filter(
      (candidate) => candidate === ".habitat/index.json"
    );
    const compatibilityRulePaths = indexPaths.length === 0 ? [] : stablePaths(pathsByKind.rule);
    const authorityPaths = stablePaths([
      ...blueprintPaths,
      ...manifestPaths,
      ...indexPaths,
      ...compatibilityRulePaths,
    ]);

    const issues: CatalogIssue[] = [];
    const sourceText = new Map<string, string>();
    for (const relativePath of authorityPaths) {
      const absolutePath = path.resolve(workspaceRoot, relativePath);
      if (!isContained(workspaceRoot, absolutePath, path)) {
        issues.push({
          code: "authority-path-escape",
          path: relativePath,
          message: "Authority document escapes workspaceRoot.",
        });
        continue;
      }
      const realPathAttempt = yield* Effect.result(fileSystem.realPath(absolutePath));
      if (realPathAttempt._tag === "Failure") {
        issues.push(
          filesystemIssue(
            realPathAttempt.failure,
            relativePath,
            "resolve authority document",
            "Authority document does not exist."
          )
        );
        continue;
      }
      if (!isContained(workspaceRealRoot, realPathAttempt.success, path)) {
        issues.push({
          code: "authority-path-escape",
          path: relativePath,
          message: "Authority document escapes workspaceRoot through a symbolic link.",
        });
        continue;
      }
      const statAttempt = yield* Effect.result(fileSystem.stat(realPathAttempt.success));
      if (statAttempt._tag === "Failure") {
        issues.push(
          filesystemIssue(
            statAttempt.failure,
            relativePath,
            "inspect authority document",
            "Authority document does not exist."
          )
        );
        continue;
      }
      if (statAttempt.success.type !== "File") {
        issues.push({
          code: "authority-path-kind-mismatch",
          path: relativePath,
          message: "Authority document must be a regular file.",
        });
        continue;
      }
      const readAttempt = yield* Effect.result(fileSystem.readFileString(realPathAttempt.success));
      if (readAttempt._tag === "Failure") {
        issues.push(
          filesystemIssue(
            readAttempt.failure,
            relativePath,
            "read authority document",
            "Authority document does not exist."
          )
        );
        continue;
      }
      sourceText.set(relativePath, readAttempt.success);
    }
    if (issues.length > 0) return rejected(issues);

    const blueprints: BlueprintSource[] = [];
    for (const relativePath of blueprintPaths) {
      const text = sourceText.get(relativePath);
      if (text === undefined) continue;
      const parse = Effect.try({
        try: () => parseToml(text),
        catch: (cause) => cause,
      });
      const parsed = yield* Effect.result(parse);
      if (parsed._tag === "Failure") {
        issues.push({
          code: "authority-toml-invalid",
          path: relativePath,
          message: "Blueprint authority is not valid TOML.",
        });
        continue;
      }
      const admitted = admitBlueprintSource(parsed.success, relativePath);
      if (admitted.ok) blueprints.push(admitted.source);
      else issues.push(...admitted.issues);
    }

    const manifests: InstanceSource[] = [];
    for (const relativePath of manifestPaths) {
      const text = sourceText.get(relativePath);
      if (text === undefined) continue;
      const parse = Effect.try({
        try: () => parseToml(text),
        catch: (cause) => cause,
      });
      const parsed = yield* Effect.result(parse);
      if (parsed._tag === "Failure") {
        issues.push({
          code: "authority-toml-invalid",
          path: relativePath,
          message: "Instance authority is not valid TOML.",
        });
        continue;
      }
      const admitted = admitInstanceSource(parsed.success, relativePath);
      if (admitted.ok) manifests.push(admitted.source);
      else issues.push(...admitted.issues);
    }

    let compatibilityIndex: CatalogDocuments["compatibilityIndex"];
    const compatibilityIndexPath = indexPaths[0];
    if (compatibilityIndexPath !== undefined) {
      const text = sourceText.get(compatibilityIndexPath);
      if (text !== undefined) {
        const parse = Effect.try({
          try: (): unknown => JSON.parse(text),
          catch: (cause) => cause,
        });
        const parsed = yield* Effect.result(parse);
        if (parsed._tag === "Failure") {
          issues.push({
            code: "authority-json-invalid",
            path: compatibilityIndexPath,
            message: "Compatibility index is not valid JSON.",
          });
        } else {
          const admitted = admitCompatibilityIndex(parsed.success, compatibilityIndexPath);
          if (admitted.ok) compatibilityIndex = admitted.value;
          else issues.push(...admitted.issues);
        }
      }
    }

    const compatibilityRules: CompatibilityRuleDocument[] = [];
    for (const relativePath of compatibilityRulePaths) {
      const text = sourceText.get(relativePath);
      if (text === undefined) continue;
      const parse = Effect.try({
        try: (): unknown => JSON.parse(text),
        catch: (cause) => cause,
      });
      const parsed = yield* Effect.result(parse);
      if (parsed._tag === "Failure") {
        issues.push({
          code: "authority-json-invalid",
          path: relativePath,
          message: "Compatibility rule manifest is not valid JSON.",
        });
        continue;
      }
      const admitted = admitCompatibilityRule(parsed.success, relativePath);
      if (!admitted.ok) {
        issues.push(...admitted.issues);
        continue;
      }

      const baselinePath = admitted.source.rule.supportFiles.baseline;
      const absoluteBaselinePath = path.resolve(workspaceRoot, baselinePath);
      if (!isContained(workspaceRoot, absoluteBaselinePath, path)) {
        issues.push({
          code: "authority-path-escape",
          path: baselinePath,
          message: "Compatibility baseline escapes workspaceRoot.",
        });
        continue;
      }
      const baselineRealPath = yield* Effect.result(fileSystem.realPath(absoluteBaselinePath));
      if (baselineRealPath._tag === "Failure") {
        issues.push(
          filesystemIssue(
            baselineRealPath.failure,
            baselinePath,
            "resolve compatibility baseline",
            "Compatibility baseline does not exist."
          )
        );
        continue;
      }
      if (!isContained(workspaceRealRoot, baselineRealPath.success, path)) {
        issues.push({
          code: "authority-path-escape",
          path: baselinePath,
          message: "Compatibility baseline escapes workspaceRoot through a symbolic link.",
        });
        continue;
      }
      const baselineStat = yield* Effect.result(fileSystem.stat(baselineRealPath.success));
      if (baselineStat._tag === "Failure") {
        issues.push(
          filesystemIssue(
            baselineStat.failure,
            baselinePath,
            "inspect compatibility baseline",
            "Compatibility baseline does not exist."
          )
        );
        continue;
      }
      if (baselineStat.success.type !== "File") {
        issues.push({
          code: "authority-path-kind-mismatch",
          path: baselinePath,
          message: "Compatibility baseline must be a regular file.",
        });
        continue;
      }
      const baselineRead = yield* Effect.result(
        fileSystem.readFileString(baselineRealPath.success)
      );
      if (baselineRead._tag === "Failure") {
        issues.push(
          filesystemIssue(
            baselineRead.failure,
            baselinePath,
            "read compatibility baseline",
            "Compatibility baseline does not exist."
          )
        );
        continue;
      }
      const baselineParsed = yield* Effect.result(
        Effect.try({
          try: (): unknown => JSON.parse(baselineRead.success),
          catch: (cause) => cause,
        })
      );
      if (baselineParsed._tag === "Failure") {
        issues.push({
          code: "authority-json-invalid",
          path: baselinePath,
          message: "Compatibility baseline is not valid JSON.",
        });
        continue;
      }
      const baseline = admitCompatibilityBaseline(baselineParsed.success, baselinePath);
      if (!baseline.ok) {
        issues.push(...baseline.issues);
        continue;
      }
      compatibilityRules.push({ ...admitted.source, baseline: baseline.value });
    }

    if (issues.length > 0) return rejected(issues);
    const documents: CatalogDocuments = {
      policyPack,
      blueprints: [...packageBlueprints, ...blueprints],
      manifests,
      compatibilityIndex,
      compatibilityRules,
    };
    const pathFacts = new Map<string, CatalogPathFact>();
    for (const relativePath of referencedRepositoryPaths(documents, path)) {
      const absolutePath = path.resolve(workspaceRoot, relativePath);
      const statAttempt = yield* Effect.result(fileSystem.stat(absolutePath));
      if (statAttempt._tag === "Failure") {
        const notFound = isNotFound(statAttempt.failure);
        pathFacts.set(relativePath, {
          relativePath,
          absolutePath,
          kind: notFound ? "missing" : "other",
          detail: notFound
            ? `Admitted path does not exist: "${relativePath}".`
            : `Unable to inspect admitted path "${relativePath}".`,
          filesystemError: !notFound,
        });
        continue;
      }
      const kind =
        statAttempt.success.type === "Directory"
          ? "directory"
          : statAttempt.success.type === "File"
            ? "file"
            : "other";
      const realPathAttempt = yield* Effect.result(fileSystem.realPath(absolutePath));
      if (realPathAttempt._tag === "Failure") {
        const notFound = isNotFound(realPathAttempt.failure);
        pathFacts.set(relativePath, {
          relativePath,
          absolutePath,
          kind: notFound ? "missing" : kind,
          detail: notFound
            ? `Admitted path does not exist: "${relativePath}".`
            : `Unable to resolve admitted path "${relativePath}".`,
          filesystemError: !notFound,
        });
        continue;
      }
      pathFacts.set(relativePath, {
        relativePath,
        absolutePath,
        kind,
        realPath: realPathAttempt.success,
      });
    }

    return resolveCatalog(documents, pathFacts, workspaceRoot, workspaceRealRoot, path);
  });

  return next({ context: { currentCatalog } });
});

type PolicyPackFileReadInput = {
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly packageRoot: string;
  readonly packageRealRoot: string;
  readonly relativePath: string;
  readonly sourcePath: string;
  readonly label: "blueprint member" | "runner asset";
};

const readPolicyPackFile = Effect.fn("habitat.catalog.readPolicyPackFile")(function* ({
  fileSystem,
  path,
  packageRoot,
  packageRealRoot,
  relativePath,
  sourcePath,
  label,
}: PolicyPackFileReadInput) {
  const absolutePath = path.resolve(packageRoot, relativePath);
  if (!isContained(packageRoot, absolutePath, path)) {
    return {
      ok: false as const,
      issue: {
        code: "authority-path-escape" as const,
        path: sourcePath,
        message: `Policy-pack ${label} escapes the selected package root.`,
      },
    };
  }
  const realPathAttempt = yield* Effect.result(fileSystem.realPath(absolutePath));
  if (realPathAttempt._tag === "Failure") {
    return {
      ok: false as const,
      issue: filesystemIssue(
        realPathAttempt.failure,
        sourcePath,
        `resolve policy-pack ${label}`,
        `Policy-pack ${label} does not exist.`
      ),
    };
  }
  if (!isContained(packageRealRoot, realPathAttempt.success, path)) {
    return {
      ok: false as const,
      issue: {
        code: "authority-path-escape" as const,
        path: sourcePath,
        message: `Policy-pack ${label} escapes the selected package root through a symbolic link.`,
      },
    };
  }
  const statAttempt = yield* Effect.result(fileSystem.stat(realPathAttempt.success));
  if (statAttempt._tag === "Failure") {
    return {
      ok: false as const,
      issue: filesystemIssue(
        statAttempt.failure,
        sourcePath,
        `inspect policy-pack ${label}`,
        `Policy-pack ${label} does not exist.`
      ),
    };
  }
  if (statAttempt.success.type !== "File") {
    return {
      ok: false as const,
      issue: {
        code: "authority-path-kind-mismatch" as const,
        path: sourcePath,
        message: `Policy-pack ${label} must be a regular file.`,
      },
    };
  }
  const readAttempt = yield* Effect.result(fileSystem.readFileString(realPathAttempt.success));
  if (readAttempt._tag === "Failure") {
    return {
      ok: false as const,
      issue: filesystemIssue(
        readAttempt.failure,
        sourcePath,
        `read policy-pack ${label}`,
        `Policy-pack ${label} does not exist.`
      ),
    };
  }
  return {
    ok: true as const,
    relativePath,
    absolutePath: realPathAttempt.success,
    contents: readAttempt.success,
  };
});

function filesystemIssue(
  error: PlatformError.PlatformError,
  path: string,
  action: string,
  missingMessage: string
): CatalogIssue {
  return isNotFound(error)
    ? { code: "authority-path-missing", path, message: missingMessage }
    : {
        code: "authority-filesystem-failed",
        path,
        message: `Unable to ${action}.`,
      };
}

function isNotFound(error: PlatformError.PlatformError): boolean {
  return error.reason._tag === "NotFound";
}

function stablePaths(paths: readonly string[]): string[] {
  return [...new Set(paths)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function toRepositoryPath(value: string, separator: string): string {
  return separator === "/" ? value : value.split(separator).join("/");
}

function isContained(root: string, target: string, path: Path.Path): boolean {
  const candidate = path.relative(root, target);
  return (
    candidate === "" ||
    (candidate !== ".." && !candidate.startsWith(`..${path.sep}`) && !path.isAbsolute(candidate))
  );
}

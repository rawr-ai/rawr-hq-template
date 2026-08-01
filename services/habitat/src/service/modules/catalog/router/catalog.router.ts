import type { RuleEvaluationFinding } from "@habitat-ai/resource-rule-evaluation";
import { MAX_SOURCE_INVENTORY_ENTRIES } from "@habitat-ai/resource-source-inventory";
import { Effect, type FileSystem, type Path, type PlatformError } from "effect";
import { parse as parseToml } from "smol-toml";
import type { CatalogIssue } from "../model/dto/catalog.js";
import type {
  CheckApplicationReport,
  CheckCatalogResult,
  CheckSelectionIssue,
} from "../model/dto/check.js";
import {
  admitBlueprintSource,
  admitCompatibilityBaseline,
  admitCompatibilityIndex,
  admitCompatibilityRule,
  admitInstanceSource,
  admitPolicyPackManifest,
  admitPolicyPackPackageJson,
  admitPolicyPackSelection,
  type BlueprintSource,
  type CatalogDocuments,
  type CatalogPathFact,
  type CompatibilityRuleDocument,
  type InstanceSource,
  type PolicyPackSelection,
  type PolicyPackSource,
  referencedRepositoryPaths,
  rejected,
  resolveCatalog,
} from "../model/policy/catalog.js";
import {
  completedCheck,
  evaluatedApplication,
  evaluatedStructureApplication,
  extractGritProgram,
  failedApplication,
  failedStructureApplication,
  type GritCheckApplication,
  isCompatibilityRule,
  notApplicableApplication,
  selectCheckApplications,
} from "../model/policy/check.js";
import {
  type AdmittedStructureApplication,
  admitStructureDocument,
  evaluateStructurePlan,
  isHabitatStructureApplication,
  makeStructureUniverse,
  planStructureEvaluation,
  type StructureRootKind,
  structureChildObservationPaths,
} from "../model/policy/structure.js";
import { module } from "../module.js";

const authorityGlobs = [
  { kind: "blueprint" as const, pattern: ".habitat/blueprints/*/blueprint.toml" },
  // Effect's glob provider requires a dynamic pattern even for this exact optional file.
  { kind: "index" as const, pattern: ".habitat/{index.json}" },
  { kind: "rule" as const, pattern: ".habitat/**/rule.json" },
];

const excludedDirectorySegments = new Set([
  ".git",
  ".nx",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "vendor",
]);
const excludedRepositoryGlobs = [...excludedDirectorySegments].map((segment) => `**/${segment}/**`);
const compatibilityProtectedRoots = [
  ".git",
  ".habitat/cache/patterns",
  "dist",
  "node_modules",
  "tools/habitat/dist",
];
const MAX_MANIFEST_DIRECTORIES = 50_000;

type StructureCheckApplicationReport = Extract<CheckApplicationReport, { runner: "habitat" }>;
type StructurePreparation =
  | { readonly kind: "failed"; readonly report: StructureCheckApplicationReport }
  | { readonly kind: "admitted"; readonly value: AdmittedStructureApplication };
type CheckApplicationPreparation =
  | { readonly kind: "grit"; readonly application: GritCheckApplication }
  | { readonly kind: "structure"; readonly preparation: StructurePreparation };
type StructureInventoryPreparation =
  | { readonly kind: "not-required" }
  | { readonly kind: "failed"; readonly detail: string }
  | { readonly kind: "ready"; readonly universe: ReturnType<typeof makeStructureUniverse> };
type StructureRootObservationFailure = {
  readonly ok: false;
  readonly detail: string;
};
type StructureRootObservation =
  | { readonly ok: true; readonly kind: StructureRootKind | "missing" }
  | StructureRootObservationFailure;
type StructureObservationPreparation =
  | {
      readonly kind: "ready";
      readonly kinds: Map<string, StructureRootKind | "missing">;
    }
  | { readonly kind: "failed"; readonly detail: string };

type CatalogOperationContext = {
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly workspaceRoot: string;
  readonly policyPack: PolicyPackSelection;
};

function resolveCurrentCatalog(context: CatalogOperationContext) {
  return Effect.gen(function* () {
    const { fileSystem, path } = context;
    const workspaceRoot = context.workspaceRoot;
    const selectedPolicyPack = admitPolicyPackSelection(context.policyPack, path);
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
    const admittedManifest = admitPolicyPackManifest(parsedManifest.success, manifestSourcePath);
    if (!admittedPackage.ok) policyPackIssues.push(...admittedPackage.issues);
    if (!admittedManifest.ok) policyPackIssues.push(...admittedManifest.issues);
    if (!admittedPackage.ok || !admittedManifest.ok) return rejected(policyPackIssues);
    const policyPack: PolicyPackSource = {
      name: admittedPackage.value.name,
      version: admittedPackage.value.version,
      protocolVersion: admittedManifest.value.protocolVersion,
      blueprints: [],
    };

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
        if (excludedDirectorySegments.has(entry)) continue;
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
      blueprints,
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
}

/**
 * Catalog authority operations share one current-repository resolution boundary.
 *
 * `resolve` returns that admitted authority directly. `check` consumes the same
 * resolution, selects applications, and invokes only ready host resources.
 */
const resolve = module.resolve.effect(function* ({ context }) {
  return yield* resolveCurrentCatalog(context);
});

const check = module.check.effect(function* ({ context, input }) {
  const resolved = yield* resolveCurrentCatalog(context);
  if (resolved._tag === "Rejected") {
    return catalogRejected(resolved.issues);
  }

  const selection = selectCheckApplications(resolved.catalog, input);
  if (!selection.ok) {
    return selectionRejected(selection.issues);
  }

  const observedKinds = new Map<string, StructureRootObservation>();
  const observeStructurePathKind = (relativePath: string) =>
    Effect.gen(function* () {
      const absolutePath = context.path.resolve(context.workspaceRoot, relativePath);
      const linkAttempt = yield* Effect.result(context.fileSystem.readLink(absolutePath));
      if (linkAttempt._tag === "Success") {
        return { ok: true, kind: "other" } satisfies StructureRootObservation;
      }
      if (isNotFound(linkAttempt.failure) || hasExactCauseCode(linkAttempt.failure, "ENOTDIR")) {
        return { ok: true, kind: "missing" } satisfies StructureRootObservation;
      }
      if (!hasExactCauseCode(linkAttempt.failure, "EINVAL")) {
        return {
          ok: false,
          detail: `Unable to inspect structure path "${relativePath || "."}".`,
        } satisfies StructureRootObservation;
      }
      const statAttempt = yield* Effect.result(context.fileSystem.stat(absolutePath));
      if (statAttempt._tag === "Failure") {
        if (isNotFound(statAttempt.failure) || hasExactCauseCode(statAttempt.failure, "ENOTDIR")) {
          return { ok: true, kind: "missing" } satisfies StructureRootObservation;
        }
        return {
          ok: false,
          detail: `Unable to inspect structure path "${relativePath || "."}".`,
        } satisfies StructureRootObservation;
      }
      const kind: StructureRootKind =
        statAttempt.success.type === "Directory"
          ? "directory"
          : statAttempt.success.type === "File"
            ? "file"
            : "other";
      return { ok: true, kind } satisfies StructureRootObservation;
    });
  const prepareStructureObservations = (
    relativePaths: readonly string[],
    kinds: Map<string, StructureRootKind | "missing">
  ) =>
    Effect.gen(function* () {
      for (const relativePath of relativePaths) {
        let observation = observedKinds.get(relativePath);
        if (observation === undefined) {
          observation = yield* observeStructurePathKind(relativePath);
          observedKinds.set(relativePath, observation);
        }
        if (!observation.ok) {
          return {
            kind: "failed",
            detail: observation.detail,
          } satisfies StructureObservationPreparation;
        }
        kinds.set(relativePath, observation.kind);
      }
      return { kind: "ready", kinds } satisfies StructureObservationPreparation;
    });

  const preparations: CheckApplicationPreparation[] = [];
  for (const application of selection.applications) {
    if (!isHabitatStructureApplication(application)) {
      preparations.push({ kind: "grit", application });
      continue;
    }
    const structureAttempt = yield* Effect.result(
      context.fileSystem.readFileString(application.runner.structure.absolutePath)
    );
    if (structureAttempt._tag === "Failure") {
      preparations.push({
        kind: "structure",
        preparation: {
          kind: "failed",
          report: failedStructureApplication(
            application,
            "StructureReadFailed",
            `Unable to read structure asset "${application.runner.structure.relativePath}".`
          ),
        },
      });
      continue;
    }

    const parseAttempt = yield* Effect.result(
      Effect.try({ try: () => parseToml(structureAttempt.success), catch: (cause) => cause })
    );
    if (parseAttempt._tag === "Failure") {
      preparations.push({
        kind: "structure",
        preparation: {
          kind: "failed",
          report: failedStructureApplication(
            application,
            "StructureInvalid",
            `Invalid Habitat structure TOML in "${application.runner.structure.relativePath}".`
          ),
        },
      });
      continue;
    }
    const admission = admitStructureDocument(parseAttempt.success, application);
    if (!admission.ok) {
      preparations.push({
        kind: "structure",
        preparation: {
          kind: "failed",
          report: failedStructureApplication(application, "StructureInvalid", admission.detail),
        },
      });
      continue;
    }
    preparations.push({
      kind: "structure",
      preparation: { kind: "admitted", value: admission.admitted },
    });
  }

  const needsInventory = preparations.some(
    (prepared) =>
      prepared.kind === "structure" &&
      prepared.preparation.kind === "admitted" &&
      prepared.preparation.value.scopes.length > 0
  );
  let inventoryPreparation: StructureInventoryPreparation = { kind: "not-required" };
  if (needsInventory) {
    const inventoryAttempt = yield* Effect.result(
      context.sourceInventory.observe({
        root: context.workspaceRoot,
        maxEntries: MAX_SOURCE_INVENTORY_ENTRIES,
      })
    );
    if (inventoryAttempt._tag === "Failure") {
      inventoryPreparation = {
        kind: "failed",
        detail: `Source inventory failed (${inventoryAttempt.failure.reason}): ${inventoryAttempt.failure.detail}`,
      };
    } else {
      inventoryPreparation = {
        kind: "ready",
        universe: makeStructureUniverse(inventoryAttempt.success),
      };
    }
  }

  const reports: CheckApplicationReport[] = [];
  for (const prepared of preparations) {
    if (prepared.kind === "structure") {
      if (prepared.preparation.kind === "failed") {
        reports.push(prepared.preparation.report);
        continue;
      }
      const admitted = prepared.preparation.value;
      const application = admitted.application;
      if (admitted.scopes.length === 0) {
        reports.push(evaluatedStructureApplication(application, []));
        continue;
      }
      if (inventoryPreparation.kind === "failed") {
        reports.push(
          failedStructureApplication(application, "InventoryFailed", inventoryPreparation.detail)
        );
        continue;
      }
      if (inventoryPreparation.kind === "not-required") {
        return yield* Effect.die(
          new Error("Structure inventory was not prepared for an admitted bound scope.")
        );
      }

      const plan = planStructureEvaluation(admitted, inventoryPreparation.universe);
      const observations = yield* Effect.gen(function* () {
        const roots = yield* prepareStructureObservations(plan.rootObservationPaths, new Map());
        if (roots.kind === "failed") return roots;
        return yield* prepareStructureObservations(
          structureChildObservationPaths(plan, roots.kinds),
          roots.kinds
        );
      });
      if (observations.kind === "failed") {
        reports.push(
          failedStructureApplication(application, "StructureObservationFailed", observations.detail)
        );
        continue;
      }
      reports.push(
        evaluatedStructureApplication(application, evaluateStructurePlan(plan, observations.kinds))
      );
      continue;
    }

    const application = prepared.application;
    const patternAttempt = yield* Effect.result(
      context.fileSystem.readFileString(application.runner.pattern.absolutePath)
    );
    if (patternAttempt._tag === "Failure") {
      reports.push(
        failedApplication(
          application,
          "PatternReadFailed",
          `Unable to read pattern asset "${application.runner.pattern.relativePath}".`
        )
      );
      continue;
    }

    const program = extractGritProgram(patternAttempt.success);
    if (!program.ok) {
      reports.push(failedApplication(application, "PatternInvalid", program.detail));
      continue;
    }

    const subjectPreparation = yield* prepareGritSubjects(
      application,
      context.workspaceRoot,
      context.fileSystem,
      context.path
    );
    if (subjectPreparation.kind === "failed") {
      reports.push(failedApplication(application, "SetupFailed", subjectPreparation.detail));
      continue;
    }
    if (subjectPreparation.kind === "not-applicable") {
      if (!isCompatibilityRule(application)) {
        return yield* Effect.die(
          new Error("Version-three Grit applications cannot be not applicable.")
        );
      }
      reports.push(notApplicableApplication(application));
      continue;
    }
    const subjects = subjectPreparation.subjects;
    const evaluation = yield* Effect.result(
      context.ruleEvaluation.evaluate({
        program: program.program,
        subjectPaths: subjects.map((subject) => subject.absolutePath),
      })
    );
    if (evaluation._tag === "Failure") {
      reports.push(
        failedApplication(application, evaluation.failure.reason, evaluation.failure.detail)
      );
      continue;
    }

    const normalized = normalizeFindings(
      evaluation.success.findings,
      subjects,
      context.workspaceRoot,
      context.path
    );
    reports.push(
      normalized.ok
        ? evaluatedApplication(application, normalized.findings)
        : failedApplication(application, "FindingPathInvalid", normalized.detail)
    );
  }

  return completedCheck(reports);
});

/** Grouped catalog operation tree consumed by the module composition face. */
export const catalog = { resolve, check };

function catalogRejected(issues: readonly CatalogIssue[]): CheckCatalogResult {
  return { _tag: "CatalogRejected", issues: [...issues] };
}

function selectionRejected(issues: readonly CheckSelectionIssue[]): CheckCatalogResult {
  return { _tag: "SelectionRejected", issues: [...issues] };
}

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

function hasExactCauseCode(error: PlatformError.PlatformError, code: string): boolean {
  const cause = "cause" in error.reason ? error.reason.cause : undefined;
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === code;
}

type ResolvedSubject = {
  readonly absolutePath: string;
  readonly kind: "directory" | "file";
};

type GritSubjectPreparation =
  | { readonly kind: "ready"; readonly subjects: readonly ResolvedSubject[] }
  | { readonly kind: "not-applicable" }
  | { readonly kind: "failed"; readonly detail: string };

function prepareGritSubjects(
  application: GritCheckApplication,
  workspaceRoot: string,
  fileSystem: FileSystem.FileSystem,
  path: Path.Path
): Effect.Effect<GritSubjectPreparation, never> {
  if (!isCompatibilityRule(application)) {
    return Effect.succeed({
      kind: "ready" as const,
      subjects: resolvedSubjects(application, workspaceRoot, path),
    });
  }

  return Effect.gen(function* () {
    const workspaceRealPath = yield* Effect.result(fileSystem.realPath(workspaceRoot));
    if (workspaceRealPath._tag === "Failure") {
      return {
        kind: "failed" as const,
        detail: "Unable to canonicalize the compatibility workspace root.",
      };
    }

    const authority = resolvedSubjects(application, workspaceRoot, path);
    for (const root of authority) {
      const canonical = yield* Effect.result(fileSystem.realPath(root.absolutePath));
      if (canonical._tag === "Failure") {
        return {
          kind: "failed" as const,
          detail: `Unable to canonicalize compatibility acquisition root "${toRepositoryPath(
            path.relative(workspaceRoot, root.absolutePath),
            path.sep
          )}".`,
        };
      }
      const expectedCanonical = path.resolve(
        workspaceRealPath.success,
        path.relative(workspaceRoot, root.absolutePath)
      );
      if (
        canonical.success !== expectedCanonical ||
        !isContained(workspaceRealPath.success, canonical.success, path)
      ) {
        return {
          kind: "failed" as const,
          detail: `Compatibility acquisition root "${toRepositoryPath(
            path.relative(workspaceRoot, root.absolutePath),
            path.sep
          )}" is a symbolic link; compatibility checks accept direct workspace roots only.`,
        };
      }
    }

    const resolvedCoveragePatterns = application.coveragePatterns.map((pattern) =>
      path.resolve(workspaceRoot, pattern)
    );
    const compatibilityExcludes = [path.resolve(workspaceRoot, "**/node_modules/**")];
    const globAttempts = yield* Effect.all(
      resolvedCoveragePatterns.map((pattern) =>
        Effect.result(fileSystem.glob(pattern, { exclude: compatibilityExcludes }))
      )
    );
    const failedGlob = globAttempts.find((attempt) => attempt._tag === "Failure");
    if (failedGlob?._tag === "Failure") {
      return {
        kind: "failed" as const,
        detail: "Unable to enumerate compatibility exact-path coverage.",
      };
    }

    const directAttempts = yield* Effect.all(
      resolvedCoveragePatterns.map((pattern) => Effect.result(fileSystem.stat(pattern)))
    );
    const failedDirect = directAttempts.find(
      (attempt) => attempt._tag === "Failure" && !isNotFound(attempt.failure)
    );
    if (failedDirect?._tag === "Failure") {
      return {
        kind: "failed" as const,
        detail: "Unable to inspect compatibility exact-path coverage.",
      };
    }

    const candidates = stablePaths(
      [
        ...globAttempts.flatMap((attempt) =>
          attempt._tag === "Success"
            ? attempt.success.map((candidate) =>
                path.isAbsolute(candidate)
                  ? path.resolve(candidate)
                  : path.resolve(workspaceRoot, candidate)
              )
            : []
        ),
        ...directAttempts.flatMap((attempt, index) =>
          attempt._tag === "Success" && attempt.success.type === "File"
            ? [resolvedCoveragePatterns[index]]
            : []
        ),
      ].filter((candidate): candidate is string => candidate !== undefined)
    ).filter(
      (candidate) =>
        !isCompatibilityProtectedSubject(candidate, workspaceRoot, path) &&
        authority.some((root) =>
          root.kind === "file"
            ? candidate === root.absolutePath
            : isContained(root.absolutePath, candidate, path)
        )
    );

    const subjects: ResolvedSubject[] = [];
    for (const candidate of candidates) {
      const canonical = yield* Effect.result(fileSystem.realPath(candidate));
      if (canonical._tag === "Failure") {
        if (isNotFound(canonical.failure)) continue;
        return {
          kind: "failed" as const,
          detail: `Unable to canonicalize compatibility subject "${toRepositoryPath(
            path.relative(workspaceRoot, candidate),
            path.sep
          )}".`,
        };
      }
      const expectedCanonical = path.resolve(
        workspaceRealPath.success,
        path.relative(workspaceRoot, candidate)
      );
      if (
        canonical.success !== expectedCanonical ||
        !isContained(workspaceRealPath.success, canonical.success, path)
      ) {
        return {
          kind: "failed" as const,
          detail: `Exact coverage selected symbolic link "${toRepositoryPath(
            path.relative(workspaceRoot, candidate),
            path.sep
          )}"; compatibility checks accept regular files only.`,
        };
      }
      const stat = yield* Effect.result(fileSystem.stat(canonical.success));
      if (stat._tag === "Failure") {
        if (isNotFound(stat.failure)) continue;
        return {
          kind: "failed" as const,
          detail: `Unable to inspect compatibility subject "${toRepositoryPath(
            path.relative(workspaceRoot, candidate),
            path.sep
          )}".`,
        };
      }
      if (stat.success.type === "File") {
        subjects.push({ absolutePath: candidate, kind: "file" });
      }
    }

    return subjects.length === 0
      ? ({ kind: "not-applicable" as const } satisfies GritSubjectPreparation)
      : ({ kind: "ready" as const, subjects } satisfies GritSubjectPreparation);
  });
}

function isCompatibilityProtectedSubject(
  candidate: string,
  workspaceRoot: string,
  path: Path.Path
): boolean {
  const relative = toRepositoryPath(path.relative(workspaceRoot, candidate), path.sep);
  if (relative.split("/").includes("node_modules")) return true;
  return compatibilityProtectedRoots.some(
    (root) => relative === root || relative.startsWith(`${root}/`)
  );
}

function resolvedSubjects(
  application: GritCheckApplication,
  workspaceRoot: string,
  path: Path.Path
): readonly ResolvedSubject[] {
  const subjects = new Map<string, ResolvedSubject>();
  for (const entry of application.runner.acquisition.entries) {
    const absolutePath = path.resolve(workspaceRoot, entry.path);
    subjects.set(absolutePath, { absolutePath, kind: entry.kind });
  }
  return [...subjects.values()].sort((left, right) =>
    left.absolutePath < right.absolutePath ? -1 : left.absolutePath > right.absolutePath ? 1 : 0
  );
}

function normalizeFindings(
  findings: readonly RuleEvaluationFinding[],
  subjects: readonly ResolvedSubject[],
  workspaceRoot: string,
  path: Path.Path
):
  | { readonly ok: true; readonly findings: readonly RuleEvaluationFinding[] }
  | { readonly ok: false; readonly detail: string } {
  const normalized: RuleEvaluationFinding[] = [];
  for (const finding of findings) {
    if (!path.isAbsolute(finding.path)) {
      return {
        ok: false,
        detail: `Evaluator returned a non-absolute finding path: "${finding.path}".`,
      };
    }
    const absolutePath = path.resolve(finding.path);
    if (
      !isContained(workspaceRoot, absolutePath, path) ||
      !subjects.some((subject) =>
        subject.kind === "file"
          ? absolutePath === subject.absolutePath
          : isContained(subject.absolutePath, absolutePath, path)
      )
    ) {
      return {
        ok: false,
        detail: `Evaluator returned a finding outside admitted subjects: "${finding.path}".`,
      };
    }
    normalized.push({
      ...finding,
      path: toRepositoryPath(path.relative(workspaceRoot, absolutePath), path.sep),
    });
  }
  return { ok: true, findings: normalized };
}

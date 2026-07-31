import type { RuleEvaluationFinding } from "@habitat/resource-rule-evaluation";
import { Effect, type FileSystem, type Path, type PlatformError } from "effect";
import { parse as parseToml } from "smol-toml";
import type { CatalogIssue } from "../model/dto/catalog";
import type {
  CheckApplicationReport,
  CheckCatalogResult,
  CheckSelectionIssue,
} from "../model/dto/check";
import {
  admitBlueprintSource,
  admitCompatibilityIndex,
  admitCompatibilityRule,
  admitInstanceSource,
  type BlueprintSource,
  type CatalogDocuments,
  type CatalogPathFact,
  type CompatibilityRuleDocument,
  type InstanceSource,
  referencedRepositoryPaths,
  rejected,
  resolveCatalog,
} from "../model/policy/catalog";
import {
  completedCheck,
  evaluatedApplication,
  extractGritProgram,
  failedApplication,
  type GritCheckApplication,
  selectCheckApplications,
} from "../model/policy/check";
import { module } from "../module";

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
const MAX_MANIFEST_DIRECTORIES = 50_000;

type CatalogOperationContext = {
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly workspaceRoot: string;
};

function resolveCurrentCatalog(context: CatalogOperationContext) {
  return Effect.gen(function* () {
    const { fileSystem, path } = context;
    const workspaceRoot = context.workspaceRoot;
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
      if (admitted.ok) compatibilityRules.push(admitted.source);
      else issues.push(...admitted.issues);
    }

    if (issues.length > 0) return rejected(issues);
    const documents: CatalogDocuments = {
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
 * resolution, selects applications, invokes only the ready Grit-check resource,
 * and interprets mechanical findings without constructing a provider.
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

  const reports: CheckApplicationReport[] = [];
  for (const application of selection.applications) {
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

    const subjects = resolvedSubjects(application, context.workspaceRoot, context.path);
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

type ResolvedSubject = {
  readonly absolutePath: string;
  readonly kind: "directory" | "file";
};

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

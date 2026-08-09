import type {
  RuleEvaluationFinding,
  RuleEvaluationProgramResult,
} from "@habitat-ai/resource-rule-evaluation";
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
import { excludedRepositoryDirectorySegments } from "../model/policy/repository-paths.js";
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

const compatibilityProtectedRoots = [".habitat/cache/patterns"];

type StructureCheckApplicationReport = Extract<CheckApplicationReport, { runner: "habitat" }>;
type StructurePreparation =
  | { readonly kind: "failed"; readonly report: StructureCheckApplicationReport }
  | { readonly kind: "admitted"; readonly value: AdmittedStructureApplication };
type CheckApplicationPreparation =
  | { readonly kind: "grit"; readonly application: GritCheckApplication }
  | { readonly kind: "structure"; readonly preparation: StructurePreparation };
type ReadyGritEvaluation = {
  readonly applicationIndex: number;
  readonly application: GritCheckApplication;
  readonly programId: string;
  readonly program: string;
  readonly subjects: readonly ResolvedSubject[];
  readonly subjectPaths: readonly string[];
};
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

/** Selects and evaluates every application admitted by the request-local catalog. */
export const check = module.check.effect(function* ({ context, input }) {
  const resolved = yield* context.currentCatalog;
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

  const reports: Array<CheckApplicationReport | undefined> = new Array(preparations.length);
  const readyGritEvaluations: ReadyGritEvaluation[] = [];
  for (const [applicationIndex, prepared] of preparations.entries()) {
    if (prepared.kind === "structure") {
      if (prepared.preparation.kind === "failed") {
        reports[applicationIndex] = prepared.preparation.report;
        continue;
      }
      const admitted = prepared.preparation.value;
      const application = admitted.application;
      if (admitted.scopes.length === 0) {
        reports[applicationIndex] = evaluatedStructureApplication(application, []);
        continue;
      }
      if (inventoryPreparation.kind === "failed") {
        reports[applicationIndex] = failedStructureApplication(
          application,
          "InventoryFailed",
          inventoryPreparation.detail
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
        reports[applicationIndex] = failedStructureApplication(
          application,
          "StructureObservationFailed",
          observations.detail
        );
        continue;
      }
      reports[applicationIndex] = evaluatedStructureApplication(
        application,
        evaluateStructurePlan(plan, observations.kinds)
      );
      continue;
    }

    const application = prepared.application;
    const patternAttempt = yield* Effect.result(
      context.fileSystem.readFileString(application.runner.pattern.absolutePath)
    );
    if (patternAttempt._tag === "Failure") {
      reports[applicationIndex] = failedApplication(
        application,
        "PatternReadFailed",
        `Unable to read pattern asset "${application.runner.pattern.relativePath}".`
      );
      continue;
    }

    const program = extractGritProgram(patternAttempt.success);
    if (!program.ok) {
      reports[applicationIndex] = failedApplication(application, "PatternInvalid", program.detail);
      continue;
    }

    const subjectPreparation = yield* prepareGritSubjects(
      application,
      context.workspaceRoot,
      context.fileSystem,
      context.path
    );
    if (subjectPreparation.kind === "failed") {
      reports[applicationIndex] = failedApplication(
        application,
        "SetupFailed",
        subjectPreparation.detail
      );
      continue;
    }
    if (subjectPreparation.kind === "not-applicable") {
      if (!isCompatibilityRule(application)) {
        return yield* Effect.die(
          new Error("Version-three Grit applications cannot be not applicable.")
        );
      }
      reports[applicationIndex] = notApplicableApplication(application);
      continue;
    }
    const subjects = subjectPreparation.subjects;
    readyGritEvaluations.push({
      applicationIndex,
      application,
      programId: `application-${applicationIndex}`,
      program: program.program,
      subjects,
      subjectPaths: subjects.map((subject) => subject.absolutePath),
    });
  }

  for (const evaluations of groupGritEvaluations(readyGritEvaluations)) {
    const first = evaluations[0];
    if (first === undefined) {
      return yield* Effect.die(new Error("A Grit evaluation group must not be empty."));
    }
    const evaluation = yield* Effect.result(
      context.ruleEvaluation.evaluate({
        programs: evaluations.map(({ programId, program }) => ({ id: programId, program })),
        subjectPaths: first.subjectPaths,
      })
    );
    if (evaluation._tag === "Failure") {
      for (const prepared of evaluations) {
        reports[prepared.applicationIndex] = failedApplication(
          prepared.application,
          evaluation.failure.reason,
          evaluation.failure.detail
        );
      }
      continue;
    }

    const resultMismatch = evaluationResultMismatch(evaluations, evaluation.success.results);
    if (resultMismatch !== undefined) {
      for (const prepared of evaluations) {
        reports[prepared.applicationIndex] = failedApplication(
          prepared.application,
          "InvalidOutput",
          resultMismatch
        );
      }
      continue;
    }
    const results = indexEvaluationResults(evaluation.success.results);

    for (const prepared of evaluations) {
      const result = results.get(prepared.programId);
      if (result === undefined) {
        return yield* Effect.die(
          new Error(`Validated evaluation result '${prepared.programId}' is absent.`)
        );
      }
      const normalized = normalizeFindings(
        result.findings,
        prepared.subjects,
        context.workspaceRoot,
        context.path
      );
      reports[prepared.applicationIndex] = normalized.ok
        ? evaluatedApplication(prepared.application, normalized.findings)
        : failedApplication(prepared.application, "FindingPathInvalid", normalized.detail);
    }
  }

  const completedReports: CheckApplicationReport[] = [];
  for (const [applicationIndex, report] of reports.entries()) {
    if (report === undefined) {
      return yield* Effect.die(
        new Error(`Habitat check produced no report for application ${applicationIndex}.`)
      );
    }
    completedReports.push(report);
  }
  return completedCheck(completedReports);
});

function catalogRejected(issues: readonly CatalogIssue[]): CheckCatalogResult {
  return { _tag: "CatalogRejected", issues: [...issues] };
}

function selectionRejected(issues: readonly CheckSelectionIssue[]): CheckCatalogResult {
  return { _tag: "SelectionRejected", issues: [...issues] };
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

function groupGritEvaluations(
  evaluations: readonly ReadyGritEvaluation[]
): readonly (readonly ReadyGritEvaluation[])[] {
  const groups = new Map<string, ReadyGritEvaluation[]>();
  for (const evaluation of evaluations) {
    const key = JSON.stringify(evaluation.subjectPaths);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [evaluation]);
    else group.push(evaluation);
  }
  return [...groups.values()];
}

function evaluationResultMismatch(
  evaluations: readonly ReadyGritEvaluation[],
  results: readonly RuleEvaluationProgramResult[]
): string | undefined {
  if (results.length !== evaluations.length) {
    return `Rule evaluator returned ${results.length} program results for ${evaluations.length} requested programs.`;
  }
  const uniqueIds = new Set(results.map(({ programId }) => programId));
  if (uniqueIds.size !== results.length) {
    return "Rule evaluator returned duplicate program result identities.";
  }
  const unexpected = results.find(
    (result, index) => result.programId !== evaluations[index]?.programId
  );
  return unexpected === undefined
    ? undefined
    : "Rule evaluator did not preserve requested program result order and identity.";
}

function indexEvaluationResults(
  results: readonly RuleEvaluationProgramResult[]
): ReadonlyMap<string, RuleEvaluationProgramResult> {
  return new Map(results.map((result) => [result.programId, result]));
}

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
    const compatibilityExcludes = [...excludedRepositoryDirectorySegments].map((segment) =>
      path.resolve(workspaceRoot, `**/${segment}/**`)
    );
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
  if (relative.split("/").some((segment) => excludedRepositoryDirectorySegments.has(segment))) {
    return true;
  }
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

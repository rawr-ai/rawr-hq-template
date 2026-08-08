import type { RuleEvaluationFinding } from "@habitat-ai/resource-rule-evaluation";
import type { HabitatCatalog } from "../dto/catalog.js";
import type {
  CheckApplicationReport,
  CheckCatalogInput,
  CheckCatalogResult,
  CheckSelectionIssue,
} from "../dto/check.js";
import type { HabitatStructureApplication, StructureDiagnostic } from "./structure.js";

type InstanceApplication = HabitatCatalog["applications"][number];
type CompatibilityRule = HabitatCatalog["compatibility"]["rules"][number];
type RuleApplication = InstanceApplication | CompatibilityRule;
type ResolvedGritRunner = Extract<RuleApplication["runner"], { name: "grit" }>;
type GritCheckRunner = Omit<ResolvedGritRunner, "acquisition"> & {
  readonly acquisition: Omit<ResolvedGritRunner["acquisition"], "kind"> & {
    readonly kind: "check";
  };
};

/** Resolved application mechanically executable by the Grit check resource. */
export type GritCheckApplication = RuleApplication & {
  readonly runner: GritCheckRunner;
};

/** Runner set executable by catalog.check. */
export type ExecutableCheckApplication = GritCheckApplication | HabitatStructureApplication;

type GritCheckApplicationReport = Extract<CheckApplicationReport, { runner: "grit" }>;
type StructureCheckApplicationReport = Extract<CheckApplicationReport, { runner: "habitat" }>;
type GritInstanceCheckApplicationReport = Extract<
  GritCheckApplicationReport,
  { instanceId: string }
>;
type CompatibilityGritCheckApplicationReport = Extract<
  GritCheckApplicationReport,
  { instanceId: null }
>;
type StructureInstanceCheckApplicationReport = Extract<
  StructureCheckApplicationReport,
  { instanceId: string }
>;
type CompatibilityStructureCheckApplicationReport = Extract<
  StructureCheckApplicationReport,
  { instanceId: null }
>;
type CompatibilityGritCheckApplication = Extract<
  GritCheckApplication,
  { readonly baseline: unknown }
>;
type GritReportIdentity =
  | Pick<
      GritInstanceCheckApplicationReport,
      | "ownerProject"
      | "instanceId"
      | "ruleId"
      | "runner"
      | "lane"
      | "locked"
      | "message"
      | "remediate"
    >
  | Pick<
      CompatibilityGritCheckApplicationReport,
      | "ownerProject"
      | "instanceId"
      | "ruleId"
      | "runner"
      | "lane"
      | "locked"
      | "message"
      | "remediate"
    >;
type StructureReportIdentity =
  | Pick<
      StructureInstanceCheckApplicationReport,
      | "ownerProject"
      | "instanceId"
      | "ruleId"
      | "runner"
      | "lane"
      | "locked"
      | "message"
      | "remediate"
    >
  | Pick<
      CompatibilityStructureCheckApplicationReport,
      | "ownerProject"
      | "instanceId"
      | "ruleId"
      | "runner"
      | "lane"
      | "locked"
      | "message"
      | "remediate"
    >;

type CheckSelection =
  | {
      readonly ok: true;
      readonly applications: readonly ExecutableCheckApplication[];
    }
  | {
      readonly ok: false;
      readonly issues: readonly CheckSelectionIssue[];
    };

const knownRunnerSelectors = new Set(["grit", "habitat", "nx"]);

/** Selects the closed executable Grit-check and native structure application set. */
export function selectCheckApplications(
  catalog: HabitatCatalog,
  input: CheckCatalogInput
): CheckSelection {
  const selectors = input.selectors;
  const requestedRules = [
    ...new Set([
      ...(selectors?.rule === undefined ? [] : [selectors.rule]),
      ...(selectors?.rules ?? []),
    ]),
  ];
  const hasExplicitSelectors =
    selectors?.owner !== undefined ||
    selectors?.instance !== undefined ||
    selectors?.rule !== undefined ||
    selectors?.rules !== undefined ||
    selectors?.runner !== undefined;
  const issues: CheckSelectionIssue[] = [];
  if (selectors?.owner !== undefined) {
    const issue = selectionIssue(catalog, "owner", selectors.owner);
    if (issue !== undefined) issues.push(issue);
  }
  if (selectors?.instance !== undefined) {
    const issue = selectionIssue(catalog, "instance", selectors.instance);
    if (issue !== undefined) issues.push(issue);
  }
  for (const ruleId of requestedRules) {
    const issue = selectionIssue(catalog, "rule", ruleId);
    if (issue !== undefined) issues.push(issue);
  }
  if (selectors?.runner !== undefined) {
    const issue = selectionIssue(catalog, "runner", selectors.runner);
    if (issue !== undefined) issues.push(issue);
  }
  if (issues.length > 0) return refused(issues);

  const applications: readonly RuleApplication[] = [
    ...catalog.applications,
    ...catalog.compatibility.rules,
  ];
  const selected = applications.filter(
    (application) =>
      (selectors?.owner === undefined || application.ownerProject === selectors.owner) &&
      (selectors?.instance === undefined ||
        (isInstanceApplication(application) && application.instanceId === selectors.instance)) &&
      (requestedRules.length === 0 || requestedRules.includes(application.ruleId)) &&
      (selectors?.runner === undefined || application.runner.name === selectors.runner)
  );
  if (hasExplicitSelectors && selected.length === 0 && !isKnownEmptyRunnerSelection(selectors)) {
    return refused([
      issue(
        "selector-empty",
        "selectors",
        "The requested selector intersection contains no resolved applications."
      ),
    ]);
  }

  const unsupported = selected.filter(isUnsupportedGritApplication);
  if (unsupported.length > 0) {
    return refused(
      unsupported.map((application) =>
        issue(
          "runner-unsupported",
          applicationIdentityText(application),
          `Rule "${application.ruleId}" requires Grit ${application.runner.acquisition.kind}, which catalog.check does not execute.`
        )
      )
    );
  }

  return {
    ok: true,
    applications: selected.filter(isExecutableCheckApplication).sort(compareApplications),
  };
}

/** Extracts the first closed Grit fence from one admitted pattern asset. */
export function extractGritProgram(
  contents: string
):
  | { readonly ok: true; readonly program: string }
  | { readonly ok: false; readonly detail: string } {
  const lines = contents.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const opening = lines.findIndex((line) => line === "```grit");
  if (opening < 0) {
    return { ok: false, detail: "Pattern asset has no opening ```grit fence." };
  }
  const closingOffset = lines.slice(opening + 1).findIndex((line) => line === "```");
  if (closingOffset < 0) {
    return { ok: false, detail: "Pattern asset has no closing Grit fence." };
  }
  const program = lines.slice(opening + 1, opening + 1 + closingOffset).join("\n");
  return program.trim().length === 0
    ? { ok: false, detail: "Pattern asset contains an empty Grit program." }
    : { ok: true, program };
}

/** Produces one semantic report from trusted, repository-relative findings. */
export function evaluatedApplication(
  application: GritCheckApplication,
  findings: readonly RuleEvaluationFinding[]
): GritCheckApplicationReport {
  const severity = application.lane === "enforced" ? "error" : "advisory";
  return {
    ...applicationIdentity(application),
    status:
      findings.length === 0
        ? "pass"
        : application.lane === "enforced"
          ? "fail"
          : "advisory-findings",
    disposition: { kind: "evaluated" },
    findings: findings.map((finding) => ({ ...finding, severity, baselined: false })),
  };
}

/** Produces one deterministic operational-error report for an application. */
export function failedApplication(
  application: GritCheckApplication,
  reason: Extract<GritCheckApplicationReport["disposition"], { kind: "failed" }>["reason"],
  detail: string
): GritCheckApplicationReport {
  return {
    ...applicationIdentity(application),
    status: "error",
    disposition: {
      kind: "failed",
      reason,
      detail: boundedDetail(detail),
    },
    findings: [],
  };
}

/** Reports an exact-coverage compatibility rule that has no current subject files. */
export function notApplicableApplication(
  application: CompatibilityGritCheckApplication
): CompatibilityGritCheckApplicationReport {
  return {
    ownerProject: application.ownerProject,
    instanceId: null,
    ruleId: application.ruleId,
    runner: "grit",
    lane: application.lane,
    locked: true,
    message: application.message,
    remediate: application.remediate,
    status: "pass",
    disposition: { kind: "not-applicable", reason: "no-matched-acquisition-roots" },
    findings: [],
  };
}

/** Produces one native Habitat report from pure structure diagnostics. */
export function evaluatedStructureApplication(
  application: HabitatStructureApplication,
  diagnostics: readonly StructureDiagnostic[]
): StructureCheckApplicationReport {
  const severity = application.lane === "enforced" ? "error" : "advisory";
  return {
    ...structureApplicationIdentity(application),
    status:
      diagnostics.length === 0
        ? "pass"
        : application.lane === "enforced"
          ? "fail"
          : "advisory-findings",
    disposition: { kind: "evaluated" },
    findings: diagnostics.map((diagnostic) => ({
      ...diagnostic,
      severity,
      baselined: false,
    })),
  };
}

/** Produces one deterministic native Habitat operational-error report. */
export function failedStructureApplication(
  application: HabitatStructureApplication,
  reason: Extract<StructureCheckApplicationReport["disposition"], { kind: "failed" }>["reason"],
  detail: string
): StructureCheckApplicationReport {
  return {
    ...structureApplicationIdentity(application),
    status: "error",
    disposition: { kind: "failed", reason, detail: boundedDetail(detail) },
    findings: [],
  };
}

/** Completes a check from already ordered application reports. */
export function completedCheck(
  applications: readonly CheckApplicationReport[]
): CheckCatalogResult {
  return {
    _tag: "Completed",
    ok: applications.every(
      (application) => application.status === "pass" || application.status === "advisory-findings"
    ),
    applications: [...applications],
  };
}

function applicationIdentity(application: GritCheckApplication): GritReportIdentity {
  if (isCompatibilityRule(application)) {
    return {
      ownerProject: application.ownerProject,
      instanceId: null,
      ruleId: application.ruleId,
      runner: "grit",
      lane: application.lane,
      locked: true,
      message: application.message,
      remediate: application.remediate,
    };
  }
  return {
    ownerProject: application.ownerProject,
    instanceId: application.instanceId,
    ruleId: application.ruleId,
    runner: "grit",
    lane: application.lane,
    locked: false,
    message: application.message,
    remediate: application.remediate,
  };
}

function structureApplicationIdentity(
  application: HabitatStructureApplication
): StructureReportIdentity {
  if (isCompatibilityRule(application)) {
    return {
      ownerProject: application.ownerProject,
      instanceId: null,
      ruleId: application.ruleId,
      runner: "habitat",
      lane: application.lane,
      locked: true,
      message: application.message,
      remediate: application.remediate,
    };
  }
  return {
    ownerProject: application.ownerProject,
    instanceId: application.instanceId,
    ruleId: application.ruleId,
    runner: "habitat",
    lane: application.lane,
    locked: false,
    message: application.message,
    remediate: application.remediate,
  };
}

function isGritCheckApplication(application: RuleApplication): application is GritCheckApplication {
  return application.runner.name === "grit" && application.runner.acquisition.kind === "check";
}

function isUnsupportedGritApplication(
  application: RuleApplication
): application is RuleApplication & {
  readonly runner: ResolvedGritRunner;
} {
  return application.runner.name === "grit" && application.runner.acquisition.kind !== "check";
}

function isExecutableCheckApplication(
  application: RuleApplication
): application is ExecutableCheckApplication {
  return application.runner.name === "habitat" || isGritCheckApplication(application);
}

function compareApplications(
  left: ExecutableCheckApplication,
  right: ExecutableCheckApplication
): number {
  return (
    compareText(left.ruleId, right.ruleId) ||
    compareText(instanceId(left) ?? "", instanceId(right) ?? "") ||
    compareText(left.ownerProject, right.ownerProject)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function refused(issues: readonly CheckSelectionIssue[]): CheckSelection {
  return { ok: false, issues };
}

function issue(
  code: CheckSelectionIssue["code"],
  selector: string,
  message: string
): CheckSelectionIssue {
  return { code, selector, message };
}

function selectionIssue(
  catalog: HabitatCatalog,
  kind: "owner" | "instance" | "rule" | "runner",
  value: string
): CheckSelectionIssue | undefined {
  const applications: readonly RuleApplication[] = [
    ...catalog.applications,
    ...catalog.compatibility.rules,
  ];
  const matches = {
    owner: applications.some((application) => application.ownerProject === value),
    instance: catalog.applications.some((application) => application.instanceId === value),
    rule: applications.some((application) => application.ruleId === value),
    runner: applications.some((application) => application.runner.name === value),
  };
  if (matches[kind] || (kind === "runner" && knownRunnerSelectors.has(value))) return undefined;
  const actualKind = (["owner", "instance", "rule", "runner"] as const).find(
    (candidate) => candidate !== kind && matches[candidate]
  );
  return actualKind === undefined
    ? issue(
        "selector-unknown",
        `${kind}:${value}`,
        `No resolved application uses ${kind} "${value}".`
      )
    : issue(
        "selector-wrong-namespace",
        `${kind}:${value}`,
        `"${value}" is a known ${actualKind}, not a ${kind}.`
      );
}

/** Narrows a resolved check application to one compatibility rule. */
export function isCompatibilityRule(
  application: RuleApplication
): application is CompatibilityRule {
  return "baseline" in application;
}

function isInstanceApplication(application: RuleApplication): application is InstanceApplication {
  return "instanceId" in application;
}

function instanceId(application: RuleApplication): string | null {
  return isInstanceApplication(application) ? application.instanceId : null;
}

function applicationIdentityText(application: RuleApplication): string {
  const instance = instanceId(application);
  return instance === null ? application.ruleId : `${instance}:${application.ruleId}`;
}

function isKnownEmptyRunnerSelection(selectors: CheckCatalogInput["selectors"]): boolean {
  return (
    selectors?.owner === undefined &&
    selectors?.instance === undefined &&
    selectors?.rule === undefined &&
    selectors?.rules === undefined &&
    selectors?.runner !== undefined &&
    knownRunnerSelectors.has(selectors.runner)
  );
}

function boundedDetail(detail: string): string {
  const normalized = detail.trim() || "Application evaluation failed.";
  return normalized.length <= 4_096 ? normalized : `${normalized.slice(0, 4_093)}...`;
}

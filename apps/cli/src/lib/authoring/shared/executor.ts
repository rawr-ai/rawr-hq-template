import {
  NO_AUTHORING_WRITE,
  rejectedAuthoringResult,
  type AuthoringExecutionResult,
  type AuthoringPlanIssue,
  type AuthoringWriteFailure,
  type CompleteOrderedWritePlan,
  type QualifiedWrite,
  type VerifiedDestinationRoot,
} from "./model";

export type QualifiedWriteInspection =
  | Readonly<{ kind: "Missing" }>
  | Readonly<{ kind: "Exact" }>
  | Readonly<{ kind: "Conflict"; message: string }>;

export type QualifiedWritePublication =
  | Readonly<{ kind: "Published" }>
  | Readonly<{ kind: "Failed"; message: string }>;

export interface QualifiedWritePort {
  inspect(root: VerifiedDestinationRoot, write: QualifiedWrite): Promise<QualifiedWriteInspection>;
  publish(root: VerifiedDestinationRoot, write: QualifiedWrite): Promise<QualifiedWritePublication>;
}

export async function executeAuthoringPlan(input: Readonly<{
  plan: CompleteOrderedWritePlan;
  dryRun: boolean;
  port: QualifiedWritePort;
}>): Promise<AuthoringExecutionResult> {
  const inspections: QualifiedWriteInspection[] = [];
  const issues: AuthoringPlanIssue[] = [];
  for (const write of input.plan.writes) {
    try {
      const inspection = await input.port.inspect(input.plan.destinationRoot, write);
      inspections.push(inspection);
      if (inspection.kind === "Conflict") {
        issues.push(Object.freeze({
          code: "PATH_COLLISION",
          path: write.relativePath,
          message: inspection.message,
        }));
      }
    } catch (error) {
      issues.push(Object.freeze({
        code: "PLAN_INSPECTION_FAILED",
        path: write.relativePath,
        message: errorMessage(error),
      }));
    }
  }
  if (issues.length > 0) {
    return rejectedAuthoringResult(issues as [AuthoringPlanIssue, ...AuthoringPlanIssue[]]);
  }
  if (input.dryRun) {
    return Object.freeze({ kind: "AuthoringDryRun", plan: input.plan, write: NO_AUTHORING_WRITE });
  }
  if (inspections.every((inspection) => inspection.kind === "Exact")) {
    return Object.freeze({ kind: "AuthoringConverged", plan: input.plan, write: NO_AUTHORING_WRITE });
  }

  const applied: QualifiedWrite[] = [];
  for (const write of input.plan.writes) {
    let inspection: QualifiedWriteInspection;
    try {
      inspection = await input.port.inspect(input.plan.destinationRoot, write);
    } catch (error) {
      return publicationFailure(input.plan, applied, write, "PUBLICATION_FAILED", errorMessage(error));
    }
    if (inspection.kind === "Conflict") {
      return publicationFailure(input.plan, applied, write, "PUBLICATION_FAILED", inspection.message);
    }
    const needsPublication = inspection.kind === "Missing";
    if (needsPublication) {
      let publication: QualifiedWritePublication;
      try {
        publication = await input.port.publish(input.plan.destinationRoot, write);
      } catch (error) {
        return publicationFailure(input.plan, applied, write, "PUBLICATION_FAILED", errorMessage(error));
      }
      if (publication.kind === "Failed") {
        return publicationFailure(input.plan, applied, write, "PUBLICATION_FAILED", publication.message);
      }
    }
    let verified: QualifiedWriteInspection;
    try {
      verified = await input.port.inspect(input.plan.destinationRoot, write);
    } catch (error) {
      return publicationFailure(input.plan, applied, write, "PUBLICATION_NOT_VERIFIED", errorMessage(error));
    }
    if (verified.kind !== "Exact") {
      return publicationFailure(
        input.plan,
        applied,
        write,
        "PUBLICATION_NOT_VERIFIED",
        verified.kind === "Conflict" ? verified.message : "Published path is missing",
      );
    }
    if (needsPublication) applied.push(write);
  }

  if (applied.length === 0) {
    return Object.freeze({ kind: "AuthoringConverged", plan: input.plan, write: NO_AUTHORING_WRITE });
  }

  return Object.freeze({
    kind: "AuthoringAuthored",
    plan: input.plan,
    applied: Object.freeze(applied) as readonly [QualifiedWrite, ...QualifiedWrite[]],
  });
}

function publicationFailure(
  plan: CompleteOrderedWritePlan,
  applied: readonly QualifiedWrite[],
  write: QualifiedWrite,
  code: AuthoringWriteFailure["code"],
  message: string,
): AuthoringExecutionResult {
  const failure = Object.freeze({ code, path: write.relativePath, message });
  if (applied.length === 0) {
    return Object.freeze({
      kind: "AuthoringFailed",
      plan,
      applied: Object.freeze([]) as readonly [],
      failure,
    });
  }
  return Object.freeze({
    kind: "AuthoringPartial",
    plan,
    applied: Object.freeze([...applied]) as readonly [QualifiedWrite, ...QualifiedWrite[]],
    failure,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

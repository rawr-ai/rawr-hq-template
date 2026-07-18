import type { CompleteNativeHomesObservation } from "../model/dto/native-homes";
import type {
  CanonicalStatusOutcome,
  ProviderOperationOutcome,
} from "../model/dto/outcome";
import type {
  DeploymentResult,
  ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import type {
  CanonicalStatusProcedureResult,
  CompleteNativeHomesProcedureResult,
  ProviderOperationProcedureResult,
} from "../schemas";

export async function providerOperationResult(
  operation: Promise<DeploymentResult<ProviderOperationOutcome>>,
): Promise<ProviderOperationProcedureResult> {
  const result = await operation;
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      status: result.value.status,
      targets: result.value.targets.map((outcome) => ({
        target: { ...outcome.target },
        status: outcome.status,
        events: outcome.events.map((event) => event),
        issues: issueDtos(outcome.issues),
        visibleFingerprint: outcome.visibleFingerprint,
      })),
      evidence: result.value.evidence,
      issues: issueDtos(result.value.issues),
    },
  };
}

export async function canonicalStatusResult(
  operation: Promise<DeploymentResult<readonly CanonicalStatusOutcome[]>>,
): Promise<CanonicalStatusProcedureResult> {
  const result = await operation;
  return result.ok
    ? {
        ok: true,
        value: result.value.map((outcome) => ({
          target: { ...outcome.target },
          status: outcome.status,
          issues: issueDtos(outcome.issues),
        })),
      }
    : result;
}

export async function completeNativeHomesResult(
  operation: Promise<DeploymentResult<CompleteNativeHomesObservation>>,
): Promise<CompleteNativeHomesProcedureResult> {
  const result = await operation;
  return result.ok
    ? {
        ok: true,
        value: {
          protocol: result.value.protocol,
          homes: result.value.homes.map((home) => ({ ...home })),
          observationDigest: result.value.observationDigest,
        },
      }
    : result;
}

function issueDtos(
  issues: readonly ProviderDeploymentIssue[],
): ProviderDeploymentIssue[] {
  return issues.map((entry) => ({ ...entry }));
}

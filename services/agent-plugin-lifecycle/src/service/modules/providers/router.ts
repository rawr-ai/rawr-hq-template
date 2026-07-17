import {
  createCanonicalStatus,
  createCanonicalSync,
  createCompleteNativeHomesReader,
  createCompleteTest,
  createGovernedCanonicalChannelReader,
  createManagedRetire,
  createTargetedTest,
} from "./internal";
import type { ProviderLifecycleRuntime } from "./ports";
import type { GovernanceLifecycleRuntime } from "../governance/ports";
import { module } from "./module";
import type {
  DeploymentResult,
  ProviderDeploymentIssue,
} from "./internal/domain/result";
import type {
  CanonicalStatusOutcome,
  ProviderOperationOutcome,
} from "./internal/domain/outcome";
import type { CompleteNativeHomesObservation } from "./internal/domain/native-homes";
import type {
  CanonicalStatusProcedureResult,
  CompleteNativeHomesProcedureResult,
  ProviderOperationProcedureResult,
} from "./schemas";

function applicationRuntime(runtime: Readonly<{
  providers: ProviderLifecycleRuntime;
  governance: GovernanceLifecycleRuntime;
}>) {
  return runtime.providers;
}

function canonicalRuntime(runtime: Parameters<typeof applicationRuntime>[0]) {
  return Object.freeze({
    ...runtime.providers,
    channel: createGovernedCanonicalChannelReader(runtime.governance),
  });
}

async function providerOperationResult(
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

async function canonicalStatusResult(
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

async function completeNativeHomesResult(
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

const targetedTest = module.targetedTest.handler(async ({ context, input }) =>
  providerOperationResult(createTargetedTest(() => applicationRuntime(context.runtime))(input)));

const completeTest = module.completeTest.handler(async ({ context, input }) =>
  providerOperationResult(createCompleteTest(() => applicationRuntime(context.runtime))(input)));

const canonicalSync = module.canonicalSync.handler(async ({ context, input }) =>
  providerOperationResult(createCanonicalSync(() => canonicalRuntime(context.runtime))(input)));

const canonicalStatus = module.canonicalStatus.handler(async ({ context, input }) =>
  canonicalStatusResult(createCanonicalStatus(() => canonicalRuntime(context.runtime))(input)));

const managedRetire = module.managedRetire.handler(async ({ context, input }) =>
  providerOperationResult(createManagedRetire(() => applicationRuntime(context.runtime))(input)));

const completeNativeHomes = module.completeNativeHomes.handler(async ({ context }) =>
  completeNativeHomesResult(createCompleteNativeHomesReader(() => applicationRuntime(context.runtime))()));

export const router = module.router({
  targetedTest,
  completeTest,
  canonicalSync,
  canonicalStatus,
  managedRetire,
  completeNativeHomes,
});

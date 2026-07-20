import { type Static, type TSchema } from "typebox";
import { Clone, Parse } from "typebox/value";

import type { CompleteNativeHomesObservation } from "../model/dto/native-homes";
import type {
  CanonicalStatusOutcome,
  CanonicalSyncOutcome,
  CompleteTestProviderOperationOutcome,
  TargetedTestProviderOperationOutcome,
} from "../model/dto/outcome";
import type { DeploymentResult } from "../model/errors/deployment-result";
import {
  type CanonicalStatusProcedureResult,
  CanonicalStatusResultSchema,
  type CanonicalSyncProcedureResult,
  CanonicalSyncResultSchema,
  type CompleteNativeHomesProcedureResult,
  CompleteNativeHomesResultSchema,
  type CompleteTestProcedureResult,
  CompleteTestResultSchema,
  type TargetedTestProcedureResult,
  TargetedTestResultSchema,
} from "../schemas";

export async function completeTestOperationResult(
  operation: Promise<DeploymentResult<CompleteTestProviderOperationOutcome>>,
): Promise<CompleteTestProcedureResult> {
  return projectProcedureResult(CompleteTestResultSchema, await operation);
}

export async function targetedTestOperationResult(
  operation: Promise<DeploymentResult<TargetedTestProviderOperationOutcome>>,
): Promise<TargetedTestProcedureResult> {
  return projectProcedureResult(TargetedTestResultSchema, await operation);
}

export async function canonicalStatusResult(
  operation: Promise<DeploymentResult<readonly CanonicalStatusOutcome[]>>,
): Promise<CanonicalStatusProcedureResult> {
  return projectProcedureResult(CanonicalStatusResultSchema, await operation);
}

export async function canonicalSyncResult(
  operation: Promise<DeploymentResult<CanonicalSyncOutcome>>,
): Promise<CanonicalSyncProcedureResult> {
  return projectProcedureResult(CanonicalSyncResultSchema, await operation);
}

export async function completeNativeHomesResult(
  operation: Promise<DeploymentResult<CompleteNativeHomesObservation>>,
): Promise<CompleteNativeHomesProcedureResult> {
  return projectProcedureResult(CompleteNativeHomesResultSchema, await operation);
}

function projectProcedureResult<const TBoundary extends TSchema>(
  boundary: TBoundary,
  result: unknown,
): Static<TBoundary> {
  // Parse returns an already-valid input unchanged, so clone first to sever domain aliases.
  return Parse(boundary, Clone(result));
}

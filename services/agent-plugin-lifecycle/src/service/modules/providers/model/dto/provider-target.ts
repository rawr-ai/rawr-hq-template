import { ReadonlyObject, type Static, Type } from "typebox";
import { Value } from "typebox/value";

import {
  isCanonicalAbsolutePath,
  MAX_CANONICAL_ABSOLUTE_PATH_BYTES,
} from "../../../../model/dto/structural";
import {
  type DeploymentResult,
  failure,
  firstIssue,
  issue,
  type ProviderDeploymentIssue,
  success,
} from "../errors/deployment-result";
import { type CanonicalValue, canonicalDigest, compareCanonical } from "../helpers/canonical";

declare const providerHomeBrand: unique symbol;
declare const providerTargetDigestBrand: unique symbol;

export const ProviderIdSchema = Type.Union([Type.Literal("claude"), Type.Literal("codex")]);
export const MAX_PROVIDER_TARGETS = 64;
export const MAX_PROVIDER_HOME_LENGTH = MAX_CANONICAL_ABSOLUTE_PATH_BYTES;
export const ProviderHomeSchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVIDER_HOME_LENGTH,
});
export const ProviderTargetInputSchema = ReadonlyObject(
  Type.Object({
    provider: ProviderIdSchema,
    home: ProviderHomeSchema,
  }),
  { additionalProperties: false }
);
export const ProviderTargetsInputSchema = ReadonlyObject(Type.Array(ProviderTargetInputSchema), {
  minItems: 1,
  maxItems: MAX_PROVIDER_TARGETS,
});

export type ProviderId = Static<typeof ProviderIdSchema>;
export type ProviderHome = string & { readonly [providerHomeBrand]: "ProviderHome" };
export type ProviderTargetInput = Static<typeof ProviderTargetInputSchema>;
export type ProviderTargetDigest = string & {
  readonly [providerTargetDigestBrand]: "ProviderTargetDigest";
};

export interface ProviderTarget {
  readonly provider: ProviderId;
  readonly home: ProviderHome;
  readonly targetDigest: ProviderTargetDigest;
}

export function parseProviderTarget(
  input: unknown,
  pathPrefix = "target"
): DeploymentResult<ProviderTarget> {
  if (!Value.Check(ProviderTargetInputSchema, input)) {
    return failure([
      issue(
        "INVALID_TARGET",
        pathPrefix,
        "Provider target must match the closed provider target schema"
      ),
    ]);
  }
  return normalizeProviderTarget(input, pathPrefix);
}

export function parseProviderTargets(
  input: unknown,
  pathPrefix = "targets"
): DeploymentResult<readonly ProviderTarget[]> {
  if (!Value.Check(ProviderTargetsInputSchema, input)) {
    return failure([
      issue(
        "INVALID_TARGET",
        pathPrefix,
        "Provider targets must match the closed provider target list schema"
      ),
    ]);
  }
  return normalizeProviderTargets(input, pathPrefix);
}

export function normalizeProviderTargets(
  input: readonly ProviderTargetInput[],
  pathPrefix = "targets"
): DeploymentResult<readonly ProviderTarget[]> {
  const targets: ProviderTarget[] = [];
  const issues: ProviderDeploymentIssue[] = [];
  for (const [index, candidate] of input.entries()) {
    const normalized = normalizeProviderTarget(candidate, `${pathPrefix}[${index}]`);
    if (normalized.ok) targets.push(normalized.value);
    else issues.push(...normalized.issues);
  }
  issues.push(...duplicateTargetIssues(targets, pathPrefix));
  return issues.length > 0
    ? failure(
        firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target list is invalid"))
      )
    : success(Object.freeze(targets));
}

function normalizeProviderTarget(
  input: ProviderTargetInput,
  pathPrefix: string
): DeploymentResult<ProviderTarget> {
  if (!isCanonicalAbsolutePath(input.home)) {
    return failure([
      issue(
        "INVALID_HOME",
        `${pathPrefix}.home`,
        "Provider home must be a non-root canonical absolute POSIX path",
        "canonical absolute home",
        input.home
      ),
    ]);
  }
  return success(createProviderTarget(input.provider, input.home as ProviderHome));
}

function duplicateTargetIssues(
  targets: ProviderTarget[],
  pathPrefix: string
): ProviderDeploymentIssue[] {
  targets.sort(compareTargets);
  const issues: ProviderDeploymentIssue[] = [];
  for (let index = 1; index < targets.length; index += 1) {
    if (targets[index - 1]?.targetDigest === targets[index]?.targetDigest) {
      issues.push(
        issue(
          "DUPLICATE_TARGET",
          pathPrefix,
          "Provider targets must be distinct after canonicalization",
          "distinct provider/home pairs",
          targets[index]!.targetDigest
        )
      );
    }
  }
  return issues;
}

export function compareTargets(left: ProviderTarget, right: ProviderTarget): number {
  return compareCanonical(left.targetDigest, right.targetDigest);
}

export function targetValue(target: Pick<ProviderTarget, "home" | "provider">): CanonicalValue {
  return { provider: target.provider, home: target.home };
}

function createProviderTarget(provider: ProviderId, home: ProviderHome): ProviderTarget {
  return Object.freeze({
    provider,
    home,
    targetDigest: canonicalDigest("pt1_", targetValue({ provider, home })) as ProviderTargetDigest,
  });
}

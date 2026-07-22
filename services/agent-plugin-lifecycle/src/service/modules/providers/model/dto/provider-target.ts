import path from "node:path";
import { ReadonlyObject, Type, type Static } from "typebox";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import { exactRecord } from "../helpers/parse";
import { failure, firstIssue, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../errors/deployment-result";

declare const providerHomeBrand: unique symbol;
declare const providerTargetDigestBrand: unique symbol;

export const ProviderIdSchema = Type.Union([Type.Literal("claude"), Type.Literal("codex")]);
export const MAX_PROVIDER_TARGETS = 64;
export const MAX_PROVIDER_HOME_LENGTH = 4_096;
export const ProviderHomeSchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVIDER_HOME_LENGTH,
});
export const ProviderTargetInputSchema = ReadonlyObject(Type.Object(
  {
    provider: ProviderIdSchema,
    home: ProviderHomeSchema,
  },
), { additionalProperties: false });
export const ProviderTargetsInputSchema = ReadonlyObject(Type.Array(ProviderTargetInputSchema, {
  minItems: 1,
  maxItems: MAX_PROVIDER_TARGETS,
}));

export type ProviderId = Static<typeof ProviderIdSchema>;
export type ProviderHome = string & { readonly [providerHomeBrand]: "ProviderHome" };
export type ProviderTargetInput = Static<typeof ProviderTargetInputSchema>;
export type ProviderTargetDigest = string & { readonly [providerTargetDigestBrand]: "ProviderTargetDigest" };

export interface ProviderTarget {
  readonly provider: ProviderId;
  readonly home: ProviderHome;
  readonly targetDigest: ProviderTargetDigest;
}

const MAX_HOME_BYTES = 4_096;
const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export function parseProviderTarget(input: unknown, pathPrefix = "target"): DeploymentResult<ProviderTarget> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["home", "provider"], pathPrefix, issues)) {
    return failure(firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target must be a closed object")));
  }
  const provider = parseProviderId(input.provider, `${pathPrefix}.provider`, issues);
  const home = parseProviderHome(input.home, `${pathPrefix}.home`, issues);
  if (issues.length > 0 || provider === undefined || home === undefined) {
    return failure(firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target is invalid")));
  }
  const target = Object.freeze({
    provider,
    home,
    targetDigest: canonicalDigest("pt1_", targetValue({ provider, home })) as ProviderTargetDigest,
  });
  return success(target);
}

export function parseProviderTargets(input: unknown, pathPrefix = "targets"): DeploymentResult<readonly ProviderTarget[]> {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_PROVIDER_TARGETS) {
    return failure([issue("EXPECTED_ARRAY", pathPrefix, `Targets must contain between 1 and ${MAX_PROVIDER_TARGETS} entries`, `1..${MAX_PROVIDER_TARGETS}`, Array.isArray(input) ? String(input.length) : typeof input)]);
  }
  const issues: ProviderDeploymentIssue[] = [];
  const targets: ProviderTarget[] = [];
  for (const [index, candidate] of input.entries()) {
    const parsed = parseProviderTarget(candidate, `${pathPrefix}[${index}]`);
    if (parsed.ok) targets.push(parsed.value);
    else issues.push(...parsed.issues);
  }
  issues.push(...duplicateTargetIssues(targets, pathPrefix));
  return issues.length > 0
    ? failure(firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target list is invalid")))
    : success(Object.freeze(targets));
}

export function normalizeProviderTargets(
  input: readonly ProviderTargetInput[],
  pathPrefix = "targets",
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
    ? failure(firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target list is invalid")))
    : success(Object.freeze(targets));
}

function normalizeProviderTarget(
  input: ProviderTargetInput,
  pathPrefix: string,
): DeploymentResult<ProviderTarget> {
  const issues: ProviderDeploymentIssue[] = [];
  const home = parseProviderHome(input.home, `${pathPrefix}.home`, issues);
  return home === undefined
    ? failure(firstIssue(issues, issue("INVALID_TARGET", pathPrefix, "Provider target is invalid")))
    : success(createProviderTarget(input.provider, home));
}

function duplicateTargetIssues(
  targets: ProviderTarget[],
  pathPrefix: string,
): ProviderDeploymentIssue[] {
  targets.sort(compareTargets);
  const issues: ProviderDeploymentIssue[] = [];
  for (let index = 1; index < targets.length; index += 1) {
    if (targets[index - 1]?.targetDigest === targets[index]?.targetDigest) {
      issues.push(issue(
        "DUPLICATE_TARGET",
        pathPrefix,
        "Provider targets must be distinct after canonicalization",
        "distinct provider/home pairs",
        targets[index]!.targetDigest,
      ));
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

function parseProviderId(
  value: unknown,
  pathPrefix: string,
  issues: ProviderDeploymentIssue[],
): ProviderId | undefined {
  if (value === "codex" || value === "claude") return value;
  issues.push(issue("UNSUPPORTED_PROVIDER", pathPrefix, "Provider must be one of the supported native providers", "codex|claude", String(value)));
  return undefined;
}

function createProviderTarget(provider: ProviderId, home: ProviderHome): ProviderTarget {
  return Object.freeze({
    provider,
    home,
    targetDigest: canonicalDigest("pt1_", targetValue({ provider, home })) as ProviderTargetDigest,
  });
}

function parseProviderHome(
  value: unknown,
  pathPrefix: string,
  issues: ProviderDeploymentIssue[],
): ProviderHome | undefined {
  if (typeof value !== "string") {
    issues.push(issue("EXPECTED_STRING", pathPrefix, "Provider home must be a string"));
    return undefined;
  }
  if (!isCanonicalProviderHome(value)) {
    issues.push(issue("INVALID_HOME", pathPrefix, "Provider home must be a non-root canonical absolute POSIX path", "canonical absolute home", value));
    return undefined;
  }
  return value as ProviderHome;
}

function isCanonicalProviderHome(value: string): boolean {
  const normalized = path.posix.normalize(value);
  return value !== "/"
    && path.posix.isAbsolute(value)
    && normalized === value
    && !value.endsWith("/")
    && !value.includes("\\")
    && value.normalize("NFC") === value
    && !CONTROL_CHARACTER_PATTERN.test(value)
    && encoder.encode(value).byteLength <= MAX_HOME_BYTES;
}

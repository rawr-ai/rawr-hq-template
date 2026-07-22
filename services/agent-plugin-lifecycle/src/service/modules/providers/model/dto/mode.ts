import path from "node:path";
import { ReadonlyObject, Type, type Static } from "typebox";

import {
  CompleteSetArtifactRefInputSchema,
  normalizeArtifactRef,
  parseArtifactRef,
  parseRepositoryIdentity,
  ReleaseArtifactRefInputSchema,
  type CompleteSetArtifactRef,
  type ReleaseArtifactRef,
  type RepositoryIdentity,
} from "../../../../shared/release";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import { boundedArray, canonicalString, exactRecord } from "../helpers/parse";
import { failure, firstIssue, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../errors/deployment-result";
import {
  ProviderTargetsInputSchema,
  normalizeProviderTargets,
  parseProviderTargets,
  targetValue,
  type ProviderTarget,
} from "./provider-target";

declare const evaluationProfileBrand: unique symbol;
declare const requestDigestBrand: unique symbol;
declare const workspaceRootBrand: unique symbol;

export const EvaluationProfileSchema = Type.String({
  minLength: 1,
  maxLength: 256,
  pattern: "^[a-z0-9][a-z0-9._:@/-]*$",
});
export const ProviderRepositoryIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 512,
});
export const ProviderContentWorkspaceRootSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
});
export const ReleaseArtifactRefSchema = ReleaseArtifactRefInputSchema;
export const CompleteSetArtifactRefSchema = CompleteSetArtifactRefInputSchema;
export const ContentRecordLocatorInputSchema = ReadonlyObject(Type.Object(
  {
    repositoryIdentity: ProviderRepositoryIdentitySchema,
    workspaceRoot: ProviderContentWorkspaceRootSchema,
  },
), { additionalProperties: false });
export const TargetedTestInputSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("targeted-test"),
    releases: ReadonlyObject(Type.Array(ReleaseArtifactRefSchema, { minItems: 1, maxItems: 1_024 })),
    evaluationProfile: EvaluationProfileSchema,
    targets: ProviderTargetsInputSchema,
  },
), { additionalProperties: false });
export const CompleteTestInputSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("complete-test"),
    releaseSet: CompleteSetArtifactRefSchema,
    evaluationProfile: EvaluationProfileSchema,
    targets: ProviderTargetsInputSchema,
  },
), { additionalProperties: false });
export const CanonicalSyncInputSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("canonical-sync"),
    channel: Type.Literal("current-main"),
    locator: ContentRecordLocatorInputSchema,
    targets: ProviderTargetsInputSchema,
  },
), { additionalProperties: false });
export const CanonicalStatusInputSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("canonical-status"),
    channel: Type.Literal("current-main"),
    locator: ContentRecordLocatorInputSchema,
    targets: ProviderTargetsInputSchema,
  },
), { additionalProperties: false });

export type EvaluationProfile = string & { readonly [evaluationProfileBrand]: "EvaluationProfile" };
export type ProviderRequestDigest = string & { readonly [requestDigestBrand]: "ProviderRequestDigest" };
export type ContentWorkspaceRoot = string & { readonly [workspaceRootBrand]: "ContentWorkspaceRoot" };
export type TargetedTestInput = Static<typeof TargetedTestInputSchema>;
export type CompleteTestInput = Static<typeof CompleteTestInputSchema>;
export type CanonicalSyncInput = Static<typeof CanonicalSyncInputSchema>;
export type CanonicalStatusInput = Static<typeof CanonicalStatusInputSchema>;

export interface ContentRecordLocator {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly workspaceRoot: ContentWorkspaceRoot;
}

export type TargetedTest = Readonly<Omit<TargetedTestInput, "evaluationProfile" | "releases" | "targets"> & {
  readonly releases: readonly ReleaseArtifactRef[];
  readonly evaluationProfile: EvaluationProfile;
  readonly targets: readonly ProviderTarget[];
  readonly requestDigest: ProviderRequestDigest;
}>;

export type CompleteTest = Readonly<Omit<CompleteTestInput, "evaluationProfile" | "releaseSet" | "targets"> & {
  readonly releaseSet: CompleteSetArtifactRef;
  readonly evaluationProfile: EvaluationProfile;
  readonly targets: readonly ProviderTarget[];
  readonly requestDigest: ProviderRequestDigest;
}>;

export type CanonicalSync = Readonly<Omit<CanonicalSyncInput, "locator" | "targets"> & {
  readonly locator: ContentRecordLocator;
  readonly targets: readonly ProviderTarget[];
  readonly requestDigest: ProviderRequestDigest;
}>;

export type ProviderDeploymentRequest = TargetedTest | CompleteTest | CanonicalSync;

export type CanonicalStatusRequest = Readonly<Omit<CanonicalStatusInput, "locator" | "targets"> & {
  readonly locator: ContentRecordLocator;
  readonly targets: readonly ProviderTarget[];
  readonly requestDigest: ProviderRequestDigest;
}>;

const MAX_RELEASES = 1_024;
const EVALUATION_PROFILE_PATTERN = /^[a-z0-9][a-z0-9._:@/-]*$/u;
const REPOSITORY_PATH_PATTERN = /^\/(?:[^/\u0000-\u001f\u007f]+\/)*[^/\u0000-\u001f\u007f]+$/u;
const pathEncoder = new TextEncoder();

export function parseProviderDeploymentRequest(input: unknown): DeploymentResult<ProviderDeploymentRequest> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failure([issue("EXPECTED_OBJECT", "request", "Deployment request must be a closed object")]);
  }
  const kind = Object.hasOwn(input, "kind") ? (input as { readonly kind?: unknown }).kind : undefined;
  switch (kind) {
    case "targeted-test":
      return parseTargetedTest(input);
    case "complete-test":
      return parseCompleteTest(input);
    case "canonical-sync":
      return parseCanonicalSync(input);
    default:
      return failure([issue("INVALID_MODE", "request.kind", "Deployment mode must be targeted-test, complete-test, or canonical-sync", "targeted-test|complete-test|canonical-sync", String(kind))]);
  }
}

export function parseCanonicalStatusRequest(input: unknown): DeploymentResult<CanonicalStatusRequest> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["channel", "kind", "locator", "targets"], "request", issues)) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Status request is invalid")));
  }
  if (input.kind !== "canonical-status") issues.push(issue("INVALID_MODE", "request.kind", "Status request kind must be canonical-status", "canonical-status", String(input.kind)));
  const channel = parseChannel(input.channel, issues);
  const locator = parseLocator(input.locator, issues);
  const targets = parseTargets(input.targets, issues);
  if (issues.length > 0 || channel === undefined || locator === undefined || targets === undefined) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Status request is invalid")));
  }
  const body = { kind: "canonical-status", channel, locator, targets } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

export function normalizeCompleteTestRequest(
  input: CompleteTestInput,
): DeploymentResult<CompleteTest> {
  const targets = normalizeProviderTargets(input.targets, "request.targets");
  if (!targets.ok) return targets;
  const body = {
    kind: input.kind,
    releaseSet: normalizeArtifactRef(input.releaseSet),
    evaluationProfile: input.evaluationProfile as EvaluationProfile,
    targets: targets.value,
  } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

export function normalizeTargetedTestRequest(
  input: TargetedTestInput,
): DeploymentResult<TargetedTest> {
  const targets = normalizeProviderTargets(input.targets, "request.targets");
  if (!targets.ok) return targets;
  const releases = input.releases.map((entry) => normalizeArtifactRef(entry));
  releases.sort((left, right) => compareCanonical(left.releaseDigest, right.releaseDigest));
  for (let index = 1; index < releases.length; index += 1) {
    if (releases[index - 1]?.releaseDigest === releases[index]?.releaseDigest) {
      return failure([issue(
        "DUPLICATE_MEMBER",
        "request.releases",
        "Targeted release refs must be distinct",
        "distinct release digests",
        releases[index]!.releaseDigest,
      )]);
    }
  }
  const body = {
    kind: input.kind,
    releases: Object.freeze(releases),
    evaluationProfile: input.evaluationProfile as EvaluationProfile,
    targets: targets.value,
  } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

function parseTargetedTest(input: unknown): DeploymentResult<TargetedTest> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["evaluationProfile", "kind", "releases", "targets"], "request", issues)) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Targeted-test request is invalid")));
  }
  const rawRefs = boundedArray(input.releases, "request.releases", MAX_RELEASES, issues);
  const releases: ReleaseArtifactRef[] = [];
  for (const [index, candidate] of (rawRefs ?? []).entries()) {
    const parsed = parseArtifactRef(candidate);
    if (!parsed.ok) {
      issues.push(...parsed.issues.map((entry) => issue("INVALID_ARTIFACT_REF", `request.releases[${index}].${entry.path}`, entry.message)));
    } else if (parsed.value.kind !== "release") {
      issues.push(issue("ARTIFACT_KIND_MISMATCH", `request.releases[${index}]`, "Targeted test requires release artifact refs", "release", parsed.value.kind));
    } else {
      releases.push(parsed.value);
    }
  }
  releases.sort((left, right) => compareCanonical(left.releaseDigest, right.releaseDigest));
  for (let index = 1; index < releases.length; index += 1) {
    if (releases[index - 1]?.releaseDigest === releases[index]?.releaseDigest) {
      issues.push(issue("DUPLICATE_MEMBER", "request.releases", "Targeted release refs must be distinct", "distinct release digests", releases[index]!.releaseDigest));
    }
  }
  const evaluationProfile = parseEvaluationProfile(input.evaluationProfile, issues);
  const targets = parseTargets(input.targets, issues);
  if (issues.length > 0 || releases.length === 0 || evaluationProfile === undefined || targets === undefined) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Targeted-test request is invalid")));
  }
  const body = { kind: "targeted-test", releases: Object.freeze(releases), evaluationProfile, targets } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

function parseCompleteTest(input: unknown): DeploymentResult<CompleteTest> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["evaluationProfile", "kind", "releaseSet", "targets"], "request", issues)) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Complete-test request is invalid")));
  }
  const parsedRef = parseArtifactRef(input.releaseSet);
  if (!parsedRef.ok) issues.push(...parsedRef.issues.map((entry) => issue("INVALID_ARTIFACT_REF", `request.releaseSet.${entry.path}`, entry.message)));
  if (parsedRef.ok && parsedRef.value.kind !== "complete-set") issues.push(issue("ARTIFACT_KIND_MISMATCH", "request.releaseSet", "Complete test requires one complete-set artifact ref", "complete-set", parsedRef.value.kind));
  const evaluationProfile = parseEvaluationProfile(input.evaluationProfile, issues);
  const targets = parseTargets(input.targets, issues);
  if (issues.length > 0 || !parsedRef.ok || parsedRef.value.kind !== "complete-set" || evaluationProfile === undefined || targets === undefined) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Complete-test request is invalid")));
  }
  const body = { kind: "complete-test", releaseSet: parsedRef.value, evaluationProfile, targets } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

function parseCanonicalSync(input: unknown): DeploymentResult<CanonicalSync> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["channel", "kind", "locator", "targets"], "request", issues)) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Canonical-sync request is invalid")));
  }
  const channel = parseChannel(input.channel, issues);
  const locator = parseLocator(input.locator, issues);
  const targets = parseTargets(input.targets, issues);
  if (issues.length > 0 || channel === undefined || locator === undefined || targets === undefined) {
    return failure(firstIssue(issues, issue("INVALID_MODE", "request", "Canonical-sync request is invalid")));
  }
  const body = { kind: "canonical-sync", channel, locator, targets } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

function parseTargets(input: unknown, issues: ProviderDeploymentIssue[]): readonly ProviderTarget[] | undefined {
  const result = parseProviderTargets(input, "request.targets");
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}

function parseEvaluationProfile(input: unknown, issues: ProviderDeploymentIssue[]): EvaluationProfile | undefined {
  const parsed = canonicalString(input, "request.evaluationProfile", issues, {
    maxBytes: 256,
    pattern: EVALUATION_PROFILE_PATTERN,
    code: "INVALID_EVALUATION_PROFILE",
  });
  return parsed as EvaluationProfile | undefined;
}

function parseChannel(input: unknown, issues: ProviderDeploymentIssue[]): "current-main" | undefined {
  if (input === "current-main") return input;
  issues.push(issue("INVALID_MODE", "request.channel", "Canonical channel must be the fixed policy channel", "current-main", String(input)));
  return undefined;
}

function parseLocator(input: unknown, issues: ProviderDeploymentIssue[]): ContentRecordLocator | undefined {
  const nested: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["repositoryIdentity", "workspaceRoot"], "request.locator", nested)) {
    issues.push(...nested);
    return undefined;
  }
  const repository = parseRepositoryIdentity(input.repositoryIdentity, "request.locator.repositoryIdentity");
  if (!repository.ok) nested.push(...repository.issues.map((entry) => issue("INVALID_LOCATOR", entry.path, entry.message)));
  const root = canonicalString(input.workspaceRoot, "request.locator.workspaceRoot", nested, {
    maxBytes: 4_096,
    pattern: REPOSITORY_PATH_PATTERN,
    code: "INVALID_LOCATOR",
  });
  if (root !== undefined && (root.includes("/../") || root.includes("/./") || root.endsWith("/..") || root.endsWith("/."))) {
    nested.push(issue("INVALID_LOCATOR", "request.locator.workspaceRoot", "Workspace root must be a canonical absolute path", "canonical absolute path", root));
  }
  issues.push(...nested);
  return nested.length === 0 && repository.ok && root !== undefined
    ? Object.freeze({ repositoryIdentity: repository.value, workspaceRoot: root as ContentWorkspaceRoot })
    : undefined;
}

function digestRequest(input: Omit<TargetedTest, "requestDigest"> | Omit<CompleteTest, "requestDigest"> | Omit<CanonicalSync, "requestDigest"> | Omit<CanonicalStatusRequest, "requestDigest">): ProviderRequestDigest {
  return canonicalDigest("prq1_", requestValue(input)) as ProviderRequestDigest;
}

function requestValue(input: Omit<TargetedTest, "requestDigest"> | Omit<CompleteTest, "requestDigest"> | Omit<CanonicalSync, "requestDigest"> | Omit<CanonicalStatusRequest, "requestDigest">): CanonicalValue {
  switch (input.kind) {
    case "targeted-test":
      return { kind: input.kind, releases: input.releases.map(releaseRefValue), evaluationProfile: input.evaluationProfile, targets: input.targets.map(targetValue) };
    case "complete-test":
      return { kind: input.kind, releaseSet: setRefValue(input.releaseSet), evaluationProfile: input.evaluationProfile, targets: input.targets.map(targetValue) };
    case "canonical-sync":
    case "canonical-status":
      return { kind: input.kind, channel: input.channel, locator: locatorValue(input.locator), targets: input.targets.map(targetValue) };
  }
}

export function locatorValue(locator: ContentRecordLocator): CanonicalValue {
  return { repositoryIdentity: locator.repositoryIdentity, workspaceRoot: locator.workspaceRoot };
}

export function targetRequestDigest(
  request: ProviderDeploymentRequest,
  target: ProviderTarget,
): ProviderRequestDigest {
  const targetIdentity = targetValue(target);
  const value: CanonicalValue = request.kind === "targeted-test"
    ? {
      kind: request.kind,
      releases: request.releases.map(releaseRefValue),
      evaluationProfile: request.evaluationProfile,
      target: targetIdentity,
    }
    : request.kind === "complete-test"
      ? {
        kind: request.kind,
        releaseSet: setRefValue(request.releaseSet),
        evaluationProfile: request.evaluationProfile,
        target: targetIdentity,
      }
      : {
        kind: request.kind,
        channel: request.channel,
        repositoryIdentity: request.locator.repositoryIdentity,
        target: targetIdentity,
      };
  return canonicalDigest("prq1_", value) as ProviderRequestDigest;
}

export function releaseRefValue(ref: ReleaseArtifactRef): CanonicalValue {
  return { kind: ref.kind, releaseDigest: ref.releaseDigest, artifactDigest: ref.artifactDigest };
}

export function setRefValue(ref: CompleteSetArtifactRef): CanonicalValue {
  return { kind: ref.kind, releaseSetDigest: ref.releaseSetDigest };
}

function isCanonicalContentWorkspaceRoot(value: string): boolean {
  const normalized = path.posix.normalize(value);
  return value !== "/"
    && path.posix.isAbsolute(value)
    && normalized === value
    && !value.endsWith("/")
    && !value.includes("\\")
    && value.normalize("NFC") === value
    && pathEncoder.encode(value).byteLength <= 4_096;
}

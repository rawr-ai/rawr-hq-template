import path from "node:path";
import { ReadonlyObject, Type, type Static } from "typebox";

import {
  CompleteSetArtifactRefInputSchema,
  normalizeArtifactRef,
  parseRepositoryIdentity,
  ReleaseArtifactRefInputSchema,
  type CompleteSetArtifactRef,
  type ReleaseArtifactRef,
  type RepositoryIdentity,
} from "../../../../shared/release";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import { failure, issue, success, type DeploymentResult } from "../errors/deployment-result";
import {
  ProviderTargetsInputSchema,
  normalizeProviderTargets,
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
export type ContentRecordLocatorInput = Static<typeof ContentRecordLocatorInputSchema>;
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

const pathEncoder = new TextEncoder();

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

export function normalizeCanonicalStatusRequest(
  input: CanonicalStatusInput,
): DeploymentResult<CanonicalStatusRequest> {
  const targets = normalizeProviderTargets(input.targets, "request.targets");
  if (!targets.ok) return targets;
  const locator = normalizeContentRecordLocator(input.locator);
  if (!locator.ok) return locator;
  const body = {
    kind: input.kind,
    channel: input.channel,
    locator: locator.value,
    targets: targets.value,
  } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
}

export function normalizeCanonicalSyncRequest(
  input: CanonicalSyncInput,
): DeploymentResult<CanonicalSync> {
  const targets = normalizeProviderTargets(input.targets, "request.targets");
  if (!targets.ok) return targets;
  const locator = normalizeContentRecordLocator(input.locator);
  if (!locator.ok) return locator;
  const body = {
    kind: input.kind,
    channel: input.channel,
    locator: locator.value,
    targets: targets.value,
  } as const;
  return success(Object.freeze({ ...body, requestDigest: digestRequest(body) }));
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

function normalizeContentRecordLocator(
  input: ContentRecordLocatorInput,
): DeploymentResult<ContentRecordLocator> {
  const repository = parseRepositoryIdentity(
    input.repositoryIdentity,
    "request.locator.repositoryIdentity",
  );
  if (!repository.ok) {
    const [first, ...remaining] = repository.issues;
    return failure([
      issue("INVALID_LOCATOR", first.path, first.message),
      ...remaining.map((entry) => issue("INVALID_LOCATOR", entry.path, entry.message)),
    ]);
  }
  if (!isCanonicalContentWorkspaceRoot(input.workspaceRoot)) {
    return failure([issue(
      "INVALID_LOCATOR",
      "request.locator.workspaceRoot",
      "Content workspace root must be a canonical non-root absolute path",
      "canonical absolute path",
      input.workspaceRoot,
    )]);
  }
  return success(Object.freeze({
    repositoryIdentity: repository.value,
    workspaceRoot: input.workspaceRoot as ContentWorkspaceRoot,
  }));
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

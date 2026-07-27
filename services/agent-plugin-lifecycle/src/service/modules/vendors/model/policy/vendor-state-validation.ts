import { Value } from "typebox/value";
import { ContentDigestSchema } from "#agent-plugin-lifecycle-service/model/dto/release-digest";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  RepositoryIdentitySchema,
} from "#agent-plugin-lifecycle-service/model/dto/release-identity";
import { equalBytes } from "#agent-plugin-lifecycle-service/model/helpers/byte-equality";
import type { VendorStatusRequest, VendorUpdateIssue } from "../dto/vendor-operations";
import type { VendorSourceIdentity } from "../dto/vendor-records";
import {
  CANONICAL_ABSOLUTE_PATH_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  QUALIFIED_HEAD_REF_PATTERN,
  STRICT_UTC_RFC3339_PATTERN,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorRepositoryLocatorSchema,
  VendorSourceDeclarationSchema,
} from "../dto/vendor-records";
import type {
  VendorAuthoringPlan,
  VendorDeclaredSourceObservation,
  VendorWorkspaceObservation,
} from "../dto/vendor-workspace";
import { vendorIssue } from "./vendor-policy-result";

const canonicalAbsolutePath = new RegExp(CANONICAL_ABSOLUTE_PATH_PATTERN, "u");
const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");
const qualifiedHeadRef = new RegExp(QUALIFIED_HEAD_REF_PATTERN, "u");
const VENDOR_WORKSPACE_READ_TOKEN_PATTERN = "^sha256_[0-9a-f]{64}$";
const vendorWorkspaceReadToken = new RegExp(VENDOR_WORKSPACE_READ_TOKEN_PATTERN, "u");
const strictUtcRfc3339 = new RegExp(STRICT_UTC_RFC3339_PATTERN, "u");

export function vendorWorkspaceIssue(
  request: VendorStatusRequest,
  observation: VendorWorkspaceObservation
): VendorUpdateIssue | undefined {
  const expected = request.contentWorkspace;
  const actual = observation.contentWorkspace;
  if (!canonicalAbsolutePath.test(expected.locator)) {
    return vendorIssue(
      "RuntimeFailure",
      "The content workspace locator is not canonical and absolute."
    );
  }
  if (
    !Value.Check(RepositoryIdentitySchema, actual.repositoryIdentity) ||
    actual.repositoryIdentity !== expected.repositoryIdentity
  ) {
    return vendorIssue(
      "WrongRepository",
      "Repository observation does not match the requested repository identity."
    );
  }
  if (
    !Value.Check(ContentAuthoritySchema, actual.contentAuthority) ||
    actual.contentAuthority !== expected.contentAuthority
  ) {
    return vendorIssue(
      "WrongRepository",
      "Repository observation does not match the requested content authority."
    );
  }
  if (!qualifiedHeadRef.test(actual.refName) || actual.refName !== expected.refName) {
    return vendorIssue(
      "WrongRef",
      "Repository observation does not match the requested qualified ref."
    );
  }
  if (
    !Value.Check(GitCommitIdSchema, actual.sourceCommit) ||
    actual.sourceCommit !== expected.sourceCommit ||
    !Value.Check(GitTreeIdSchema, actual.sourceTree) ||
    actual.sourceTree !== expected.sourceTree
  ) {
    return vendorIssue(
      "LocalDrift",
      "Repository observation does not match the requested commit and tree."
    );
  }
  if (
    actual.releaseInputPath !== expected.releaseInputPath ||
    observation.workspaceIdentity.root !== expected.locator ||
    !vendorWorkspaceReadToken.test(observation.readToken)
  ) {
    return vendorIssue(
      "UnsupportedLayout",
      "Repository observation changed the canonical workspace layout."
    );
  }

  const sourceIds = new Set<string>();
  const destinations = new Set<string>();
  const authoredPaths: string[] = [actual.releaseInputPath];
  for (const source of observation.sources) {
    const declaration = source.declaration;
    if (sourceIds.has(declaration.sourceId) || destinations.has(declaration.destinationPath)) {
      return vendorIssue(
        "UnsupportedLayout",
        "Vendor source or destination identity is duplicated.",
        declaration.sourceId
      );
    }
    sourceIds.add(declaration.sourceId);
    destinations.add(declaration.destinationPath);
    for (const path of [
      source.declarationBinding.id,
      declaration.destinationPath,
      declaration.provenancePath,
      declaration.lockPath,
    ]) {
      if (
        !normalizedRelativePath.test(path) ||
        authoredPaths.some((known) => pathsOverlap(known, path))
      ) {
        return vendorIssue(
          "UnsupportedLayout",
          "Vendor authoring paths overlap, alias, or repeat.",
          declaration.sourceId
        );
      }
      authoredPaths.push(path);
    }
  }
  return undefined;
}

export function localVendorSourceIssue(
  source: VendorDeclaredSourceObservation
): VendorUpdateIssue | undefined {
  const declaredSourceId = source.declaration.sourceId;
  const {
    declaration,
    declarationBinding,
    declarationContentDigest,
    provenance,
    provenanceBinding,
    provenanceContentDigest,
    lock,
    lockBinding,
    lockContentDigest,
    destination,
  } = source;
  if (!Value.Check(VendorSourceDeclarationSchema, declaration)) {
    return vendorIssue(
      "PayloadMismatch",
      "The vendor declaration record is invalid.",
      declaredSourceId
    );
  }
  if (
    !Value.Check(VendorRecordBindingSchema, declarationBinding) ||
    declarationBinding.contentDigest !== declarationContentDigest
  ) {
    return vendorIssue(
      "PayloadMismatch",
      "The declaration binding does not cover its exact canonical bytes.",
      declaredSourceId
    );
  }
  if (
    provenance === null ||
    provenanceBinding === null ||
    provenanceContentDigest === null ||
    lock === null ||
    lockBinding === null ||
    lockContentDigest === null ||
    !Value.Check(VendorProvenanceRecordSchema, provenance) ||
    !Value.Check(VendorLockRecordSchema, lock)
  ) {
    return vendorIssue(
      "PayloadMismatch",
      "Vendor provenance or lock record is missing or invalid.",
      declaredSourceId
    );
  }
  if (!validObservedAt(provenance.observedAt)) {
    return vendorIssue(
      "PayloadMismatch",
      "Vendor provenance observedAt is not a real strict UTC instant.",
      declaredSourceId
    );
  }
  if (
    provenanceBinding.id !== declaration.provenancePath ||
    provenanceBinding.contentDigest !== provenanceContentDigest ||
    lockBinding.id !== declaration.lockPath ||
    lockBinding.contentDigest !== lockContentDigest
  ) {
    return vendorIssue(
      "PayloadMismatch",
      "Vendor bindings disagree with canonical record paths or bytes.",
      declaredSourceId
    );
  }
  const admitted = lock.admitted;
  if (!validVendorIdentity(admitted)) {
    return vendorIssue(
      "PayloadMismatch",
      "Canonical vendor lock identity is invalid.",
      declaredSourceId
    );
  }
  if (admitted.repositoryIdentity !== declaration.repositoryIdentity) {
    return vendorIssue(
      "WrongRepository",
      "Admitted source repository differs from its declaration.",
      declaredSourceId
    );
  }
  if (admitted.refName !== declaration.refName) {
    return vendorIssue(
      "WrongRef",
      "Admitted source ref differs from its declaration.",
      declaredSourceId
    );
  }
  if (
    provenance.sourceId !== declaration.sourceId ||
    lock.sourceId !== declaration.sourceId ||
    !sameVendorIdentity(provenance.admitted, admitted) ||
    provenance.importedPayloadDigest !== admitted.payloadDigest ||
    provenance.curationRevision !== declaration.curationRevision ||
    provenance.supportedBaseline !== declaration.supportedBaseline ||
    !validVendorIdentity(provenance.observedLatest) ||
    provenance.observedLatest.repositoryIdentity !== declaration.repositoryIdentity ||
    provenance.observedLatest.refName !== declaration.refName
  ) {
    return vendorIssue(
      "PayloadMismatch",
      "Declaration, provenance, and lock records disagree.",
      declaredSourceId
    );
  }
  if (
    (declaration.policy === "held" && provenance.disposition !== "held") ||
    (declaration.policy === "tracked" && provenance.disposition === "held")
  ) {
    return vendorIssue(
      "PayloadMismatch",
      "Vendor policy and provenance disposition disagree.",
      declaredSourceId
    );
  }
  if (destination.kind === "Missing") {
    return vendorIssue(
      "LocalDrift",
      `Vendor destination ${declaration.destinationPath} is missing.`,
      declaredSourceId
    );
  }
  if (destination.kind === "Invalid")
    return vendorIssue("LocalDrift", destination.detail, declaredSourceId);
  if (destination.payloadDigest !== admitted.payloadDigest) {
    return vendorIssue(
      "LocalDrift",
      "Vendor destination bytes differ from the admitted payload.",
      declaredSourceId
    );
  }
  return undefined;
}

export function vendorPlanIsApplied(
  observation: VendorWorkspaceObservation,
  plan: VendorAuthoringPlan
): boolean {
  if (
    observation.readToken !== plan.expectedReadToken ||
    !equalBytes(observation.releaseInputBytes, plan.expectedReleaseInputBytes)
  ) {
    return false;
  }
  const byId = new Map(observation.sources.map((source) => [source.declaration.sourceId, source]));
  return plan.expectedTransitions.every((transition) => {
    const source = byId.get(transition.sourceId);
    return (
      source !== undefined &&
      localVendorSourceIssue(source) === undefined &&
      source.memberPluginId === transition.memberPluginId &&
      sameBinding(source.declarationBinding, transition.declarationBinding) &&
      source.declarationContentDigest === transition.declarationContentDigest &&
      sameDeclaration(source.declaration, transition.declaration) &&
      source.provenanceBinding !== null &&
      sameBinding(source.provenanceBinding, transition.provenanceBinding) &&
      source.provenanceContentDigest === transition.provenanceContentDigest &&
      source.provenance !== null &&
      sameProvenance(source.provenance, transition.provenance) &&
      source.lockBinding !== null &&
      sameBinding(source.lockBinding, transition.lockBinding) &&
      source.lockContentDigest === transition.lockContentDigest &&
      source.lock !== null &&
      source.lock.sourceId === transition.lock.sourceId &&
      sameVendorIdentity(source.lock.admitted, transition.lock.admitted) &&
      source.destination.kind === "Present" &&
      source.destination.payloadDigest === transition.destinationPayloadDigest
    );
  });
}

export function sameVendorIdentity(
  left: VendorSourceIdentity,
  right: VendorSourceIdentity
): boolean {
  return (
    left.repositoryIdentity === right.repositoryIdentity &&
    left.refName === right.refName &&
    left.sourceCommit === right.sourceCommit &&
    left.sourceTree === right.sourceTree &&
    left.payloadDigest === right.payloadDigest
  );
}

export function validVendorIdentity(identity: VendorSourceIdentity): boolean {
  return (
    Value.Check(VendorRepositoryLocatorSchema, identity.repositoryIdentity) &&
    qualifiedHeadRef.test(identity.refName) &&
    Value.Check(GitCommitIdSchema, identity.sourceCommit) &&
    Value.Check(GitTreeIdSchema, identity.sourceTree) &&
    Value.Check(ContentDigestSchema, identity.payloadDigest)
  );
}

function validObservedAt(value: string): boolean {
  if (!strictUtcRfc3339.test(value)) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/u.exec(value);
  if (match === null) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ""] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3));
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, minute, second, millisecond);
  return (
    instant.getUTCFullYear() === year &&
    instant.getUTCMonth() === month - 1 &&
    instant.getUTCDate() === day &&
    instant.getUTCHours() === hour &&
    instant.getUTCMinutes() === minute &&
    instant.getUTCSeconds() === second
  );
}

function sameBinding(
  left: Readonly<{ id: string; protocol: string; contentDigest: string }>,
  right: Readonly<{ id: string; protocol: string; contentDigest: string }>
): boolean {
  return (
    left.id === right.id &&
    left.protocol === right.protocol &&
    left.contentDigest === right.contentDigest
  );
}

function sameDeclaration(
  left: VendorDeclaredSourceObservation["declaration"],
  right: VendorDeclaredSourceObservation["declaration"]
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceId === right.sourceId &&
    left.policy === right.policy &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.refName === right.refName &&
    left.sourcePath === right.sourcePath &&
    left.destinationPath === right.destinationPath &&
    left.provenancePath === right.provenancePath &&
    left.lockPath === right.lockPath &&
    left.curationRevision === right.curationRevision &&
    left.supportedBaseline === right.supportedBaseline
  );
}

function sameProvenance(
  left: NonNullable<VendorDeclaredSourceObservation["provenance"]>,
  right: NonNullable<VendorDeclaredSourceObservation["provenance"]>
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceId === right.sourceId &&
    sameVendorIdentity(left.admitted, right.admitted) &&
    left.importedPayloadDigest === right.importedPayloadDigest &&
    left.curationRevision === right.curationRevision &&
    left.supportedBaseline === right.supportedBaseline &&
    sameVendorIdentity(left.observedLatest, right.observedLatest) &&
    left.observedAt === right.observedAt &&
    left.disposition === right.disposition
  );
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

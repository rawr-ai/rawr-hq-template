import type { NativeMarketplaceSource } from "@habitat-ai/rawr-resource-native-agent-provider";
import { Value } from "typebox/value";
import type { SourceEligibilityIssue } from "../../../../model/dto/content-workspace";
import { MAX_OWNERSHIP_CLAIMS } from "../../../../model/dto/distribution-ownership";
import type {
  DerivedReleaseSelection,
  ReleaseDerivationFailure,
} from "../../../../model/dto/release-derivation";
import { parseReleaseRelativePath } from "../../../../model/policy/release-identity";
import type {
  ProviderIssue,
  ProviderIssueCode,
  SelectedContentObservation,
} from "../dto/provider-lifecycle";
import type {
  SelectedContent,
  SelectedContentFile,
  SelectedContentIssueCode,
  SelectedContentMember,
  SelectedContentResolution,
} from "../dto/selected-content";
import { SelectedContentSchema } from "../dto/selected-content";

type ProviderSelectionResolution =
  | Readonly<{ kind: "Selected"; content: SelectedContent }>
  | Readonly<{ kind: "Rejected"; issues: readonly ProviderIssue[] }>;

interface SelectedContentConstructionInput {
  readonly derivation: DerivedReleaseSelection;
  readonly selectionKind: SelectedContent["selectionKind"];
  readonly marketplace: SelectedContent["marketplace"];
}

/**
 * Projects service-owned release derivation into Provider-selected content.
 *
 * @remarks
 * Release membership, payload binding, and release-set construction are
 * complete before this policy runs. This module adds only provider marketplace
 * identity and the member facts needed for native observation.
 */
export function constructSelectedContent(
  input: SelectedContentConstructionInput
): SelectedContentResolution {
  const firstRelease = input.derivation.releases[0];
  if (firstRelease === undefined) {
    return selectedContentRejected(
      "ReleaseConstructionFailed",
      "Release derivation did not produce a selected member."
    );
  }
  const releaseSet = input.derivation.releaseSet;
  if (input.selectionKind === "targeted" && releaseSet !== undefined) {
    return selectedContentRejected(
      "ReleaseConstructionFailed",
      "Release derivation does not match the Provider selection kind."
    );
  }
  const members = input.derivation.releases.map((release) => {
    const body = release.body;
    return Object.freeze({
      pluginId: body.pluginId,
      aliases: [...body.aliases],
      payloadDigest: body.payloadDigest,
      releaseDigest: release.releaseDigest,
      manifest: body.payloadManifest.map((entry) => Object.freeze({ ...entry })),
    });
  });
  const releaseBody = firstRelease.body;
  const common = Object.freeze({
    contentAuthority: releaseBody.contentAuthority,
    repositoryIdentity: releaseBody.sourceRepository,
    sourceCommit: releaseBody.sourceCommit,
    sourceTree: releaseBody.sourceTree,
    releaseInputDigest: releaseBody.releaseInputDigest,
    marketplace: input.marketplace,
    members,
  });
  if (input.selectionKind === "targeted") {
    return Object.freeze({
      kind: "Selected",
      content: Object.freeze({
        ...common,
        selectionKind: "targeted",
        releaseSetDigest: null,
      }),
    });
  }
  if (releaseSet === undefined) {
    return selectedContentRejected(
      "ReleaseConstructionFailed",
      "Release derivation does not match the Provider selection kind."
    );
  }
  return Object.freeze({
    kind: "Selected",
    content: Object.freeze({
      ...common,
      selectionKind: "complete-set",
      releaseSetDigest: releaseSet.releaseSetDigest,
    }),
  });
}

/** Maps neutral service derivation failures into Provider selection vocabulary. */
export function selectedContentFromReleaseDerivationFailure(
  failure: ReleaseDerivationFailure
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  switch (failure.reason) {
    case "InvalidSelection":
      return selectedContentRejected(
        "SelectionMismatch",
        "Selected plugin identities are empty or duplicated."
      );
    case "UndeclaredMember":
      return selectedContentRejected(
        "SelectionMismatch",
        `Selected plugin ${failure.pluginId} is not declared.`
      );
    case "MissingPayload":
      return selectedContentRejected(
        "SourceIneligible",
        `Verified payload is absent for ${failure.pluginId}.`
      );
    case "InvalidRelease":
      return selectedContentRejected(
        "ReleaseConstructionFailed",
        `Release construction failed for ${failure.pluginId}: ${failure.issueCodes.join(",")}.`
      );
    case "InvalidReleaseSet":
      return selectedContentRejected(
        "ReleaseConstructionFailed",
        `Complete release-set construction failed: ${failure.issueCodes.join(",")}.`
      );
  }
}

/** Maps concrete clean-source refusals into Provider selection vocabulary. */
export function selectedContentFromSourceIssues(
  issues: readonly SourceEligibilityIssue[]
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  return selectedContentRejected(
    "SourceIneligible",
    issues.length === 0
      ? "Source eligibility failed without a diagnostic."
      : issues.map((issue) => `${issue.code}: ${issue.detail}`).join("; ")
  );
}

/** Closes selected-content resolution into the public Provider issue vocabulary. */
export function providerSelectionResolution(
  resolved: Extract<SelectedContentResolution, { kind: "Rejected" }>
): Extract<ProviderSelectionResolution, { kind: "Rejected" }>;
export function providerSelectionResolution(
  resolved: SelectedContentResolution
): ProviderSelectionResolution;
export function providerSelectionResolution(
  resolved: SelectedContentResolution
): ProviderSelectionResolution {
  if (resolved.kind === "Rejected") {
    return {
      kind: "Rejected",
      issues: Object.freeze(
        resolved.issues.map((issue) =>
          providerIssue("SelectionRejected", `${issue.code}: ${issue.detail}`)
        )
      ),
    };
  }
  const issues = validateSelectedContent(resolved.content);
  return issues.length === 0
    ? { kind: "Selected", content: resolved.content }
    : { kind: "Rejected", issues: Object.freeze(issues.slice(0, 256)) };
}

/** Constructs one bounded selected-content refusal. */
export function selectedContentRejected(
  code: SelectedContentIssueCode,
  detail: string
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  const issue = Object.freeze({ code, detail: boundedDetail(detail) });
  const issues: [typeof issue, ...(typeof issue)[]] = [issue];
  return Object.freeze({
    kind: "Rejected",
    issues: Object.freeze(issues),
  });
}

export function providerIssue(
  code: ProviderIssueCode,
  detail: string,
  pluginId?: ProviderIssue["pluginId"]
): ProviderIssue {
  const issue = {
    code,
    detail: boundedDetail(detail),
    ...(pluginId === undefined ? {} : { pluginId }),
  };
  return Object.freeze(issue);
}

export function validateSelectedContent(content: SelectedContent): readonly ProviderIssue[] {
  const issues: ProviderIssue[] = [];
  if (!Value.Check(SelectedContentSchema, content)) {
    return Object.freeze([
      providerIssue(
        "DesiredContentInvalid",
        "Selected content does not match its TypeBox contract."
      ),
    ]);
  }
  if (
    content.marketplace.source.kind === "git" &&
    content.marketplace.source.revision !== content.sourceCommit
  ) {
    issues.push(
      providerIssue(
        "DesiredContentInvalid",
        "Selected Git marketplace revision does not match the selected source commit."
      )
    );
  }
  if (!isCanonicalDistinctOrder(content.members.map((member) => member.pluginId))) {
    issues.push(
      providerIssue(
        "DesiredContentInvalid",
        "Selected plugin identities must be distinct and canonically ordered."
      )
    );
  }
  const ownershipClaimCount = content.members.reduce(
    (total, member) => total + member.aliases.length,
    0
  );
  if (ownershipClaimCount > MAX_OWNERSHIP_CLAIMS) {
    issues.push(
      providerIssue(
        "DesiredContentInvalid",
        "Selected ownership aliases exceed the aggregate ownership bound."
      )
    );
  }
  const ownedNames = new Map<string, string>();
  for (const member of content.members) {
    if (!isCanonicalDistinctOrder(member.aliases)) {
      issues.push(
        providerIssue(
          "DesiredContentInvalid",
          "Selected aliases must be distinct and canonically ordered.",
          member.pluginId
        )
      );
    }
    if (!isCanonicalDistinctOrder(member.manifest.map((file) => file.path))) {
      issues.push(
        providerIssue(
          "DesiredContentInvalid",
          "Selected manifest paths must be distinct and canonically ordered.",
          member.pluginId
        )
      );
    }
    if (member.manifest.some((file) => !parseReleaseRelativePath(file.path).ok)) {
      issues.push(
        providerIssue(
          "DesiredContentInvalid",
          "Selected manifest paths must be canonical release-relative paths.",
          member.pluginId
        )
      );
    }
    collectOwnedName(ownedNames, member.pluginId, member.pluginId, issues);
    for (const alias of member.aliases)
      collectOwnedName(ownedNames, alias, member.pluginId, issues);
  }
  return Object.freeze(issues);
}

export function selectedContentObservation(content: SelectedContent): SelectedContentObservation {
  const [firstPluginId, ...remainingPluginIds] = content.members.map((member) => member.pluginId);
  if (firstPluginId === undefined) {
    throw new Error("Selected content must contain at least one member");
  }
  const pluginIds: SelectedContentObservation["pluginIds"] = Object.freeze([
    firstPluginId,
    ...remainingPluginIds,
  ]);
  return Object.freeze({
    repositoryIdentity: content.repositoryIdentity,
    sourceCommit: content.sourceCommit,
    sourceTree: content.sourceTree,
    releaseInputDigest: content.releaseInputDigest,
    releaseSetDigest: content.releaseSetDigest,
    pluginIds,
  });
}

export function sameSelectedContent(left: SelectedContent, right: SelectedContent): boolean {
  return (
    left.selectionKind === right.selectionKind &&
    left.contentAuthority === right.contentAuthority &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.sourceCommit === right.sourceCommit &&
    left.sourceTree === right.sourceTree &&
    left.releaseInputDigest === right.releaseInputDigest &&
    left.releaseSetDigest === right.releaseSetDigest &&
    sameMarketplaceSource(left.marketplace.source, right.marketplace.source) &&
    left.marketplace.identity === right.marketplace.identity &&
    sameMembers(left.members, right.members)
  );
}

function collectOwnedName(
  owners: Map<string, string>,
  name: string,
  pluginId: SelectedContentMember["pluginId"],
  issues: ProviderIssue[]
): void {
  const existing = owners.get(name);
  if (existing !== undefined && existing !== pluginId) {
    issues.push(
      providerIssue(
        "DesiredContentInvalid",
        `Plugin ownership name ${name} is declared by both ${existing} and ${pluginId}.`,
        pluginId
      )
    );
    return;
  }
  owners.set(name, pluginId);
}

function sameMarketplaceSource(
  left: NativeMarketplaceSource,
  right: NativeMarketplaceSource
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "local" && right.kind === "local") return left.root === right.root;
  if (left.kind !== "git" || right.kind !== "git") return false;
  return (
    left.repositoryUrl === right.repositoryUrl &&
    left.revision === right.revision &&
    sameTextArray(left.sparsePaths, right.sparsePaths)
  );
}

function sameMembers(
  left: readonly SelectedContentMember[],
  right: readonly SelectedContentMember[]
): boolean {
  return (
    left.length === right.length &&
    left.every((member, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        member.pluginId === other.pluginId &&
        member.payloadDigest === other.payloadDigest &&
        member.releaseDigest === other.releaseDigest &&
        sameTextArray(member.aliases, other.aliases) &&
        sameSelectedContentManifest(member.manifest, other.manifest)
      );
    })
  );
}

function sameSelectedContentManifest(
  left: readonly SelectedContentFile[],
  right: readonly SelectedContentFile[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        entry.path === other.path &&
        entry.mode === other.mode &&
        entry.byteLength === other.byteLength &&
        entry.contentDigest === other.contentDigest
      );
    })
  );
}

function sameTextArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isCanonicalDistinctOrder(values: readonly string[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) return false;
  }
  return true;
}

function boundedDetail(detail: string): string {
  if (detail.length <= 4_096) return detail;
  return `${detail.slice(0, 4_080)}...[truncated]`;
}

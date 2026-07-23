import { issue, type ControllerIssue } from "./issues";
import {
  CONTROLLER_PAYLOAD_SCHEMA_VERSION,
  compareCanonicalText,
  controllerDigestFromSha256,
  parseBoundedCanonicalString,
  parseControllerArchitecture,
  parseControllerPlatform,
  parseReleaseRelativePath,
  parseSha256Digest,
  sha256,
  type ControllerDigest,
  type ControllerArchitecture,
  type ControllerPlatform,
  type ControllerPayloadSchemaVersion,
  type ReleaseRelativePath,
  type Sha256Digest,
} from "./primitives";
import { asNonEmpty, failure, success, type ControllerResult } from "./result";

declare const controllerPayloadManifestBrand: unique symbol;
declare const controllerOfficialSetManifestBrand: unique symbol;

export const MAX_CONTROLLER_OFFICIAL_MEMBERS = 256 as const;
export const MAX_CONTROLLER_BUILD_INTERFACES = 256 as const;
export const MAX_CONTROLLER_PAYLOAD_ENTRIES = 100_000 as const;
export const MAX_CONTROLLER_MEMBER_SURFACE_VALUES = 4_096 as const;
export const MAX_CONTROLLER_PAYLOAD_MANIFEST_BYTES = 64 * 1024 * 1024 - 1_024;
export const CONTROLLER_MEMBER_PAYLOAD_DIGEST_SCHEMA_VERSION = 1 as const;

export type ControllerOfficialMemberRole = "command" | "native-manager";

export interface ControllerOfficialMemberInput {
  readonly packageId: string;
  readonly version: string;
  readonly role: ControllerOfficialMemberRole;
  readonly root: string;
  readonly payloadDigest: string;
  readonly commandIds: readonly string[];
  readonly topics: readonly string[];
  readonly aliases: readonly string[];
  readonly hiddenAliases: readonly string[];
  readonly hooks: readonly string[];
}

export interface ControllerOfficialMember {
  readonly packageId: string;
  readonly version: string;
  readonly role: ControllerOfficialMemberRole;
  readonly root: ReleaseRelativePath;
  readonly payloadDigest: Sha256Digest;
  readonly commandIds: readonly string[];
  readonly topics: readonly string[];
  readonly aliases: readonly string[];
  readonly hiddenAliases: readonly string[];
  readonly hooks: readonly string[];
}

export type ControllerOfficialSetManifest = readonly ControllerOfficialMember[] & {
  readonly [controllerOfficialSetManifestBrand]: "ControllerOfficialSetManifest";
};

export interface ControllerBuildInterfaceInput {
  readonly name: string;
  readonly version: string;
}

export interface ControllerBuildInterface {
  readonly name: string;
  readonly version: string;
}

export interface ControllerBundledRuntimeInput {
  readonly path: string;
  readonly licensePath: string;
  readonly digest: string;
  readonly version: string;
  readonly revision: string;
  readonly platform: ControllerPlatform;
  readonly architecture: ControllerArchitecture;
}

export interface ControllerBundledRuntime {
  readonly path: ReleaseRelativePath;
  readonly licensePath: ReleaseRelativePath;
  readonly digest: Sha256Digest;
  readonly version: string;
  readonly revision: string;
  readonly platform: ControllerPlatform;
  readonly architecture: ControllerArchitecture;
}

export interface ControllerDependencyLockInput {
  readonly path: string;
  readonly digest: string;
}

export interface ControllerDependencyLock {
  readonly path: ReleaseRelativePath;
  readonly digest: Sha256Digest;
}

export interface ControllerPayloadFileInput {
  readonly kind: "file";
  readonly path: string;
  readonly mode: number;
  readonly digest: string;
}

export interface ControllerPayloadLinkInput {
  readonly kind: "link";
  readonly path: string;
  readonly mode: number;
  readonly target: string;
}

export type ControllerPayloadEntryInput = ControllerPayloadFileInput | ControllerPayloadLinkInput;

export interface ControllerPayloadFile {
  readonly kind: "file";
  readonly path: ReleaseRelativePath;
  readonly mode: number;
  readonly digest: Sha256Digest;
}

export interface ControllerPayloadLink {
  readonly kind: "link";
  readonly path: ReleaseRelativePath;
  readonly mode: number;
  readonly target: ReleaseRelativePath;
}

export type ControllerPayloadEntry = ControllerPayloadFile | ControllerPayloadLink;

export type ControllerObservedPayloadEntryInput = ControllerPayloadEntryInput & {
  readonly nlink: number;
};
export type ControllerObservedPayloadEntry = ControllerPayloadEntry & { readonly nlink: number };
export type VerifiedControllerPayloadEntry = ControllerPayloadEntry & { readonly nlink: 1 };

export interface ControllerPayloadManifestInput {
  readonly schemaVersion: ControllerPayloadSchemaVersion;
  readonly sourceRevision: string;
  readonly runtime: ControllerBundledRuntimeInput;
  readonly entrypoint: string;
  readonly officialMembers: readonly ControllerOfficialMemberInput[];
  readonly dependencyLock: ControllerDependencyLockInput;
  readonly buildInterfaces: readonly ControllerBuildInterfaceInput[];
  readonly entries: readonly ControllerPayloadEntryInput[];
}

export type ControllerPayloadManifest = Readonly<{
  schemaVersion: ControllerPayloadSchemaVersion;
  sourceRevision: string;
  runtime: ControllerBundledRuntime;
  entrypoint: ReleaseRelativePath;
  officialMembers: ControllerOfficialSetManifest;
  dependencyLock: ControllerDependencyLock;
  buildInterfaces: readonly ControllerBuildInterface[];
  entries: readonly ControllerPayloadEntry[];
  [controllerPayloadManifestBrand]: "ControllerPayloadManifest";
}>;

const encoder = new TextEncoder();
const REVISION_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const BUN_REVISION_PATTERN = /^[0-9a-f]{40}$/;
const BUN_VERSION_PATTERN =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/;
const PACKAGE_ID_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

export function createControllerPayloadManifest(
  input: unknown
): ControllerResult<ControllerPayloadManifest, ControllerIssue> {
  const issues: ControllerIssue[] = [];
  if (
    !isExactRecord(
      input,
      [
        "buildInterfaces",
        "dependencyLock",
        "entries",
        "entrypoint",
        "officialMembers",
        "runtime",
        "schemaVersion",
        "sourceRevision",
      ],
      "manifest",
      issues
    )
  ) {
    return failure(asNonEmpty(issues)!);
  }

  if (input.schemaVersion !== CONTROLLER_PAYLOAD_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        "manifest.schemaVersion",
        "Unsupported controller payload schema version",
        {
          expected: CONTROLLER_PAYLOAD_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const sourceRevision = collect(
    parseBoundedCanonicalString(input.sourceRevision, "manifest.sourceRevision", {
      minBytes: 40,
      maxBytes: 64,
      pattern: REVISION_PATTERN,
    }),
    issues
  );
  const runtime = parseBundledRuntime(input.runtime, issues);
  const entrypoint = collect(
    parseReleaseRelativePath(input.entrypoint, "manifest.entrypoint"),
    issues
  );
  const dependencyLock = parseDependencyLock(input.dependencyLock, issues);
  const officialSet = createControllerOfficialSetManifest(input.officialMembers);
  if (!officialSet.ok) issues.push(...officialSet.issues);
  const officialMembers = officialSet.ok ? officialSet.value : undefined;
  const buildInterfaces = parseBuildInterfaces(input.buildInterfaces, issues);
  const entries = parsePayloadEntries(input.entries, "manifest.entries", issues);

  if (officialMembers !== undefined && entries !== undefined) {
    validateOfficialPayloadRoots(officialMembers, entries, issues);
  }
  if (
    runtime !== undefined &&
    dependencyLock !== undefined &&
    entrypoint !== undefined &&
    entries !== undefined
  ) {
    validateNamedPayloadFiles(runtime, dependencyLock, entrypoint, entries, issues);
  }
  if (entrypoint !== undefined && entries !== undefined) {
    const entry = entries.find((candidate) => candidate.path === entrypoint);
    if (entry === undefined) {
      issues.push(
        issue(
          "MISSING_PAYLOAD_ENTRY",
          "manifest.entrypoint",
          "Controller entrypoint is absent from the payload inventory"
        )
      );
    } else if (entry.kind !== "file") {
      issues.push(
        issue(
          "PAYLOAD_ENTRY_MISMATCH",
          "manifest.entrypoint",
          "Controller entrypoint must be an inventoried file"
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(issues);
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (
    sourceRevision === undefined ||
    runtime === undefined ||
    entrypoint === undefined ||
    dependencyLock === undefined ||
    officialMembers === undefined ||
    buildInterfaces === undefined ||
    entries === undefined
  ) {
    return failure([
      issue("EXPECTED_OBJECT", "manifest", "Manifest validation did not produce a complete value"),
    ]);
  }

  const manifest = Object.freeze({
    schemaVersion: CONTROLLER_PAYLOAD_SCHEMA_VERSION,
    sourceRevision,
    runtime,
    entrypoint,
    officialMembers: Object.freeze(officialMembers),
    dependencyLock,
    buildInterfaces: Object.freeze(buildInterfaces),
    entries: Object.freeze(entries),
  }) as ControllerPayloadManifest;
  const canonicalByteLength = canonicalSerializeControllerPayloadManifest(manifest).byteLength;
  if (canonicalByteLength > MAX_CONTROLLER_PAYLOAD_MANIFEST_BYTES) {
    return failure([
      issue(
        "MANIFEST_TOO_LARGE",
        "manifest",
        "Canonical controller payload manifest exceeds its decode bound",
        {
          expected: MAX_CONTROLLER_PAYLOAD_MANIFEST_BYTES,
          actual: canonicalByteLength,
        }
      ),
    ]);
  }
  return success(manifest);
}

export function createControllerOfficialSetManifest(
  input: unknown
): ControllerResult<ControllerOfficialSetManifest, ControllerIssue> {
  const issues: ControllerIssue[] = [];
  const members = parseOfficialMembers(input, issues);
  if (members !== undefined) validateOfficialOwnership(members, issues);
  const nonEmpty = asNonEmpty(issues);
  return nonEmpty === undefined && members !== undefined
    ? success(Object.freeze(members) as ControllerOfficialSetManifest)
    : failure(
        nonEmpty ?? [
          issue(
            "EXPECTED_ARRAY",
            "officialMembers",
            "Official set validation did not produce members"
          ),
        ]
      );
}

export function canonicalSerializeControllerPayloadManifest(
  manifest: ControllerPayloadManifest
): Uint8Array {
  return encoder.encode(canonicalStringifyControllerPayloadManifest(manifest));
}

export function canonicalStringifyControllerPayloadManifest(
  manifest: ControllerPayloadManifest
): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    sourceRevision: manifest.sourceRevision,
    runtime: {
      path: manifest.runtime.path,
      licensePath: manifest.runtime.licensePath,
      digest: manifest.runtime.digest,
      version: manifest.runtime.version,
      revision: manifest.runtime.revision,
      platform: manifest.runtime.platform,
      architecture: manifest.runtime.architecture,
    },
    entrypoint: manifest.entrypoint,
    officialMembers: manifest.officialMembers.map((member) => ({
      packageId: member.packageId,
      version: member.version,
      role: member.role,
      root: member.root,
      payloadDigest: member.payloadDigest,
      commandIds: member.commandIds,
      topics: member.topics,
      aliases: member.aliases,
      hiddenAliases: member.hiddenAliases,
      hooks: member.hooks,
    })),
    dependencyLock: {
      path: manifest.dependencyLock.path,
      digest: manifest.dependencyLock.digest,
    },
    buildInterfaces: manifest.buildInterfaces.map((entry) => ({
      name: entry.name,
      version: entry.version,
    })),
    entries: manifest.entries.map(canonicalPayloadEntryValue),
  });
}

export function computeControllerDigest(manifest: ControllerPayloadManifest): ControllerDigest {
  return controllerDigestFromSha256(sha256(canonicalSerializeControllerPayloadManifest(manifest)));
}

export function computeControllerMemberPayloadDigest(
  entriesInput: unknown,
  rootInput: unknown
): ControllerResult<Sha256Digest, ControllerIssue> {
  const issues: ControllerIssue[] = [];
  const root = collect(parseReleaseRelativePath(rootInput, "member.root"), issues);
  const entries = parsePayloadEntries(entriesInput, "member.entries", issues);
  if (root !== undefined && entries !== undefined && !hasEntriesBelowRoot(entries, root)) {
    issues.push(
      issue("MISSING_PAYLOAD_ENTRY", "member.root", "Official member root has no payload entry")
    );
  }
  const nonEmpty = asNonEmpty(issues);
  return nonEmpty === undefined && root !== undefined && entries !== undefined
    ? success(computeMemberPayloadDigest(entries, root))
    : failure(
        nonEmpty ?? [
          issue("EXPECTED_OBJECT", "member", "Member payload digest input is incomplete"),
        ]
      );
}

export function verifyControllerPayload(
  manifestInput: unknown,
  observedEntriesInput: unknown
): ControllerResult<VerifiedControllerPayload, ControllerIssue> {
  const manifest = createControllerPayloadManifest(manifestInput);
  const issues: ControllerIssue[] = [];
  if (!manifest.ok) issues.push(...manifest.issues);
  const observedEntries = parsePayloadEntries(
    observedEntriesInput,
    "observedEntries",
    issues,
    true
  );
  if (!manifest.ok || observedEntries === undefined) return failure(asNonEmpty(issues)!);

  const expectedByPath = new Map(manifest.value.entries.map((entry) => [entry.path, entry]));
  const observedByPath = new Map(observedEntries.map((entry) => [entry.path, entry]));
  for (const expected of manifest.value.entries) {
    const observed = observedByPath.get(expected.path);
    if (observed === undefined) {
      issues.push(
        issue(
          "MISSING_PAYLOAD_ENTRY",
          `observedEntries.${expected.path}`,
          "Manifest payload entry is absent"
        )
      );
      continue;
    }
    compareObservedPayloadEntry(expected, observed, issues);
  }
  for (const observed of observedEntries) {
    if (!expectedByPath.has(observed.path)) {
      issues.push(
        issue(
          "UNEXPECTED_PAYLOAD_ENTRY",
          `observedEntries.${observed.path}`,
          "Payload contains an unmanifested entry"
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(issues);
  return nonEmpty === undefined
    ? success(
        Object.freeze({
          manifest: manifest.value,
          entries: Object.freeze(observedEntries) as readonly VerifiedControllerPayloadEntry[],
        }) as VerifiedControllerPayload
      )
    : failure(nonEmpty);
}

declare const verifiedControllerPayloadBrand: unique symbol;

export type VerifiedControllerPayload = Readonly<{
  manifest: ControllerPayloadManifest;
  entries: readonly VerifiedControllerPayloadEntry[];
  [verifiedControllerPayloadBrand]: "VerifiedControllerPayload";
}>;

function parseBundledRuntime(
  input: unknown,
  issues: ControllerIssue[]
): ControllerBundledRuntime | undefined {
  const path = "manifest.runtime";
  if (
    !isExactRecord(
      input,
      ["architecture", "digest", "licensePath", "path", "platform", "revision", "version"],
      path,
      issues
    )
  ) {
    return undefined;
  }
  const runtimePath = collect(parseReleaseRelativePath(input.path, `${path}.path`), issues);
  const licensePath = collect(
    parseReleaseRelativePath(input.licensePath, `${path}.licensePath`),
    issues
  );
  const digest = collect(parseSha256Digest(input.digest, `${path}.digest`), issues);
  const version = collect(
    parseBoundedCanonicalString(input.version, `${path}.version`, {
      maxBytes: 128,
      pattern: BUN_VERSION_PATTERN,
    }),
    issues
  );
  const revision = collect(
    parseBoundedCanonicalString(input.revision, `${path}.revision`, {
      minBytes: 40,
      maxBytes: 40,
      pattern: BUN_REVISION_PATTERN,
    }),
    issues
  );
  const platform = collect(parseControllerPlatform(input.platform, `${path}.platform`), issues);
  const architecture = collect(
    parseControllerArchitecture(input.architecture, `${path}.architecture`),
    issues
  );
  return runtimePath !== undefined &&
    licensePath !== undefined &&
    digest !== undefined &&
    version !== undefined &&
    revision !== undefined &&
    platform !== undefined &&
    architecture !== undefined
    ? Object.freeze({
        path: runtimePath,
        licensePath,
        digest,
        version,
        revision,
        platform,
        architecture,
      })
    : undefined;
}

function parseDependencyLock(
  input: unknown,
  issues: ControllerIssue[]
): ControllerDependencyLock | undefined {
  const path = "manifest.dependencyLock";
  if (!isExactRecord(input, ["digest", "path"], path, issues)) return undefined;
  const lockPath = collect(parseReleaseRelativePath(input.path, `${path}.path`), issues);
  const digest = collect(parseSha256Digest(input.digest, `${path}.digest`), issues);
  return lockPath !== undefined && digest !== undefined
    ? Object.freeze({ path: lockPath, digest })
    : undefined;
}

function parseOfficialMembers(
  input: unknown,
  issues: ControllerIssue[]
): readonly ControllerOfficialMember[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(
      issue("EXPECTED_ARRAY", "manifest.officialMembers", "Official members must be an array")
    );
    return undefined;
  }
  if (input.length === 0 || input.length > MAX_CONTROLLER_OFFICIAL_MEMBERS) {
    issues.push(
      issue(
        "INVALID_COUNT",
        "manifest.officialMembers",
        `Official member count must be between 1 and ${MAX_CONTROLLER_OFFICIAL_MEMBERS}`,
        {
          expected: MAX_CONTROLLER_OFFICIAL_MEMBERS,
          actual: input.length,
        }
      )
    );
  }
  const members: ControllerOfficialMember[] = [];
  input.slice(0, MAX_CONTROLLER_OFFICIAL_MEMBERS).forEach((candidate, index) => {
    const path = `manifest.officialMembers[${index}]`;
    if (
      !isExactRecord(
        candidate,
        [
          "aliases",
          "commandIds",
          "hiddenAliases",
          "hooks",
          "packageId",
          "payloadDigest",
          "role",
          "root",
          "topics",
          "version",
        ],
        path,
        issues
      )
    )
      return;
    const packageId = collect(
      parseBoundedCanonicalString(candidate.packageId, `${path}.packageId`, {
        maxBytes: 214,
        pattern: PACKAGE_ID_PATTERN,
      }),
      issues
    );
    const version = collect(
      parseBoundedCanonicalString(candidate.version, `${path}.version`, { maxBytes: 128 }),
      issues
    );
    const role =
      candidate.role === "command" || candidate.role === "native-manager"
        ? candidate.role
        : undefined;
    if (role === undefined) {
      issues.push(
        issue(
          "INVALID_STRING",
          `${path}.role`,
          "Official member role must be command or native-manager"
        )
      );
    }
    const root = collect(parseReleaseRelativePath(candidate.root, `${path}.root`), issues);
    const payloadDigest = collect(
      parseSha256Digest(candidate.payloadDigest, `${path}.payloadDigest`),
      issues
    );
    const commandIds = parseCanonicalCommandSet(candidate.commandIds, `${path}.commandIds`, issues);
    const topics = parseCanonicalCommandSet(candidate.topics, `${path}.topics`, issues);
    const aliases = parseCanonicalCommandSet(candidate.aliases, `${path}.aliases`, issues);
    const hiddenAliases = parseCanonicalCommandSet(
      candidate.hiddenAliases,
      `${path}.hiddenAliases`,
      issues
    );
    const hooks = parseCanonicalStringSet(candidate.hooks, `${path}.hooks`, issues);
    if (
      packageId !== undefined &&
      version !== undefined &&
      role !== undefined &&
      root !== undefined &&
      payloadDigest !== undefined &&
      commandIds !== undefined &&
      topics !== undefined &&
      aliases !== undefined &&
      hiddenAliases !== undefined &&
      hooks !== undefined
    ) {
      members.push(
        Object.freeze({
          packageId,
          version,
          role,
          root,
          payloadDigest,
          commandIds,
          topics,
          aliases,
          hiddenAliases,
          hooks,
        })
      );
    }
  });
  return members.sort((left, right) => compareCanonicalText(left.packageId, right.packageId));
}

function parseBuildInterfaces(
  input: unknown,
  issues: ControllerIssue[]
): readonly ControllerBuildInterface[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(
      issue("EXPECTED_ARRAY", "manifest.buildInterfaces", "Build interfaces must be an array")
    );
    return undefined;
  }
  if (input.length === 0 || input.length > MAX_CONTROLLER_BUILD_INTERFACES) {
    issues.push(
      issue(
        "INVALID_COUNT",
        "manifest.buildInterfaces",
        `Build interface count must be between 1 and ${MAX_CONTROLLER_BUILD_INTERFACES}`,
        {
          expected: MAX_CONTROLLER_BUILD_INTERFACES,
          actual: input.length,
        }
      )
    );
  }
  const entries: ControllerBuildInterface[] = [];
  input.slice(0, MAX_CONTROLLER_BUILD_INTERFACES).forEach((candidate, index) => {
    const path = `manifest.buildInterfaces[${index}]`;
    if (!isExactRecord(candidate, ["name", "version"], path, issues)) return;
    const name = collect(
      parseBoundedCanonicalString(candidate.name, `${path}.name`, { maxBytes: 128 }),
      issues
    );
    const version = collect(
      parseBoundedCanonicalString(candidate.version, `${path}.version`, { maxBytes: 128 }),
      issues
    );
    if (name !== undefined && version !== undefined) entries.push(Object.freeze({ name, version }));
  });
  entries.sort(
    (left, right) =>
      compareCanonicalText(left.name, right.name) ||
      compareCanonicalText(left.version, right.version)
  );
  reportDuplicates(
    entries.map((entry) => entry.name),
    "manifest.buildInterfaces",
    issues
  );
  return entries;
}

function parsePayloadEntries(
  input: unknown,
  path: string,
  issues: ControllerIssue[],
  observed: true
): readonly ControllerObservedPayloadEntry[] | undefined;
function parsePayloadEntries(
  input: unknown,
  path: string,
  issues: ControllerIssue[],
  observed?: false
): readonly ControllerPayloadEntry[] | undefined;
function parsePayloadEntries(
  input: unknown,
  path: string,
  issues: ControllerIssue[],
  observed = false
): readonly (ControllerPayloadEntry | ControllerObservedPayloadEntry)[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(issue("EXPECTED_ARRAY", path, "Payload entries must be an array"));
    return undefined;
  }
  if (input.length === 0 || input.length > MAX_CONTROLLER_PAYLOAD_ENTRIES) {
    issues.push(
      issue(
        "INVALID_COUNT",
        path,
        `Payload entry count must be between 1 and ${MAX_CONTROLLER_PAYLOAD_ENTRIES}`,
        {
          expected: MAX_CONTROLLER_PAYLOAD_ENTRIES,
          actual: input.length,
        }
      )
    );
  }
  const entries: (ControllerPayloadEntry | ControllerObservedPayloadEntry)[] = [];
  input.slice(0, MAX_CONTROLLER_PAYLOAD_ENTRIES).forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(candidate, entryPath, issues)) return;
    if (candidate.kind === "file") {
      assertExactKeys(
        candidate,
        observed ? ["digest", "kind", "mode", "nlink", "path"] : ["digest", "kind", "mode", "path"],
        entryPath,
        issues
      );
      const parsedPath = collect(
        parseReleaseRelativePath(candidate.path, `${entryPath}.path`),
        issues
      );
      const mode = parseMode(candidate.mode, `${entryPath}.mode`, issues);
      const digest = collect(parseSha256Digest(candidate.digest, `${entryPath}.digest`), issues);
      const nlink = observed
        ? parseNlink(candidate.nlink, `${entryPath}.nlink`, issues)
        : undefined;
      if (
        parsedPath !== undefined &&
        mode !== undefined &&
        digest !== undefined &&
        (!observed || nlink !== undefined)
      ) {
        entries.push(
          Object.freeze(
            observed
              ? { kind: "file", path: parsedPath, mode, digest, nlink: nlink! }
              : { kind: "file", path: parsedPath, mode, digest }
          )
        );
      }
      return;
    }
    if (candidate.kind === "link") {
      assertExactKeys(
        candidate,
        observed ? ["kind", "mode", "nlink", "path", "target"] : ["kind", "mode", "path", "target"],
        entryPath,
        issues
      );
      const parsedPath = collect(
        parseReleaseRelativePath(candidate.path, `${entryPath}.path`),
        issues
      );
      const mode = parseMode(candidate.mode, `${entryPath}.mode`, issues);
      const target = collect(
        parseReleaseRelativePath(candidate.target, `${entryPath}.target`),
        issues
      );
      const nlink = observed
        ? parseNlink(candidate.nlink, `${entryPath}.nlink`, issues)
        : undefined;
      if (
        parsedPath !== undefined &&
        mode !== undefined &&
        target !== undefined &&
        (!observed || nlink !== undefined)
      ) {
        if (parsedPath === target)
          issues.push(
            issue(
              "UNSAFE_LINK_TARGET",
              `${entryPath}.target`,
              "Payload link must not target itself"
            )
          );
        entries.push(
          Object.freeze(
            observed
              ? { kind: "link", path: parsedPath, mode, target, nlink: nlink! }
              : { kind: "link", path: parsedPath, mode, target }
          )
        );
      }
      return;
    }
    issues.push(
      issue("UNKNOWN_FIELD", `${entryPath}.kind`, "Payload entry kind must be file or link")
    );
  });
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicates(
    entries.map((entry) => entry.path),
    path,
    issues
  );
  validateLinkTargets(entries, path, issues);
  return entries;
}

function validateOfficialPayloadRoots(
  members: readonly ControllerOfficialMember[],
  entries: readonly ControllerPayloadEntry[],
  issues: ControllerIssue[]
): void {
  for (const member of members) {
    if (!hasEntriesBelowRoot(entries, member.root)) {
      issues.push(
        issue(
          "MISSING_PAYLOAD_ENTRY",
          `manifest.officialMembers.${member.packageId}.root`,
          "Official member root has no payload entry"
        )
      );
      continue;
    }
    const computedDigest = computeMemberPayloadDigest(entries, member.root);
    if (computedDigest !== member.payloadDigest) {
      issues.push(
        issue(
          "MEMBER_PAYLOAD_DIGEST_MISMATCH",
          `manifest.officialMembers.${member.packageId}.payloadDigest`,
          "Official member payload digest does not match its canonical inventory subtree",
          { expected: computedDigest, actual: member.payloadDigest }
        )
      );
    }
  }
}

function validateNamedPayloadFiles(
  runtime: ControllerBundledRuntime,
  dependencyLock: ControllerDependencyLock,
  entrypoint: ReleaseRelativePath,
  entries: readonly ControllerPayloadEntry[],
  issues: ControllerIssue[]
): void {
  const namedPaths = [runtime.path, runtime.licensePath, dependencyLock.path, entrypoint];
  if (new Set(namedPaths).size !== namedPaths.length) {
    issues.push(
      issue(
        "SURFACE_COLLISION",
        "manifest",
        "Runtime, runtime license, dependency lock, and entrypoint paths must be distinct"
      )
    );
  }
  validateNamedFile(
    entries,
    runtime.path,
    "manifest.runtime.path",
    runtime.digest,
    "RUNTIME_DIGEST_MISMATCH",
    issues
  );
  validateNamedFile(
    entries,
    runtime.licensePath,
    "manifest.runtime.licensePath",
    undefined,
    undefined,
    issues
  );
  validateNamedFile(
    entries,
    dependencyLock.path,
    "manifest.dependencyLock.path",
    dependencyLock.digest,
    "DEPENDENCY_LOCK_DIGEST_MISMATCH",
    issues
  );
}

function validateNamedFile(
  entries: readonly ControllerPayloadEntry[],
  path: ReleaseRelativePath,
  issuePath: string,
  expectedDigest: Sha256Digest | undefined,
  mismatchCode: "RUNTIME_DIGEST_MISMATCH" | "DEPENDENCY_LOCK_DIGEST_MISMATCH" | undefined,
  issues: ControllerIssue[]
): void {
  const entry = entries.find((candidate) => candidate.path === path);
  if (entry === undefined) {
    issues.push(
      issue(
        "MISSING_PAYLOAD_ENTRY",
        issuePath,
        "Named controller payload file is absent from the inventory"
      )
    );
    return;
  }
  if (entry.kind !== "file") {
    issues.push(
      issue("PAYLOAD_ENTRY_MISMATCH", issuePath, "Named controller payload path must be a file")
    );
    return;
  }
  if (
    expectedDigest !== undefined &&
    mismatchCode !== undefined &&
    entry.digest !== expectedDigest
  ) {
    issues.push(
      issue(
        mismatchCode,
        issuePath,
        "Named controller payload digest differs from its inventory row",
        {
          expected: entry.digest,
          actual: expectedDigest,
        }
      )
    );
  }
}

function hasEntriesBelowRoot(
  entries: readonly ControllerPayloadEntry[],
  root: ReleaseRelativePath
): boolean {
  return entries.some((entry) => entry.path === root || entry.path.startsWith(`${root}/`));
}

function computeMemberPayloadDigest(
  entries: readonly ControllerPayloadEntry[],
  root: ReleaseRelativePath
): Sha256Digest {
  const memberEntries = entries.filter(
    (entry) => entry.path === root || entry.path.startsWith(`${root}/`)
  );
  return sha256(
    encoder.encode(
      JSON.stringify({
        schemaVersion: CONTROLLER_MEMBER_PAYLOAD_DIGEST_SCHEMA_VERSION,
        root,
        entries: memberEntries.map(canonicalPayloadEntryValue),
      })
    )
  );
}

function canonicalPayloadEntryValue(
  entry: ControllerPayloadEntry
): Readonly<Record<string, string | number>> {
  return entry.kind === "file"
    ? { kind: entry.kind, path: entry.path, mode: entry.mode, digest: entry.digest }
    : { kind: entry.kind, path: entry.path, mode: entry.mode, target: entry.target };
}

function validateOfficialOwnership(
  members: readonly ControllerOfficialMember[],
  issues: ControllerIssue[]
): void {
  reportDuplicates(
    members.map((member) => member.packageId),
    "manifest.officialMembers.packageId",
    issues
  );
  reportDuplicates(
    members.map((member) => member.root),
    "manifest.officialMembers.root",
    issues
  );
  for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
    const left = members[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
      const right = members[rightIndex]!;
      if (left.root.startsWith(`${right.root}/`) || right.root.startsWith(`${left.root}/`)) {
        issues.push(
          issue(
            "SURFACE_COLLISION",
            "manifest.officialMembers.root",
            "Official member roots must not overlap"
          )
        );
      }
    }
  }

  const commandSurfaces = new Map<string, string>();
  for (const member of members) {
    for (const value of [...member.commandIds, ...member.aliases, ...member.hiddenAliases]) {
      const owner = commandSurfaces.get(value);
      if (owner !== undefined) {
        issues.push(
          issue(
            "SURFACE_COLLISION",
            `manifest.officialMembers.${member.packageId}`,
            `Command surface ${value} is already owned by ${owner}`
          )
        );
      } else {
        commandSurfaces.set(value, member.packageId);
      }
    }
  }
}

function validateLinkTargets(
  entries: readonly ControllerPayloadEntry[],
  path: string,
  issues: ControllerIssue[]
): void {
  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const entry of entries) {
    if (entry.kind !== "link") continue;
    if (entry.target.startsWith(`${entry.path}/`) || entry.path.startsWith(`${entry.target}/`)) {
      issues.push(
        issue(
          "UNSAFE_LINK_TARGET",
          `${path}.${entry.path}.target`,
          "Payload link path and target must not contain one another"
        )
      );
      continue;
    }
    const targetExists =
      entryByPath.has(entry.target) ||
      entries.some((candidate) => candidate.path.startsWith(`${entry.target}/`));
    if (!targetExists) {
      issues.push(
        issue(
          "UNSAFE_LINK_TARGET",
          `${path}.${entry.path}.target`,
          "Payload link target is not contained in the complete inventory"
        )
      );
      continue;
    }
    const visited = new Set<string>([entry.path]);
    let target = entryByPath.get(entry.target);
    while (target?.kind === "link") {
      if (visited.has(target.path)) {
        issues.push(
          issue(
            "UNSAFE_LINK_TARGET",
            `${path}.${entry.path}.target`,
            "Payload link chain contains a cycle"
          )
        );
        break;
      }
      visited.add(target.path);
      target = entryByPath.get(target.target);
    }
  }
}

function parseCanonicalStringSet(
  input: unknown,
  path: string,
  issues: ControllerIssue[]
): readonly string[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(issue("EXPECTED_ARRAY", path, "Value must be an array"));
    return undefined;
  }
  if (input.length > MAX_CONTROLLER_MEMBER_SURFACE_VALUES) {
    issues.push(
      issue("INVALID_COUNT", path, `Array exceeds ${MAX_CONTROLLER_MEMBER_SURFACE_VALUES} values`, {
        expected: MAX_CONTROLLER_MEMBER_SURFACE_VALUES,
        actual: input.length,
      })
    );
  }
  const values: string[] = [];
  input.slice(0, MAX_CONTROLLER_MEMBER_SURFACE_VALUES).forEach((value, index) => {
    const parsed = collect(
      parseBoundedCanonicalString(value, `${path}[${index}]`, { maxBytes: 512 }),
      issues
    );
    if (parsed !== undefined) values.push(parsed);
  });
  values.sort(compareCanonicalText);
  reportDuplicates(values, path, issues);
  return Object.freeze(values);
}

function parseCanonicalCommandSet(
  input: unknown,
  path: string,
  issues: ControllerIssue[]
): readonly string[] | undefined {
  const values = parseCanonicalStringSet(input, path, issues);
  if (values === undefined) return undefined;
  values.forEach((value, index) => {
    if (!COMMAND_ID_PATTERN.test(value)) {
      issues.push(
        issue(
          "INVALID_STRING",
          `${path}[${index}]`,
          "Command identities must use canonical colon-delimited segments"
        )
      );
    }
  });
  return values;
}

function parseMode(value: unknown, path: string, issues: ControllerIssue[]): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push(issue("EXPECTED_INTEGER", path, "Payload mode must be an integer"));
    return undefined;
  }
  if (value < 0 || value > 0o7777) {
    issues.push(
      issue("INVALID_MODE", path, "Payload mode must be between 0 and 07777", {
        expected: 0o7777,
        actual: value,
      })
    );
    return undefined;
  }
  return value;
}

function parseNlink(value: unknown, path: string, issues: ControllerIssue[]): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    issues.push(
      issue("EXPECTED_INTEGER", path, "Observed payload nlink must be a positive integer")
    );
    return undefined;
  }
  if (value !== 1) {
    issues.push(
      issue(
        "SHARED_PAYLOAD_INODE",
        path,
        "Controller payload entries must have an independent inode",
        {
          expected: 1,
          actual: value,
        }
      )
    );
  }
  return value;
}

function reportDuplicates(
  values: readonly string[],
  path: string,
  issues: ControllerIssue[]
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issues.push(issue("DUPLICATE_VALUE", path, `Duplicate value: ${value}`));
    seen.add(value);
  }
}

function compareObservedPayloadEntry(
  expected: ControllerPayloadEntry,
  observed: ControllerPayloadEntry,
  issues: ControllerIssue[]
): void {
  const path = `observedEntries.${expected.path}`;
  if (expected.kind !== observed.kind) {
    issues.push(
      issue(
        "PAYLOAD_KIND_MISMATCH",
        `${path}.kind`,
        "Observed payload entry kind differs from the manifest",
        {
          expected: expected.kind,
          actual: observed.kind,
        }
      )
    );
    return;
  }
  if (expected.mode !== observed.mode) {
    issues.push(
      issue(
        "PAYLOAD_MODE_MISMATCH",
        `${path}.mode`,
        "Observed payload mode differs from the manifest",
        {
          expected: expected.mode,
          actual: observed.mode,
        }
      )
    );
  }
  if (expected.kind === "file" && observed.kind === "file" && expected.digest !== observed.digest) {
    issues.push(
      issue(
        "PAYLOAD_DIGEST_MISMATCH",
        `${path}.digest`,
        "Observed file digest differs from the manifest",
        {
          expected: expected.digest,
          actual: observed.digest,
        }
      )
    );
  }
  if (expected.kind === "link" && observed.kind === "link" && expected.target !== observed.target) {
    issues.push(
      issue(
        "PAYLOAD_LINK_TARGET_MISMATCH",
        `${path}.target`,
        "Observed link target differs from the manifest",
        {
          expected: expected.target,
          actual: observed.target,
        }
      )
    );
  }
}

function collect<T>(
  result: ControllerResult<T, ControllerIssue>,
  issues: ControllerIssue[]
): T | undefined {
  if (result.ok) return result.value;
  issues.push(...result.issues);
  return undefined;
}

function isRecord(
  value: unknown,
  path: string,
  issues: ControllerIssue[]
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue("EXPECTED_OBJECT", path, "Value must be an object"));
    return false;
  }
  return true;
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
  path: string,
  issues: ControllerIssue[]
): value is Record<string, unknown> {
  if (!isRecord(value, path, issues)) return false;
  assertExactKeys(value, keys, path, issues);
  return true;
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
  issues: ControllerIssue[]
): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key))
      issues.push(
        issue("UNKNOWN_FIELD", `${path}.${key}`, "Field is not part of the closed schema")
      );
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key))
      issues.push(issue("UNKNOWN_FIELD", `${path}.${key}`, "Required field is missing"));
  }
}

export const EXTERNAL_EXTENSION_DISPOSITIONS = ["delegate-native", "converged", "reject"] as const;

export type ExternalExtensionDisposition = (typeof EXTERNAL_EXTENSION_DISPOSITIONS)[number];

export const COLLISION_CLASSES = [
  "package",
  "command",
  "topic",
  "alias",
  "hidden-alias",
  "hook",
] as const;

export type CollisionClass = (typeof COLLISION_CLASSES)[number];

export type ReservedIdentityClass = CollisionClass;

export type ExternalExtensionCollision = {
  collisionClass: CollisionClass;
  value: string;
  reservedAs: readonly ReservedIdentityClass[];
};

export type ReservedControllerSurface = {
  packageIds: ReadonlySet<string>;
  commandIds: ReadonlySet<string>;
  topics: ReadonlySet<string>;
  aliases: ReadonlySet<string>;
  hiddenAliases: ReadonlySet<string>;
  hooks: ReadonlySet<string>;
};

export type StaticCommandManifest = {
  id: string;
  isESM: boolean;
  topics: readonly string[];
  aliases: readonly string[];
  hiddenAliases: readonly string[];
  relativePath: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type StaticHookManifest = {
  event: string;
  identifier: string;
  target: readonly string[];
};

export type StaticExternalExtension = {
  packageId: string;
  version: string;
  root: string;
  canonicalRoot: string;
  fingerprint: string;
  moduleType: "commonjs" | "module";
  commandRoot: readonly string[];
  topics: readonly string[];
  commands: readonly StaticCommandManifest[];
  hooks: readonly string[];
  hookManifests: readonly StaticHookManifest[];
};

export type NativeLinkEntry = {
  name: string;
  type: "link";
  root: string;
};

type NativeUserEntryMetadata = {
  name: string;
  type: "user";
  tag?: string;
  url?: string;
};

export type NativeUserEntry = NativeUserEntryMetadata & {
  dependencySpec: string;
};

export type NativeRegistryUserEntry = NativeUserEntryMetadata & {
  dependencySpec?: string;
};

export type NativeExternalEntry = NativeLinkEntry | NativeUserEntry;

export type NativeRegistryEntry =
  | NativeLinkEntry
  | NativeRegistryUserEntry;

export type ActiveExternalExtension = {
  entry: NativeExternalEntry;
  extension: StaticExternalExtension;
};

export const QUARANTINE_CODES = [
  "registry-malformed",
  "native-package-residue",
  "native-dependency-missing",
  "native-dependency-mismatch",
  "entry-malformed",
  "entry-duplicate",
  "root-missing",
  "root-unreadable",
  "package-manifest-missing",
  "package-manifest-malformed",
  "package-identity-mismatch",
  "nested-plugin-declaration",
  "command-manifest-missing",
  "command-manifest-malformed",
  "command-manifest-version-mismatch",
  "command-module-missing",
  "command-module-outside-root",
  "reserved-surface-collision",
] as const;

export type QuarantineCode = (typeof QUARANTINE_CODES)[number];

export type QuarantineReason = {
  code: QuarantineCode;
  message: string;
  collisions?: readonly ExternalExtensionCollision[];
};

export type QuarantinedExternalExtension = {
  identity: string;
  entry?: NativeRegistryEntry;
  root?: string;
  reason: QuarantineReason;
};

export type NativeRegistryStatus = "missing" | "valid" | "malformed";

export type NativeRegistryProjection = {
  registryPath: string;
  status: NativeRegistryStatus;
  hasResidue: boolean;
  active: readonly ActiveExternalExtension[];
  quarantined: readonly QuarantinedExternalExtension[];
};

export type CandidateInspection =
  | { accepted: true; extension: StaticExternalExtension }
  | { accepted: false; quarantine: QuarantinedExternalExtension };

export type ExternalExtensionOperation =
  | "install"
  | "link"
  | "uninstall"
  | "update"
  | "reset";

export type ExternalExtensionOperationResult = {
  operation: ExternalExtensionOperation;
  disposition: ExternalExtensionDisposition;
  reason?: string;
  reasonCode?: "mixed-update-no-safe-native-seam";
  nativeStatus?: "completed" | "failed";
  cleanup?: readonly Readonly<{
    owner: "install-staging" | "native-manager-temporary";
    status: "completed" | "failed";
    error?: string;
  }>[];
  before: NativeRegistryProjection;
  after: NativeRegistryProjection;
};

export type ExternalExtensionInspection =
  | { found: true; state: "active"; value: ActiveExternalExtension }
  | { found: true; state: "quarantined"; value: QuarantinedExternalExtension }
  | { found: false; identity: string };

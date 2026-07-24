import path from "node:path";
import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "@rawr/agent-plugin-lifecycle/input";

import { CHECK_MODES, type CheckMode } from "./flags";

export { MAX_RELEASE_INPUT_ENVELOPE_BYTES };

type InputOf<T> = T extends (...args: infer TArgs) => unknown ? TArgs[0] : never;

export type CheckRequest = InputOf<Client["releases"]["check"]>;
export type RepositoryCheckRequest = InputOf<Client["releases"]["checkRepository"]>;
export type ReleaseInputRecordRequest = InputOf<Client["releases"]["releaseInputRecord"]>;
export type ReleaseInputRefreshRequest = InputOf<Client["releases"]["refreshReleaseInput"]>;
export type VendorStatusRequest = InputOf<Client["vendors"]["status"]>;
export type VendorUpdateRequest = InputOf<Client["vendors"]["update"]>;
export type PackageRequest = InputOf<Client["packaging"]["package"]>;
export type TestRequest = InputOf<Client["providers"]["test"]>;
export type SyncRequest = InputOf<Client["providers"]["sync"]>;
export type StatusRequest = InputOf<Client["providers"]["status"]>;
export type CurrentMainRecordRequest = InputOf<Client["governance"]["currentMainRecord"]>;
export type CurrentMainSelectionRequest = InputOf<Client["governance"]["currentMainSelection"]>;

export type CheckOperationRequest =
  | Readonly<{ operation: "releases.check"; input: CheckRequest }>
  | Readonly<{ operation: "releases.checkRepository"; input: RepositoryCheckRequest }>
  | Readonly<{ operation: "releases.releaseInputRecord"; input: ReleaseInputRecordRequest }>
  | Readonly<{
      operation: "releases.refreshReleaseInput";
      input: ReleaseInputRefreshRequest;
    }>
  | Readonly<{ operation: "governance.currentMainRecord"; input: CurrentMainRecordRequest }>
  | Readonly<{
      operation: "governance.currentMainSelection";
      input: CurrentMainSelectionRequest;
    }>;

export class LifecycleInputError extends Error {
  readonly code = "LIFECYCLE_INPUT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "LifecycleInputError";
  }
}

type RawFlags = Readonly<Record<string, unknown>>;

type CheckDomainFlag =
  | "content-workspace"
  | "repository-identity"
  | "content-authority"
  | "remote-name"
  | "remote-url"
  | "ref"
  | "source-commit"
  | "source-tree"
  | "release-input"
  | "plugin-root"
  | "plugin"
  | "complete-set"
  | "member"
  | "current-main-body-json"
  | "current-main-record-json";

const CHECK_MODE_ADMITTED_FLAGS = {
  release: [
    "content-workspace",
    "repository-identity",
    "content-authority",
    "remote-name",
    "remote-url",
    "ref",
    "source-commit",
    "source-tree",
    "release-input",
    "plugin-root",
    "plugin",
    "complete-set",
  ],
  "repository-staged": [
    "content-workspace",
    "repository-identity",
    "content-authority",
    "remote-name",
    "remote-url",
    "ref",
    "release-input",
    "plugin-root",
  ],
  "repository-clean": [
    "content-workspace",
    "repository-identity",
    "content-authority",
    "remote-name",
    "remote-url",
    "ref",
    "source-commit",
    "source-tree",
    "release-input",
    "plugin-root",
  ],
  "release-input-record": [],
  "release-input-refresh": [
    "content-workspace",
    "repository-identity",
    "content-authority",
    "remote-name",
    "remote-url",
    "ref",
    "release-input",
    "plugin-root",
    "member",
  ],
  "current-main-record": ["current-main-body-json", "current-main-record-json"],
  "current-main-selection": ["content-workspace", "repository-identity"],
} as const satisfies Readonly<Record<CheckMode, readonly CheckDomainFlag[]>>;

const CHECK_DOMAIN_FLAGS = Object.freeze([
  ...new Set(Object.values(CHECK_MODE_ADMITTED_FLAGS).flat()),
]) satisfies readonly CheckDomainFlag[];

export function parseCheckOperationRequest(
  flags: RawFlags,
  releaseInputRecordBytes?: Uint8Array
): CheckOperationRequest {
  const mode =
    flags.mode === undefined ? "release" : requireLiteral(flags.mode, "--mode", CHECK_MODES);
  switch (mode) {
    case "release":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS.release);
      return Object.freeze({
        operation: "releases.check",
        input: parseReleaseWorkspaceRequest(flags),
      });
    case "repository-staged":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["repository-staged"]);
      return Object.freeze({
        operation: "releases.checkRepository",
        input: Object.freeze({
          kind: "staged",
          contentWorkspace: stagedContentWorkspacePolicy(flags),
        }),
      });
    case "repository-clean":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["repository-clean"]);
      return Object.freeze({
        operation: "releases.checkRepository",
        input: Object.freeze({
          kind: "clean",
          contentWorkspace: releaseContentWorkspacePolicy(flags),
        }),
      });
    case "release-input-record":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["release-input-record"]);
      return Object.freeze({
        operation: "releases.releaseInputRecord",
        input: parseReleaseInputRecordRequest(releaseInputRecordBytes),
      });
    case "release-input-refresh":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["release-input-refresh"]);
      return Object.freeze({
        operation: "releases.refreshReleaseInput",
        input: Object.freeze({
          contentWorkspace: stagedContentWorkspacePolicy(flags),
          memberIds: Object.freeze(
            requireStringList(flags.member, "--member", {
              maxItems: MAX_RELEASE_MEMBERS,
              unique: true,
            }).map((memberId) =>
              requireLifecycleInput(
                parsePluginId(memberId),
                "--member must be a canonical plugin identity"
              )
            )
          ),
        }),
      });
    case "current-main-record":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["current-main-record"]);
      return Object.freeze({
        operation: "governance.currentMainRecord",
        input: parseCurrentMainRecordRequest(flags),
      });
    case "current-main-selection":
      assertCheckDomain(flags, CHECK_MODE_ADMITTED_FLAGS["current-main-selection"]);
      return Object.freeze({
        operation: "governance.currentMainSelection",
        input: Object.freeze({
          locator: Object.freeze({
            workspacePath: requireCanonicalAbsolute(
              flags["content-workspace"],
              "--content-workspace"
            ),
            expectedRepositoryIdentity: requireLifecycleInput(
              parseRepositoryIdentity(flags["repository-identity"]),
              "--repository-identity must be a canonical logical repository identity"
            ),
          }),
        }),
      });
  }
}

function parseReleaseInputRecordRequest(bytes: Uint8Array | undefined): ReleaseInputRecordRequest {
  if (bytes === undefined || bytes.byteLength === 0) {
    throw new LifecycleInputError("--mode release-input-record requires nonempty stdin");
  }
  if (bytes.byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
    throw new LifecycleInputError(
      `--mode release-input-record stdin exceeds ${MAX_RELEASE_INPUT_ENVELOPE_BYTES} bytes`
    );
  }

  let body: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    body = JSON.parse(text) as unknown;
  } catch {
    return Object.freeze({ kind: "validate-envelope", bytes });
  }

  if (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (Object.hasOwn(body, "releaseInputDigest") || Object.hasOwn(body, "body"))
  ) {
    return Object.freeze({ kind: "validate-envelope", bytes });
  }
  return Object.freeze({ kind: "encode-body", body });
}

function parseCurrentMainRecordRequest(flags: RawFlags): CurrentMainRecordRequest {
  const bodyJson = optionalBoundedJsonText(
    flags["current-main-body-json"],
    "--current-main-body-json"
  );
  const recordJson = optionalBoundedJsonText(
    flags["current-main-record-json"],
    "--current-main-record-json"
  );
  if ((bodyJson === undefined) === (recordJson === undefined)) {
    throw new LifecycleInputError(
      "Select exactly one of --current-main-body-json or --current-main-record-json"
    );
  }
  if (bodyJson !== undefined) {
    let body: unknown;
    try {
      body = JSON.parse(bodyJson) as unknown;
    } catch {
      throw new LifecycleInputError("--current-main-body-json must contain valid JSON");
    }
    return Object.freeze({ kind: "encode-body", body }) as CurrentMainRecordRequest;
  }
  return Object.freeze({
    kind: "validate-record",
    bytes: new TextEncoder().encode(recordJson),
  });
}

export function parseVendorStatusRequest(flags: RawFlags): VendorStatusRequest {
  return Object.freeze({ contentWorkspace: vendorWorkspace(flags) });
}

export function parseVendorUpdateRequest(flags: RawFlags): VendorUpdateRequest {
  const sourceIds = requireStringList(flags.source, "--source", { unique: true });
  return Object.freeze({
    contentWorkspace: vendorWorkspace(flags),
    sourceIds: Object.freeze(sourceIds),
  });
}

export function parsePackageRequest(flags: RawFlags): PackageRequest {
  const release = parseReleaseWorkspaceRequest(flags);
  const outputPath = requireCanonicalAbsolute(flags.output, "--output", { allowFile: true });
  return Object.freeze({
    ...release,
    format: requireLiteral(flags.format, "--format", ["cowork-v1"] as const),
    outputPath,
  });
}

export function parseTestRequest(flags: RawFlags): TestRequest {
  const pluginIds = optionalStringList(flags.plugin, "--plugin");
  const completeSet = flags["complete-set"] === true;
  if ((pluginIds.length === 0) === !completeSet) {
    throw new LifecycleInputError("Select exactly one of --plugin or --complete-set");
  }
  const mode: TestRequest["mode"] = completeSet
    ? Object.freeze({ kind: "complete-set" })
    : Object.freeze({
        kind: "targeted",
        pluginIds: requireNonEmpty(
          requireStringList(pluginIds, "--plugin", {
            maxItems: MAX_RELEASE_MEMBERS,
            unique: true,
          }).map((pluginId) =>
            requireLifecycleInput(
              parsePluginId(pluginId),
              "--plugin must be a canonical plugin identity"
            )
          ),
          "--plugin"
        ),
      });
  const disposableRoot = requireCanonicalAbsolute(flags["disposable-root"], "--disposable-root");
  const targets = parseProviderTargets(flags.target);
  assertStrictDescendants(disposableRoot, targets);
  return Object.freeze({
    contentWorkspace: releaseContentWorkspacePolicy(flags),
    disposableRoot,
    mode,
    targets,
  });
}

export function parseSyncRequest(flags: RawFlags): SyncRequest {
  return Object.freeze({
    channel: "current-main",
    locator: contentRecordLocator(flags),
    targets: parseProviderTargets(flags.target),
  });
}

export function parseStatusRequest(flags: RawFlags): StatusRequest {
  return Object.freeze({
    channel: "current-main",
    locator: contentRecordLocator(flags),
    targets: parseProviderTargets(flags.target),
  });
}

function parseReleaseWorkspaceRequest(flags: RawFlags): CheckRequest {
  const plugin = optionalString(flags.plugin, "--plugin");
  const completeSet = flags["complete-set"] === true;
  if ((plugin === undefined) === !completeSet) {
    throw new LifecycleInputError("Select exactly one of --plugin or --complete-set");
  }
  const mode =
    plugin === undefined ? Object.freeze({ kind: "complete-set" as const }) : targetMode(plugin);
  return Object.freeze({
    contentWorkspace: releaseContentWorkspacePolicy(flags),
    mode,
  });
}

function releaseContentWorkspacePolicy(flags: RawFlags): CheckRequest["contentWorkspace"] {
  return Object.freeze({
    ...stagedContentWorkspacePolicy(flags),
    sourceCommit: requireLifecycleInput(
      parseGitCommitId(flags["source-commit"]),
      "--source-commit must be an exact lowercase Git object ID"
    ),
    sourceTree: requireLifecycleInput(
      parseGitTreeId(flags["source-tree"]),
      "--source-tree must be an exact lowercase Git object ID"
    ),
  });
}

function stagedContentWorkspacePolicy(
  flags: RawFlags
): Extract<RepositoryCheckRequest, Readonly<{ kind: "staged" }>>["contentWorkspace"] {
  return Object.freeze({
    locator: requireCanonicalAbsolute(flags["content-workspace"], "--content-workspace"),
    repositoryIdentity: requireLifecycleInput(
      parseRepositoryIdentity(flags["repository-identity"]),
      "--repository-identity must be a canonical logical repository identity"
    ),
    contentAuthority: requireLifecycleInput(
      parseContentAuthority(flags["content-authority"]),
      "--content-authority must be canonical"
    ),
    remoteName: requireString(flags["remote-name"], "--remote-name"),
    remoteUrl: requireString(flags["remote-url"], "--remote-url"),
    refName: requireString(flags.ref, "--ref"),
    releaseInputPath: requireLifecycleInput(
      parseReleaseRelativePath(flags["release-input"]),
      "--release-input must be a canonical POSIX relative path"
    ),
    pluginRoot: requireLifecycleInput(
      parseReleaseRelativePath(flags["plugin-root"]),
      "--plugin-root must be a canonical POSIX relative path"
    ),
  });
}

function assertCheckDomain(flags: RawFlags, admitted: readonly CheckDomainFlag[]): void {
  const admittedSet = new Set<string>(admitted);
  for (const flag of CHECK_DOMAIN_FLAGS) {
    const value = flags[flag];
    if (value === undefined || value === false || admittedSet.has(flag)) continue;
    throw new LifecycleInputError(`--${flag} is not admitted by the selected --mode`);
  }
}

function targetMode(plugin: string): CheckRequest["mode"] {
  const parsed = parsePluginId(plugin);
  if (parsed === undefined) {
    throw new LifecycleInputError("--plugin must be a canonical plugin identity");
  }
  return Object.freeze({ kind: "targeted", pluginId: parsed });
}

function vendorWorkspace(flags: RawFlags): VendorStatusRequest["contentWorkspace"] {
  return Object.freeze({
    locator: requireCanonicalAbsolute(flags["content-workspace"], "--content-workspace"),
    repositoryIdentity: requireString(flags["repository-identity"], "--repository-identity"),
    contentAuthority: requireString(flags["content-authority"], "--content-authority"),
    refName: requireString(flags.ref, "--ref"),
    sourceCommit: requireGitObject(flags["source-commit"], "--source-commit"),
    sourceTree: requireGitObject(flags["source-tree"], "--source-tree"),
    releaseInputPath: requireRelativePath(flags["release-input"], "--release-input"),
  });
}

function contentRecordLocator(flags: RawFlags): SyncRequest["locator"] {
  return Object.freeze({
    workspacePath: requireCanonicalAbsolute(flags["content-workspace"], "--content-workspace"),
    expectedRepositoryIdentity: requireLifecycleInput(
      parseRepositoryIdentity(flags["repository-identity"]),
      "--repository-identity must be a canonical logical repository identity"
    ),
  });
}

function parseProviderTargets(input: unknown): TestRequest["targets"] {
  const values = requireStringList(input, "--target", { unique: true });
  const targets = values.map((value) => {
    const separator = value.indexOf("=");
    if (separator <= 0 || separator !== value.lastIndexOf("=")) {
      throw new LifecycleInputError("--target must use provider=absolute-home");
    }
    const provider = value.slice(0, separator);
    if (provider !== "claude" && provider !== "codex") {
      throw new LifecycleInputError("--target provider must be claude or codex");
    }
    return Object.freeze({
      provider,
      home: requireCanonicalAbsolute(value.slice(separator + 1), "--target home"),
    });
  });
  const identities = new Set<string>();
  for (const target of targets) {
    const identity = `${target.provider}\0${target.home}`;
    if (identities.has(identity))
      throw new LifecycleInputError("--target contains a duplicate canonical target");
    identities.add(identity);
  }
  return requireNonEmpty(targets, "--target");
}

function assertStrictDescendants(disposableRoot: string, targets: TestRequest["targets"]): void {
  for (const target of targets) {
    const relative = path.relative(disposableRoot, target.home);
    if (
      relative.length === 0 ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new LifecycleInputError(
        `--target home for ${target.provider} must be a strict descendant of --disposable-root`
      );
    }
  }
}

function requireNonEmpty<T>(values: readonly T[], label: string): readonly [T, ...T[]] {
  const [first, ...rest] = values;
  if (first === undefined) throw new LifecycleInputError(`${label} must be provided at least once`);
  return Object.freeze([first, ...rest]);
}

function requireLifecycleInput<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new LifecycleInputError(message);
  return value;
}

function requireCanonicalAbsolute(
  input: unknown,
  label: string,
  options: Readonly<{ allowFile?: boolean }> = {}
): string {
  const value = requireString(input, label, { max: 16_384 });
  if (!path.isAbsolute(value) || path.normalize(value) !== value || path.resolve(value) !== value) {
    throw new LifecycleInputError(`${label} must be an absolute lexically canonical path`);
  }
  if (value === path.parse(value).root)
    throw new LifecycleInputError(`${label} may not be a filesystem root`);
  if (!options.allowFile && path.basename(value).length === 0) {
    throw new LifecycleInputError(`${label} must identify a concrete authority root`);
  }
  return value;
}

function requireRelativePath(input: unknown, label: string): string {
  const value = requireString(input, label, { max: 4_096 });
  if (
    value.includes("\\") ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    path.posix.normalize(value) !== value ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new LifecycleInputError(`${label} must be a canonical repository-relative path`);
  }
  return value;
}

function requireGitObject(input: unknown, label: string): string {
  const value = requireString(input, label, { max: 64 });
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) {
    throw new LifecycleInputError(`${label} must be an exact lowercase Git object ID`);
  }
  return value;
}

function requireString(
  input: unknown,
  label: string,
  options: Readonly<{ max?: number }> = {}
): string {
  const max = options.max ?? 512;
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    input.length > max ||
    /[\u0000-\u001f\u007f]/u.test(input)
  ) {
    throw new LifecycleInputError(
      `${label} must be a bounded nonempty string without control characters`
    );
  }
  return input;
}

function optionalString(input: unknown, label: string): string | undefined {
  return input === undefined ? undefined : requireString(input, label);
}

function optionalBoundedJsonText(input: unknown, label: string): string | undefined {
  if (input === undefined) return undefined;
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    new TextEncoder().encode(input).byteLength > 2 * 1024 * 1024 ||
    input.includes("\0")
  ) {
    throw new LifecycleInputError(`${label} must be bounded nonempty UTF-8 JSON text`);
  }
  return input;
}

function requireStringList(
  input: unknown,
  label: string,
  options: Readonly<{ maxItems?: number; unique?: boolean }> = {}
): string[] {
  const values = optionalStringList(input, label);
  if (values.length === 0) throw new LifecycleInputError(`${label} must be provided at least once`);
  if (options.maxItems !== undefined && values.length > options.maxItems) {
    throw new LifecycleInputError(`${label} may be provided at most ${options.maxItems} times`);
  }
  if (options.unique && new Set(values).size !== values.length) {
    throw new LifecycleInputError(`${label} contains a duplicate value`);
  }
  return values;
}

function optionalStringList(input: unknown, label: string): string[] {
  if (input === undefined) return [];
  const values = Array.isArray(input) ? input : [input];
  return values.map((value) => requireString(value, label));
}

function requireLiteral<const T extends readonly string[]>(
  input: unknown,
  label: string,
  allowed: T
): T[number] {
  const value = requireString(input, label);
  if (!allowed.includes(value)) {
    throw new LifecycleInputError(`${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T[number];
}

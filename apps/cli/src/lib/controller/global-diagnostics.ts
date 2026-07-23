import {
  CONTROLLER_SELECTION_BYTES,
  decodeControllerSelection,
  type ControllerIssue,
} from "@rawr/controller-release";
import { createHash } from "node:crypto";
import { constants, createReadStream } from "node:fs";
import { access, lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import type { NativeRegistryProjection } from "../external-extensions/model";
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerDataRootFromRelease,
  controllerLauncherPath,
  controllerReleasePath,
  controllerSelectorPath,
} from "./layout";
import {
  inspectControllerRelease,
  type ControllerReleaseInspectionIssue,
} from "./release-inspector";

type DiagnosticDomain =
  | "data-root"
  | "selector"
  | "launcher"
  | "release"
  | "runtime"
  | "global-resolution"
  | "external-extensions";

export type GlobalDoctorIssue = Readonly<{
  domain: DiagnosticDomain;
  code: string;
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}>;

type DataRootSource =
  | "release-context"
  | "RAWR_DATA_DIR"
  | "XDG_DATA_HOME"
  | "operator-home"
  | "HOME"
  | "unresolved";

type FileEvidence = Readonly<{
  path: string;
  status: "regular" | "alias" | "symlink" | "other" | "missing" | "unreadable";
  realpath: string | null;
  executable: boolean;
  digest: string | null;
}>;

type InvocationDiagnostics = Readonly<{
  status: "valid" | "invalid" | "absent";
  controllerDigest: string | null;
  releaseRoot: string | null;
  selectorMatchesInvocation: boolean | null;
}>;

type SelectorDiagnostics = Readonly<{
  path: string | null;
  status: "valid" | "invalid" | "missing" | "unreadable" | "unavailable";
  controllerDigest: string | null;
  issues: readonly GlobalDoctorIssue[];
}>;

type ReleaseDiagnostics = Readonly<{
  status: "verified" | "invalid" | "unavailable";
  root: string | null;
  controllerDigest: string | null;
  sourceRevision: string | null;
  entry: Readonly<{
    path: string | null;
    releasePath: string;
    verified: boolean;
  }>;
  runtime: Readonly<{
    path: string | null;
    releasePath: string;
    licensePath: string | null;
    licenseReleasePath: string;
    digest: string | null;
    version: string | null;
    revision: string | null;
    platform: string | null;
    architecture: string | null;
    platformMatchesHost: boolean | null;
    architectureMatchesHost: boolean | null;
    verified: boolean;
  }>;
  dependencyLock: Readonly<{
    path: string | null;
    releasePath: string;
    digest: string | null;
    verified: boolean;
  }>;
  officialMembers: readonly Readonly<{
    packageId: string;
    version: string;
    root: string;
    payloadDigest: string;
    commandIds: readonly string[];
    topics: readonly string[];
    aliases: readonly string[];
    hiddenAliases: readonly string[];
    hooks: readonly string[];
    entryCount: number;
    verified: boolean;
  }>[];
  issues: readonly GlobalDoctorIssue[];
}>;

type ExternalExtensionDiagnostics = Readonly<{
  registryPath: string;
  status: NativeRegistryProjection["status"] | "unavailable";
  hasResidue: boolean;
  active: readonly Readonly<{
    packageId: string;
    version: string;
    type: "link" | "user";
    root: string;
    fingerprint: string;
  }>[];
  quarantined: readonly Readonly<{
    identity: string;
    root: string | null;
    code: string;
    message: string;
  }>[];
  healthy: boolean;
}>;

export type GlobalDoctorData = Readonly<{
  healthy: boolean;
  dataRoot: Readonly<{
    path: string | null;
    configuredPath: string | null;
    source: DataRootSource;
    status: "available" | "invalid" | "missing" | "unreadable" | "unresolved";
    realpath: string | null;
  }>;
  invocation: InvocationDiagnostics;
  selector: SelectorDiagnostics;
  launcher: FileEvidence | null;
  release: ReleaseDiagnostics;
  globalResolution: Readonly<{
    commandPath: string | null;
    commandRealpath: string | null;
    expectedLauncherPath: string | null;
    expectedLauncherRealpath: string | null;
    matchesLauncher: boolean;
  }>;
  externalExtensions: ExternalExtensionDiagnostics;
  issues: readonly GlobalDoctorIssue[];
}>;

export type GlobalDoctorInspectionOptions = Readonly<{
  env: NodeJS.ProcessEnv;
  cwd: string;
  oclifDataDir: string;
  readExternalExtensions: () => Promise<NativeRegistryProjection>;
  hostPlatform?: string;
  hostArchitecture?: string;
}>;

const CONTROLLER_DIGEST_PATTERN = /^[0-9a-f]{64}$/u;

export async function inspectGlobalController(
  options: GlobalDoctorInspectionOptions
): Promise<GlobalDoctorData> {
  const issues: GlobalDoctorIssue[] = [];
  const invocationResult = parseInvocationContext(options.env);
  issues.push(...invocationResult.issues);

  const configured = configuredDataRoot(options.env);
  const requestedDataRoot = invocationResult.dataRoot ?? configured.path;
  const dataRoot = await inspectDataRoot(
    requestedDataRoot,
    configured.path,
    invocationResult.dataRoot ? "release-context" : configured.source
  );
  if (dataRoot.issue) issues.push(dataRoot.issue);
  const effectiveDataRoot =
    dataRoot.value.status === "available" ? dataRoot.value.realpath : dataRoot.value.path;

  const selector = await inspectSelector(effectiveDataRoot);
  issues.push(...selector.issues);

  const invocation: InvocationDiagnostics = Object.freeze({
    status: invocationResult.status,
    controllerDigest: invocationResult.controllerDigest,
    releaseRoot: invocationResult.releaseRoot,
    selectorMatchesInvocation:
      invocationResult.controllerDigest && selector.controllerDigest
        ? invocationResult.controllerDigest === selector.controllerDigest
        : null,
  });
  if (invocation.selectorMatchesInvocation === false) {
    issues.push(
      issue(
        "selector",
        "CONTROLLER_INVOCATION_SELECTION_MISMATCH",
        selector.path ?? "controller/current",
        "The running controller release does not match the current selector",
        selector.controllerDigest,
        invocation.controllerDigest
      )
    );
  }

  const release = await inspectSelectedRelease({
    dataRoot: effectiveDataRoot,
    controllerDigest: selector.controllerDigest,
    hostPlatform: options.hostPlatform ?? process.platform,
    hostArchitecture: options.hostArchitecture ?? process.arch,
  });
  issues.push(...release.issues);

  const launcher = effectiveDataRoot
    ? await inspectFile(controllerLauncherPath(effectiveDataRoot), true, effectiveDataRoot)
    : null;
  if (launcher && (launcher.status !== "regular" || !launcher.executable)) {
    issues.push(
      issue(
        "launcher",
        "CONTROLLER_LAUNCHER_INVALID",
        launcher.path,
        "Stable controller launcher must be one executable regular file",
        "executable regular file",
        `${launcher.status}${launcher.executable ? ", executable" : ", not executable"}`
      )
    );
  }

  const command = await resolveExecutable("rawr", options.env.PATH, options.cwd);
  const matchesLauncher = Boolean(
    command.realpath &&
      launcher?.realpath &&
      launcher.status === "regular" &&
      command.realpath === launcher.realpath
  );
  if (!matchesLauncher) {
    issues.push(
      issue(
        "global-resolution",
        "GLOBAL_RAWR_RESOLUTION_MISMATCH",
        "PATH",
        "Global rawr must resolve to the stable selector launcher",
        launcher?.realpath ?? launcher?.path ?? null,
        command.realpath ?? command.path
      )
    );
  }

  if (effectiveDataRoot !== null && path.resolve(options.oclifDataDir) !== effectiveDataRoot) {
    issues.push(
      issue(
        "external-extensions",
        "EXTERNAL_EXTENSION_DATA_ROOT_MISMATCH",
        options.oclifDataDir,
        "Native external extension state must share the canonical controller data root",
        effectiveDataRoot,
        path.resolve(options.oclifDataDir)
      )
    );
  }
  const external = await inspectExternalExtensions(
    options.oclifDataDir,
    options.readExternalExtensions
  );
  if (!external.healthy) {
    issues.push(
      issue(
        "external-extensions",
        "EXTERNAL_EXTENSION_STATE_UNHEALTHY",
        external.registryPath,
        "Native external extension state contains unreadable or quarantined entries",
        "missing or valid registry with no quarantine",
        `${external.status}; quarantined=${external.quarantined.length}`
      )
    );
  }

  return Object.freeze({
    healthy: issues.length === 0,
    dataRoot: dataRoot.value,
    invocation,
    selector,
    launcher,
    release,
    globalResolution: Object.freeze({
      commandPath: command.path,
      commandRealpath: command.realpath,
      expectedLauncherPath: launcher?.path ?? null,
      expectedLauncherRealpath: launcher?.realpath ?? null,
      matchesLauncher,
    }),
    externalExtensions: external,
    issues: Object.freeze(issues),
  });
}

function parseInvocationContext(env: NodeJS.ProcessEnv): Readonly<{
  status: InvocationDiagnostics["status"];
  controllerDigest: string | null;
  releaseRoot: string | null;
  dataRoot: string | null;
  issues: readonly GlobalDoctorIssue[];
}> {
  const rawDigest = nonEmpty(env.RAWR_CONTROLLER_DIGEST);
  const rawReleaseRoot = nonEmpty(env.RAWR_CONTROLLER_RELEASE_ROOT);
  if (!rawDigest && !rawReleaseRoot) {
    return {
      status: "absent",
      controllerDigest: null,
      releaseRoot: null,
      dataRoot: null,
      issues: [],
    };
  }

  const contextIssues: GlobalDoctorIssue[] = [];
  if (!rawDigest || !CONTROLLER_DIGEST_PATTERN.test(rawDigest)) {
    contextIssues.push(
      issue(
        "release",
        "INVOCATION_DIGEST_INVALID",
        "RAWR_CONTROLLER_DIGEST",
        "Invocation controller digest must be 64 lowercase hexadecimal characters",
        "<64-lowercase-hex>",
        rawDigest
      )
    );
  }
  if (!rawReleaseRoot || !path.isAbsolute(rawReleaseRoot)) {
    contextIssues.push(
      issue(
        "release",
        "INVOCATION_RELEASE_ROOT_INVALID",
        "RAWR_CONTROLLER_RELEASE_ROOT",
        "Invocation release root must be absolute",
        "absolute path",
        rawReleaseRoot
      )
    );
  }

  let dataRoot: string | null = null;
  if (
    rawDigest &&
    CONTROLLER_DIGEST_PATTERN.test(rawDigest) &&
    rawReleaseRoot &&
    path.isAbsolute(rawReleaseRoot)
  ) {
    const normalizedRoot = path.resolve(rawReleaseRoot);
    dataRoot = controllerDataRootFromRelease(normalizedRoot);
    const expectedRoot = controllerReleasePath(dataRoot, rawDigest);
    if (normalizedRoot !== expectedRoot) {
      contextIssues.push(
        issue(
          "release",
          "INVOCATION_RELEASE_LAYOUT_MISMATCH",
          "RAWR_CONTROLLER_RELEASE_ROOT",
          "Invocation release root must match its digest-qualified controller layout",
          expectedRoot,
          normalizedRoot
        )
      );
      dataRoot = null;
    }
  }

  return {
    status: contextIssues.length === 0 ? "valid" : "invalid",
    controllerDigest: rawDigest,
    releaseRoot: rawReleaseRoot ? path.resolve(rawReleaseRoot) : null,
    dataRoot,
    issues: Object.freeze(contextIssues),
  };
}

function configuredDataRoot(env: NodeJS.ProcessEnv): Readonly<{
  path: string | null;
  source: Exclude<DataRootSource, "release-context">;
}> {
  const explicit = nonEmpty(env.RAWR_DATA_DIR);
  if (explicit) return { path: explicit, source: "RAWR_DATA_DIR" };

  const xdgData = nonEmpty(env.XDG_DATA_HOME);
  if (xdgData) return { path: path.join(xdgData, "rawr"), source: "XDG_DATA_HOME" };

  if (env.RAWR_OPERATOR_HOME_SET === "1") {
    const operatorHome = nonEmpty(env.RAWR_OPERATOR_HOME);
    if (operatorHome)
      return { path: path.join(operatorHome, ".local", "share", "rawr"), source: "operator-home" };
  }

  const home = nonEmpty(env.HOME);
  return home
    ? { path: path.join(home, ".local", "share", "rawr"), source: "HOME" }
    : { path: null, source: "unresolved" };
}

async function inspectDataRoot(
  requestedPath: string | null,
  configuredPath: string | null,
  source: DataRootSource
): Promise<
  Readonly<{
    value: GlobalDoctorData["dataRoot"];
    issue: GlobalDoctorIssue | null;
  }>
> {
  if (!requestedPath) {
    return {
      value: Object.freeze({
        path: null,
        configuredPath,
        source,
        status: "unresolved",
        realpath: null,
      }),
      issue: issue(
        "data-root",
        "CONTROLLER_DATA_ROOT_UNRESOLVED",
        "dataRoot",
        "Controller data root is unavailable"
      ),
    };
  }
  if (!path.isAbsolute(requestedPath)) {
    return {
      value: Object.freeze({
        path: requestedPath,
        configuredPath,
        source,
        status: "invalid",
        realpath: null,
      }),
      issue: issue(
        "data-root",
        "CONTROLLER_DATA_ROOT_INVALID",
        "dataRoot",
        "Controller data root must be absolute",
        "absolute path",
        requestedPath
      ),
    };
  }

  const normalized = path.resolve(requestedPath);
  try {
    const status = await lstat(normalized);
    if (!status.isDirectory()) {
      return {
        value: Object.freeze({
          path: normalized,
          configuredPath,
          source,
          status: "invalid",
          realpath: null,
        }),
        issue: issue(
          "data-root",
          "CONTROLLER_DATA_ROOT_INVALID",
          normalized,
          "Controller data root is not a directory"
        ),
      };
    }
    const canonical = await realpath(normalized);
    return {
      value: Object.freeze({
        path: canonical,
        configuredPath,
        source,
        status: "available",
        realpath: canonical,
      }),
      issue: null,
    };
  } catch (error) {
    const missing = isMissing(error);
    return {
      value: Object.freeze({
        path: normalized,
        configuredPath,
        source,
        status: missing ? "missing" : "unreadable",
        realpath: null,
      }),
      issue: issue(
        "data-root",
        missing ? "CONTROLLER_DATA_ROOT_MISSING" : "CONTROLLER_DATA_ROOT_UNREADABLE",
        normalized,
        errorMessage(error)
      ),
    };
  }
}

async function inspectSelector(dataRoot: string | null): Promise<SelectorDiagnostics> {
  if (!dataRoot) {
    return Object.freeze({
      path: null,
      status: "unavailable",
      controllerDigest: null,
      issues: Object.freeze([]),
    });
  }
  const selectorPath = controllerSelectorPath(dataRoot);
  const parentViolation = await inspectCanonicalContainedParent(dataRoot, selectorPath);
  if (parentViolation) {
    return Object.freeze({
      path: selectorPath,
      status: "invalid",
      controllerDigest: null,
      issues: Object.freeze([
        issue(
          "selector",
          "CONTROLLER_SELECTION_PARENT_ALIAS",
          parentViolation.path,
          "Controller selection parent chain must remain canonical and inside the data root",
          "canonical contained directory",
          parentViolation.actual
        ),
      ]),
    });
  }
  try {
    const status = await lstat(selectorPath);
    if (!status.isFile() || status.nlink !== 1) {
      return Object.freeze({
        path: selectorPath,
        status: "invalid",
        controllerDigest: null,
        issues: Object.freeze([
          issue(
            "selector",
            "CONTROLLER_SELECTION_ALIAS",
            selectorPath,
            "Controller selection must be one independent regular file",
            "regular file with one link",
            status.isSymbolicLink() ? "symlink" : `${String(status.nlink)} links`
          ),
        ]),
      });
    }
    if (status.size !== CONTROLLER_SELECTION_BYTES) {
      return Object.freeze({
        path: selectorPath,
        status: "invalid",
        controllerDigest: null,
        issues: Object.freeze([
          issue(
            "selector",
            "INVALID_SELECTION_LENGTH",
            selectorPath,
            "Controller selection must have the exact bounded wire length",
            CONTROLLER_SELECTION_BYTES,
            status.size
          ),
        ]),
      });
    }
    const decoded = decodeControllerSelection(new Uint8Array(await readFile(selectorPath)));
    if (!decoded.ok) {
      return Object.freeze({
        path: selectorPath,
        status: "invalid",
        controllerDigest: null,
        issues: Object.freeze(decoded.issues.map((entry) => controllerIssue("selector", entry))),
      });
    }
    return Object.freeze({
      path: selectorPath,
      status: "valid",
      controllerDigest: decoded.value.controllerDigest,
      issues: Object.freeze([]),
    });
  } catch (error) {
    const missing = isMissing(error);
    return Object.freeze({
      path: selectorPath,
      status: missing ? "missing" : "unreadable",
      controllerDigest: null,
      issues: Object.freeze([
        issue(
          "selector",
          missing ? "CONTROLLER_SELECTION_MISSING" : "CONTROLLER_SELECTION_UNREADABLE",
          selectorPath,
          errorMessage(error)
        ),
      ]),
    });
  }
}

async function inspectSelectedRelease(
  input: Readonly<{
    dataRoot: string | null;
    controllerDigest: string | null;
    hostPlatform: string;
    hostArchitecture: string;
  }>
): Promise<ReleaseDiagnostics> {
  if (!input.dataRoot || !input.controllerDigest) {
    return Object.freeze({
      status: "unavailable",
      root: null,
      controllerDigest: input.controllerDigest,
      sourceRevision: null,
      entry: Object.freeze({ path: null, releasePath: CONTROLLER_ENTRY_PATH, verified: false }),
      runtime: unverifiedRuntime(null),
      dependencyLock: unverifiedDependencyLock(null),
      officialMembers: Object.freeze([]),
      issues: Object.freeze([]),
    });
  }

  const releaseRoot = controllerReleasePath(input.dataRoot, input.controllerDigest);
  const parentViolation = await inspectCanonicalContainedParent(input.dataRoot, releaseRoot);
  if (parentViolation) {
    return Object.freeze({
      status: "invalid",
      root: releaseRoot,
      controllerDigest: input.controllerDigest,
      sourceRevision: null,
      entry: Object.freeze({
        path: path.join(releaseRoot, CONTROLLER_ENTRY_PATH),
        releasePath: CONTROLLER_ENTRY_PATH,
        verified: false,
      }),
      runtime: unverifiedRuntime(releaseRoot),
      dependencyLock: unverifiedDependencyLock(releaseRoot),
      officialMembers: Object.freeze([]),
      issues: Object.freeze([
        issue(
          "release",
          "CONTROLLER_RELEASE_PARENT_ALIAS",
          parentViolation.path,
          "Controller release parent chain must remain canonical and inside the data root",
          "canonical contained directory",
          parentViolation.actual
        ),
      ]),
    });
  }
  const inspection = await inspectControllerRelease({
    releaseRoot,
    expectedDigest: input.controllerDigest,
  });
  if (inspection.status === "invalid") {
    return Object.freeze({
      status: "invalid",
      root: releaseRoot,
      controllerDigest: input.controllerDigest,
      sourceRevision: null,
      entry: Object.freeze({
        path: path.join(releaseRoot, CONTROLLER_ENTRY_PATH),
        releasePath: CONTROLLER_ENTRY_PATH,
        verified: false,
      }),
      runtime: unverifiedRuntime(releaseRoot),
      dependencyLock: unverifiedDependencyLock(releaseRoot),
      officialMembers: Object.freeze([]),
      issues: Object.freeze(inspection.issues.map((entry) => releaseIssue(entry))),
    });
  }

  const manifest = inspection.envelope.manifest;
  const platformMatchesHost = manifest.runtime.platform === input.hostPlatform;
  const architectureMatchesHost = manifest.runtime.architecture === input.hostArchitecture;
  const releaseIssues: GlobalDoctorIssue[] = [];
  if (!platformMatchesHost) {
    releaseIssues.push(
      issue(
        "runtime",
        "CONTROLLER_RUNTIME_PLATFORM_MISMATCH",
        "manifest.runtime.platform",
        "Bundled Bun platform differs from the current host",
        input.hostPlatform,
        manifest.runtime.platform
      )
    );
  }
  if (!architectureMatchesHost) {
    releaseIssues.push(
      issue(
        "runtime",
        "CONTROLLER_RUNTIME_ARCHITECTURE_MISMATCH",
        "manifest.runtime.architecture",
        "Bundled Bun architecture differs from the current host",
        input.hostArchitecture,
        manifest.runtime.architecture
      )
    );
  }

  return Object.freeze({
    status: "verified",
    root: inspection.releaseRoot,
    controllerDigest: inspection.controllerDigest,
    sourceRevision: manifest.sourceRevision,
    entry: Object.freeze({
      path: path.join(inspection.releaseRoot, manifest.entrypoint),
      releasePath: manifest.entrypoint,
      verified: true,
    }),
    runtime: Object.freeze({
      path: path.join(inspection.releaseRoot, manifest.runtime.path),
      releasePath: manifest.runtime.path,
      licensePath: path.join(inspection.releaseRoot, manifest.runtime.licensePath),
      licenseReleasePath: manifest.runtime.licensePath,
      digest: manifest.runtime.digest,
      version: manifest.runtime.version,
      revision: manifest.runtime.revision,
      platform: manifest.runtime.platform,
      architecture: manifest.runtime.architecture,
      platformMatchesHost,
      architectureMatchesHost,
      verified: true,
    }),
    dependencyLock: Object.freeze({
      path: path.join(inspection.releaseRoot, manifest.dependencyLock.path),
      releasePath: manifest.dependencyLock.path,
      digest: manifest.dependencyLock.digest,
      verified: true,
    }),
    officialMembers: Object.freeze(
      manifest.officialMembers.map((member) =>
        Object.freeze({
          packageId: member.packageId,
          version: member.version,
          root: member.root,
          payloadDigest: member.payloadDigest,
          commandIds: member.commandIds,
          topics: member.topics,
          aliases: member.aliases,
          hiddenAliases: member.hiddenAliases,
          hooks: member.hooks,
          entryCount: inspection.entries.filter(
            (entry) => entry.path === member.root || entry.path.startsWith(`${member.root}/`)
          ).length,
          verified: true,
        })
      )
    ),
    issues: Object.freeze(releaseIssues),
  });
}

async function inspectFile(
  filePath: string,
  computeDigest: boolean,
  containmentRoot?: string
): Promise<FileEvidence> {
  if (containmentRoot) {
    const parentViolation = await inspectCanonicalContainedParent(containmentRoot, filePath);
    if (parentViolation) {
      return Object.freeze({
        path: filePath,
        status: "alias",
        realpath: null,
        executable: false,
        digest: null,
      });
    }
  }
  try {
    const status = await lstat(filePath);
    let canonical: string | null = null;
    let executable = false;
    try {
      canonical = await realpath(filePath);
    } catch {
      // Lexical path evidence below remains useful when resolution fails.
    }
    const kind =
      status.isFile() && status.nlink === 1 && canonical === filePath
        ? "regular"
        : canonical !== null && canonical !== filePath
          ? "alias"
          : status.isSymbolicLink()
            ? "symlink"
            : "other";
    if (kind === "regular") {
      try {
        await access(filePath, constants.X_OK);
        executable = true;
      } catch {
        // Execute access is represented independently from the file kind.
      }
    }
    return Object.freeze({
      path: filePath,
      status: kind,
      realpath: canonical,
      executable,
      digest: computeDigest && kind === "regular" ? await sha256File(filePath) : null,
    });
  } catch (error) {
    return Object.freeze({
      path: filePath,
      status: isMissing(error) ? "missing" : "unreadable",
      realpath: null,
      executable: false,
      digest: null,
    });
  }
}

type CanonicalParentViolation = Readonly<{
  path: string;
  actual: string;
}>;

async function inspectCanonicalContainedParent(
  root: string,
  candidate: string
): Promise<CanonicalParentViolation | null> {
  const normalizedRoot = path.resolve(root);
  const normalizedCandidate = path.resolve(candidate);
  const candidateOffset = path.relative(normalizedRoot, normalizedCandidate);
  if (
    candidateOffset === "" ||
    candidateOffset === ".." ||
    candidateOffset.startsWith(`..${path.sep}`) ||
    path.isAbsolute(candidateOffset)
  ) {
    return Object.freeze({ path: normalizedCandidate, actual: "outside data root" });
  }

  const parentOffset = path.relative(normalizedRoot, path.dirname(normalizedCandidate));
  if (parentOffset === "") return null;
  let cursor = normalizedRoot;
  for (const segment of parentOffset.split(path.sep)) {
    cursor = path.join(cursor, segment);
    try {
      const status = await lstat(cursor);
      if (!status.isDirectory() || status.isSymbolicLink()) {
        return Object.freeze({
          path: cursor,
          actual: status.isSymbolicLink() ? "symlink" : "non-directory",
        });
      }
      const canonical = await realpath(cursor);
      if (canonical !== cursor) {
        return Object.freeze({ path: cursor, actual: `alias to ${canonical}` });
      }
    } catch (error) {
      if (isMissing(error)) return null;
      return Object.freeze({ path: cursor, actual: errorMessage(error) });
    }
  }
  return null;
}

function unverifiedRuntime(releaseRoot: string | null): ReleaseDiagnostics["runtime"] {
  return Object.freeze({
    path: releaseRoot ? path.join(releaseRoot, CONTROLLER_RUNTIME_PATH) : null,
    releasePath: CONTROLLER_RUNTIME_PATH,
    licensePath: releaseRoot ? path.join(releaseRoot, CONTROLLER_RUNTIME_LICENSE_PATH) : null,
    licenseReleasePath: CONTROLLER_RUNTIME_LICENSE_PATH,
    digest: null,
    version: null,
    revision: null,
    platform: null,
    architecture: null,
    platformMatchesHost: null,
    architectureMatchesHost: null,
    verified: false,
  });
}

function unverifiedDependencyLock(
  releaseRoot: string | null
): ReleaseDiagnostics["dependencyLock"] {
  return Object.freeze({
    path: releaseRoot ? path.join(releaseRoot, CONTROLLER_DEPENDENCY_LOCK_PATH) : null,
    releasePath: CONTROLLER_DEPENDENCY_LOCK_PATH,
    digest: null,
    verified: false,
  });
}

async function resolveExecutable(
  name: string,
  pathValue: string | undefined,
  cwd: string
): Promise<Readonly<{ path: string | null; realpath: string | null }>> {
  for (const entry of (pathValue ?? "").split(path.delimiter)) {
    const directory = entry.length > 0 ? entry : cwd;
    const candidate = path.resolve(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return { path: candidate, realpath: await realpath(candidate) };
    } catch {
      // Continue through PATH without executing a candidate.
    }
  }
  return { path: null, realpath: null };
}

async function inspectExternalExtensions(
  oclifDataDir: string,
  readProjection: () => Promise<NativeRegistryProjection>
): Promise<ExternalExtensionDiagnostics> {
  try {
    const projection = await readProjection();
    const quarantined = projection.quarantined.map((entry) =>
      Object.freeze({
        identity: entry.identity,
        root: entry.root ?? null,
        code: entry.reason.code,
        message: entry.reason.message,
      })
    );
    return Object.freeze({
      registryPath: projection.registryPath,
      status: projection.status,
      hasResidue: projection.hasResidue,
      active: Object.freeze(
        projection.active.map((entry) =>
          Object.freeze({
            packageId: entry.extension.packageId,
            version: entry.extension.version,
            type: entry.entry.type,
            root: entry.extension.canonicalRoot,
            fingerprint: entry.extension.fingerprint,
          })
        )
      ),
      quarantined: Object.freeze(quarantined),
      healthy: projection.status !== "malformed" && quarantined.length === 0,
    });
  } catch (error) {
    return Object.freeze({
      registryPath: path.join(oclifDataDir, "package.json"),
      status: "unavailable",
      hasResidue: false,
      active: Object.freeze([]),
      quarantined: Object.freeze([
        {
          identity: "native-registry",
          root: null,
          code: "registry-unavailable",
          message: errorMessage(error),
        },
      ]),
      healthy: false,
    });
  }
}

function controllerIssue(domain: DiagnosticDomain, entry: ControllerIssue): GlobalDoctorIssue {
  return issue(domain, entry.code, entry.path, entry.message, entry.expected, entry.actual);
}

function releaseIssue(entry: ControllerReleaseInspectionIssue): GlobalDoctorIssue {
  return issue("release", entry.code, entry.path, entry.message, entry.expected, entry.actual);
}

function issue(
  domain: DiagnosticDomain,
  code: string,
  issuePath: string,
  message: string,
  expected?: unknown,
  actual?: unknown
): GlobalDoctorIssue {
  return Object.freeze({
    domain,
    code,
    path: issuePath,
    message,
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual }),
  });
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isMissing(error: unknown): boolean {
  return errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import { lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { cwd, execPath } from "node:process";
import { Context, Effect, Exit, Layer } from "effect";
import {
  type CommandPolicy,
  decodeStructural,
  MaximumTimerDelayMs,
} from "../../contracts/index.js";
import {
  CommandProcess,
  type CommandProcessShape,
  type CommandRequest,
} from "../../runtime/index.js";
import {
  type ArtifactPathMapping,
  type BunPackageSubstrateIdentity,
  type ExactGitRevision,
  type GitBunConfig,
  GitBunConfigSchema,
  type GitPatchSubstrateIdentity,
  type PackedPackageDescriptor,
  type PatchDescriptor,
  type ResolvedToolIdentity,
} from "./contracts.js";
import { canonicalGitCanonicalization, makeGitMechanics } from "./git.js";
import {
  type GitBunError,
  identityMismatch,
  invalidInput,
  isGitBunError,
  operationFailed,
  runChecked,
  sha256Portable,
  stableJson,
} from "./internal.js";
import {
  buildAndPackSdkPackage,
  canonicalBunPackageCanonicalization,
  type PackSdkPackageRequest,
  type VerifyInstalledSdkPackageRequest,
  verifyInstalledSdkPackage,
} from "./package.js";
import { type PackagePublicationState, rollbackPackagePublication } from "./package-build.js";

export interface MaterializeRevisionRequest {
  readonly sourceRepositoryPath: string;
  readonly revision: ExactGitRevision;
  readonly destinationPath: string;
}

export interface CapturePatchRequest {
  readonly sourceRepositoryPath: string;
  readonly baseline: ExactGitRevision;
  readonly terminalProductPath: string;
  readonly pathMapping: ArtifactPathMapping;
}

export interface ApplyPatchRequest {
  readonly sourceRepositoryPath: string;
  readonly baseline: ExactGitRevision;
  readonly descriptor: PatchDescriptor;
  readonly patchBytes: Uint8Array;
  readonly pathMapping: ArtifactPathMapping;
  readonly productPath: string;
}

export interface CapturedPatchResult {
  readonly descriptor: PatchDescriptor;
  readonly bytes: Uint8Array;
}

export interface GitBunShape {
  readonly materializeRevision: (
    request: MaterializeRevisionRequest
  ) => Effect.Effect<void, GitBunError>;
  readonly capturePatch: (
    request: CapturePatchRequest
  ) => Effect.Effect<CapturedPatchResult, GitBunError>;
  readonly applyAndRegenerate: (request: ApplyPatchRequest) => Effect.Effect<void, GitBunError>;
  readonly packSdkPackage: (
    request: PackSdkPackageRequest
  ) => Effect.Effect<PackedPackageDescriptor, GitBunError>;
  readonly verifyInstalledSdkPackage: (
    request: VerifyInstalledSdkPackageRequest
  ) => Effect.Effect<void, GitBunError>;
}

export class GitBun extends Context.Service<GitBun, GitBunShape>()(
  "@rawr/research-sdk/adapters/git-bun/GitBun"
) {}

export function makeGitBunLayer(
  rawConfig: unknown
): Layer.Layer<GitBun, GitBunError, CommandProcess> {
  return Layer.effect(
    GitBun,
    Effect.gen(function* () {
      const process = yield* CommandProcess;
      const config = yield* decodeConfig(rawConfig);
      const scratchRoot = yield* canonicalDirectory(config.scratchRoot, "configure");
      const commandPolicy: CommandPolicy = { ...config.command, environment: {} };
      const mechanics = makeGitMechanics(process, commandPolicy);

      return Object.freeze({
        materializeRevision: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            withControlRoot(scratchRoot, "materialize", (controlRoot) =>
              mechanics.materializeRevision({
                ...request,
                substrate,
                controlRoot,
              })
            )
          ),
        capturePatch: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            withControlRoot(scratchRoot, "capture", (controlRoot) =>
              mechanics.capturePatch({
                ...request,
                substrate,
                controlRoot,
              })
            )
          ),
        applyAndRegenerate: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            withControlRoot(scratchRoot, "apply", (controlRoot) =>
              mechanics.applyAndRegenerate({
                ...request,
                substrate,
                controlRoot,
              })
            )
          ),
        packSdkPackage: (request) =>
          Effect.suspend(() => {
            const publicationState: PackagePublicationState = { outputPublished: false };
            return Effect.flatMap(acquirePackageSubstrate(config.bun), (substrate) =>
              withControlRoot(scratchRoot, "pack", (controlRoot) =>
                Effect.flatMap(
                  preparePackageEnvironment(controlRoot, substrate.bun.resolvedBinary),
                  (environment) =>
                    buildAndPackSdkPackage({
                      request,
                      substrate,
                      runner: process,
                      controlRoot,
                      environment,
                      timeoutMs: commandPolicy.timeoutMs,
                      terminationGraceMs: commandPolicy.terminationGraceMs,
                      publicationState,
                    })
                )
              )
            ).pipe(
              Effect.onExit((exit) =>
                Exit.isFailure(exit) && publicationState.outputPublished
                  ? rollbackPackagePublication(request.outputPath)
                  : Effect.void
              )
            );
          }),
        verifyInstalledSdkPackage: (request) =>
          Effect.flatMap(acquirePackageSubstrate(config.bun), (substrate) =>
            Effect.andThen(
              requirePackageSubstrate(request.expected.substrate, substrate),
              verifyInstalledSdkPackage(request)
            )
          ),
      } satisfies GitBunShape);
    })
  );
}

function decodeConfig(rawConfig: unknown): Effect.Effect<GitBunConfig, GitBunError> {
  const decoded = decodeStructural(GitBunConfigSchema, rawConfig);
  if (decoded.kind === "Invalid") {
    return Effect.fail(invalidInput("configure", "Git/Bun configuration is malformed."));
  }
  if (
    decoded.value.command.timeoutMs + decoded.value.command.terminationGraceMs >
    MaximumTimerDelayMs
  ) {
    return Effect.fail(
      invalidInput("configure", "Git/Bun command deadlines exceed the timer range.")
    );
  }
  return Effect.succeed(decoded.value);
}

function acquireGitSubstrate(
  requirement: GitBunConfig["git"],
  policy: CommandPolicy,
  process: CommandProcessShape
): Effect.Effect<GitPatchSubstrateIdentity, GitBunError> {
  return Effect.gen(function* () {
    const gitBinary = yield* canonicalBinary(requirement.executable, "resolve-git");
    const git = yield* observeGit(process, policy, gitBinary);
    yield* requireGitTool(requirement, git);
    return freezeGitSubstrate({
      kind: "CanonicalGitPatchV1",
      git,
      canonicalization: canonicalGitCanonicalization,
      environmentDigest: sha256Portable(
        "research-sdk.git-environment.v1",
        canonicalGitCanonicalization.environment
      ),
      configurationDigest: sha256Portable("research-sdk.git-configuration.v1", {
        applyArguments: canonicalGitCanonicalization.applyArguments,
        attributesPolicy: canonicalGitCanonicalization.attributesPolicy,
        configuration: canonicalGitCanonicalization.configuration,
        diffArguments: canonicalGitCanonicalization.diffArguments,
        stageArguments: canonicalGitCanonicalization.stageArguments,
      }),
    });
  });
}

function acquirePackageSubstrate(
  requirement: GitBunConfig["bun"]
): Effect.Effect<BunPackageSubstrateIdentity, GitBunError> {
  return Effect.gen(function* () {
    const bunBinary = yield* canonicalBinary(requirement.executable, "resolve-bun");
    const runningBun = yield* canonicalBinary(execPath, "resolve-running-bun");
    if (runningBun !== bunBinary) {
      return yield* Effect.fail(
        identityMismatch(
          "configure",
          "The adapter process does not use the admitted Bun runtime identity."
        )
      );
    }
    const bun = {
      resolvedBinary: bunBinary,
      version: Bun.version,
      revision: Bun.revision,
    } satisfies ResolvedToolIdentity;
    yield* requireBunTool(requirement, bun);
    return freezePackageSubstrate({
      kind: "ImmutableBunPackageV1",
      bun,
      canonicalization: canonicalBunPackageCanonicalization,
      environmentDigest: sha256Portable(
        "research-sdk.bun-package-environment.v1",
        canonicalBunPackageCanonicalization.environment
      ),
      configurationDigest: sha256Portable("research-sdk.bun-package-configuration.v1", {
        buildArguments: canonicalBunPackageCanonicalization.buildArguments,
        packArguments: canonicalBunPackageCanonicalization.packArguments,
      }),
    });
  });
}

function freezeGitSubstrate(value: GitPatchSubstrateIdentity): GitPatchSubstrateIdentity {
  Object.freeze(value.git);
  Object.freeze(value.environmentDigest);
  Object.freeze(value.configurationDigest);
  return Object.freeze(value);
}

function freezePackageSubstrate(value: BunPackageSubstrateIdentity): BunPackageSubstrateIdentity {
  Object.freeze(value.bun);
  Object.freeze(value.environmentDigest);
  Object.freeze(value.configurationDigest);
  return Object.freeze(value);
}

function observeGit(
  process: CommandProcessShape,
  policy: CommandPolicy,
  executable: string
): Effect.Effect<ResolvedToolIdentity, GitBunError> {
  return Effect.flatMap(
    runChecked(process, command(policy, executable, ["--version"]), "observe-git"),
    ({ stdout }) => {
      const match = /^git version ([^\s]+)\s*$/u.exec(new TextDecoder().decode(stdout));
      return match?.[1] === undefined
        ? Effect.fail(identityMismatch("observe-git", "Git emitted an invalid version identity."))
        : Effect.succeed({ resolvedBinary: executable, version: match[1] });
    }
  );
}

function command(
  policy: CommandPolicy,
  executable: string,
  arguments_: readonly string[]
): CommandRequest {
  return {
    executable,
    arguments: [...arguments_],
    cwd: cwd(),
    environment: { LANG: "C", LC_ALL: "C", TZ: "UTC" },
    timeoutMs: policy.timeoutMs,
    terminationGraceMs: policy.terminationGraceMs,
  };
}

function requireGitTool(
  requirement: GitBunConfig["git"],
  observed: ResolvedToolIdentity
): Effect.Effect<void, GitBunError> {
  return requirement.expectedVersion === observed.version &&
    requirement.executable === observed.resolvedBinary &&
    observed.revision === undefined
    ? Effect.void
    : Effect.fail(identityMismatch("configure", "The observed Git identity differs."));
}

function requireBunTool(
  requirement: GitBunConfig["bun"],
  observed: ResolvedToolIdentity
): Effect.Effect<void, GitBunError> {
  return requirement.expectedVersion === observed.version &&
    requirement.executable === observed.resolvedBinary &&
    requirement.expectedRevision === observed.revision
    ? Effect.void
    : Effect.fail(identityMismatch("configure", "The observed Bun identity differs."));
}

function requirePackageSubstrate(
  left: BunPackageSubstrateIdentity,
  right: BunPackageSubstrateIdentity
): Effect.Effect<void, GitBunError> {
  return stableJson(left) === stableJson(right)
    ? Effect.void
    : Effect.fail(identityMismatch("verify-installed-package", "Bun package substrate differs."));
}

function canonicalDirectory(path: string, operation: string): Effect.Effect<string, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      const canonical = await realpath(path);
      if (!isAbsolute(path) || canonical !== path || !(await lstat(canonical)).isDirectory()) {
        throw invalidInput(operation, "The configured directory is not a canonical realpath.");
      }
      return canonical;
    },
    catch: (error) => normalizeFsError(operation, error),
  });
}

function canonicalBinary(path: string, operation: string): Effect.Effect<string, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      const canonical = await realpath(path);
      if (!isAbsolute(path) || canonical !== path || !(await lstat(canonical)).isFile()) {
        throw invalidInput(operation, "The configured tool is not a canonical file realpath.");
      }
      return canonical;
    },
    catch: (error) => normalizeFsError(operation, error),
  });
}

function preparePackageEnvironment(
  root: string,
  bunBinary: string
): Effect.Effect<Readonly<Record<string, string>>, GitBunError> {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: async () => {
        const substitutions: Readonly<Record<string, string>> = {
          "<adapter-owned-home>": join(root, "home"),
          "<adapter-owned-tmp>": join(root, "tmp"),
          "<admitted-tool-path>": `${dirname(bunBinary)}:/usr/bin:/bin`,
        };
        await Promise.all([
          mkdir(substitutions["<adapter-owned-home>"]!),
          mkdir(substitutions["<adapter-owned-tmp>"]!),
        ]);
        return Object.fromEntries(
          canonicalBunPackageCanonicalization.environment.map(({ name, value }) => [
            name,
            substitutions[value] ?? value,
          ])
        );
      },
      catch: (error) => operationFailed("acquire-package-environment", error),
    })
  );
}

function withControlRoot<Output>(
  scratchRoot: string,
  prefix: string,
  use: (controlRoot: string) => Effect.Effect<Output, GitBunError>
): Effect.Effect<Output, GitBunError> {
  return Effect.acquireUseRelease(
    Effect.uninterruptible(
      Effect.tryPromise({
        try: () => mkdtemp(join(scratchRoot, `git-bun-${prefix}-`)),
        catch: (error) => operationFailed("acquire-operation", error),
      })
    ),
    use,
    (controlRoot) =>
      Effect.uninterruptible(
        Effect.tryPromise({
          try: () => rm(controlRoot, { recursive: true, force: true }),
          catch: (error) => operationFailed("release-operation", error),
        })
      )
  );
}

function normalizeFsError(operation: string, error: unknown): GitBunError {
  return isGitBunError(error) ? error : operationFailed(operation, error);
}

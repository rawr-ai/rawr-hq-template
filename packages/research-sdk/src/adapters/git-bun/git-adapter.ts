import { cwd } from "node:process";
import { Context, Effect, Layer } from "effect";
import {
  type ArtifactSubstrate,
  ArtifactSubstrateSchema,
  type CommandPolicy,
  decodeStructural,
} from "../../contracts/index.js";
import {
  CommandProcess,
  type CommandProcessShape,
  type CommandRequest,
} from "../../runtime/index.js";
import {
  type ArtifactPathMapping,
  type ExactGitRevision,
  type GitArtifactConfig,
  GitArtifactConfigSchema,
  type GitPatchSubstrateIdentity,
  GitPatchSubstrateIdentitySchema,
  type PatchDescriptor,
  type ResolvedToolIdentity,
} from "./contracts.js";
import { canonicalGitCanonicalization, gitArtifactSubstrate, makeGitMechanics } from "./git.js";
import {
  equalDigest,
  type GitBunError,
  identityMismatch,
  invalidInput,
  runChecked,
  sha256Portable,
  stableJson,
} from "./internal.js";
import {
  canonicalBinary,
  canonicalDirectory,
  validateCommandDeadline,
  withControlRoot,
} from "./operation.js";

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
  readonly materializationSubstrate: ArtifactSubstrate;
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

export interface GitArtifactsShape {
  readonly materializeRevision: (
    request: MaterializeRevisionRequest
  ) => Effect.Effect<ArtifactSubstrate, GitBunError>;
  readonly capturePatch: (
    request: CapturePatchRequest
  ) => Effect.Effect<CapturedPatchResult, GitBunError>;
  readonly applyAndRegenerate: (request: ApplyPatchRequest) => Effect.Effect<void, GitBunError>;
}

export class GitArtifacts extends Context.Service<GitArtifacts, GitArtifactsShape>()(
  "@rawr/research-sdk/adapters/git-bun/GitArtifacts"
) {}

export function makeGitArtifactsLayer(
  rawConfig: unknown
): Layer.Layer<GitArtifacts, GitBunError, CommandProcess> {
  return Layer.effect(
    GitArtifacts,
    Effect.gen(function* () {
      const process = yield* CommandProcess;
      const config = yield* decodeGitConfig(rawConfig);
      const scratchRoot = yield* canonicalDirectory(config.scratchRoot, "configure");
      const commandPolicy: CommandPolicy = { ...config.command, environment: {} };
      const mechanics = makeGitMechanics(process, commandPolicy);

      return Object.freeze({
        materializeRevision: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            Effect.as(
              withControlRoot(scratchRoot, "materialize", (controlRoot) =>
                mechanics.materializeRevision({ ...request, substrate, controlRoot })
              ),
              gitArtifactSubstrate(substrate)
            )
          ),
        capturePatch: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            Effect.andThen(
              requireGitSubstrate(request.materializationSubstrate, substrate, "capturePatch"),
              withControlRoot(scratchRoot, "capture", (controlRoot) =>
                mechanics.capturePatch({ ...request, substrate, controlRoot })
              )
            )
          ),
        applyAndRegenerate: (request) =>
          Effect.flatMap(acquireGitSubstrate(config.git, commandPolicy, process), (substrate) =>
            withControlRoot(scratchRoot, "apply", (controlRoot) =>
              mechanics.applyAndRegenerate({ ...request, substrate, controlRoot })
            )
          ),
      } satisfies GitArtifactsShape);
    })
  );
}

function decodeGitConfig(rawConfig: unknown): Effect.Effect<GitArtifactConfig, GitBunError> {
  const decoded = decodeStructural(GitArtifactConfigSchema, rawConfig);
  return decoded.kind === "Invalid"
    ? Effect.fail(invalidInput("configure", "Git artifact configuration is malformed."))
    : validateCommandDeadline(decoded.value);
}

function acquireGitSubstrate(
  requirement: GitArtifactConfig["git"],
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

function observeGit(
  process: CommandProcessShape,
  policy: CommandPolicy,
  executable: string
): Effect.Effect<ResolvedToolIdentity, GitBunError> {
  const request: CommandRequest = {
    executable,
    arguments: ["--version"],
    cwd: cwd(),
    environment: { LANG: "C", LC_ALL: "C", TZ: "UTC" },
    timeoutMs: policy.timeoutMs,
    terminationGraceMs: policy.terminationGraceMs,
  };
  return Effect.flatMap(runChecked(process, request, "observe-git"), ({ stdout }) => {
    const match = /^git version ([^\s]+)\s*$/u.exec(new TextDecoder().decode(stdout));
    return match?.[1] === undefined
      ? Effect.fail(identityMismatch("observe-git", "Git emitted an invalid version identity."))
      : Effect.succeed({ resolvedBinary: executable, version: match[1] });
  });
}

function requireGitTool(
  requirement: GitArtifactConfig["git"],
  observed: ResolvedToolIdentity
): Effect.Effect<void, GitBunError> {
  return requirement.expectedVersion === observed.version &&
    requirement.executable === observed.resolvedBinary &&
    observed.revision === undefined
    ? Effect.void
    : Effect.fail(identityMismatch("configure", "The observed Git identity differs."));
}

function requireGitSubstrate(
  materialization: ArtifactSubstrate,
  current: GitPatchSubstrateIdentity,
  operation: string
): Effect.Effect<void, GitBunError> {
  const envelope = decodeStructural(ArtifactSubstrateSchema, materialization);
  if (envelope.kind === "Invalid" || envelope.value.kind !== "CanonicalGitPatchV1") {
    return Effect.fail(
      identityMismatch(operation, "The materialized Git substrate envelope is invalid.")
    );
  }
  const identity = decodeStructural(GitPatchSubstrateIdentitySchema, envelope.value.identity);
  if (
    identity.kind === "Invalid" ||
    !equalDigest(
      envelope.value.identityDigest,
      sha256Portable("research-sdk.git-artifact-substrate.v1", identity.value)
    )
  ) {
    return Effect.fail(
      identityMismatch(operation, "The materialized Git substrate identity is invalid.")
    );
  }

  return stableJson(identity.value) === stableJson(current)
    ? Effect.void
    : Effect.fail(
        identityMismatch(
          operation,
          "The current Git substrate differs from the materialized frozen input."
        )
      );
}

function freezeGitSubstrate(value: GitPatchSubstrateIdentity): GitPatchSubstrateIdentity {
  Object.freeze(value.git);
  Object.freeze(value.environmentDigest);
  Object.freeze(value.configurationDigest);
  return Object.freeze(value);
}

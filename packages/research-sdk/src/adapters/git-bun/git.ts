import { join } from "node:path";
import { Effect } from "effect";
import type { ArtifactSubstrate, CommandPolicy, DigestIdentity } from "../../contracts/index.js";
import type { CommandProcessShape } from "../../runtime/command.js";
import type {
  ArtifactPathMapping,
  ExactGitRevision,
  GitPatchSubstrateIdentity,
  PatchDescriptor,
} from "./contracts.js";
import {
  applyPatch,
  canonicalPatch,
  changedPaths,
  comparePathRules,
  enforcePathMapping,
  requireEqualRevision,
  requireEqualSubstrate,
  requireWorktreeMatchesIndex,
  stageBaseline,
  stageProductTree,
  validatePathMapping,
  validateSubmittedModes,
  verifyMappedPatch,
  verifyPatchBytes,
  writeProductTree,
} from "./git-patch.js";
import {
  type CommandContext,
  canonicalGitCanonicalization,
  materializeOwnedRevision,
  type OwnedGitContext,
  ownedGitContext,
  preflightToolchain,
  prepareOwnedRepository,
  preparePublicationPath,
  publishDirectory,
  repositoryRevisionIdentity,
  requireDirectory,
  trySynchronous,
  validateProductTree,
  verifySourceRevision,
} from "./git-repository.js";
import {
  equalBytes,
  type GitBunError,
  identityMismatch,
  sha256Digest,
  sha256Portable,
} from "./internal.js";

export { canonicalGitCanonicalization };

export function gitRepositoryIdentity(input: {
  readonly commitObjectId: string;
  readonly objectFormat: "sha1" | "sha256";
  readonly rootTreeObjectId: string;
}): DigestIdentity {
  return repositoryRevisionIdentity(input);
}

export function artifactPathMappingDigest(mapping: ArtifactPathMapping): DigestIdentity {
  const canonical = {
    ignore: [...mapping.ignore].sort(comparePathRules),
    submit: [...mapping.submit].sort(comparePathRules),
  };
  return sha256Portable("research-sdk.artifact-path-mapping.v1", canonical);
}

export function gitArtifactSubstrate(substrate: GitPatchSubstrateIdentity): ArtifactSubstrate {
  return {
    kind: substrate.kind,
    resolvedBinary: substrate.git.resolvedBinary,
    version: substrate.git.version,
    environmentDigest: substrate.environmentDigest,
    configurationDigest: substrate.configurationDigest,
  };
}

interface MaterializeRevisionInput {
  readonly substrate: GitPatchSubstrateIdentity;
  readonly sourceRepositoryPath: string;
  readonly revision: ExactGitRevision;
  readonly controlRoot: string;
  readonly destinationPath: string;
}

interface CapturePatchInput {
  readonly substrate: GitPatchSubstrateIdentity;
  readonly sourceRepositoryPath: string;
  readonly baseline: ExactGitRevision;
  readonly terminalProductPath: string;
  readonly pathMapping: ArtifactPathMapping;
  readonly controlRoot: string;
}

interface CapturedPatch {
  readonly descriptor: PatchDescriptor;
  readonly bytes: Uint8Array;
}

interface ApplyPatchInput {
  readonly substrate: GitPatchSubstrateIdentity;
  readonly sourceRepositoryPath: string;
  readonly baseline: ExactGitRevision;
  readonly descriptor: PatchDescriptor;
  readonly patchBytes: Uint8Array;
  readonly pathMapping: ArtifactPathMapping;
  readonly controlRoot: string;
  readonly productPath: string;
}

interface GitMechanics {
  readonly materializeRevision: (
    input: MaterializeRevisionInput
  ) => Effect.Effect<void, GitBunError>;
  readonly capturePatch: (input: CapturePatchInput) => Effect.Effect<CapturedPatch, GitBunError>;
  readonly applyAndRegenerate: (input: ApplyPatchInput) => Effect.Effect<void, GitBunError>;
}

interface PreparedBaseline {
  readonly context: OwnedGitContext;
  readonly tree: string;
}

export function makeGitMechanics(
  process: CommandProcessShape,
  policy: CommandPolicy
): GitMechanics {
  const commands = { process, policy } satisfies CommandContext;

  return {
    materializeRevision: (input) =>
      Effect.gen(function* () {
        yield* preflightToolchain(commands, input.substrate);
        const destinationPath = yield* preparePublicationPath(
          input.destinationPath,
          "materializeRevision"
        );
        const source = yield* verifySourceRevision(
          commands,
          input.substrate,
          input.sourceRepositoryPath,
          input.revision
        );
        const owned = yield* prepareOwnedRepository(
          commands,
          input.substrate,
          input.controlRoot,
          source,
          input.revision
        );
        const stagedProductPath = join(input.controlRoot, "materialized-product");
        const context = ownedGitContext(commands, input.substrate, owned, stagedProductPath);
        yield* materializeOwnedRevision(context, input.revision);
        yield* stageBaseline(context, input.revision.selectedTreeObjectId);
        yield* publishDirectory(stagedProductPath, destinationPath, "materializeRevision");
      }),
    capturePatch: (input) =>
      Effect.gen(function* () {
        yield* preflightToolchain(commands, input.substrate);
        yield* trySynchronous("capturePatch", () => validatePathMapping(input.pathMapping));
        const terminalProductPath = yield* requireDirectory(
          input.terminalProductPath,
          "capturePatch"
        );
        yield* validateProductTree(terminalProductPath, "capturePatch");
        const baseline = yield* prepareBaseline(
          commands,
          input.substrate,
          input.sourceRepositoryPath,
          input.baseline,
          input.controlRoot,
          "baseline"
        );
        const terminal = ownedGitContext(
          commands,
          input.substrate,
          baseline.context.repository,
          terminalProductPath
        );
        yield* stageProductTree(terminal);
        yield* enforcePathMapping(terminal, baseline.tree, input.pathMapping);

        const changed = yield* changedPaths(terminal, baseline.tree);
        yield* validateSubmittedModes(terminal, changed, "capturePatch");
        yield* requireWorktreeMatchesIndex(terminal, "capturePatch", input.pathMapping);
        const bytes = yield* canonicalPatch(terminal, baseline.tree);
        const productTreeObjectId = yield* writeProductTree(terminal);
        const descriptor = yield* trySynchronous("capturePatch", (): PatchDescriptor => {
          const common = {
            baseline: input.baseline,
            pathMappingDigest: artifactPathMappingDigest(input.pathMapping),
            productTreeObjectId,
            substrate: input.substrate,
          };
          return bytes.byteLength === 0
            ? { kind: "Empty", ...common }
            : {
                kind: "Captured",
                ...common,
                patchDigest: sha256Digest("research-sdk.git-patch.v1", bytes),
                byteLength: bytes.byteLength,
              };
        });
        return { descriptor, bytes };
      }),
    applyAndRegenerate: (input) =>
      Effect.gen(function* () {
        yield* preflightToolchain(commands, input.substrate);
        const productPath = yield* preparePublicationPath(input.productPath, "applyAndRegenerate");
        yield* trySynchronous("applyAndRegenerate", () => {
          validatePathMapping(input.pathMapping);
          requireEqualSubstrate(input.descriptor.substrate, input.substrate);
          requireEqualRevision(input.descriptor.baseline, input.baseline);
          const expectedMapping = artifactPathMappingDigest(input.pathMapping);
          if (
            input.descriptor.pathMappingDigest.algorithm !== expectedMapping.algorithm ||
            input.descriptor.pathMappingDigest.preimageKind !== expectedMapping.preimageKind ||
            input.descriptor.pathMappingDigest.value !== expectedMapping.value
          ) {
            throw identityMismatch("applyAndRegenerate", "path mapping digest differs.");
          }
          verifyPatchBytes(input.descriptor, input.patchBytes);
        });
        const baseline = yield* prepareBaseline(
          commands,
          input.substrate,
          input.sourceRepositoryPath,
          input.baseline,
          input.controlRoot,
          "reconstructed-product"
        );

        if (input.descriptor.kind === "Captured") {
          yield* applyPatch(baseline.context, input.patchBytes);
        }
        const appliedChanges = yield* changedPaths(baseline.context, baseline.tree);
        yield* validateSubmittedModes(baseline.context, appliedChanges, "applyAndRegenerate");
        yield* verifyMappedPatch(baseline.context, baseline.tree, input.pathMapping);
        yield* requireWorktreeMatchesIndex(baseline.context, "applyAndRegenerate");
        const regeneratedPatch = yield* canonicalPatch(baseline.context, baseline.tree);
        if (!equalBytes(regeneratedPatch, input.patchBytes)) {
          return yield* Effect.fail(
            identityMismatch(
              "applyAndRegenerate",
              "The regenerated canonical patch differs from the submitted bytes."
            )
          );
        }
        const productTreeObjectId = yield* writeProductTree(baseline.context);
        if (input.descriptor.productTreeObjectId !== productTreeObjectId) {
          return yield* Effect.fail(
            identityMismatch("applyAndRegenerate", "Product tree identity differs.")
          );
        }
        yield* publishDirectory(baseline.context.worktree, productPath, "applyAndRegenerate");
      }),
  };
}

function prepareBaseline(
  commands: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  sourceRepositoryPath: string,
  revision: ExactGitRevision,
  controlRoot: string,
  directoryName: "baseline" | "reconstructed-product"
): Effect.Effect<PreparedBaseline, GitBunError> {
  return Effect.gen(function* () {
    const source = yield* verifySourceRevision(commands, substrate, sourceRepositoryPath, revision);
    const owned = yield* prepareOwnedRepository(commands, substrate, controlRoot, source, revision);
    const worktree = join(controlRoot, directoryName);
    const context = ownedGitContext(commands, substrate, owned, worktree);
    yield* materializeOwnedRevision(context, revision);
    const tree = yield* stageBaseline(context, revision.selectedTreeObjectId);
    return { context, tree };
  });
}

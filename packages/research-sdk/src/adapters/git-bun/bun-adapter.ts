import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execPath } from "node:process";
import { Context, Effect, Exit, Layer } from "effect";
import { type CommandPolicy, decodeStructural } from "../../contracts/index.js";
import { CommandProcess } from "../../runtime/index.js";
import {
  type BunPackageConfig,
  BunPackageConfigSchema,
  type BunPackageSubstrateIdentity,
  type PackedPackageDescriptor,
  type ResolvedToolIdentity,
} from "./contracts.js";
import {
  type GitBunError,
  identityMismatch,
  invalidInput,
  operationFailed,
  sha256Portable,
  stableJson,
} from "./internal.js";
import {
  canonicalBinary,
  canonicalDirectory,
  validateCommandDeadline,
  withControlRoot,
} from "./operation.js";
import {
  buildAndPackSdkPackage,
  canonicalBunPackageCanonicalization,
  type PackSdkPackageRequest,
  type VerifyInstalledSdkPackageRequest,
  verifyInstalledSdkPackage,
} from "./package.js";
import { type PackagePublicationState, rollbackPackagePublication } from "./package-build.js";

export interface BunPackagesShape {
  readonly packSdkPackage: (
    request: PackSdkPackageRequest
  ) => Effect.Effect<PackedPackageDescriptor, GitBunError>;
  readonly verifyInstalledSdkPackage: (
    request: VerifyInstalledSdkPackageRequest
  ) => Effect.Effect<void, GitBunError>;
}

export class BunPackages extends Context.Service<BunPackages, BunPackagesShape>()(
  "@rawr/research-sdk/adapters/git-bun/BunPackages"
) {}

export function makeBunPackagesLayer(
  rawConfig: unknown
): Layer.Layer<BunPackages, GitBunError, CommandProcess> {
  return Layer.effect(
    BunPackages,
    Effect.gen(function* () {
      const process = yield* CommandProcess;
      const config = yield* decodeBunConfig(rawConfig);
      const scratchRoot = yield* canonicalDirectory(config.scratchRoot, "configure");
      const commandPolicy: CommandPolicy = { ...config.command, environment: {} };

      return Object.freeze({
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
      } satisfies BunPackagesShape);
    })
  );
}

function decodeBunConfig(rawConfig: unknown): Effect.Effect<BunPackageConfig, GitBunError> {
  const decoded = decodeStructural(BunPackageConfigSchema, rawConfig);
  return decoded.kind === "Invalid"
    ? Effect.fail(invalidInput("configure", "Bun package configuration is malformed."))
    : validateCommandDeadline(decoded.value);
}

function acquirePackageSubstrate(
  requirement: BunPackageConfig["bun"]
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

function requireBunTool(
  requirement: BunPackageConfig["bun"],
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

function freezePackageSubstrate(value: BunPackageSubstrateIdentity): BunPackageSubstrateIdentity {
  Object.freeze(value.bun);
  Object.freeze(value.environmentDigest);
  Object.freeze(value.configurationDigest);
  return Object.freeze(value);
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

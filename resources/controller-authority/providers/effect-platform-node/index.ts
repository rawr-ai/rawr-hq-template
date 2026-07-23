import { FileSystem } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import {
  type ControllerAuthorityFailure,
  type ControllerAuthorityPreflight,
  type ControllerAuthorityPreflightInput,
  type ControllerAuthorityResource,
  type ControllerExecutableAuthority,
  type ControllerProviderHomeAuthority,
} from "@rawr/resource-controller-authority";
import { Effect } from "effect";

export const controllerAuthorityResource: ControllerAuthorityResource<FileSystem.FileSystem> = {
  preflight: Effect.fn("controllerAuthority.preflight")(function* (
    input: ControllerAuthorityPreflightInput
  ) {
    const fs = yield* FileSystem.FileSystem;
    const executables = yield* Effect.forEach(input.executables, (executable) =>
      validateExecutable(fs, executable)
    );
    const providerHomes = yield* validateProviderHomes(fs, input.providerHomes);
    return Object.freeze({
      executables: Object.freeze(executables),
      providerHomes: Object.freeze(providerHomes),
    });
  }),
};

export type NodeControllerAuthorityPreflightResult =
  | Readonly<{ ok: true; value: ControllerAuthorityPreflight }>
  | Readonly<{ ok: false; failure: ControllerAuthorityFailure }>;

export function preflightNodeControllerAuthority(
  input: ControllerAuthorityPreflightInput
): Promise<NodeControllerAuthorityPreflightResult> {
  return Effect.runPromise(
    controllerAuthorityResource.preflight(input).pipe(
      Effect.match({
        onFailure: (failure) => Object.freeze({ ok: false, failure }),
        onSuccess: (value) => Object.freeze({ ok: true, value }),
      }),
      Effect.provide(NodeContext.layer)
    )
  );
}

const validateExecutable = Effect.fn("controllerAuthority.validateExecutable")(function* (
  fs: FileSystem.FileSystem,
  executable: ControllerExecutableAuthority
) {
  const canonical = yield* canonicalPath(fs, executable.path, "executable");
  if (canonical !== executable.path) {
    return yield* rejected(
      "executable",
      "Aliased",
      executable.path,
      `${executable.name} executable must be its exact canonical path`
    );
  }
  const info = yield* fs
    .stat(executable.path)
    .pipe(Effect.mapError((cause) => platformFailure("executable", executable.path, cause)));
  if (info.type !== "File") {
    return yield* rejected(
      "executable",
      "NotRegularFile",
      executable.path,
      `${executable.name} executable must be a regular file`
    );
  }
  if ((info.mode & 0o111) === 0) {
    return yield* rejected(
      "executable",
      "NotExecutable",
      executable.path,
      `${executable.name} executable has no executable mode bit`
    );
  }
  return executable;
});

const validateProviderHomes = Effect.fn("controllerAuthority.validateProviderHomes")(function* (
  fs: FileSystem.FileSystem,
  homes: readonly ControllerProviderHomeAuthority[]
) {
  const canonicalHomes = new Set<string>();
  return yield* Effect.forEach(homes, (home) =>
    Effect.gen(function* () {
      const canonical = yield* canonicalPath(fs, home.path, "provider-home");
      if (canonical !== home.path) {
        return yield* rejected(
          "provider-home",
          "Aliased",
          home.path,
          `${home.provider} provider home must be its exact canonical path`
        );
      }
      const info = yield* fs
        .stat(home.path)
        .pipe(Effect.mapError((cause) => platformFailure("provider-home", home.path, cause)));
      if (info.type !== "Directory") {
        return yield* rejected(
          "provider-home",
          "NotDirectory",
          home.path,
          `${home.provider} provider home must be a directory`
        );
      }
      if (canonicalHomes.has(canonical)) {
        return yield* rejected(
          "provider-home",
          "DuplicateHome",
          home.path,
          `Provider homes must have distinct canonical identities: ${canonical}`
        );
      }
      canonicalHomes.add(canonical);
      return home;
    })
  );
});

function canonicalPath(
  fs: FileSystem.FileSystem,
  candidate: string,
  boundary: ControllerAuthorityFailure["boundary"]
) {
  return fs
    .realPath(candidate)
    .pipe(Effect.mapError((cause) => platformFailure(boundary, candidate, cause)));
}

function platformFailure(
  boundary: ControllerAuthorityFailure["boundary"],
  candidate: string,
  cause: PlatformError
): ControllerAuthorityFailure {
  const missing = cause._tag === "SystemError" && cause.reason === "NotFound";
  return Object.freeze({
    _tag: "ControllerAuthorityFailure",
    boundary,
    reason: missing ? "Missing" : "FilesystemUnavailable",
    path: candidate,
    detail: missing
      ? `Authority path does not exist: ${candidate}`
      : `Could not inspect authority path ${candidate}: ${cause.message}`,
  });
}

function rejected(
  boundary: ControllerAuthorityFailure["boundary"],
  reason: ControllerAuthorityFailure["reason"],
  candidate: string,
  detail: string
) {
  return Effect.fail<ControllerAuthorityFailure>(
    Object.freeze({
      _tag: "ControllerAuthorityFailure",
      boundary,
      reason,
      path: candidate,
      detail,
    })
  );
}

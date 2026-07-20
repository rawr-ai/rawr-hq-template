import type { Effect } from "effect";

export type ControllerExecutableKind = "git" | "provider";

export interface ControllerExecutableAuthority {
  readonly kind: ControllerExecutableKind;
  readonly name: string;
  readonly path: string;
}

export interface ControllerProviderHomeAuthority {
  readonly provider: "claude" | "codex";
  readonly path: string;
}

export interface ControllerAuthorityPreflightInput {
  readonly executables: readonly ControllerExecutableAuthority[];
  readonly providerHomes: readonly ControllerProviderHomeAuthority[];
}

export interface ControllerAuthorityPreflight {
  readonly executables: readonly ControllerExecutableAuthority[];
  readonly providerHomes: readonly ControllerProviderHomeAuthority[];
}

export type ControllerAuthorityFailureReason =
  | "Missing"
  | "Aliased"
  | "NotExecutable"
  | "NotRegularFile"
  | "NotDirectory"
  | "DuplicateHome"
  | "FilesystemUnavailable";

export interface ControllerAuthorityFailure {
  readonly _tag: "ControllerAuthorityFailure";
  readonly boundary: "executable" | "provider-home";
  readonly reason: ControllerAuthorityFailureReason;
  readonly path: string;
  readonly detail: string;
}

export interface ControllerAuthorityResource<R = never> {
  readonly preflight: (
    input: ControllerAuthorityPreflightInput,
  ) => Effect.Effect<ControllerAuthorityPreflight, ControllerAuthorityFailure, R>;
}

import { isAbsolute, relative } from "node:path";
import { Effect } from "effect";
import type {
  DigestIdentity,
  PortableData,
  ProcessTerminationUnconfirmed,
} from "../../contracts/index.js";
import type { CommandProcessShape, CommandRequest, CommandResult } from "../../runtime/command.js";

export interface GitBunInvalidInput {
  readonly kind: "GitBunInvalidInput";
  readonly operation: string;
  readonly message: string;
}

export interface GitBunOperationFailed {
  readonly kind: "GitBunOperationFailed";
  readonly operation: string;
  readonly message: "Operation failed; diagnostic content omitted.";
  readonly exitCode: number | null;
  readonly signalCode: string | null;
  readonly diagnosticDigest: DigestIdentity;
  readonly diagnosticByteLength: number;
}

export interface GitBunIdentityMismatch {
  readonly kind: "GitBunIdentityMismatch";
  readonly operation: string;
  readonly message: string;
}

export type GitBunError =
  | GitBunInvalidInput
  | GitBunOperationFailed
  | GitBunIdentityMismatch
  | ProcessTerminationUnconfirmed;

export function isGitBunError(value: unknown): value is GitBunError {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const kind = Reflect.get(value, "kind");
  return (
    kind === "GitBunInvalidInput" ||
    kind === "GitBunOperationFailed" ||
    kind === "GitBunIdentityMismatch" ||
    kind === "ProcessTerminationUnconfirmed"
  );
}

export function invalidInput(operation: string, message: string): GitBunInvalidInput {
  return { kind: "GitBunInvalidInput", operation, message };
}

export function operationFailed(
  operation: string,
  diagnostic: unknown,
  process: { readonly exitCode: number; readonly signalCode: string | null } | undefined = undefined
): GitBunOperationFailed {
  const bytes = diagnosticBytes(diagnostic);
  return {
    kind: "GitBunOperationFailed",
    operation,
    message: "Operation failed; diagnostic content omitted.",
    exitCode: process?.exitCode ?? null,
    signalCode: process?.signalCode ?? null,
    diagnosticDigest: sha256Digest("research-sdk.git-bun-diagnostic.v1", bytes),
    diagnosticByteLength: bytes.byteLength,
  };
}

export function identityMismatch(operation: string, message: string): GitBunIdentityMismatch {
  return { kind: "GitBunIdentityMismatch", operation, message };
}

export function runChecked(
  runner: CommandProcessShape,
  request: CommandRequest,
  operation: string
): Effect.Effect<CommandResult, GitBunOperationFailed | ProcessTerminationUnconfirmed> {
  return runner.run(request).pipe(
    Effect.mapError((error) =>
      error.kind === "ProcessTerminationUnconfirmed" ? error : operationFailed(operation, error)
    ),
    Effect.flatMap((result) =>
      result.exitCode === 0
        ? Effect.succeed(result)
        : Effect.fail(
            operationFailed(operation, result.stderr, {
              exitCode: result.exitCode,
              signalCode: result.signalCode,
            })
          )
    )
  );
}

export function sha256Digest(preimageKind: string, value: string | Uint8Array): DigestIdentity {
  return {
    algorithm: "sha256",
    preimageKind,
    value: new Bun.CryptoHasher("sha256").update(value).digest("hex"),
  };
}

export function stableJson(value: PortableData): string {
  return JSON.stringify(sortPortable(value));
}

export function sha256Portable(preimageKind: string, value: PortableData): DigestIdentity {
  return sha256Digest(preimageKind, stableJson(value));
}

export function equalDigest(left: DigestIdentity, right: DigestIdentity): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.preimageKind === right.preimageKind &&
    left.value === right.value
  );
}

export function normalizePortablePath(path: string): string | undefined {
  if (path.length === 0 || path.includes("\0") || path.includes("\\") || isAbsolute(path)) {
    return undefined;
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "..")) {
    return undefined;
  }
  const normalized = segments.filter((segment) => segment !== ".").join("/");
  return normalized.length === 0 ? "." : normalized;
}

export function isAtOrBelow(candidate: string, root: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function describeUnknown(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function diagnosticBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  return new TextEncoder().encode(describeUnknown(value));
}

function sortPortable(value: PortableData): PortableData {
  if (isPortableArray(value)) {
    return value.map(sortPortable);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortPortable(value[key]!)])
    );
  }
  return value;
}

function isPortableArray(value: PortableData): value is readonly PortableData[] {
  return Array.isArray(value);
}

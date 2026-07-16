import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

import {
  GUARDED_NATIVE_MANAGER_CONTRACT,
  type NativeMutationRequest,
  type PublicPluginCommandExport,
} from "./native-mutation";
import { isCanonicalPackageId } from "./package-id";

export const NATIVE_MANAGER_PROTOCOL_VERSION = 1;

export type NativeManagerInvocation = Readonly<{
  protocolVersion: typeof NATIVE_MANAGER_PROTOCOL_VERSION;
  cliRoot: string;
  nativeDataDir: string;
  request: NativeMutationRequest;
}>;

const COMMANDS = new Set<PublicPluginCommandExport>([
  "plugins:install",
  "plugins:link",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
]);

const SHA256 = /^[0-9a-f]{64}$/u;

export function encodeNativeManagerInvocation(invocation: NativeManagerInvocation): string {
  validateNativeManagerInvocation(invocation);
  return `${JSON.stringify(invocation)}\n`;
}

export function decodeNativeManagerInvocation(text: string): NativeManagerInvocation {
  if (Buffer.byteLength(text, "utf8") > 64 * 1024) {
    throw new Error("NATIVE_MANAGER_REQUEST_TOO_LARGE");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("NATIVE_MANAGER_REQUEST_INVALID_JSON");
  }
  validateNativeManagerInvocation(value);
  return value;
}

export function validateNativeManagerInvocation(
  value: unknown,
): asserts value is NativeManagerInvocation {
  if (!isRecord(value) || value.protocolVersion !== NATIVE_MANAGER_PROTOCOL_VERSION) {
    throw new Error("NATIVE_MANAGER_PROTOCOL_INVALID");
  }
  if (!absoluteString(value.cliRoot) || !absoluteString(value.nativeDataDir)) {
    throw new Error("NATIVE_MANAGER_PATH_INVALID");
  }
  validateNativeMutationRequest(value.request);
}

export function validateNativeMutationRequest(
  value: unknown,
): asserts value is NativeMutationRequest {
  if (!isRecord(value) || typeof value.commandExport !== "string" || !COMMANDS.has(value.commandExport as PublicPluginCommandExport)) {
    throw new Error("NATIVE_MANAGER_COMMAND_REJECTED");
  }
  if (!Array.isArray(value.argv) || value.argv.some((entry) => typeof entry !== "string")) {
    throw new Error("NATIVE_MANAGER_ARGUMENTS_INVALID");
  }
  if (!managerContractMatches(value.contract)) {
    throw new Error("NATIVE_MANAGER_CONTRACT_INVALID");
  }

  const argv = value.argv as string[];
  switch (value.commandExport) {
    case "plugins:install": {
      if (
        argv.length !== 2
        || argv[1] !== "--silent"
        || !argv[0]?.startsWith("file:")
        || !isRecord(value.inspectedArtifact)
        || !absoluteString(value.inspectedArtifact.path)
        || typeof value.inspectedArtifact.sha256 !== "string"
        || !SHA256.test(value.inspectedArtifact.sha256)
        || argv[0] !== `file:${value.inspectedArtifact.path}`
      ) {
        throw new Error("NATIVE_MANAGER_INSTALL_BINDING_INVALID");
      }
      break;
    }
    case "plugins:link": {
      if (argv.length !== 2 || !absoluteString(argv[0]) || argv[1] !== "--no-install" || value.inspectedArtifact !== undefined) {
        throw new Error("NATIVE_MANAGER_LINK_ARGUMENTS_INVALID");
      }
      break;
    }
    case "plugins:uninstall": {
      if (
        argv.length !== 1
        || !isCanonicalPackageId(argv[0] ?? "")
        || value.inspectedArtifact !== undefined
      ) {
        throw new Error("NATIVE_MANAGER_UNINSTALL_ARGUMENTS_INVALID");
      }
      break;
    }
    case "plugins:update": {
      if (argv.length !== 0 || value.inspectedArtifact !== undefined) {
        throw new Error("NATIVE_MANAGER_UPDATE_ARGUMENTS_INVALID");
      }
      break;
    }
    case "plugins:reset": {
      if (
        (argv.length !== 0 && (argv.length !== 1 || argv[0] !== "--hard"))
        || value.inspectedArtifact !== undefined
      ) {
        throw new Error("NATIVE_MANAGER_RESET_ARGUMENTS_INVALID");
      }
      break;
    }
  }
}

export async function verifyInspectedInstallArtifact(
  request: NativeMutationRequest,
): Promise<void> {
  validateNativeMutationRequest(request);
  if (request.commandExport !== "plugins:install" || request.inspectedArtifact === undefined) return;

  const artifact = request.inspectedArtifact;
  const canonicalPath = await realpath(artifact.path);
  if (canonicalPath !== artifact.path) {
    throw new Error("NATIVE_MANAGER_ARTIFACT_ALIAS_REJECTED");
  }
  const status = await lstat(canonicalPath);
  if (!status.isFile() || status.nlink !== 1) {
    throw new Error("NATIVE_MANAGER_ARTIFACT_NOT_PRIVATE_FILE");
  }
  if (await sha256RegularFile(canonicalPath) !== artifact.sha256) {
    throw new Error("NATIVE_MANAGER_ARTIFACT_HASH_MISMATCH");
  }
}

export async function sha256RegularFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function managerContractMatches(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(GUARDED_NATIVE_MANAGER_CONTRACT).every(
    ([key, expected]) => value[key] === expected,
  ) && Object.keys(value).length === Object.keys(GUARDED_NATIVE_MANAGER_CONTRACT).length;
}

function absoluteString(value: unknown): value is string {
  return typeof value === "string" && path.isAbsolute(value) && path.normalize(value) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

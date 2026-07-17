import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export interface NoReplacePublication {
  readonly sourcePath: string;
  readonly destinationPath: string;
  readonly expectedSource: Readonly<{ dev: bigint; ino: bigint }>;
}

export type NoReplacePublicationResult =
  | Readonly<{ kind: "Published" }>
  | Readonly<{ kind: "Occupied" }>
  | Readonly<{ kind: "Unsupported"; reason: string }>
  | Readonly<{ kind: "Unknown"; errno?: number; reason: string }>;

export interface NoReplacePublisher {
  publish(publication: NoReplacePublication): Promise<NoReplacePublicationResult>;
}

type SupportedPlatform = "darwin" | "linux";

interface NativeRenameCall {
  readonly platform: SupportedPlatform;
  readonly sourceParentFd: number;
  readonly sourceName: Uint8Array;
  readonly destinationParentFd: number;
  readonly destinationName: Uint8Array;
  readonly flags: number;
}

interface NativeRenameResult {
  readonly returnCode: number;
  readonly errno: number;
}

export type NativeRename = (call: NativeRenameCall) => NativeRenameResult;

const DARWIN_RENAME_EXCL = 0x00000004;
const DARWIN_RENAME_NOFOLLOW_ANY = 0x00000010;
const LINUX_RENAME_NOREPLACE = 0x00000001;

export function createBunFfiNoReplacePublisher(options: {
  readonly platform?: NodeJS.Platform;
  readonly nativeRename?: NativeRename;
} = {}): NoReplacePublisher {
  const platform = options.platform ?? process.platform;
  const publisher: NoReplacePublisher = {
    async publish(publication): Promise<NoReplacePublicationResult> {
      if (platform !== "darwin" && platform !== "linux") {
        return { kind: "Unsupported", reason: `no no-replace adapter for ${platform}` };
      }

      let sourceParent;
      let destinationParent;
      try {
        const source = await verifySource(publication);
        const destination = await verifyDestination(publication.destinationPath);
        sourceParent = await openCanonicalParent(source.parent);
        destinationParent = await openCanonicalParent(destination.parent);

        const currentSource = await lstat(publication.sourcePath, { bigint: true });
        if (
          !currentSource.isDirectory()
          || currentSource.isSymbolicLink()
          || currentSource.dev !== publication.expectedSource.dev
          || currentSource.ino !== publication.expectedSource.ino
          || await realpath(publication.sourcePath) !== publication.sourcePath
        ) {
          return { kind: "Unknown", reason: "source changed before no-replace publication" };
        }

        const flags = platform === "darwin"
          ? DARWIN_RENAME_EXCL | DARWIN_RENAME_NOFOLLOW_ANY
          : LINUX_RENAME_NOREPLACE;
        let nativeResult: NativeRenameResult;
        try {
          const rename = options.nativeRename ?? await loadBunNativeRename(platform);
          nativeResult = rename({
            platform,
            sourceParentFd: sourceParent.fd,
            sourceName: nulTerminated(source.name),
            destinationParentFd: destinationParent.fd,
            destinationName: nulTerminated(destination.name),
            flags,
          });
        } catch (error) {
          return { kind: "Unsupported", reason: errorMessage(error) };
        }

        if (nativeResult.returnCode === 0) return { kind: "Published" };
        if (nativeResult.returnCode !== -1) {
          return {
            kind: "Unknown",
            errno: nativeResult.errno,
            reason: `native no-replace returned unexpected status ${nativeResult.returnCode}`,
          };
        }
        if (nativeResult.errno === 17) return { kind: "Occupied" };
        if (unsupportedErrnos(platform).has(nativeResult.errno)) {
          return {
            kind: "Unsupported",
            reason: `no-replace syscall is unsupported (errno ${nativeResult.errno})`,
          };
        }
        return {
          kind: "Unknown",
          errno: nativeResult.errno,
          reason: `no-replace syscall outcome is unknown (errno ${nativeResult.errno})`,
        };
      } catch (error) {
        return { kind: "Unknown", reason: errorMessage(error) };
      } finally {
        await Promise.allSettled([sourceParent?.close(), destinationParent?.close()].filter(Boolean));
      }
    },
  };
  return Object.freeze(publisher);
}

async function verifySource(publication: NoReplacePublication): Promise<{ parent: string; name: string }> {
  const sourcePath = requireAbsoluteCanonicalShape(publication.sourcePath, "source");
  const parent = dirname(sourcePath);
  const name = requireDirectChildName(basename(sourcePath), "source");
  const status = await lstat(sourcePath, { bigint: true });
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || status.dev !== publication.expectedSource.dev
    || status.ino !== publication.expectedSource.ino
    || await realpath(sourcePath) !== sourcePath
  ) {
    throw new Error("source is not the captured canonical staging directory");
  }
  return { parent, name };
}

async function verifyDestination(path: string): Promise<{ parent: string; name: string }> {
  const destinationPath = requireAbsoluteCanonicalShape(path, "destination");
  return {
    parent: dirname(destinationPath),
    name: requireDirectChildName(basename(destinationPath), "destination"),
  };
}

async function openCanonicalParent(path: string) {
  const normalized = resolve(path);
  const before = await lstat(normalized, { bigint: true });
  const canonical = await realpath(normalized);
  if (!before.isDirectory() || before.isSymbolicLink() || canonical !== normalized) {
    throw new Error(`publication parent is not canonical: ${path}`);
  }
  const handle = await open(
    normalized,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  const opened = await handle.stat({ bigint: true });
  if (!opened.isDirectory() || opened.dev !== before.dev || opened.ino !== before.ino) {
    await handle.close();
    throw new Error(`publication parent changed while opening: ${path}`);
  }
  return handle;
}

function requireAbsoluteCanonicalShape(path: string, label: string): string {
  const normalized = resolve(path);
  if (path !== normalized) throw new Error(`${label} path must be absolute and normalized`);
  return normalized;
}

function requireDirectChildName(value: string, label: string): string {
  if (
    value.length === 0
    || value === "."
    || value === ".."
    || value.includes("/")
    || value.includes("\\")
    || value.includes("\0")
  ) {
    throw new Error(`${label} name is not a direct-child basename`);
  }
  return value;
}

function nulTerminated(value: string): Uint8Array {
  return new TextEncoder().encode(`${value}\0`);
}

function unsupportedErrnos(platform: SupportedPlatform): ReadonlySet<number> {
  return platform === "darwin"
    ? new Set([18, 22, 45, 78])
    : new Set([18, 22, 38, 95]);
}

async function loadBunNativeRename(platform: SupportedPlatform): Promise<NativeRename> {
  if (!("Bun" in globalThis)) throw new Error("Bun FFI runtime is unavailable");
  const { dlopen, read } = await import("bun:ffi");
  const libraryName = platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6";
  const renameSymbol = platform === "darwin" ? "renameatx_np" : "renameat2";
  const errnoSymbol = platform === "darwin" ? "__error" : "__errno_location";
  const library = dlopen(libraryName, {
    [renameSymbol]: {
      args: ["i32", "ptr", "i32", "ptr", "u32"],
      returns: "i32",
    },
    [errnoSymbol]: {
      args: [],
      returns: "ptr",
    },
  });
  return (call) => {
    try {
      const rename = library.symbols[renameSymbol]!;
      const errnoPointer = library.symbols[errnoSymbol]!;
      const returnCode = rename(
        call.sourceParentFd,
        call.sourceName,
        call.destinationParentFd,
        call.destinationName,
        call.flags,
      ) as number;
      const pointer = errnoPointer();
      const errno = returnCode === -1 && pointer !== null
        ? read.i32(pointer as Parameters<typeof read.i32>[0])
        : 0;
      return { returnCode, errno };
    } finally {
      library.close();
    }
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

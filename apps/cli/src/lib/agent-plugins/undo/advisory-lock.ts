export type SupportedCapsulePlatform = "darwin" | "linux";

export interface NativeFlockCallV1 {
  readonly fd: number;
  readonly operation: number;
}

export interface NativeFlockResultV1 {
  readonly returnCode: number;
  readonly errno: number;
}

export type NativeFlockV1 = (call: NativeFlockCallV1) => NativeFlockResultV1;

export type AdvisoryLockResultV1 =
  | Readonly<{ kind: "Acquired" }>
  | Readonly<{ kind: "Busy" }>
  | Readonly<{ kind: "Unsupported"; reason: string }>
  | Readonly<{ kind: "Failed"; errno?: number; reason: string }>;

export interface CapsuleAdvisoryLockV1 {
  readonly platform: NodeJS.Platform;
  acquire(fd: number): Promise<AdvisoryLockResultV1>;
  release(fd: number): Promise<Readonly<{ kind: "Released" }> | Readonly<{ kind: "Failed"; reason: string }>>;
}

const LOCK_EX = 0x02;
const LOCK_NB = 0x04;
const LOCK_UN = 0x08;

export function createBunFfiCapsuleAdvisoryLock(options: Readonly<{
  platform?: NodeJS.Platform;
  nativeFlock?: NativeFlockV1;
}> = {}): CapsuleAdvisoryLockV1 {
  const platform = options.platform ?? process.platform;
  return Object.freeze({
    platform,
    async acquire(fd: number): Promise<AdvisoryLockResultV1> {
      if (platform !== "darwin" && platform !== "linux") {
        return { kind: "Unsupported", reason: `capsule advisory lock is unsupported on ${platform}` };
      }
      let result: NativeFlockResultV1;
      try {
        const flock = options.nativeFlock ?? await loadNativeFlock(platform);
        result = flock({ fd, operation: LOCK_EX | LOCK_NB });
      } catch (error) {
        return { kind: "Unsupported", reason: errorMessage(error) };
      }
      if (result.returnCode === 0) return { kind: "Acquired" };
      if (result.returnCode !== -1) {
        return { kind: "Failed", errno: result.errno, reason: `flock returned ${result.returnCode}` };
      }
      if (busyErrnos(platform).has(result.errno)) return { kind: "Busy" };
      if (unsupportedErrnos(platform).has(result.errno)) {
        return { kind: "Unsupported", reason: `flock is unsupported by this filesystem (errno ${result.errno})` };
      }
      return { kind: "Failed", errno: result.errno, reason: `flock failed (errno ${result.errno})` };
    },
    async release(fd: number) {
      if (platform !== "darwin" && platform !== "linux") {
        return { kind: "Failed" as const, reason: `capsule advisory lock is unsupported on ${platform}` };
      }
      try {
        const flock = options.nativeFlock ?? await loadNativeFlock(platform);
        const result = flock({ fd, operation: LOCK_UN });
        return result.returnCode === 0
          ? { kind: "Released" as const }
          : { kind: "Failed" as const, reason: `flock unlock failed (errno ${result.errno})` };
      } catch (error) {
        return { kind: "Failed" as const, reason: errorMessage(error) };
      }
    },
  });
}

function busyErrnos(platform: SupportedCapsulePlatform): ReadonlySet<number> {
  return platform === "darwin" ? new Set([11, 35]) : new Set([11]);
}

function unsupportedErrnos(platform: SupportedCapsulePlatform): ReadonlySet<number> {
  return platform === "darwin" ? new Set([22, 45, 78]) : new Set([22, 38, 95]);
}

async function loadNativeFlock(platform: SupportedCapsulePlatform): Promise<NativeFlockV1> {
  if (!("Bun" in globalThis)) throw new Error("Bun FFI runtime is unavailable");
  const { dlopen, read } = await import("bun:ffi");
  const libraryName = platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6";
  const errnoSymbol = platform === "darwin" ? "__error" : "__errno_location";
  return (call) => {
    const library = dlopen(libraryName, {
      flock: { args: ["i32", "i32"], returns: "i32" },
      [errnoSymbol]: { args: [], returns: "ptr" },
    });
    try {
      const returnCode = library.symbols.flock!(call.fd, call.operation) as number;
      const pointer = library.symbols[errnoSymbol]!();
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

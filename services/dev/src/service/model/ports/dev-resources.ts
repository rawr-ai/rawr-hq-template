/** File-kind observation returned by the Dev filesystem port. */
export type DevFileStat = {
  isFile: boolean;
  isDirectory: boolean;
};

/** Directory entry returned by the Dev filesystem port. */
export type DevDirEntry = {
  name: string;
  isDirectory: boolean;
};

/** Minimal filesystem observation exposed to workspace-scoped Dev operations. */
export type DevFileSystemResource = {
  stat(filePath: string): Promise<DevFileStat | null>;
  readDir(dirPath: string): Promise<DevDirEntry[] | null>;
};

/** Platform path operations required by workspace-scoped Dev operations. */
export type DevPathResource = {
  join(...parts: string[]): string;
  resolve(filePath: string): string;
  relative(fromPath: string, toPath: string): string;
  basename(filePath: string): string;
};

/** Byte-preserving outcome from an external process invoked by a Dev operation. */
export type DevExecResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
  durationMs: number;
};

/** Process capability used for Git, Graphite, and bounded pacing operations. */
export type DevProcessResource = {
  exec(
    command: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number }
  ): Promise<DevExecResult>;
  sleep(ms: number): Promise<void>;
};

/** Clock capability used to derive deterministic operation-owned names. */
export type DevClockResource = {
  now(): Date;
};

/**
 * Host capability bundle admitted once at the Dev service boundary.
 *
 * This is construction vocabulary for the service host, not an independent
 * state owner or resource lifecycle.
 */
export type DevResources = {
  fs: DevFileSystemResource;
  path: DevPathResource;
  process: DevProcessResource;
  clock: DevClockResource;
};

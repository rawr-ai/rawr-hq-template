export type DevFileStat = {
  isFile: boolean;
  isDirectory: boolean;
};

export type DevDirEntry = {
  name: string;
  isDirectory: boolean;
};

export type DevExecResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
  durationMs: number;
};

export type DevFileSystemResource = {
  stat(filePath: string): Promise<DevFileStat | null>;
  readDir(dirPath: string): Promise<DevDirEntry[] | null>;
};

export type DevPathResource = {
  join(...parts: string[]): string;
  resolve(filePath: string): string;
  relative(fromPath: string, toPath: string): string;
  basename(filePath: string): string;
};

export type DevProcessResource = {
  exec(
    command: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number }
  ): Promise<DevExecResult>;
  sleep(ms: number): Promise<void>;
};

export type DevClockResource = {
  now(): Date;
};

export type DevResources = {
  fs: DevFileSystemResource;
  path: DevPathResource;
  process: DevProcessResource;
  clock: DevClockResource;
};

import type { HyperresearchCliOperation, HyperresearchCliResult } from "./entities";

export interface HyperresearchCliBackend {
  run(input: {
    operation: HyperresearchCliOperation;
    args: string[];
    cwd: string;
  }): Promise<HyperresearchCliResult>;
}

export interface HyperresearchCodexIO {
  now(): string;
  randomId(prefix: string): string;
  join(...parts: string[]): string;
  dirname(filePath: string): string;
  ensureDir(dirPath: string): Promise<void>;
  pathExists(filePath: string): Promise<boolean>;
  readTextFile(filePath: string): Promise<string | null>;
  writeTextFile(filePath: string, content: string): Promise<void>;
  readJsonFile<T>(filePath: string): Promise<T | null>;
  writeJsonFile(filePath: string, data: unknown): Promise<void>;
  sha256(content: string): string;
}

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export interface GitRunOptions {
  readonly input?: string | Uint8Array;
}

/** Minimal Git process boundary used by history and committed-frame intake. */
export interface GitRunner {
  readonly root: string;
  text(args: readonly string[], options?: GitRunOptions): string;
  bytes(args: readonly string[], options?: GitRunOptions): Uint8Array;
}

/** Construct the exact local Git transport used by the neutral kernel. */
export function createGitRunner(root: string): GitRunner {
  const workingDirectory = resolve(root);
  return {
    root: workingDirectory,
    text(args, options = {}) {
      return execFileSync("git", [...args], {
        cwd: workingDirectory,
        encoding: "utf8",
        input: options.input,
        maxBuffer: 512 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    },
    bytes(args, options = {}) {
      return execFileSync("git", [...args], {
        cwd: workingDirectory,
        encoding: "buffer",
        input: options.input,
        maxBuffer: 512 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    },
  };
}

/** Accept a full SHA-1 or SHA-256 object identity, never an ambiguous short ref. */
export function assertGitObjectId(value: string, field = "Git object"): string {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) {
    throw new Error(`${field} must be a full lower-case Git object ID`);
  }
  return value;
}

import { spawn } from "node:child_process";
import type { HyperresearchCliBackend } from "@rawr/hyperresearch-codex/resources";
import type {
  HyperresearchCliOperation,
  HyperresearchCliResult,
} from "@rawr/hyperresearch-codex/types";

export class NodeHyperresearchCliBackend implements HyperresearchCliBackend {
  constructor(private readonly binary = "hyperresearch") {}

  async run(input: {
    operation: HyperresearchCliOperation;
    args: string[];
    cwd: string;
  }): Promise<HyperresearchCliResult> {
    return await new Promise((resolve) => {
      const child = spawn(this.binary, [input.operation, ...input.args], {
        cwd: input.cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
      child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
      child.on("close", (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });
      child.on("error", (error) => {
        resolve({
          exitCode: 1,
          stderr: error.message,
        });
      });
    });
  }
}

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { spawnInstalledCommand } from "../support/spawn-installed-command.js";

const literalArgs = [
  "repository with spaces",
  "",
  'embedded "quotes"',
  "trailing\\",
  "(parentheses)",
  "ampersand&argument",
  "%HABITAT_ARGV_CANARY%",
];
const argvSource = "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n";

describe("installed command argument transport", () => {
  it("preserves literal arguments, a spaced script path and a spaced working directory", async () => {
    await withFixture(async ({ root, env }) => {
      const script = path.join(root, "echo argv.cjs");
      await writeFile(script, argvSource);
      const result = await capture(
        spawnInstalledCommand(process.execPath, [script, ...literalArgs], {
          cwd: root,
          env,
        })
      );

      expect(result.exitCode, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(literalArgs);
    });
  }, 30_000);

  it("initializes the exact native Git repository path containing spaces", async () => {
    await withFixture(async ({ root, env }) => {
      const repository = path.join(root, "repository with spaces");
      const initialized = await capture(
        spawnInstalledCommand("git", ["init", "--quiet", "--initial-branch=main", repository], {
          cwd: root,
          env,
        })
      );
      expect(initialized.exitCode, initialized.stderr).toBe(0);

      const observed = await capture(
        spawnInstalledCommand("git", ["-C", repository, "rev-parse", "--show-toplevel"], {
          cwd: root,
          env,
        })
      );
      expect(observed.exitCode, observed.stderr).toBe(0);
      expect(await realpath(observed.stdout.trim())).toBe(await realpath(repository));
    });
  }, 30_000);

  it.skipIf(process.platform !== "win32").each(["absolute", "PATH"] as const)(
    "preserves literal argv through a Windows .cmd shim resolved by %s",
    async (resolution) => {
      await withFixture(async ({ root, env }) => {
        const bin = path.join(root, "node_modules", ".bin");
        await mkdir(bin, { recursive: true });
        await writeFile(path.join(bin, "argv.cjs"), argvSource);
        await writeFile(
          path.join(bin, "argv-fixture.cmd"),
          ["@echo off", `"${process.execPath}" "%~dp0argv.cjs" %*`, ""].join("\r\n")
        );
        const executable =
          resolution === "absolute" ? path.join(bin, "argv-fixture") : "argv-fixture";
        const result = await capture(
          spawnInstalledCommand(executable, literalArgs, {
            cwd: root,
            env: { ...env, PATH: `${bin}${path.delimiter}${env.PATH ?? ""}` },
          })
        );

        expect(result.exitCode, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual(literalArgs);
      });
    },
    30_000
  );
});

async function withFixture(
  operation: (fixture: { root: string; env: NodeJS.ProcessEnv }) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "habitat argv "));
  const env: NodeJS.ProcessEnv = {
    COMSPEC: process.env.COMSPEC,
    PATH: process.env.PATH,
    PATHEXT: process.env.PATHEXT,
    SYSTEMROOT: process.env.SYSTEMROOT,
    WINDIR: process.env.WINDIR,
    HOME: root,
    USERPROFILE: root,
    TEMP: root,
    TMP: root,
    TMPDIR: root,
    GIT_CONFIG_GLOBAL: path.join(root, "unused.gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    HABITAT_ARGV_CANARY: "must-not-expand",
  };
  try {
    await operation({ root, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function capture(child: ReturnType<typeof spawnInstalledCommand>): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let failure: unknown;
    const timer = setTimeout(() => {
      failure = new Error("Native argv fixture exceeded its timeout.");
      if (child.pid === undefined) return;
      try {
        if (process.platform === "win32") {
          execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            stdio: "pipe",
            timeout: 5_000,
            windowsHide: true,
          });
        } else {
          process.kill(-child.pid, "SIGKILL");
        }
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) {
          failure = new AggregateError([failure, error], "Native argv fixture cleanup failed.");
        }
      }
    }, 10_000);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      failure ??= error;
    });
    child.once("close", (exitCode) => {
      clearTimeout(timer);
      if (failure !== undefined) reject(failure);
      else resolve({ exitCode, stdout, stderr });
    });
  });
}

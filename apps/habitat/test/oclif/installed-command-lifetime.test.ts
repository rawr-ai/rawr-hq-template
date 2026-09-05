import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runAgentPluginCommand } from "../support/agent-plugin-telemetry-matrix";

type OwnedProcesses = { parent: number; descendant: number };

describe("installed command helper process lifetime", () => {
  for (const mode of [
    "abort",
    "timeout",
    "output",
    "stubborn-descendant",
    "transient-permission",
    "persistent-permission",
  ] as const) {
    const simulatedPermission = mode === "transient-permission" || mode === "persistent-permission";
    const stubbornDescendant = mode === "stubborn-descendant" || simulatedPermission;
    it.skipIf(process.platform === "win32" && stubbornDescendant)(
      simulatedPermission
        ? `${mode} simulated EPERM still requires native owned-group absence`
        : `${mode} joins the owned ${process.platform === "win32" ? "Windows process tree" : "POSIX process group"} before rejecting`,
      async () => {
        const root = await realpath(await mkdtemp(join(tmpdir(), "habitat-command-lifetime-")));
        const cliRoot = join(root, "cli");
        const cwd = join(root, "working");
        const readyPath = join(root, "ready.json");
        const controller = new AbortController();
        const refusal = new Error("Owned command abort sentinel");
        const permissionFailure = Object.assign(new Error("Simulated owned-group EPERM"), {
          code: "EPERM",
        });
        const nativeKill = process.kill.bind(process);
        let processes: OwnedProcesses | undefined;
        let settlement: Promise<unknown> | undefined;
        let restoreKill: (() => void) | undefined;
        let outcomeSettled = false;
        const cleanupFailures: unknown[] = [];
        try {
          await mkdir(join(cliRoot, "bin"), { recursive: true });
          await mkdir(cwd);
          await writeFile(join(cliRoot, "package.json"), '{"type":"commonjs"}\n');
          const descendant = [
            ...(stubbornDescendant ? ["process.on('SIGTERM', () => {});"] : []),
            "setInterval(() => {}, 1000);",
            "process.send({ pid: process.pid }, () => process.disconnect());",
          ].join("\n");
          await writeFile(
            join(cliRoot, "bin", "run.js"),
            [
              "const { spawn } = require('node:child_process');",
              "const fs = require('node:fs');",
              "process.once('SIGTERM', () => process.exit(0));",
              `const ready = ${JSON.stringify(readyPath)};`,
              `const child = spawn(process.execPath, ['--eval', ${JSON.stringify(descendant)}], {`,
              "  cwd: process.cwd(), stdio: ['ignore', 'ignore', 'ignore', 'ipc'],",
              "});",
              "child.once('message', ({ pid }) => {",
              "  fs.writeFileSync(ready + '.tmp', JSON.stringify({ parent: process.pid, descendant: pid }));",
              "  fs.renameSync(ready + '.tmp', ready);",
              "  child.unref();",
              "  if (process.argv[2] === 'output') process.stdout.write('x'.repeat(4_194_305));",
              "});",
              "setInterval(() => {}, 1000);",
            ].join("\n")
          );
          const outcome = runAgentPluginCommand({
            cliRoot,
            cwd,
            env: process.env,
            args: [mode],
            signal: controller.signal,
            timeoutMs: mode === "timeout" ? 5_000 : 15_000,
          }).then(
            (value) => {
              outcomeSettled = true;
              return { kind: "success" as const, value };
            },
            (error: unknown) => {
              outcomeSettled = true;
              return { kind: "failure" as const, error };
            }
          );
          settlement = outcome;
          processes = await readReadyProcesses(readyPath);
          let forcedSignals = 0;
          let refusedObservations = 0;
          let simulatePermission = true;
          if (simulatedPermission) {
            const ownedGroup = -processes.parent;
            const spy = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
              if (pid === ownedGroup && simulatePermission) {
                if (signal === "SIGKILL") {
                  forcedSignals += 1;
                  throw permissionFailure;
                }
                if (signal === 0) {
                  refusedObservations += 1;
                  throw permissionFailure;
                }
              }
              return nativeKill(pid, signal);
            });
            restoreKill = () => spy.mockRestore();
          }
          if (mode === "abort" || stubbornDescendant) {
            expect(isRunning(processes.parent)).toBe(true);
            expect(isRunning(processes.descendant)).toBe(true);
            controller.abort(refusal);
          }
          if (simulatedPermission) {
            await expect
              .poll(() => refusedObservations, { interval: 20, timeout: 2_000 })
              .toBeGreaterThan(0);
            expect(forcedSignals).toBe(1);
            expect(outcomeSettled).toBe(false);
            expect(isRunning(processes.descendant)).toBe(true);
            if (mode === "transient-permission") {
              simulatePermission = false;
              nativeKill(-processes.parent, "SIGKILL");
            }
          }
          const result = await outcome;
          expect(result.kind).toBe("failure");
          if (result.kind !== "failure") throw new Error("Expected command refusal.");
          expect(isRunning(processes.parent)).toBe(false);
          if (mode === "persistent-permission") {
            expect(result.error).toBeInstanceOf(AggregateError);
            if (!(result.error instanceof AggregateError))
              throw new Error("Expected cleanup refusal.");
            expect(result.error.cause).toBe(refusal);
            expect(result.error.errors[0]).toBe(refusal);
            expect(result.error.errors[1]).toMatchObject({
              message:
                "Owned fixture process group absence was not established after forced termination.",
              cause: permissionFailure,
            });
            expect(isRunning(processes.descendant)).toBe(true);
            expect(nativeKill(-processes.parent, 0)).toBe(true);
          } else {
            if (mode === "abort" || stubbornDescendant) expect(result.error).toBe(refusal);
            else
              expect(result.error).toMatchObject({
                message:
                  mode === "timeout"
                    ? "Installed lifecycle command timed out."
                    : "Installed lifecycle output exceeds its bound.",
              });
            expect(isRunning(processes.descendant)).toBe(false);
            if (process.platform !== "win32") expect(isRunning(-processes.parent)).toBe(false);
            // A live Windows descendant holding this cwd would make removal fail with EBUSY.
            await rm(cwd, { recursive: true, force: false });
          }
        } finally {
          restoreKill?.();
          controller.abort(refusal);
          if (processes !== undefined) {
            for (const pid of [processes.descendant, processes.parent]) {
              if (!isRunning(pid)) continue;
              try {
                if (process.platform === "win32") {
                  execFileSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
                    stdio: "pipe",
                    windowsHide: true,
                  });
                } else process.kill(pid, "SIGKILL");
              } catch (error) {
                if (isRunning(pid)) cleanupFailures.push(error);
              }
            }
          }
          await settlement;
          if (processes !== undefined) {
            for (const pid of [processes.descendant, processes.parent]) {
              await expect.poll(() => isRunning(pid), { interval: 20, timeout: 5_000 }).toBe(false);
            }
          }
          await rm(root, { recursive: true, force: true });
        }
        expect(cleanupFailures).toEqual([]);
      },
      20_000
    );
  }
});

async function readReadyProcesses(path: string): Promise<OwnedProcesses> {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(path, "utf8")) as OwnedProcesses;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Native child did not publish readiness.");
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    throw error;
  }
}

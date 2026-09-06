import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChildProcessResource } from "@habitat-ai/resource-child-process";
import { Cause, Deferred, Effect, Exit, Fiber, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../../../src/client";
import { runCommand } from "../../../src/service/model/policy/command-execution";
import { createFixture, type Fixture } from "../../support/service/fixture";

const fixtures: Fixture[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  for (const fixture of fixtures.splice(0)) await fixture.cleanup();
});
async function setup() {
  const fixture = await createFixture();
  fixtures.push(fixture);
  return fixture;
}

describe("one scoped native command", () => {
  it("retains exact arguments, separate streams and the native numeric exit", async () => {
    const fixture = await setup();
    const args = [
      "--eval",
      "process.stdout.write(JSON.stringify(process.argv.slice(1))); process.stderr.write('separate'); process.exitCode=7;",
      "a b",
      "line\nbreak",
      "--literal",
    ];
    const result = await Effect.runPromise(
      runCommand(
        fixture.options.deps.childProcess,
        fixture.nodeExecutable,
        args,
        fixture.repositoryPath
      )
    );
    expect(result).toEqual({
      command: fixture.nodeExecutable,
      args,
      status: "failed",
      exitCode: 7,
      stdout: JSON.stringify(args.slice(2)),
      stderr: "separate",
      failure: null,
    });
  });

  it.each([
    ["stdout", 4 * 1024 * 1024],
    ["stderr", 256 * 1024],
  ] as const)("bounds %s independently and joins its native child before returning", async (channel, limit) => {
    const fixture = await setup();
    let pid: number | undefined;
    const spawner: ChildProcessResource = {
      ...fixture.options.deps.childProcess,
      spawn: (command) =>
        fixture.options.deps.childProcess.spawn(command).pipe(
          Effect.tap((child) =>
            Effect.sync(() => {
              pid = Number(child.pid);
            })
          )
        ),
    };
    const result = await Effect.runPromise(
      runCommand(
        spawner,
        fixture.nodeExecutable,
        [
          "--eval",
          `process.${channel}.write('x'.repeat(${limit + 1024})); setInterval(() => {}, 1000);`,
        ],
        fixture.repositoryPath
      )
    );
    expect(result.status).toBe("failed");
    expect(result.failure).toContain(`${channel} exceeds ${limit} bytes`);
    expect(new TextEncoder().encode(result[channel])).toHaveLength(limit);
    expect(result[channel === "stdout" ? "stderr" : "stdout"]).toBe("");
    expect(pid).toBeDefined();
    if (pid !== undefined) expect(processExists(pid)).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "interruption waits for delayed native SIGTERM cleanup and leaves no live child",
    async () => {
      const fixture = await setup();
      const marker = join(fixture.root, "interruption-events");
      const ready = await Effect.runPromise(Deferred.make<void>());
      let pid: number | undefined;
      const spawner: ChildProcessResource = {
        ...fixture.options.deps.childProcess,
        spawn: (command) =>
          fixture.options.deps.childProcess.spawn(command).pipe(
            Effect.map((child) => {
              pid = Number(child.pid);
              return {
                ...child,
                stdout: child.stdout.pipe(Stream.tap(() => Deferred.succeed(ready, undefined))),
              };
            })
          ),
      };
      const script = [
        "const fs = require('node:fs');",
        `const marker = ${JSON.stringify(marker)};`,
        "process.once('SIGTERM', () => { fs.appendFileSync(marker, 'term\\n'); setTimeout(() => { fs.appendFileSync(marker, 'cleanup\\n'); process.exit(0); }, 200); });",
        "setInterval(() => {}, 1000); setTimeout(() => process.exit(94), 6000);",
        "fs.appendFileSync(marker, 'ready\\n'); process.stdout.write('ready\\n');",
      ].join("\n");
      const fiber = Effect.runFork(
        runCommand(spawner, fixture.nodeExecutable, ["--eval", script], fixture.repositoryPath)
      );
      try {
        await Effect.runPromise(Deferred.await(ready).pipe(Effect.timeout("3 seconds")));
        let settled = false;
        const interrupted = Effect.runPromise(Fiber.interrupt(fiber)).then(() => {
          settled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(settled).toBe(false);
        await interrupted;
        const exit = await Effect.runPromise(Fiber.await(fiber));
        expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
        expect(await readFile(marker, "utf8")).toBe("ready\nterm\ncleanup\n");
        expect(pid).toBeDefined();
        if (pid !== undefined) expect(processExists(pid)).toBe(false);
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber));
      }
    }
  );

  it("a timeout remains a failed native step only after its child has settled", async () => {
    const fixture = await setup();
    let pid: number | undefined;
    const spawner: ChildProcessResource = {
      ...fixture.options.deps.childProcess,
      spawn: (command) =>
        fixture.options.deps.childProcess.spawn(command).pipe(
          Effect.tap((child) =>
            Effect.sync(() => {
              pid = Number(child.pid);
            })
          )
        ),
    };
    const result = await Effect.runPromise(
      runCommand(
        spawner,
        fixture.nodeExecutable,
        ["--eval", "setInterval(() => {}, 1000);"],
        fixture.repositoryPath,
        300
      )
    );
    expect(result.status).toBe("failed");
    expect(result.failure).toContain("TimeoutError");
    expect(pid).toBeDefined();
    if (pid !== undefined) expect(processExists(pid)).toBe(false);
  });
});

describe("explicit repository authority", () => {
  it("clears inherited Git-local overrides for real observation and mutation of repository B, leaving A untouched", async () => {
    const a = await setup();
    const b = await setup();
    const aWorktree = await a.worktree("wt-selected", "selected");
    const bWorktree = await b.worktree("wt-selected", "selected");
    const before = {
      head: a.git(["rev-parse", "HEAD"]),
      index: await readFile(join(a.repositoryPath, ".git", "index")),
    };
    for (const [name, value] of Object.entries({
      GIT_DIR: join(a.repositoryPath, ".git"),
      GIT_WORK_TREE: a.repositoryPath,
      GIT_COMMON_DIR: join(a.repositoryPath, ".git"),
      GIT_INDEX_FILE: join(a.repositoryPath, ".git", "index"),
      GIT_OBJECT_DIRECTORY: join(a.repositoryPath, ".git", "objects"),
      GIT_ALTERNATE_OBJECT_DIRECTORIES: join(a.repositoryPath, ".git", "objects"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.bare",
      GIT_CONFIG_VALUE_0: "true",
    }))
      vi.stubEnv(name, value);
    const spawner: ChildProcessResource = {
      ...b.nativeChildProcess,
      spawn(command) {
        if (!ChildProcess.isStandardCommand(command)) throw new Error("Expected a native command.");
        return b.nativeChildProcess.spawn(
          ChildProcess.make(command.command, command.args, {
            ...command.options,
            env: { ...b.env, ...command.options.env },
          })
        );
      },
    };
    const client = createClient({
      ...b.options,
      deps: { ...b.options.deps, childProcess: spawner },
    });
    const result = await client.worktree.cleanup({
      repositoryPath: b.repositoryPath,
      prefix: "wt-",
      trunk: "trunk",
      apply: true,
    });
    expect(result.kind).toBe("Applied");
    expect(result.repositoryRoot).toBe(b.repositoryPath);
    expect(result.removed).toEqual([bWorktree]);
    expect(a.git(["worktree", "list", "--porcelain", "-z"])).toContain(`worktree ${aWorktree}\0`);
    expect(a.git(["rev-parse", "HEAD"])).toBe(before.head);
    expect(await readFile(join(a.repositoryPath, ".git", "index"))).toEqual(before.index);
  });

  it("uses the native Git-local name set for Graphite too, without dropping normal config or author environment", async () => {
    const fixture = await setup();
    const names = fixture.git(["rev-parse", "--local-env-vars"]).trim().split("\n");
    for (const name of names) vi.stubEnv(name, "must-not-reach-child");
    vi.stubEnv("GIT_AUTHOR_NAME", "retained-author");
    vi.stubEnv("GIT_CONFIG_GLOBAL", fixture.env.GIT_CONFIG_GLOBAL);
    const spawner: ChildProcessResource = {
      ...fixture.nativeChildProcess,
      spawn(command) {
        if (!ChildProcess.isStandardCommand(command)) throw new Error("Expected a native command.");
        expect(command.command).toBe("gt");
        expect(
          Object.entries(command.options.env ?? {})
            .filter(([, value]) => value === undefined)
            .map(([name]) => name)
            .sort()
        ).toEqual([...names].sort());
        return fixture.nativeChildProcess.spawn(
          ChildProcess.make(
            fixture.nodeExecutable,
            ["--eval", "process.stdout.write(JSON.stringify(process.env));"],
            command.options
          )
        );
      },
    };
    const result = await Effect.runPromise(
      runCommand(spawner, "gt", ["state", "--no-interactive"], fixture.repositoryPath)
    );
    expect(result.status).toBe("succeeded");
    const env = JSON.parse(result.stdout);
    for (const name of names) expect(env[name]).toBeUndefined();
    expect(env.GIT_AUTHOR_NAME).toBe("retained-author");
    expect(env.GIT_CONFIG_GLOBAL).toBe(fixture.env.GIT_CONFIG_GLOBAL);
  });
});

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

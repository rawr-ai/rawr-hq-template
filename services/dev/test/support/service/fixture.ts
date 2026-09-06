import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { type CreateClientOptions, createClient } from "../../../src/client";

export type NativeCall = { command: string; args: readonly string[]; cwd: string | undefined };
export type GraphiteProtocol = { state: unknown; submitExit?: number; mergeExit?: number };

/** Owns real temporary Git state and native child scopes; optional Graphite data is only a unit protocol fixture. */
export async function createFixture(graphite?: GraphiteProtocol) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "habitat-dev-service-")));
  const nodeExecutable = execFileSync("node", ["--print", "process.execPath"], {
    encoding: "utf8",
  }).trim();
  const repositoryPath = join(root, "repository space");
  const home = join(root, "home");
  await mkdir(repositoryPath);
  await mkdir(home);
  const env = {
    PATH:
      process.platform === "win32"
        ? String(process.env.PATH)
        : ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(delimiter),
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: home,
    XDG_DATA_HOME: home,
    GIT_CONFIG_GLOBAL: join(home, "gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ALLOW_PROTOCOL: "file",
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    NO_COLOR: "1",
    TERM: "dumb",
  };
  await writeFile(env.GIT_CONFIG_GLOBAL, "");
  const git = (args: readonly string[], cwd = repositoryPath): string =>
    execFileSync("git", [...args], { cwd, env, encoding: "utf8", timeout: 10_000 });
  git(["init", "--initial-branch=trunk"]);
  git(["config", "commit.gpgsign", "false"]);
  await writeFile(join(repositoryPath, "file.txt"), "base\n");
  git(["add", "."]);
  git(["commit", "-m", "initial"]);
  const native = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const context = yield* Layer.build(NodeServices.layer);
        return {
          filesystem: {
            fileSystem: Context.get(context, FileSystem.FileSystem),
            path: Context.get(context, Path.Path),
          },
          childProcess: Context.get(context, ChildProcessSpawner.ChildProcessSpawner),
        };
      })
    )
  );
  const calls: NativeCall[] = [];
  const options: CreateClientOptions = {
    deps: {
      filesystem: native.filesystem,
      childProcess: {
        ...native.childProcess,
        spawn(command) {
          if (!ChildProcess.isStandardCommand(command))
            throw new Error("Fixture expects one native command.");
          calls.push({ command: command.command, args: command.args, cwd: command.options.cwd });
          const scoped = {
            ...command.options,
            extendEnv: false,
            env: { ...env, ...command.options.env },
          };
          if (command.command === "gt" && graphite !== undefined) {
            const operation = command.args[0];
            const output =
              operation === "state"
                ? JSON.stringify(graphite.state)
                : operation === "submit"
                  ? "Submitted native protocol fixture\n"
                  : "Merge job started\n";
            const code =
              operation === "submit"
                ? (graphite.submitExit ?? 0)
                : operation === "merge"
                  ? (graphite.mergeExit ?? 0)
                  : 0;
            return native.childProcess.spawn(
              ChildProcess.make(
                nodeExecutable,
                [
                  "-e",
                  "process.stdout.write(process.argv[1]); process.stderr.write(process.argv[3]); process.exitCode=Number(process.argv[2]);",
                  output,
                  String(code),
                  code === 0 ? "" : "protocol refusal\n",
                ],
                scoped
              )
            );
          }
          return native.childProcess.spawn(
            ChildProcess.make(command.command, command.args, scoped)
          );
        },
      },
    },
    scope: {},
    config: {},
  };
  return {
    root,
    repositoryPath,
    nodeExecutable,
    env,
    nativeChildProcess: native.childProcess,
    git,
    options,
    calls,
    client: createClient(options),
    async worktree(name: string, branch: string) {
      const path = join(root, name);
      git(["worktree", "add", "-b", branch, path, "HEAD"]);
      return git(["rev-parse", "--show-toplevel"], path).replace(/\n$/, "");
    },
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export type Fixture = Awaited<ReturnType<typeof createFixture>>;

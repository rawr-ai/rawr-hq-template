import assert from "node:assert/strict";
import { mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertAgentPluginTrace as assertInstalledTrace,
  receiveAgentPluginTelemetry as receiveInstalledTelemetry,
  runAgentPluginCommand as runInstalledCommand,
} from "./agent-plugin-telemetry-matrix.js";

type FixtureCommand = (
  command: string,
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

type MatrixInput = {
  readonly cliRoot: string;
  readonly root: string;
  readonly runFixtureCommand: FixtureCommand;
  readonly signal: AbortSignal;
};

type NativeReport = {
  kind: string;
  steps: { command: string; args: string[]; status: string }[];
  branch?: string | null;
  before?: string | null;
  after?: string | null;
  candidates?: { path: string; branch: string }[];
  removed?: string[];
  dirty?: boolean | null;
  stack?: unknown;
};

async function createFixture(input: MatrixInput) {
  input.signal.throwIfAborted();
  await mkdir(input.root, { recursive: false });
  const home = path.join(input.root, "home");
  const temporary = path.join(input.root, "tmp");
  await mkdir(home);
  await mkdir(temporary);
  const globalConfig = path.join(home, "gitconfig");
  await writeFile(globalConfig, "");
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
    PSModulePath: process.env.PSModulePath,
    WINDIR: process.env.WINDIR,
    SHELL: process.env.SHELL,
    HOME: home,
    USERPROFILE: home,
    APPDATA: path.join(home, "config"),
    LOCALAPPDATA: path.join(home, "cache"),
    XDG_CONFIG_HOME: path.join(home, "config"),
    XDG_CACHE_HOME: path.join(home, "cache"),
    XDG_DATA_HOME: path.join(home, "data"),
    TMPDIR: temporary,
    TEMP: temporary,
    TMP: temporary,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_AUTHOR_NAME: "Habitat Native Acceptance",
    GIT_AUTHOR_EMAIL: "native-acceptance@example.invalid",
    GIT_COMMITTER_NAME: "Habitat Native Acceptance",
    GIT_COMMITTER_EMAIL: "native-acceptance@example.invalid",
    GIT_TERMINAL_PROMPT: "0",
    NO_COLOR: "1",
    NODE_ENV: "production",
  };
  const native = async (command: string, args: readonly string[], cwd = input.root) => {
    input.signal.throwIfAborted();
    const result = await input.runFixtureCommand(command, args, { cwd, env });
    assert.equal(result.exitCode, 0, result.stderr || result.stdout);
    return result.stdout.trimEnd();
  };
  const git = (args: readonly string[], cwd = input.root) => native("git", args, cwd);
  const repo = path.join(input.root, "repository with spaces");
  await git(["init", "--initial-branch=main", repo]);
  await writeFile(path.join(repo, "content.txt"), "initial\n");
  await git(["add", "content.txt"], repo);
  await git(["commit", "--message", "Initial fixture"], repo);
  return { repo, env, native, git };
}

async function withCommands<A>(
  input: MatrixInput,
  env: NodeJS.ProcessEnv,
  body: (
    command: (
      family: "repo" | "stack" | "worktree",
      name: string,
      args: readonly string[],
      expected: { kind: string; exitCode: number },
      procedure: string
    ) => Promise<NativeReport>
  ) => Promise<A>
) {
  const receiver = await receiveInstalledTelemetry();
  const instances = new Set<string>();
  let invocations = 0;
  try {
    const result = await body(async (family, name, args, expected, procedure) => {
      input.signal.throwIfAborted();
      receiver.requests.length = 0;
      const commandArgs = ["dev", family, name, ...args, "--json"];
      const outcome = await runInstalledCommand({
        cliRoot: input.cliRoot,
        cwd: input.root,
        args: commandArgs,
        env: { ...env, HABITAT_TELEMETRY: receiver.configuration },
        signal: input.signal,
      }).catch((cause: unknown) => {
        throw new Error(
          `Installed developer command ${invocations + 1} (${commandArgs.join(" ")}) failed after ${receiver.requests.length} OTLP requests.`,
          { cause }
        );
      });
      assert.equal(outcome.code, expected.exitCode, outcome.stderr || outcome.stdout);
      assert.equal(outcome.stderr, "");
      const envelope: { operation: string; result: NativeReport } = JSON.parse(outcome.stdout);
      assert.equal(envelope.operation, procedure);
      assert.equal(envelope.result.kind, expected.kind, outcome.stdout);
      instances.add(
        assertInstalledTrace({
          requests: receiver.requests,
          commandId: `dev:${family}:${name}`,
          procedure,
        })
      );
      invocations += 1;
      return envelope.result;
    });
    assert.deepEqual(receiver.errors, []);
    assert.equal(instances.size, invocations);
    return { result, invocations, processInstances: instances.size };
  } finally {
    await receiver.close();
  }
}

/** Real local remote updates discriminate planning, refusal and native ff-only behavior. */
export async function verifyDevRepository(input: MatrixInput) {
  const fixture = await createFixture(input);
  const remote = path.join(input.root, "remote.git");
  const consumer = path.join(input.root, "consumer with spaces");
  await fixture.git(["init", "--bare", "--initial-branch=main", remote]);
  await fixture.git(["remote", "add", "origin", remote], fixture.repo);
  await fixture.git(["push", "--set-upstream", "origin", "main"], fixture.repo);
  await fixture.git(["clone", remote, consumer]);
  const initial = await fixture.git(["rev-parse", "HEAD"], consumer);
  await writeFile(path.join(fixture.repo, "content.txt"), "updated\n");
  await fixture.git(["commit", "--all", "--message", "Upstream update"], fixture.repo);
  await fixture.git(["push", "origin", "main"], fixture.repo);
  const upstream = await fixture.git(["rev-parse", "HEAD"], fixture.repo);
  const base = ["--repository", consumer];
  // A Git hook's inherited repository variables must not redirect the explicit consumer.
  const invocationEnv = {
    ...fixture.env,
    GIT_DIR: path.join(fixture.repo, ".git"),
    GIT_WORK_TREE: fixture.repo,
    GIT_INDEX_FILE: path.join(fixture.repo, ".git", "index"),
  };
  return withCommands(input, invocationEnv, async (command) => {
    const call = (args: readonly string[], kind: string, exitCode = 0) =>
      command("repo", "sync-upstream", [...base, ...args], { kind, exitCode }, "repo.syncUpstream");
    const plan = await call([], "Planned");
    assert.equal(plan.branch, "main");
    assert.equal(plan.before, initial);
    assert.equal(await fixture.git(["rev-parse", "HEAD"], consumer), initial);
    await call(["--apply", "--dry-run"], "Planned");
    const refused = await call(
      ["--apply", "--scratch-file", "missing.md", "--scratch-mode", "block"],
      "Refused",
      1
    );
    assert.equal(
      refused.steps.some((step) => step.args[0] === "pull" && step.status === "succeeded"),
      false
    );
    assert.equal(await fixture.git(["rev-parse", "HEAD"], consumer), initial);
    const updated = await call(["--apply"], "Updated");
    assert.equal(updated.before, initial);
    assert.equal(updated.after, upstream);
    assert.equal(await readFile(path.join(consumer, "content.txt"), "utf8"), "updated\n");
    const repeated = await call(["--apply"], "Updated");
    assert.equal(repeated.before, upstream);
    assert.equal(repeated.after, upstream);

    await writeFile(path.join(consumer, "untracked.txt"), "must not be absorbed\n");
    await call(["--apply"], "Refused", 1);
    assert.equal(await fixture.git(["rev-parse", "HEAD"], consumer), upstream);
    await rm(path.join(consumer, "untracked.txt"));
    await writeFile(path.join(consumer, "local.txt"), "local divergence\n");
    await fixture.git(["add", "local.txt"], consumer);
    await fixture.git(["commit", "--message", "Local divergence"], consumer);
    const localHead = await fixture.git(["rev-parse", "HEAD"], consumer);
    await writeFile(path.join(fixture.repo, "remote.txt"), "remote divergence\n");
    await fixture.git(["add", "remote.txt"], fixture.repo);
    await fixture.git(["commit", "--message", "Remote divergence"], fixture.repo);
    await fixture.git(["push", "origin", "main"], fixture.repo);
    const failed = await call(["--apply"], "Failed", 1);
    const pulls = failed.steps.filter((step) => step.args[0] === "pull");
    assert.equal(pulls.length, 1);
    assert.equal(pulls[0]?.status, "failed");
    assert.equal(await fixture.git(["rev-parse", "HEAD"], consumer), localHead);
    assert.equal(await readFile(path.join(consumer, "local.txt"), "utf8"), "local divergence\n");
  });
}

/** Native worktree refusal must preserve both the failed path and the unattempted suffix. */
export async function verifyDevWorktrees(input: MatrixInput) {
  const fixture = await createFixture(input);
  const roots = Object.fromEntries(
    ["a-remove", "b-dirty", "c-remain", "detached", "locked", "pinned", "unmerged"].map((name) => [
      name,
      path.join(input.root, `wt-${name} with spaces`),
    ])
  );
  for (const name of Object.keys(roots)) {
    const args =
      name === "detached"
        ? ["worktree", "add", "--detach", roots[name]!, "main"]
        : ["worktree", "add", "-b", `feature.${name}`, roots[name]!, "main"];
    await fixture.git(args, fixture.repo);
  }
  await fixture.git(["worktree", "lock", roots.locked!], fixture.repo);
  await writeFile(path.join(roots["b-dirty"]!, "untracked.txt"), "keep\n");
  await writeFile(path.join(roots.unmerged!, "unique.txt"), "unmerged work\n");
  await fixture.git(["add", "unique.txt"], roots.unmerged);
  await fixture.git(["commit", "--message", "Unmerged branch"], roots.unmerged);
  const unmergedHead = await fixture.git(["rev-parse", "HEAD"], roots.unmerged);
  const base = [
    "--repository",
    fixture.repo,
    "--prefix",
    "wt-",
    "--trunk",
    "main",
    "--pin-branch",
    "feature.pinned",
  ];
  return withCommands(input, fixture.env, async (command) => {
    const call = (args: readonly string[], kind: string, exitCode = 0) =>
      command("worktree", "cleanup", [...base, ...args], { kind, exitCode }, "worktree.cleanup");
    const plan = await call([], "Planned");
    assert.ok(plan.candidates);
    assert.deepEqual(
      plan.candidates.map((candidate) => path.normalize(candidate.path)),
      [roots["a-remove"], roots["b-dirty"], roots["c-remain"]]
    );
    assert.deepEqual(plan.removed, []);
    await call(["--apply", "--dry-run"], "Planned");
    await call(
      ["--apply", "--scratch-file", "missing.md", "--scratch-mode", "block"],
      "Refused",
      1
    );
    for (const candidate of plan.candidates)
      assert.equal((await stat(candidate.path)).isDirectory(), true);
    const failed = await call(["--apply"], "Failed", 1);
    assert.deepEqual(
      failed.removed?.map((entry) => path.normalize(entry)),
      [roots["a-remove"]]
    );
    assert.equal((await stat(roots["b-dirty"]!)).isDirectory(), true);
    assert.equal((await stat(roots["c-remain"]!)).isDirectory(), true);
    assert.equal(await readFile(path.join(roots["b-dirty"]!, "untracked.txt"), "utf8"), "keep\n");
    const removals = failed.steps.filter(
      (step) => step.args[0] === "worktree" && step.args[1] === "remove"
    );
    assert.equal(removals.length, 3);
    assert.equal(removals[0]?.status, "succeeded");
    assert.equal(removals[1]?.status, "failed");
    assert.equal(removals[2]?.status, "skipped");
    const pins = ["--pin-path", roots["b-dirty"]!];
    const applied = await call(["--apply", ...pins], "Applied");
    assert.deepEqual(
      applied.removed?.map((entry) => path.normalize(entry)),
      [roots["c-remain"]]
    );
    const repeated = await call(["--apply", ...pins], "Applied");
    assert.deepEqual(repeated.removed, []);
    assert.equal(
      repeated.steps.some((step) => step.args[0] === "worktree" && step.args[1] === "remove"),
      false
    );
    const unmerged = await call(["--apply", ...pins, "--no-merged-only"], "Applied");
    assert.deepEqual(
      unmerged.removed?.map((entry) => path.normalize(entry)),
      [roots.unmerged]
    );
    assert.equal(
      await fixture.git(["rev-parse", "refs/heads/feature.unmerged"], fixture.repo),
      unmergedHead
    );
    for (const name of ["detached", "locked", "pinned", "b-dirty"]) {
      assert.equal((await stat(roots[name]!)).isDirectory(), true);
    }
  });
}

/** Local native Graphite proof is read-only or refused; it never impersonates a remote merge. */
export async function verifyDevStack(input: MatrixInput & { readonly graphiteBinary: string }) {
  assert.equal(path.isAbsolute(input.graphiteBinary), true);
  assert.equal((await stat(input.graphiteBinary)).isFile(), true);
  const fixture = await createFixture(input);
  const bin = path.join(input.root, "bin");
  await mkdir(bin);
  await symlink(input.graphiteBinary, path.join(bin, "gt"));
  fixture.env.PATH = `${bin}${path.delimiter}${fixture.env.PATH ?? ""}`;
  await fixture.native("gt", ["init", "--trunk", "main", "--no-interactive"], fixture.repo);
  await fixture.native("gt", ["create", "feature.with.dots", "--no-interactive"], fixture.repo);
  const base = ["--repository", fixture.repo];
  return withCommands(input, fixture.env, async (command) => {
    const doctor = await command(
      "stack",
      "doctor",
      base,
      { kind: "Healthy", exitCode: 0 },
      "stack.doctor"
    );
    assert.equal(doctor.branch, "feature.with.dots");
    assert.equal(doctor.dirty, false);
    assert.deepEqual(doctor.stack, {
      trunk: "main",
      branches: [{ branch: "feature.with.dots", parent: "main", needsRestack: false }],
    });
    const planned = await command(
      "stack",
      "drain",
      base,
      { kind: "Planned", exitCode: 0 },
      "stack.drain"
    );
    const plannedMutations = planned.steps.filter((step) => step.status === "planned");
    assert.deepEqual(
      plannedMutations.map((step) => [step.command, ...step.args]),
      [
        ["gt", "submit", "--publish", "--no-stack", "--no-ai", "--no-edit", "--no-interactive"],
        ["gt", "merge", "--no-interactive"],
      ]
    );
    assert.equal(
      planned.steps.some((step) => step.args[0] === "sync"),
      false
    );
    await writeFile(path.join(fixture.repo, "untracked.txt"), "preserve dirty work\n");
    const refused = await command(
      "stack",
      "drain",
      [...base, "--apply"],
      { kind: "Refused", exitCode: 1 },
      "stack.drain"
    );
    assert.equal(
      refused.steps.some(
        (step) =>
          ["submit", "merge", "sync"].includes(step.args[0] ?? "") && step.status === "succeeded"
      ),
      false
    );
    await command("stack", "doctor", base, { kind: "NeedsAttention", exitCode: 1 }, "stack.doctor");
    await command(
      "stack",
      "doctor",
      [...base, "--no-fail"],
      { kind: "NeedsAttention", exitCode: 0 },
      "stack.doctor"
    );
  });
}

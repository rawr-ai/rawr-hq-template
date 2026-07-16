import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeNativeManagerInvocation } from "../../src/lib/external-extensions/native-manager-protocol";
import { GUARDED_NATIVE_MANAGER_CONTRACT } from "../../src/lib/external-extensions/native-mutation";
import {
  NATIVE_IMPORT_SANDBOX_RELATIVE_PATH,
  NATIVE_MANAGER_ENTRY_RELATIVE_PATH,
  NativePluginSubprocessPort,
  NodeNativeSubprocessRunner,
  type NativeSubprocessInput,
  type NativeSubprocessRunner,
} from "../../src/lib/external-extensions/native-subprocess";
import { removeFixtureRoots, tempRoot } from "./fixtures";

afterEach(removeFixtureRoots);

describe("native plugin manager subprocess", () => {
  it("uses the selected Bun, closed entrypoints, scrubbed environment, and temporary home", async () => {
    const fixture = managerFixture();
    const runner = new RecordingRunner();
    const subject = new NativePluginSubprocessPort(fixture.context, fixture.nativeDataDir, {
      runner,
      temporaryParent: fixture.temporaryParent,
    });

    await subject.dispatch({
      commandExport: "plugins:uninstall",
      argv: ["@fixture/external"],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    });

    const launched = runner.input;
    expect(launched).toBeDefined();
    if (!launched) return;
    expect(launched.executable).toBe(fixture.context.runtimePath);
    expect(launched.cwd).toBe(fixture.context.releaseRoot);
    expect(launched.args).toEqual([
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
      `--preload=${path.join(fixture.context.cliMemberRoot, NATIVE_IMPORT_SANDBOX_RELATIVE_PATH)}`,
      path.join(fixture.context.cliMemberRoot, NATIVE_MANAGER_ENTRY_RELATIVE_PATH),
    ]);
    expect(launched.env).toMatchObject({
      HOME: expect.stringContaining("rawr-native-manager-"),
      XDG_CONFIG_HOME: expect.stringContaining("rawr-native-manager-"),
      RAWR_DATA_DIR: fixture.nativeDataDir,
      RAWR_CONTROLLER_RELEASE_ROOT: fixture.context.releaseRoot,
      RAWR_NATIVE_MANAGER_SANDBOX: "1",
      npm_config_ignore_scripts: "true",
    });
    for (const key of ["BUN_OPTIONS", "BUN_CONFIG", "BUN_PRELOAD", "NODE_OPTIONS", "NODE_PATH"]) {
      expect(launched.env).not.toHaveProperty(key);
    }
    expect(runner.nodeShimObserved).toBe(true);
    expect(existsSync(launched.env.HOME!)).toBe(false);
    expect(readdirSync(fixture.temporaryParent)).toEqual([]);

    const invocation = decodeNativeManagerInvocation(launched.stdin);
    expect(invocation).toMatchObject({
      cliRoot: fixture.context.cliRoot,
      nativeDataDir: fixture.nativeDataDir,
      request: {
        commandExport: "plugins:uninstall",
        contract: { userPlugins: false, packageScripts: false, externalHooks: false },
      },
    });
  });

  it("removes the temporary manager state after a child failure", async () => {
    const fixture = managerFixture();
    const runner = new RecordingRunner(new Error("child failed"));
    const subject = new NativePluginSubprocessPort(fixture.context, fixture.nativeDataDir, {
      runner,
      temporaryParent: fixture.temporaryParent,
    });

    await expect(subject.dispatch({
      commandExport: "plugins:update",
      argv: [],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    })).rejects.toThrow("child failed");

    expect(readdirSync(fixture.temporaryParent)).toEqual([]);
  });

  it("removes only its canonical temporary child across repeated dispatch", async () => {
    const fixture = managerFixture();
    const runner = new RecordingRunner();
    const subject = new NativePluginSubprocessPort(fixture.context, fixture.nativeDataDir, {
      runner,
      temporaryParent: fixture.temporaryParent,
    });
    const request = {
      commandExport: "plugins:update" as const,
      argv: [],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    };

    await subject.dispatch(request);
    expect(readdirSync(fixture.temporaryParent)).toEqual([]);
    await subject.dispatch(request);

    expect(runner.calls).toBe(2);
    expect(readdirSync(fixture.temporaryParent)).toEqual([]);
  });

  it("refuses recursive cleanup after its temporary child becomes an alias", async () => {
    const fixture = managerFixture();
    const outsideRoot = tempRoot("manager-cleanup-outside");
    const marker = path.join(outsideRoot, "keep");
    writeFileSync(marker, "outside state\n");
    const runner: NativeSubprocessRunner = {
      async run(input) {
        const temporaryRoot = path.dirname(input.env.HOME!);
        renameSync(temporaryRoot, `${temporaryRoot}.gone`);
        symlinkSync(outsideRoot, temporaryRoot);
      },
    };
    const subject = new NativePluginSubprocessPort(fixture.context, fixture.nativeDataDir, {
      runner,
      temporaryParent: fixture.temporaryParent,
    });

    const result = await subject.dispatch({
      commandExport: "plugins:update",
      argv: [],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
    });

    expect(result).toEqual({
      cleanup: {
        owner: "native-manager-temporary",
        status: "failed",
        error: expect.stringContaining("refusing aliased native-manager temporary root"),
      },
    });
    expect(readFileSync(marker, "utf8")).toBe("outside state\n");
  });

  it("does not forward private manager stdout into the public command response", async () => {
    const publicWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await new NodeNativeSubprocessRunner().run({
        executable: process.execPath,
        args: ["-e", "process.stdout.write('native manager noise')"],
        cwd: process.cwd(),
        env: {},
        stdin: "",
      });
      expect(publicWrite).not.toHaveBeenCalled();
    } finally {
      publicWrite.mockRestore();
    }
  });

  it("waits for inherited subprocess pipes to close before reporting completion", async () => {
    const sentinel = path.join(tempRoot("native-runner-close"), "late-output-complete");
    const source = [
      'const { spawn } = require("node:child_process");',
      `const child = spawn(process.execPath, ["-e", ${JSON.stringify(
        `setTimeout(() => { require("node:fs").writeFileSync(${JSON.stringify(sentinel)}, "done"); process.stdout.write("late"); }, 30);`,
      )}], { stdio: ["ignore", "inherit", "inherit"] });`,
      "child.unref();",
    ].join("\n");

    await new NodeNativeSubprocessRunner().run({
      executable: process.execPath,
      args: ["-e", source],
      cwd: process.cwd(),
      env: {},
      stdin: "",
    });

    expect(existsSync(sentinel)).toBe(true);
  });
});

class RecordingRunner implements NativeSubprocessRunner {
  input: NativeSubprocessInput | undefined;
  nodeShimObserved = false;
  calls = 0;

  constructor(private readonly failure?: Error) {}

  async run(input: NativeSubprocessInput): Promise<void> {
    this.calls += 1;
    this.input = input;
    const bin = input.env.PATH?.split(path.delimiter)[0];
    this.nodeShimObserved = bin !== undefined && existsSync(path.join(bin, process.platform === "win32" ? "node.exe" : "node"));
    if (this.failure) throw this.failure;
  }
}

function managerFixture() {
  const dataRoot = realpathSync(tempRoot("manager-data-root"));
  const releaseRoot = path.join(dataRoot, "controller", "releases", "a".repeat(64));
  const cliRoot = path.join(releaseRoot, "app");
  const cliMemberRoot = path.join(cliRoot, "node_modules", "@rawr", "cli");
  const runtimePath = path.join(releaseRoot, "runtime", "bun");
  mkdirSync(path.dirname(runtimePath), { recursive: true });
  mkdirSync(path.join(cliMemberRoot, "dist", "lib", "external-extensions"), { recursive: true });
  writeFileSync(runtimePath, "runtime");
  writeFileSync(path.join(cliMemberRoot, NATIVE_MANAGER_ENTRY_RELATIVE_PATH), "entry");
  writeFileSync(path.join(cliMemberRoot, NATIVE_IMPORT_SANDBOX_RELATIVE_PATH), "sandbox");
  const nativeDataDir = path.join(tempRoot("manager-native"), "data");
  const temporaryParent = tempRoot("manager-temporary");
  return {
    context: {
      cliRoot,
      cliMemberRoot,
      dataRoot,
      digest: "a".repeat(64),
      releaseRoot,
      runtimePath,
    },
    nativeDataDir,
    temporaryParent,
  };
}

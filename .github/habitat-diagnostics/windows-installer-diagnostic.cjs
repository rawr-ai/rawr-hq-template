const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const { createRequire } = require("node:module");
const { tmpdir } = require("node:os");
const path = require("node:path");

// Run from a built producer checkout after the ordinary CLI manifest target.
const repo = process.cwd();
const requireRepo = createRequire(path.join(repo, "apps/habitat/package.json"));
const { spawn } = requireRepo("cross-spawn");
const { runServer } = requireRepo("verdaccio");
const publicRegistry = "https://registry.npmjs.org";
const candidate = "0.7.0-rc.2";
const pair = ["cli", "sdk"];
const bundle = (kind) => `habitat-ai-${kind}-${candidate}.tgz`;
const homePath = process.env.PATH ?? "";
const clean = { ...process.env };
for (const key of Object.keys(clean)) {
  if (
    /^(?:npm_config_(?:userconfig|registry)|bun_config_(?:token|registry)|bun_install_verbose|force_color|nx_dry_run|nx_migrate_use_local|nx_use_local|verdaccio_public_url)$/i.test(
      key
    )
  ) {
    delete clean[key];
  }
}
Object.assign(clean, {
  PATH: homePath,
  CI: "1",
  NO_COLOR: "1",
  NX_DAEMON: "false",
  NX_ISOLATE_PLUGINS: "false",
});
const report = (value) => console.log(JSON.stringify(value));
const json = (file) => fs.readFile(file, "utf8").then(JSON.parse);
const has = (file) =>
  fs.stat(file).then(
    () => true,
    () => false
  );
const writeJson = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + "\n");
const deadlineMs = 120000;
const maximumCount = 99999;
const bump = (table, key) => {
  table[key] = Math.min(maximumCount, (table[key] ?? 0) + 1);
};
let activity;

function observe(req, res) {
  const counters = activity;
  if (!counters) return;
  const verb =
    req.method === "GET" || req.method === "HEAD" || req.method === "PUT" ? req.method : "other";
  const requestPath = (req.url ?? "").split("?")[0].replace(/%2f/gi, "/");
  const match = /^\/@habitat-ai\/(cli|sdk)(?:\/|$)/i.exec(requestPath);
  const packageKind = match ? match[1].toLowerCase() : "other";
  const kind =
    packageKind === "other" ? "other" : requestPath.includes("/-/") ? "tarball" : "metadata";
  const category = `${verb}:${packageKind}:${kind}`;
  bump(counters.requests, category);
  let finished = false;
  res.once("finish", () => {
    finished = true;
    bump(counters.responses, `${category}:${Math.trunc(res.statusCode / 100)}xx`);
  });
  res.once("close", () => {
    if (!finished) bump(counters.aborted, category);
  });
}

function run(stage, executable, args, cwd, env, options = {}) {
  const counters = { requests: {}, responses: {}, aborted: {}, child: {}, bytes: 0 };
  activity = counters;
  const t0 = performance.now();
  const ready = () => ({ stage, elapsedMs: Math.round(performance.now() - t0), ...counters });
  report({ stage, state: "started" });
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let capture = "";
    let timedOut = false;
    let spawnFailed = false;
    let killFailed = false;
    const lines = new Map();
    function classify(input) {
      options.onLine?.(input);
      if (/\b(?:GET|HEAD)\b/.test(input)) {
        const target = /127\.0\.0\.1:\d+/.test(input)
          ? "loopback"
          : /registry\.npmjs\.org/.test(input)
            ? "public"
            : "other";
        bump(counters.child, `request:${target}`);
      }
      if (/\b(?:extract|extracting|extracted|tarball)\b/i.test(input))
        bump(counters.child, "extract");
      if (/\b(?:link|linking|hardlink|junction|symlink|copyfile|rename)\b/i.test(input))
        bump(counters.child, "filesystem");
      if (/\b(?:resolving|resolved)\b/i.test(input)) bump(counters.child, "resolve");
      if (/\b(?:retry|retrying|timed out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND)\b/i.test(input))
        bump(counters.child, "retry-or-network");
      if (/\b(?:EACCES|EPERM|EBUSY|EXDEV|ENAMETOOLONG|EEXIST|ENOSPC)\b/.test(input))
        bump(counters.child, "filesystem-error");
      if (/\b(?:failed to install the [0-9.]+ version of the migration script)\b/i.test(input))
        bump(counters.child, "nx-bootstrap-fallback");
    }
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding("utf8").on("data", (chunk) => {
        counters.bytes = Math.min(100000000, counters.bytes + Buffer.byteLength(chunk));
        if (options.capture && stream === child.stdout && capture.length < 200000)
          capture += chunk.slice(0, 200000 - capture.length);
        const framed = ((lines.get(stream) ?? "") + chunk).split(/[\r\n]+/u);
        lines.set(stream, (framed.pop() ?? "").slice(-2048));
        for (const line of framed) classify(line.slice(0, 2048));
      });
    }
    child.once("spawn", () => options.onSpawn?.(child.pid));
    child.once("error", () => {
      spawnFailed = true;
    });
    const periodic = setInterval(() => report({ ...ready(), state: "running" }), 10000);
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid === undefined) return;
      try {
        if (process.platform === "win32") {
          execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            stdio: "pipe",
            windowsHide: true,
            timeout: 5000,
          });
        } else process.kill(-child.pid, "SIGKILL");
      } catch {
        killFailed = true;
      }
    }, options.timeoutMs ?? deadlineMs);
    child.once("exit", () => report({ ...ready(), state: "exited" }));
    child.once("close", (exitCode) => {
      clearInterval(periodic);
      clearTimeout(timer);
      for (const line of lines.values()) classify(line);
      activity = undefined;
      const result = { ...ready(), state: "closed", exitCode, timedOut, spawnFailed, killFailed };
      report(result);
      resolve({ ...result, capture, ok: exitCode === 0 && !timedOut && !spawnFailed });
    });
  });
}

async function must(stage, executable, args, cwd, env, options) {
  const result = await run(stage, executable, args, cwd, env, options);
  assert(result.ok, `Required setup stage failed: ${stage}`);
  return result;
}

async function main() {
  assert.equal(process.platform, "win32", "Use a native Windows runner");
  const mode = process.argv[2];
  assert(["migration", "preset"].includes(mode), "Expected migration or preset");
  const root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), "habitat-install-probe-")));
  let registry;
  try {
    const dirs = Object.fromEntries(
      ["archives", "config", "public-config", "cache", "home", "tmp"].map((key) => [
        key,
        path.join(root, key),
      ])
    );
    for (const dir of Object.values(dirs)) await fs.mkdir(dir);
    const common = { ...clean, HOME: dirs.home, TMPDIR: dirs.tmp, XDG_CACHE_HOME: dirs.cache };
    // Same precedence as the suite: Bun uses XDG_CONFIG_HOME; npm uses NPM_CONFIG_USERCONFIG.
    const receiptEnv = { ...common };
    for (const [command, expected] of [
      ["bun", "1.3.14"],
      ["npm", "12.0.2"],
    ]) {
      const result = await must(`${command}-version`, command, ["--version"], root, receiptEnv, {
        capture: true,
        timeoutMs: 30000,
      });
      assert.equal(result.capture.trim(), expected, `${command} version mismatch`);
      report({ tool: command, version: expected });
    }
    assert(
      await has(path.join(repo, "apps/habitat/oclif.manifest.json")),
      "Run the normal CLI manifest build first"
    );
    for (const [kind, folder] of [
      ["cli", "apps/habitat"],
      ["sdk", "packages/core/sdk"],
    ]) {
      const product = path.join(repo, folder);
      const manifest = await json(path.join(product, "package.json"));
      assert.equal(manifest.version, candidate, "Wrong package version");
      assert(!manifest.publishConfig?.registry, "Do not seed a package with a registry override");
      await must(
        `pack-${kind}`,
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", dirs.archives],
        product,
        common
      );
      const bytes = await fs.readFile(path.join(dirs.archives, bundle(kind)));
      report({
        artifact: kind,
        version: candidate,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      });
    }
    registry = await runServer(
      {
        configPath: path.join(root, "registry.config.yml"),
        storage: path.join(root, "registry"),
        uplinks: {},
        packages: { "@habitat-ai/*": { access: "$all", publish: "$all", unpublish: "$all" } },
        log: { format: "pretty", level: "fatal", type: "stdout" },
        publish: { allow_offline: true },
      },
      { listenArg: "http://127.0.0.1:0" }
    );
    registry.prependListener("request", observe);
    await new Promise((resolve, reject) => {
      registry.once("error", reject);
      registry.listen(0, "127.0.0.1", resolve);
    });
    const { address, port } = registry.address();
    assert.equal(address, "127.0.0.1");
    const loopback = `http://127.0.0.1:${port}`;
    const scopeConfig = `registry=${publicRegistry}/\n@habitat-ai:registry=${loopback}/\n//127.0.0.1:${port}/:_authToken=habitat-acceptance\n`;
    await fs.writeFile(path.join(dirs.config, ".npmrc"), scopeConfig);
    await fs.writeFile(path.join(dirs["public-config"], ".npmrc"), `registry=${publicRegistry}/\n`);
    const envFor = (directory, cache) => ({
      ...common,
      XDG_CONFIG_HOME: directory,
      NPM_CONFIG_USERCONFIG: path.join(directory, ".npmrc"),
      BUN_INSTALL_CACHE_DIR: path.join(dirs.cache, cache),
      BUN_INSTALL_VERBOSE: "1",
    });
    const scoped = envFor(dirs.config, "bun");
    const publicEnv = envFor(dirs["public-config"], "bun-public");
    report({
      routing: {
        habitat: "loopback",
        others: "public",
        proxyPresent: !!(
          clean.HTTP_PROXY ||
          clean.HTTPS_PROXY ||
          clean.http_proxy ||
          clean.https_proxy
        ),
        noProxyPresent: !!(clean.NO_PROXY || clean.no_proxy),
        fixtureAndCacheSameVolume: path.parse(root).root === path.parse(dirs.cache).root,
        fixtureAndAmbientTempSameVolume: path.parse(root).root === path.parse(tmpdir()).root,
      },
    });
    for (const kind of ["sdk", "cli"]) {
      await must(
        `seed-loopback-${kind}`,
        "npm",
        [
          "publish",
          path.join(dirs.archives, bundle(kind)),
          "--access",
          "public",
          "--tag",
          "latest",
          "--ignore-scripts",
          `--registry=${loopback}`,
        ],
        root,
        { ...scoped, NPM_CONFIG_REGISTRY: loopback }
      );
    }
    if (mode === "preset") {
      const result = await require("./windows-preset-observer.cjs")({
        root,
        scoped,
        candidate,
        run,
        report,
      });
      if (!result.ok) process.exitCode = 2;
      return;
    }
    const fixture = path.join(root, "migration-consumer-0-5-6");
    await fs.mkdir(fixture);
    const baseline = {
      name: "habitat-migration-consumer",
      private: true,
      type: "module",
      packageManager: "bun@1.3.14",
      devDependencies: {
        "@habitat-ai/cli": "0.5.6",
        "@habitat-ai/sdk": "0.5.6",
        "@nx/workspace": "23.1.1",
        nx: "23.1.1",
      },
    };
    const nxJson = {
      plugins: ["@habitat-ai/cli/nx-plugin"],
      targetDefaults: {
        check: {
          cache: false,
          dependsOn: [
            { projects: ["habitat"], target: "lint" },
            "typecheck",
            "verify",
            "check:policy",
            "^check",
          ],
          outputs: [],
        },
      },
    };
    const packagePath = path.join(fixture, "package.json");
    const lockPath = path.join(fixture, "bun.lock");
    await writeJson(packagePath, baseline);
    await writeJson(path.join(fixture, "nx.json"), nxJson);
    await must(
      "install-previous-public",
      "bun",
      ["install", "--ignore-scripts", `--registry=${publicRegistry}`],
      fixture,
      publicEnv
    );
    const oldLock = await fs.readFile(lockPath);
    await must(
      "plan-native-migration",
      "bunx",
      ["nx", "migrate", `@habitat-ai/cli@${candidate}`, "--interactive=false"],
      fixture,
      {
        ...scoped,
        NX_MIGRATE_CLI_VERSION: "23.3.0",
        NX_SKIP_PROVENANCE_CHECK: "true",
        NX_VERBOSE_LOGGING: "true",
      }
    );
    const target = await json(packagePath);
    assert.equal(target.devDependencies["@habitat-ai/cli"], candidate);
    assert.equal(target.devDependencies["@habitat-ai/sdk"], candidate);
    assert(
      (await fs.readFile(path.join(fixture, "migrations.json"), "utf8")).includes(
        "0-5-7-repository-foundation"
      )
    );
    report({ plan: "verified-exact-pair-and-foundation" });
    async function verify(root, result) {
      if (!result.ok) return false;
      for (const kind of pair) {
        assert.equal(
          (await json(path.join(root, "node_modules", "@habitat-ai", kind, "package.json")))
            .version,
          candidate
        );
      }
      report({ stage: result.stage, installedExactPair: true });
      return true;
    }
    // This first command preserves the real old node_modules and lockfile.
    const existing = await run(
      "materialize-existing-upgrade",
      "bun",
      ["install", "--ignore-scripts"],
      fixture,
      scoped
    );
    await verify(fixture, existing);
    // Same planned manifest + old lock, without old node_modules: resolve only.
    const resolveRoot = path.join(root, "migrated-lock-resolution");
    await fs.mkdir(resolveRoot);
    await writeJson(path.join(resolveRoot, "package.json"), target);
    await fs.writeFile(path.join(resolveRoot, "bun.lock"), oldLock);
    const resolved = await run(
      "resolve-migrated-lock-only",
      "bun",
      ["install", "--lockfile-only", "--ignore-scripts"],
      resolveRoot,
      envFor(dirs.config, "bun-resolve-control")
    );
    // Seed a fresh planned workspace lock, then freeze installation in a separate fresh root.
    const fresh = path.join(root, "fresh-pair-lock");
    const frozen = path.join(root, "fresh-pair-frozen");
    for (const directory of [fresh, frozen]) {
      await fs.mkdir(directory);
      await writeJson(path.join(directory, "package.json"), target);
    }
    const freshLock = await run(
      "resolve-fresh-pair-lock-only",
      "bun",
      ["install", "--lockfile-only", "--ignore-scripts"],
      fresh,
      envFor(dirs.config, "bun-fresh-control")
    );
    let frozenOk = false;
    if (freshLock.ok) {
      await fs.copyFile(path.join(fresh, "bun.lock"), path.join(frozen, "bun.lock"));
      frozenOk = await verify(
        frozen,
        await run(
          "materialize-fresh-frozen-pair",
          "bun",
          ["install", "--frozen-lockfile", "--ignore-scripts"],
          frozen,
          envFor(dirs.config, "bun-frozen-control")
        )
      );
    }
    report({
      diagnostic: {
        existingUpgradeOk: existing.ok,
        oldLockResolutionOk: resolved.ok,
        freshLockResolutionOk: freshLock.ok,
        freshFrozenOk: frozenOk,
      },
    });
    if (!existing.ok || !resolved.ok || !freshLock.ok || !frozenOk) process.exitCode = 2;
  } finally {
    if (registry?.listening)
      await new Promise((resolve) => {
        registry.close(resolve);
        registry.closeAllConnections();
      });
    await fs.rm(root, { recursive: true, force: false });
    report({ cleanup: "owned-diagnostic-root-removed" });
  }
}

main().catch((error) => {
  report({
    diagnosticFailed: true,
    errorType: error?.name === "AssertionError" ? "assertion" : "unexpected",
  });
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [gritArg, publishedRule] = process.argv.slice(2);
if (!gritArg || !publishedRule) {
  console.error(
    "Usage: node qualify-grit-directory.mjs <pinned-native-grit> <published-service-v1-effect-bridge.md>"
  );
  process.exit(2);
}
const grit = path.resolve(gritArg);
const work = mkdtempSync(path.join(tmpdir(), "grit-directory-qualifier-"));
const project = path.join(work, "probe-service");
const catalog = path.join(work, "catalog");
const gritDir = path.join(catalog, ".grit");
const paths = {
  violation: "src/service/base.ts",
  legal: "src/service/impl.ts",
  outside: "test/outside.ts",
  ignored: "src/service/ignored.ts",
};
const content = 'import "@orpc/experimental-effect/extensions/effect";\nprobe_marker();\n';
const slash = (value) => value.split(path.sep).join("/");
const label = (value) =>
  Object.entries(paths).find(([, relative]) =>
    value.replaceAll("\\", "/").endsWith(`/probe-service/${relative}`)
  )?.[0] ?? "unexpected-path";
const spelling = (value) =>
  value.includes("\\") ? (value.includes("/") ? "mixed" : "backslash") : "slash";
const guard = (value) => /(?:^|.*\/)src\/(?:client|service\/.*)\.ts$/.test(value);
const native = (name) => path.join(project, paths[name]);
const emit = (value) => console.log(JSON.stringify(value));
const env = {
  ...process.env,
  CLICOLOR: "0",
  FORCE_COLOR: "0",
  GRIT_CACHE_DIR: path.join(catalog, "cache"),
  GRIT_DOWNLOADS_DISABLED: "true",
  GRIT_MAX_FILE_SIZE_BYTES: "0",
  GRIT_TELEMETRY_DISABLED: "true",
  GRIT_USER_CONFIG: path.join(catalog, "user-config"),
  NO_COLOR: "1",
  RAYON_NUM_THREADS: "2",
};
const invoke = (command, args, cwd) =>
  spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 2_000_000,
    windowsHide: true,
  });
const marker = "language js(typescript)\n`probe_marker()`";

function check(row, body, subjects) {
  writeFileSync(
    path.join(gritDir, "grit.yaml"),
    JSON.stringify({
      version: "0.0.2",
      patterns: [{ name: "policy", title: "policy", level: "error", body }],
    })
  );
  const child = invoke(
    grit,
    ["--json", "check", "--no-cache", "--grit-dir", gritDir, ...subjects],
    catalog
  );
  const reports = (child.stderr ?? "").split(/\r?\n/).flatMap((line) => {
    try {
      const object = JSON.parse(line);
      return Array.isArray(object?.paths) && Array.isArray(object?.results) ? [object] : [];
    } catch {
      return [];
    }
  });
  const valid = child.status === 0 && reports.length === 1 && child.stdout.trim() === "";
  const report = valid ? reports[0] : { paths: [], results: [] };
  emit({
    row,
    exit: child.status,
    valid,
    count: report.paths.length,
    subjects: report.paths
      .map((value) => ({
        label: label(value),
        spelling: spelling(value),
        serviceGuard: guard(value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    findings: report.results.map(({ path }) => label(path)).sort(),
  });
  assert.equal(valid, true);
  return report;
}

try {
  const source = readFileSync(publishedRule, "utf8");
  const match = /^\x60\x60\x60grit\r?\n([\s\S]*?)^\x60\x60\x60(?:\r?\n|$)/m.exec(source);
  assert.ok(match?.[1].includes("predicate service_v1_effect_bridge_is_production_source()"));
  const law = match[1];
  mkdirSync(gritDir, { recursive: true });
  mkdirSync(env.GRIT_CACHE_DIR);
  mkdirSync(env.GRIT_USER_CONFIG);
  for (const name of Object.keys(paths)) {
    const file = native(name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  writeFileSync(path.join(project, ".gitignore"), `/${paths.ignored}\n`);
  assert.equal(invoke("git", ["init", "--quiet"], project).status, 0);
  assert.equal(invoke("git", ["check-ignore", "--quiet", "--", paths.ignored], project).status, 0);
  assert.equal(
    invoke("git", ["check-ignore", "--quiet", "--", paths.violation], project).status,
    1
  );
  const version = invoke(grit, ["--version"], catalog);
  assert.equal(version.status === 0 && version.stdout.trim() === "grit 0.1.1", true);
  emit({ platform: process.platform, gritRelease: "0.1.0-alpha.1743007075", ignoredByGit: true });

  const bare = check("native-explicit-file-syntax-control", marker, [native("violation")]);
  const nativeDir = check("native-directory-published-law", law, [project]);
  const slashDir = check("slash-directory-published-law", law, [slash(project)]);
  const walker = check("slash-directory-syntax-control", marker, [slash(project)]);
  const expected = ["legal", "outside", "violation"];
  const explicit = check(
    "slash-explicit-file-counterfactual",
    law,
    expected.map((name) => slash(native(name)))
  );
  const refeedPaths = slashDir.paths.map((subject) => {
    assert.equal(path.isAbsolute(subject), true);
    return slash(subject);
  });
  const refeed = check("walker-refeed-feasibility-only", law, refeedPaths);
  const labels = (report) => report.paths.map(label).sort();
  const findings = (report) => report.results.map(({ path }) => label(path)).sort();
  assert.deepEqual(labels(bare), ["violation"]);
  assert.deepEqual(findings(bare), ["violation"]);
  for (const report of [nativeDir, slashDir, walker, explicit, refeed]) {
    assert.deepEqual(labels(report), expected);
  }
  assert.deepEqual(findings(walker), expected);
  assert.deepEqual(findings(explicit), ["violation"]);
  assert.deepEqual(refeed.paths.map(slash).sort(), refeedPaths.sort());
  assert.deepEqual(findings(refeed), ["violation"]);
  emit({
    nativeDirectoryWorks: JSON.stringify(findings(nativeDir)) === '["violation"]',
    slashDirectoryWorks: JSON.stringify(findings(slashDir)) === '["violation"]',
    exactWalkerRefed: true,
  });
} catch {
  emit({ probeError: "control-or-identity-assertion-failed" });
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [gritArg, repoArg = process.cwd()] = process.argv.slice(2);
if (!gritArg) {
  console.error("Usage: node qualify-grit-filename.mjs <pinned-native-grit> [repository-root]");
  process.exit(2);
}
const grit = path.resolve(gritArg);
const repo = path.resolve(repoArg);
const root = mkdtempSync(path.join(tmpdir(), "grit-filename-qualifier-"));
const cwd = path.join(root, "catalog");
const gritDir = path.join(cwd, ".grit");
const route = "services/greeting/src/service/modules/greeting/router/greet.ts";
const impl = "services/greeting/src/service/impl.ts";
const slash = (value) => value.split(path.sep).join("/");
const facade = 'import "@habitat-ai/sdk/plugins/server/effect";';
const vendor = 'import "@orpc/effect/extensions/effect";';
const clean = "probe_marker();\r\nexport const greet = () => 'hello';\r\n";
const withImport = (line) => `${line}\n${clean}`;
const fixturePath = (relative) => path.resolve(root, "consumer", relative);
const subjectPath = (relative) => path.resolve(cwd, relative.replaceAll("/", "\\"));
const frozenBody = (version) => {
  const source = readFileSync(
    path.join(repo, `.habitat/blueprints/service/versions/${version}/components/funnel/effect-bridge.md`),
    "utf8"
  );
  const match = /^\x60\x60\x60grit\r?\n([\s\S]*?)^\x60\x60\x60(?:\r?\n|$)/m.exec(source);
  if (!match) throw new Error(`immutable-rule-${version}-missing`);
  return match[1];
};
const marker = "language js(typescript)\n`probe_marker()`";
const filenameDiagnostic = { syntax: marker };
const cases = [
  ["v5-clean-route", 5, route, clean],
  ["v5-legal-impl", 5, impl, withImport(facade)],
  ["v5-misplaced-facade", 5, route, withImport(facade)],
  ["v5-current-vendor", 5, route, withImport(vendor)],
  ["v6-current-vendor", 6, route, withImport(vendor)],
  ["v3-current-vendor", 3, route, withImport(vendor)],
  ["v4-current-vendor", 4, route, withImport(vendor)],
  ["v3-misplaced-facade", 3, route, withImport(facade)],
  ["v4-misplaced-facade", 4, route, withImport(facade)],
];
const env = {
  ...process.env,
  CLICOLOR: "0",
  FORCE_COLOR: "0",
  GRIT_CACHE_DIR: path.join(cwd, "cache"),
  GRIT_DOWNLOADS_DISABLED: "true",
  GRIT_MAX_FILE_SIZE_BYTES: "0",
  GRIT_TELEMETRY_DISABLED: "true",
  GRIT_USER_CONFIG: path.join(cwd, "user-config"),
  NO_COLOR: "1",
  RAYON_NUM_THREADS: "2",
};
const emit = (value) => console.log(JSON.stringify(value));
const invoke = (args, input) => spawnSync(grit, args, {
  cwd, env, input, encoding: "utf8", timeout: 15_000, maxBuffer: 2_000_000, windowsHide: true,
});
const reportObjects = (output) => (output ?? "").split(/\r?\n/).flatMap((line) => {
  try { return [JSON.parse(line)]; } catch { return []; }
});
const installPatterns = (patterns) => writeFileSync(path.join(gritDir, "grit.yaml"), JSON.stringify({
  version: "0.0.2",
  patterns: Object.entries(patterns).map(([name, body]) => ({ name, title: name, body, level: "error" })),
}));
function check(mode, label, file, patterns) {
  installPatterns(patterns);
  const child = invoke(["--json", "check", "--no-cache", "--grit-dir", gritDir, file]);
  const reports = reportObjects(child.stderr).filter(
    (item) => Array.isArray(item?.paths) && Array.isArray(item?.results)
  );
  const valid = child.status === 0 && reports.length === 1 && child.stdout.trim() === "";
  const report = valid ? reports[0] : undefined;
  const findings = report?.results.map(({ local_name }) =>
    Object.hasOwn(patterns, local_name) ? local_name : "unexpected-pattern"
  ).sort() ?? [];
  const spelling = (subject) => /(?:^|\/)src\/service\/.*\.ts$/.test(subject) ? "slash" :
    /(?:^|\\)src\\service\\.*\.ts$/.test(subject) ? "backslash" : "other";
  const row = {
    mode, label, exit: child.status, valid, subjects: report?.paths.length ?? null, findings,
    subjectSpelling: report?.paths.map(spelling) ?? [],
  };
  emit(row);
  return row;
}
const writeSubject = (relative, content, proxy) => {
  const file = proxy ? subjectPath(relative) : fixturePath(relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

try {
  mkdirSync(gritDir, { recursive: true });
  mkdirSync(env.GRIT_CACHE_DIR);
  mkdirSync(env.GRIT_USER_CONFIG);
  const version = invoke(["--version"]);
  if (version.status !== 0 || version.stdout.trim() !== "grit 0.1.1") {
    throw new Error("pinned-grit-version-unavailable");
  }
  emit({ platform: process.platform, gritRelease: "0.1.0-alpha.1743007075" });
  const bodies = Object.fromEntries([3, 4, 5, 6].map((version) => [version, frozenBody(version)]));
  const transports = [
    ["absolute-native", (relative) => fixturePath(relative), false],
    ["absolute-slash", (relative) => slash(fixturePath(relative)), false],
    ["relative-slash", (relative) => slash(path.relative(cwd, fixturePath(relative))), false],
  ];
  if (process.platform !== "win32") transports.push(["posix-backslash-name-proxy", subjectPath, true]);
  const matrices = new Map();
  for (const [name, argument, proxy] of transports) {
    writeSubject(route, clean, proxy);
    const diagnostic = check(name, "filename-diagnostic", argument(route), filenameDiagnostic);
    const rows = cases.map(([label, version, relative, content]) => {
      writeSubject(relative, content, proxy);
      return check(name, label, argument(relative), { policy: bodies[version] });
    });
    matrices.set(name, { diagnostic, rows });
  }

  // Check does not support stdin in this release. Apply can expose a logical name;
  // this is solely a diagnostic and is not equivalent to check's public contract.
  for (const [name, file] of [["stdin-logical-slash", route], ["stdin-logical-backslash", route.replaceAll("/", "\\")]]) {
    for (const [label, input] of [["v5-clean-route", clean], ["v5-misplaced-facade", withImport(facade)]]) {
      const child = invoke(["--jsonl", "apply", bodies[5], file, "--stdin", "--dry-run", "--grit-dir", gritDir], input);
      const objects = [...reportObjects(child.stdout), ...reportObjects(child.stderr)];
      const matches = objects.filter((item) => item?.__typename === "Match").length;
      const failure = child.status === 0 ? null :
        /Language option js does not match pattern language js/.test(child.stderr ?? "")
          ? "dialect-mismatch" : "native-apply-failed";
      emit({ mode: name, label, exit: child.status, matches, failure });
    }
  }

  const native = matrices.get("absolute-native");
  const expectedMatch = (label) => ![
    "v5-clean-route", "v5-legal-impl", "v3-current-vendor", "v4-current-vendor",
  ].includes(label);
  const allAcquired = (matrix) => matrix.diagnostic.valid && matrix.diagnostic.subjects === 1 &&
    matrix.diagnostic.findings.includes("syntax") && matrix.rows.every((row) => row.valid && row.subjects === 1);
  const allDecisionsCorrect = (matrix) => allAcquired(matrix) &&
    matrix.rows.every((row) => row.findings.length === Number(expectedMatch(row.label)));
  const filenameFalseNegative = (matrix) => allAcquired(matrix) &&
    matrix.diagnostic.subjectSpelling.includes("backslash") &&
    matrix.rows.find((row) => row.label === "v5-misplaced-facade")?.findings.length === 0;
  const nativeResult = allDecisionsCorrect(native) ? "working" :
    filenameFalseNegative(native) ? "filename-false-negative" : "inconclusive";
  const proxy = matrices.get("posix-backslash-name-proxy");
  emit({
    nativeResult,
    absoluteSlashRepairs: allDecisionsCorrect(matrices.get("absolute-slash")),
    relativeSlashRepairs: allDecisionsCorrect(matrices.get("relative-slash")),
    posixProxyReproduces: proxy !== undefined ? filenameFalseNegative(proxy) : null,
  });
  if (nativeResult === "inconclusive") process.exitCode = 1;
} catch (error) {
  emit({ probeError: typeof error?.message === "string" && /^[a-z0-9-]+$/.test(error.message)
    ? error.message : "unexpected-probe-error" });
  process.exitCode = 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const grit = path.resolve(process.argv[2]);
const repo = path.resolve(process.argv[3] ?? ".");
const root = mkdtempSync(path.join(tmpdir(), "habitat-directory-count-"));
const gd = path.join(root, ".grit");
const env = {
  ...process.env,
  GRIT_CACHE_DIR: path.join(root, "cache"),
  GRIT_USER_CONFIG: path.join(root, "config"),
  GRIT_TELEMETRY_DISABLED: "true",
  GRIT_DOWNLOADS_DISABLED: "true",
  GRIT_MAX_FILE_SIZE_BYTES: "0",
  RAYON_NUM_THREADS: "2",
  CLICOLOR: "0",
  FORCE_COLOR: "0",
  NO_COLOR: "1",
};
const slash = (p) => p.split(path.sep).join("/");
const inputs = [
  [
    "repository-typescript",
    ".habitat/overlays/repository/rules/require_managed_runtime_construction_owner/pattern.md",
    ".",
  ],
  [
    "repository-json",
    ".habitat/blueprints/nx-workspace/require_package_publication_coherence/pattern.md",
    ".",
  ],
  [
    "repository-markdown",
    ".habitat/blueprints/agent-router/require_agent_router_shape/pattern.md",
    ".",
  ],
  [
    "catalog-service-v1",
    ".habitat/blueprints/service/components/funnel/effect-bridge.md",
    "services/catalog",
  ],
];
try {
  for (const dir of [gd, env.GRIT_CACHE_DIR, env.GRIT_USER_CONFIG]) mkdirSync(dir);
  for (const [label, rule, directory] of inputs) {
    const text = readFileSync(path.join(repo, rule), "utf8");
    const match = /^\x60\x60\x60grit\r?\n([\s\S]*?)^\x60\x60\x60(?:\r?\n|$)/m.exec(text);
    assert.ok(match);
    writeFileSync(
      path.join(gd, "grit.yaml"),
      JSON.stringify({
        version: "0.0.2",
        patterns: [{ name: "measure", title: "measure", level: "error", body: match[1] }],
      })
    );
    const r = spawnSync(
      grit,
      ["--json", "check", "--no-cache", "--grit-dir", gd, slash(path.resolve(repo, directory))],
      {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 36 * 1024 * 1024,
        windowsHide: true,
      }
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
    const reports = r.stderr.split(/\r?\n/).flatMap((line) => {
      try {
        const x = JSON.parse(line);
        return Array.isArray(x.paths) && Array.isArray(x.results) ? [x] : [];
      } catch {
        return [];
      }
    });
    assert.equal(reports.length, 1);
    const rel = reports[0].paths.map((f) => slash(path.relative(repo, f)));
    assert(rel.every((f) => f !== ".." && !f.startsWith("../") && !path.isAbsolute(f)));
    assert.equal(new Set(rel).size, rel.length);
    // Even the shortest drive root needs these UTF-16 characters and argument separators.
    const minimumDriveUnits = rel.reduce((s, f) => s + "C:/".length + f.length + 1, 0);
    const quotedUnits = (prefix) => rel.reduce((s, f) => s + prefix.length + f.length + 3, 0);
    console.log(
      JSON.stringify({
        label,
        exactWalkCount: rel.length,
        minimumDriveUnits,
        quotedDriveRootUnits: quotedUnits("C:/"),
        quotedHostedRootUnits: quotedUnits("D:/a/rawr-hq-template/rawr-hq-template/"),
        nativeArgWindow: 32767,
        catalogSubjectBudget: 28672,
      })
    );
  }
} catch {
  console.error("Inventory measurement did not complete.");
  process.exitCode = 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}

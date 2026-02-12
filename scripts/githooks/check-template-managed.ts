#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import path from "node:path";

type GuardMode = "off" | "warn" | "block";
type RepoRole = "template" | "personal" | "unknown";

const VALID_MODES = new Set<GuardMode>(["off", "warn", "block"]);

function runGit(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function normalizeMode(value: string | undefined | null): GuardMode | null {
  if (!value) return null;
  const lowered = value.trim().toLowerCase();
  if (VALID_MODES.has(lowered as GuardMode)) return lowered as GuardMode;
  return null;
}

function getGitConfig(key: string): string | null {
  const value = runGit(["config", "--get", key]);
  return value.length > 0 ? value : null;
}

function detectRepoRole(): RepoRole {
  const explicit = (process.env.RAWR_TEMPLATE_GUARD_ROLE ?? "").trim().toLowerCase();
  if (explicit === "template" || explicit === "personal") return explicit;

  const origin = getGitConfig("remote.origin.url") ?? "";
  const upstream = getGitConfig("remote.upstream.url") ?? "";
  const cwd = process.cwd();

  if (upstream.includes("rawr-hq-template")) return "personal";
  if (origin.includes("rawr-hq-template")) return "template";
  if (origin.includes("rawr-hq")) return "personal";
  if (cwd.includes("rawr-hq-template")) return "template";
  if (cwd.includes("rawr-hq")) return "personal";
  return "unknown";
}

function resolveGuardMode(role: RepoRole): GuardMode {
  const envMode = normalizeMode(process.env.RAWR_TEMPLATE_GUARD_MODE);
  if (envMode) return envMode;

  const configMode = normalizeMode(getGitConfig("rawr.templateGuardMode"));
  if (configMode) return configMode;

  const ownerEmail =
    (process.env.RAWR_TEMPLATE_GUARD_OWNER_EMAIL ?? "").trim() ||
    (getGitConfig("rawr.templateGuardOwnerEmail") ?? "");
  const ownerMode =
    normalizeMode(process.env.RAWR_TEMPLATE_GUARD_OWNER_MODE) ??
    normalizeMode(getGitConfig("rawr.templateGuardOwnerMode")) ??
    "block";
  const currentEmail =
    (process.env.GIT_AUTHOR_EMAIL ?? "").trim() ||
    (process.env.GIT_COMMITTER_EMAIL ?? "").trim() ||
    (getGitConfig("user.email") ?? "");

  if (ownerEmail && currentEmail && ownerEmail.toLowerCase() === currentEmail.toLowerCase()) {
    return ownerMode;
  }

  // Downstream default is warn so users aren't blocked by surprise.
  // Template repo itself is excluded by role check before this runs.
  if (role === "personal" || role === "unknown") return "warn";
  return "off";
}

async function parsePatternManifest(repoRoot: string): Promise<string[]> {
  const manifestPath = path.join(repoRoot, "scripts", "githooks", "template-managed-paths.txt");
  const raw = await Bun.file(manifestPath)
    .text()
    .catch(() => "");
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function listStagedFiles(): string[] {
  const raw = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3).replace(/\/+$/, "");
    return filePath === prefix || filePath.startsWith(`${prefix}/`);
  }
  return filePath === normalizedPattern;
}

async function main() {
  if (process.env.RAWR_SKIP_TEMPLATE_MANAGED_GUARD === "1") {
    process.exit(0);
  }

  const repoRole = detectRepoRole();
  if (repoRole === "template") {
    process.exit(0);
  }

  const mode = resolveGuardMode(repoRole);
  if (mode === "off") {
    process.exit(0);
  }

  const repoRoot = runGit(["rev-parse", "--show-toplevel"]);
  if (!repoRoot) {
    process.exit(0);
  }

  const patterns = await parsePatternManifest(repoRoot);
  if (patterns.length === 0) {
    process.exit(0);
  }

  const staged = listStagedFiles();
  if (staged.length === 0) {
    process.exit(0);
  }

  const matched = staged.filter((filePath) => patterns.some((pattern) => matchesPattern(filePath, pattern)));
  if (matched.length === 0) {
    process.exit(0);
  }

  const header =
    mode === "block"
      ? "[rawr-pre-commit] blocked: template-managed paths staged in downstream repo"
      : "[rawr-pre-commit] warning: template-managed paths staged in downstream repo";

  console.error(header);
  console.error(`[rawr-pre-commit] mode=${mode} role=${repoRole}`);
  console.error("[rawr-pre-commit] template-managed files:");
  for (const filePath of matched) {
    console.error(`  - ${filePath}`);
  }
  console.error("[rawr-pre-commit] expected flow: apply these changes in RAWR HQ-Template, then sync downstream.");
  console.error("[rawr-pre-commit] controls:");
  console.error("  - RAWR_TEMPLATE_GUARD_MODE=off|warn|block");
  console.error("  - git config rawr.templateGuardMode block");
  console.error("  - git config rawr.templateGuardOwnerEmail <you@example.com>");
  console.error("  - git config rawr.templateGuardOwnerMode block");
  console.error("  - bypass once: RAWR_SKIP_TEMPLATE_MANAGED_GUARD=1");

  if (mode === "block") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `[rawr-pre-commit] template-managed guard failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});

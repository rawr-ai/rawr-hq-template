import { spawn } from "node:child_process";
import path from "node:path";

import type { HostedApprovalQuery } from "@rawr/agent-plugin-lifecycle/ports/governance";

import type { HostedGovernanceBackend } from "./hosted";

const API_VERSION = "2022-11-28";
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 30_000;
const GITHUB_REPOSITORY_PATTERN = /^git:github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9](?:[a-z0-9._-]{0,98}[a-z0-9])?)$/u;
const GITHUB_LOGIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/u;
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const REVIEW_STATES = new Set([
  "APPROVED",
  "CHANGES_REQUESTED",
  "COMMENTED",
  "DISMISSED",
  "PENDING",
]);
const AUTHORITY_REVIEW_STATES = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

export interface NodeGithubCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ReadOnlyNodeGithubCommandRunner {
  readonly run: (
    executablePath: string,
    args: readonly string[],
  ) => Promise<NodeGithubCommandResult>;
}

export function createNodeGithubHostedGovernanceBackend(input: Readonly<{
  githubExecutable: string;
  runner?: ReadOnlyNodeGithubCommandRunner;
}>): HostedGovernanceBackend {
  const executablePath = requireExplicitExecutable(input.githubExecutable);
  const runner = input.runner ?? nodeGithubCommandRunner;

  return Object.freeze({
    readApproval: async (query: HostedApprovalQuery) =>
      await readExactApproval(runner, executablePath, query),
  });
}

const nodeGithubCommandRunner: ReadOnlyNodeGithubCommandRunner = Object.freeze({
  run: async (executablePath: string, args: readonly string[]) =>
    await runProcess(executablePath, args),
});

async function readExactApproval(
  runner: ReadOnlyNodeGithubCommandRunner,
  executablePath: string,
  query: HostedApprovalQuery,
): Promise<unknown> {
  const repository = parseGithubRepository(query.object.repositoryIdentity);
  const pullRequests = parsePullRequestNumbers(await runApi(
    runner,
    executablePath,
    `repos/${repository.owner}/${repository.name}/commits/${query.object.commit}/pulls?per_page=100`,
  ));
  if (pullRequests.length === 0) return undefined;

  const matchingReviews: GithubReview[] = [];
  const observedReviewIds = new Set<number>();
  for (const pullRequest of pullRequests) {
    const reviews = parseReviews(await runApi(
      runner,
      executablePath,
      `repos/${repository.owner}/${repository.name}/pulls/${pullRequest}/reviews?per_page=100`,
    ));
    // GitHub returns this history chronologically; retain the latest authority-changing review.
    let latestPolicyReview: GithubReview | undefined;
    for (const review of reviews) {
      if (observedReviewIds.has(review.id)) {
        throw new Error("GitHub returned a duplicate review identity");
      }
      observedReviewIds.add(review.id);
      if (
        review.approverIdentity === query.approverIdentity
        && AUTHORITY_REVIEW_STATES.has(review.state)
      ) {
        latestPolicyReview = review;
      }
    }
    if (
      latestPolicyReview?.state === "APPROVED"
      && latestPolicyReview.commitId === query.object.commit
    ) {
      matchingReviews.push(latestPolicyReview);
    }
  }

  if (matchingReviews.length === 0) return undefined;
  if (matchingReviews.length !== 1) {
    throw new Error("GitHub returned multiple exact hosted approval records");
  }
  const approval = matchingReviews[0]!;
  return Object.freeze({
    provider: "github",
    recordId: `github-review-${approval.id}`,
    object: query.object,
    approverIdentity: query.approverIdentity,
    decision: "approved",
    outcome: query.outcome,
  });
}

async function runApi(
  runner: ReadOnlyNodeGithubCommandRunner,
  executablePath: string,
  endpoint: string,
): Promise<string> {
  const result = await runner.run(executablePath, [
    "api",
    "--hostname",
    "github.com",
    "--method",
    "GET",
    "--header",
    "Accept: application/vnd.github+json",
    "--header",
    `X-GitHub-Api-Version: ${API_VERSION}`,
    "--paginate",
    "--slurp",
    endpoint,
  ]);
  if (!Number.isSafeInteger(result.exitCode)) {
    throw new Error("GitHub CLI returned an invalid exit status");
  }
  if (result.exitCode !== 0) {
    const detail = boundedMessage(result.stderr) || boundedMessage(result.stdout);
    throw new Error(detail.length > 0 ? `GitHub API query failed: ${detail}` : "GitHub API query failed");
  }
  return result.stdout;
}

function parseGithubRepository(repositoryIdentity: string): Readonly<{
  owner: string;
  name: string;
}> {
  const match = GITHUB_REPOSITORY_PATTERN.exec(repositoryIdentity);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error("Hosted GitHub approval requires a canonical git:github.com/owner/repository identity");
  }
  return Object.freeze({ owner: match[1], name: match[2] });
}

function parsePullRequestNumbers(stdout: string): readonly number[] {
  const values = parsePaginatedItems(stdout, "associated pull requests");
  const numbers = new Set<number>();
  for (const value of values) {
    if (!isRecord(value) || !isPositiveSafeInteger(value.number)) {
      throw new Error("GitHub returned malformed associated pull request data");
    }
    if (numbers.has(value.number)) {
      throw new Error("GitHub returned a duplicate associated pull request identity");
    }
    numbers.add(value.number);
  }
  return Object.freeze([...numbers].sort((left, right) => left - right));
}

interface GithubReview {
  readonly id: number;
  readonly state: string;
  readonly commitId: string;
  readonly approverIdentity: string;
}

function parseReviews(stdout: string): readonly GithubReview[] {
  const values = parsePaginatedItems(stdout, "pull request reviews");
  return Object.freeze(values.map((value) => {
    if (!isRecord(value) || !isRecord(value.user)) {
      throw new Error("GitHub returned malformed pull request review data");
    }
    const id = value.id;
    const state = value.state;
    const commitId = value.commit_id;
    const approverIdentity = value.user.login;
    if (
      !isPositiveSafeInteger(id)
      || typeof state !== "string"
      || !REVIEW_STATES.has(state)
      || typeof commitId !== "string"
      || !GIT_OBJECT_PATTERN.test(commitId)
      || typeof approverIdentity !== "string"
      || !GITHUB_LOGIN_PATTERN.test(approverIdentity)
    ) {
      throw new Error("GitHub returned malformed or unsupported pull request review data");
    }
    return Object.freeze({ id, state, commitId, approverIdentity });
  }));
}

function parsePaginatedItems(stdout: string, label: string): readonly unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`GitHub returned invalid JSON for ${label}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`GitHub returned an unsupported response for ${label}`);
  }
  const items: unknown[] = [];
  for (const page of parsed) {
    if (!Array.isArray(page)) {
      throw new Error(`GitHub returned an unsupported paginated response for ${label}`);
    }
    items.push(...page);
  }
  return Object.freeze(items);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function requireExplicitExecutable(candidate: string): string {
  if (
    !path.isAbsolute(candidate)
    || path.normalize(candidate) !== candidate
    || candidate === path.parse(candidate).root
  ) {
    throw new Error("GitHub CLI executable must be an explicit normalized absolute path");
  }
  return candidate;
}

function boundedMessage(value: string): string {
  return value.trim().slice(0, 2_048);
}

async function runProcess(
  executablePath: string,
  args: readonly string[],
): Promise<NodeGithubCommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, {
      env: {
        ...process.env,
        GH_PROMPT_DISABLED: "1",
        GIT_TERMINAL_PROMPT: "0",
        LANG: "C",
        LC_ALL: "C",
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("GitHub CLI query exceeded its bounded execution timeout"));
    }, PROCESS_TIMEOUT_MS);

    const collect = (chunks: Buffer[], chunk: Buffer): void => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        finish(new Error("GitHub CLI query exceeded its bounded output limit"));
        return;
      }
      chunks.push(Buffer.from(chunk));
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.once("error", (error) => finish(error));
    child.once("close", (exitCode, signal) => {
      if (exitCode === null) {
        finish(new Error(`GitHub CLI ended without an exit status (${signal ?? "unknown signal"})`));
        return;
      }
      finish(null, Object.freeze({
        exitCode,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      }));
    });

    function finish(error: Error | null, value?: NodeGithubCommandResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error !== null) {
        child.kill("SIGKILL");
        reject(error);
      } else if (value !== undefined) {
        resolve(value);
      } else {
        reject(new Error("GitHub CLI ended without a result"));
      }
    }
  });
}

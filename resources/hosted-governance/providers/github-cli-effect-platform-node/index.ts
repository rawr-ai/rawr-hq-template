import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  HostedApprovalHistory,
  HostedApprovalSelector,
  HostedGovernanceFailure,
  HostedGovernanceResource,
  HostedReviewObservation,
} from "@rawr/resource-hosted-governance";
import { Effect, Schema, Stream } from "effect";

const API_VERSION = "2022-11-28";
const PROCESS_TIMEOUT = "30 seconds";
const MAX_STDOUT_BYTES = 16 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;
const GITHUB_REPOSITORY_PATTERN = /^git:github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9](?:[a-z0-9._-]{0,98}[a-z0-9])?)$/u;
const GITHUB_LOGIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/u;
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

const GithubReviewSchema = Schema.Struct({
  id: Schema.Number,
  state: Schema.Literal(
    "APPROVED",
    "CHANGES_REQUESTED",
    "COMMENTED",
    "DISMISSED",
    "PENDING",
  ),
  commit_id: Schema.String,
  user: Schema.Struct({ login: Schema.String }),
});

const GithubPaginatedReviewSchema = Schema.Array(Schema.Array(GithubReviewSchema));

interface ByteAccumulator {
  readonly chunks: Uint8Array[];
  bytes: number;
}

type ProviderRequirements =
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | Path.Path;

export interface GithubCliEffectPlatformNodeOptions {
  readonly githubExecutable: string;
}

/**
 * Constructs a cold provider. Executable and selector authority are checked
 * only when an observation Effect is executed.
 */
export function makeGithubCliHostedGovernanceResource(
  options: GithubCliEffectPlatformNodeOptions,
): HostedGovernanceResource<ProviderRequirements> {
  const observeApprovalHistory = Effect.fn("hostedGovernance.github.observeApprovalHistory")(
    function* (selector: HostedApprovalSelector) {
      const path = yield* Path.Path;
      const fs = yield* FileSystem.FileSystem;
      const executable = yield* requireCanonicalExecutable(path, fs, options.githubExecutable);
      const selection = yield* decodeSelector(selector);
      const endpoint = [
        "repos",
        selection.owner,
        selection.repository,
        "pulls",
        String(selector.pullRequest),
        "reviews?per_page=100",
      ].join("/");
      const stdout = yield* runReadOnlyGithubApi(executable, endpoint);
      const pages = yield* decodeGithubReviews(stdout);
      const observations = yield* decodeMechanicalObservations(pages);
      return Object.freeze({
        provider: "github",
        selector: Object.freeze({ ...selector }),
        observations,
      }) satisfies HostedApprovalHistory;
    },
  );

  return Object.freeze({ observeApprovalHistory });
}

export type NodeHostedGovernanceResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: HostedGovernanceFailure }>;

export function runNodeHostedGovernance<A>(
  operation: Effect.Effect<A, HostedGovernanceFailure, ProviderRequirements>,
): Promise<NodeHostedGovernanceResult<A>> {
  return Effect.runPromise(operation.pipe(
    Effect.match({
      onFailure: (failure): NodeHostedGovernanceResult<A> => Object.freeze({ ok: false, failure }),
      onSuccess: (value): NodeHostedGovernanceResult<A> => Object.freeze({ ok: true, value }),
    }),
    Effect.provide(NodeContext.layer),
  ));
}

function requireCanonicalExecutable(
  path: Path.Path,
  fs: FileSystem.FileSystem,
  candidate: string,
) {
  if (
    !path.isAbsolute(candidate)
    || path.normalize(candidate) !== candidate
    || path.parse(candidate).root === candidate
  ) {
    return fail("Refused", "GitHub CLI executable must be an explicit normalized absolute path");
  }
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(candidate).pipe(
      Effect.mapError((cause) => platformFailure(candidate, cause)),
    );
    if (canonical !== candidate) {
      return yield* fail("Refused", "GitHub CLI executable must be its exact canonical path");
    }
    const info = yield* fs.stat(candidate).pipe(
      Effect.mapError((cause) => platformFailure(candidate, cause)),
    );
    if (info.type !== "File" || (info.mode & 0o111) === 0) {
      return yield* fail("Refused", "GitHub CLI executable must be an executable regular file");
    }
    return candidate;
  });
}

function decodeSelector(selector: HostedApprovalSelector) {
  if (selector.provider !== "github") {
    return fail("Refused", "Hosted governance provider must be github");
  }
  const repository = GITHUB_REPOSITORY_PATTERN.exec(selector.repositoryIdentity);
  if (repository?.[1] === undefined || repository[2] === undefined) {
    return fail("Refused", "Repository selector must be a canonical git:github.com/owner/repository identity");
  }
  if (!Number.isSafeInteger(selector.pullRequest) || selector.pullRequest <= 0) {
    return fail("Refused", "Pull-request selector must be a positive safe integer");
  }
  if (!GIT_OBJECT_PATTERN.test(selector.revision)) {
    return fail("Refused", "Revision selector must be a lowercase SHA-1 or SHA-256 object identity");
  }
  return Effect.succeed(Object.freeze({ owner: repository[1], repository: repository[2] }));
}

function runReadOnlyGithubApi(
  executable: string,
  endpoint: string,
): Effect.Effect<string, HostedGovernanceFailure, CommandExecutor.CommandExecutor> {
  const command = Command.make(
    executable,
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
  ).pipe(
    Command.env({
      GH_PROMPT_DISABLED: "1",
      GIT_TERMINAL_PROMPT: "0",
      LANG: "C",
      LC_ALL: "C",
      NO_COLOR: "1",
    }),
    Command.feed(""),
  );

  return Effect.scoped(Effect.gen(function* () {
    const process = yield* Command.start(command).pipe(
      Effect.mapError((cause) => platformFailure(executable, cause)),
    );
    const [stdoutBytes, stderrBytes, exitCode] = yield* Effect.all([
      collectBoundedOutput(process.stdout, MAX_STDOUT_BYTES, "stdout"),
      collectBoundedOutput(process.stderr, MAX_STDERR_BYTES, "stderr"),
      process.exitCode.pipe(
        Effect.map((code) => Number(code)),
        Effect.mapError((cause) => platformFailure(executable, cause)),
      ),
    ], { concurrency: "unbounded" });
    const [stdout, stderr] = yield* Effect.all([
      decodeUtf8(stdoutBytes),
      decodeUtf8(stderrBytes),
    ]);
    if (!Number.isSafeInteger(exitCode) || exitCode !== 0) {
      const detail = (stderr.trim() || stdout.trim()).slice(0, 2_048);
      return yield* fail(
        "CommandFailed",
        detail.length > 0
          ? `GitHub API query failed: ${detail}`
          : "GitHub API query failed without diagnostic output",
      );
    }
    return stdout;
  })).pipe(
    Effect.timeoutFail({
      duration: PROCESS_TIMEOUT,
      onTimeout: () => failure("CommandTimedOut", "GitHub API query exceeded its bounded execution timeout"),
    }),
  );
}

function collectBoundedOutput(
  stream: Stream.Stream<Uint8Array, PlatformError>,
  maxBytes: number,
  channel: "stdout" | "stderr",
) {
  return stream.pipe(
    Stream.mapError((cause) => platformFailure(channel, cause)),
    Stream.runFoldEffect(
      emptyByteAccumulator(),
      (state, chunk) => {
        const bytes = state.bytes + chunk.byteLength;
        if (bytes > maxBytes) {
          return fail("OutputLimitExceeded", `GitHub CLI ${channel} exceeded ${maxBytes} bytes`);
        }
        state.chunks.push(chunk);
        state.bytes = bytes;
        return Effect.succeed(state);
      },
    ),
    Effect.map((state) => concatenateBytes(state.chunks)),
  );
}

function decodeUtf8(bytes: Uint8Array) {
  return Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    catch: () => failure("MalformedResponse", "GitHub CLI returned non-UTF-8 output"),
  });
}

function decodeGithubReviews(stdout: string) {
  return Effect.try({
    try: (): unknown => JSON.parse(stdout),
    catch: () => failure("MalformedResponse", "GitHub CLI returned invalid JSON"),
  }).pipe(
    Effect.flatMap((value) => Schema.decodeUnknown(GithubPaginatedReviewSchema)(value)),
    Effect.mapError((cause) => cause._tag === "HostedGovernanceFailure"
      ? cause
      : failure("MalformedResponse", "GitHub CLI returned malformed paginated review data")),
  );
}

function emptyByteAccumulator(): ByteAccumulator {
  return { chunks: [], bytes: 0 };
}

function decodeMechanicalObservations(
  pages: ReadonlyArray<ReadonlyArray<Schema.Schema.Type<typeof GithubReviewSchema>>>,
) {
  const recordIds = new Set<number>();
  const observations: HostedReviewObservation[] = [];
  for (const review of pages.flat()) {
    if (
      !Number.isSafeInteger(review.id)
      || review.id <= 0
      || !GIT_OBJECT_PATTERN.test(review.commit_id)
      || !GITHUB_LOGIN_PATTERN.test(review.user.login)
      || recordIds.has(review.id)
    ) {
      return fail("MalformedResponse", "GitHub CLI returned a malformed or duplicate review observation");
    }
    recordIds.add(review.id);
    observations.push(Object.freeze({
      recordId: review.id,
      state: review.state,
      revision: review.commit_id,
      actorIdentity: review.user.login,
    }));
  }
  return Effect.succeed(Object.freeze(observations));
}

function concatenateBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((bytes, chunk) => bytes + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function platformFailure(subject: string, cause: PlatformError): HostedGovernanceFailure {
  return failure("Unavailable", `GitHub CLI is unavailable at ${subject}: ${cause.message}`);
}

function fail(reason: HostedGovernanceFailure["reason"], detail: string) {
  return Effect.fail(failure(reason, detail));
}

function failure(
  reason: HostedGovernanceFailure["reason"],
  detail: string,
): HostedGovernanceFailure {
  return Object.freeze({
    _tag: "HostedGovernanceFailure",
    operation: "observe-approval-history",
    reason,
    detail,
  });
}

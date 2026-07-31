import { NodeServices } from "@effect/platform-node";
import type {
  RuleEvaluationFailure,
  RuleEvaluationFinding,
  RuleEvaluationRequest,
  RuleEvaluationResource,
  RuleEvaluationResult,
} from "@habitat/resource-rule-evaluation";
import {
  MAX_RULE_EVALUATION_FAILURE_DETAIL,
  RuleEvaluationRequestSchema,
} from "@habitat/resource-rule-evaluation";
import {
  Effect,
  Schema as EffectSchema,
  FileSystem,
  Path,
  type PlatformError,
  type Scope,
  Stream,
} from "effect";
import { ChildProcess } from "effect/unstable/process";
import type { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
import { ReadonlyObject, type Static, Type } from "typebox";
import Schema from "typebox/schema";
import { Value } from "typebox/value";

type ProviderRequirements = FileSystem.FileSystem | Path.Path | ChildProcessSpawner;

const TEMP_CATALOG_PREFIX = "habitat-rule-evaluation-";
const GRIT_PATTERN_NAME = "habitat_rule_evaluation";
/** Maximum bytes retained from either native output stream. */
const MAX_GRIT_OUTPUT_BYTES = 256 * 1_024;

/** Structural schema for Grit provider construction. */
export const GritRuleEvaluationProviderConfigSchema = ReadonlyObject(
  Type.Object({
    executable: Type.String({
      minLength: 1,
      description: "Caller-selected Grit executable",
    }),
    timeoutMs: Type.Integer({
      minimum: 1,
      description: "Maximum duration of one native Grit check",
    }),
  }),
  { additionalProperties: false }
);

/** Configuration for one Grit-backed rule-evaluation provider. */
export type GritRuleEvaluationProviderConfig = Static<
  typeof GritRuleEvaluationProviderConfigSchema
>;

const GritPositionSchema = Type.Object(
  {
    line: Type.Integer({ minimum: 1, description: "One-based Grit source line" }),
    col: Type.Integer({ minimum: 1, description: "One-based Grit source column" }),
    offset: Type.Integer({ minimum: 0, description: "Grit-native source offset" }),
  },
  { additionalProperties: false, description: "Grit-reported source position" }
);

const GritResultSchema = Type.Object(
  {
    check_id: Type.String({
      pattern: `^#${GRIT_PATTERN_NAME}/.+$`,
      description: "Provider-owned Grit check identity with evaluator suffix",
    }),
    local_name: Type.Literal(GRIT_PATTERN_NAME, {
      description: "Provider-owned local Grit pattern name",
    }),
    path: Type.String({ minLength: 1, description: "Grit-reported subject path" }),
    start: GritPositionSchema,
    end: GritPositionSchema,
    extra: Type.Object(
      {
        message: Type.Union([Type.String(), Type.Null()], {
          description: "Optional Grit diagnostic message",
        }),
        severity: Type.Literal("error", {
          description: "Mechanical severity emitted by the scoped catalog",
        }),
      },
      { additionalProperties: false, description: "Additional Grit finding data" }
    ),
  },
  { additionalProperties: false }
);

const GritReportSchema = Type.Object(
  {
    paths: Type.Array(Type.String({ minLength: 1 }), {
      description: "Subject paths included in the Grit report",
    }),
    results: Type.Array(GritResultSchema, {
      description: "Findings included in the Grit report",
    }),
  },
  { additionalProperties: false }
);

type GritReport = Static<typeof GritReportSchema>;

interface ScopedGritCatalog {
  readonly root: string;
  readonly gritDirectory: string;
  readonly userConfigDirectory: string;
  readonly cacheDirectory: string;
}

interface ProcessObservation {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

const requestValidator = Schema.Compile(RuleEvaluationRequestSchema);
const configValidator = Schema.Compile(GritRuleEvaluationProviderConfigSchema);

/**
 * Creates a Grit-backed evaluator over Effect Platform filesystem, path, and
 * child-process services.
 */
export function makeGritRuleEvaluationResource(
  config: GritRuleEvaluationProviderConfig
): RuleEvaluationResource<ProviderRequirements> {
  const evaluate = Effect.fn("ruleEvaluation.grit.evaluate")(function* (
    input: RuleEvaluationRequest
  ) {
    if (!configValidator.Check(config)) {
      return yield* fail(
        "InvalidInput",
        "Grit provider configuration does not match its structural contract"
      );
    }
    if (!requestValidator.Check(input)) {
      return yield* fail(
        "InvalidInput",
        "Rule-evaluation request requires one resolved program and non-empty subject paths"
      );
    }

    const path = yield* Path.Path;
    if (input.subjectPaths.some((subjectPath) => !path.isAbsolute(subjectPath))) {
      return yield* fail(
        "InvalidInput",
        "Rule-evaluation subject paths must be caller-resolved absolute paths"
      );
    }
    return yield* Effect.scoped(
      withScopedGritCatalog(input.program, (catalog) =>
        runGritCheck(config, catalog, input.subjectPaths)
      )
    );
  });

  return Object.freeze({ evaluate });
}

/** Creates a ready Node realization of the Grit rule-evaluation provider. */
export function makeNodeGritRuleEvaluationResource(
  config: GritRuleEvaluationProviderConfig
): RuleEvaluationResource<never> {
  const resource = makeGritRuleEvaluationResource(config);
  return Object.freeze({
    evaluate: (input: RuleEvaluationRequest) =>
      resource.evaluate(input).pipe(Effect.provide(NodeServices.layer)),
  });
}

function withScopedGritCatalog<A>(
  program: string,
  use: (
    catalog: ScopedGritCatalog
  ) => Effect.Effect<A, RuleEvaluationFailure, ChildProcessSpawner | Scope.Scope>
): Effect.Effect<
  A,
  RuleEvaluationFailure,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner | Scope.Scope
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fs
      .makeTempDirectoryScoped({ prefix: TEMP_CATALOG_PREFIX })
      .pipe(mapPlatform("SetupFailed", "Failed to allocate temporary Grit catalog"));
    const catalog = Object.freeze({
      root,
      gritDirectory: path.join(root, ".grit"),
      userConfigDirectory: path.join(root, "user-config"),
      cacheDirectory: path.join(root, "cache"),
    });
    yield* fs
      .makeDirectory(catalog.gritDirectory)
      .pipe(mapPlatform("SetupFailed", "Failed to create Grit catalog directory"));
    yield* fs
      .makeDirectory(catalog.userConfigDirectory)
      .pipe(mapPlatform("SetupFailed", "Failed to create Grit user-config directory"));
    yield* fs
      .makeDirectory(catalog.cacheDirectory)
      .pipe(mapPlatform("SetupFailed", "Failed to create Grit cache directory"));
    yield* fs
      .writeFileString(path.join(catalog.gritDirectory, "grit.yaml"), renderGritCatalog(program))
      .pipe(mapPlatform("SetupFailed", "Failed to write temporary Grit catalog"));
    return yield* use(catalog);
  });
}

function runGritCheck(
  config: GritRuleEvaluationProviderConfig,
  catalog: ScopedGritCatalog,
  subjectPaths: readonly string[]
): Effect.Effect<RuleEvaluationResult, RuleEvaluationFailure, ChildProcessSpawner | Scope.Scope> {
  const observe = Effect.gen(function* () {
    const command = ChildProcess.make(
      config.executable,
      ["--json", "check", "--no-cache", "--grit-dir", catalog.gritDirectory, ...subjectPaths],
      {
        cwd: catalog.root,
        env: {
          FORCE_COLOR: undefined,
          GRIT_CACHE_DIR: catalog.cacheDirectory,
          GRIT_USER_CONFIG: catalog.userConfigDirectory,
          GRIT_TELEMETRY_DISABLED: "true",
          NO_COLOR: undefined,
        },
        extendEnv: true,
        stdin: "ignore",
        killSignal: "SIGTERM",
        forceKillAfter: "2 seconds",
      }
    );
    const process = yield* command.pipe(mapPlatform("ExecutionFailed", "Failed to start Grit"));
    const output = yield* Effect.all(
      {
        stdout: collectBoundedOutput(process.stdout, "stdout"),
        stderr: collectBoundedOutput(process.stderr, "stderr"),
        exitCode: process.exitCode.pipe(
          Effect.map(Number),
          mapPlatform("ExecutionFailed", "Failed to observe Grit exit")
        ),
      },
      { concurrency: "unbounded" }
    );
    return Object.freeze(output) satisfies ProcessObservation;
  }).pipe(
    Effect.timeoutOrElse({
      duration: config.timeoutMs,
      orElse: () => fail("TimedOut", `Grit evaluation exceeded its ${config.timeoutMs}ms timeout`),
    })
  );

  return observe.pipe(
    Effect.flatMap((observation) => {
      if (observation.exitCode !== 0) {
        const detail = observation.stderr.trim() || observation.stdout.trim();
        return fail(
          "ExecutionFailed",
          detail.length === 0
            ? `Grit exited with code ${observation.exitCode}`
            : `Grit exited with code ${observation.exitCode}: ${detail}`
        );
      }
      if (observation.stdout.trim().length > 0) {
        return fail(
          "InvalidOutput",
          "Grit check emitted unexpected stdout alongside its stderr JSON report"
        );
      }
      return decodeGritReport(observation.stderr).pipe(Effect.map(resultFromGritReport));
    })
  );
}

function decodeGritReport(stderr: string): Effect.Effect<GritReport, RuleEvaluationFailure> {
  if (stderr.trim().length === 0) {
    return fail("InvalidOutput", "Grit check emitted no stderr JSON report");
  }
  return EffectSchema.decodeUnknownEffect(EffectSchema.UnknownFromJsonString)(stderr).pipe(
    Effect.mapError((error) =>
      failure("InvalidOutput", `Grit check emitted invalid JSON: ${errorMessage(error)}`)
    ),
    Effect.flatMap((decoded) =>
      Effect.try({
        try: () => Value.Parse(GritReportSchema, decoded),
        catch: (error) =>
          failure("InvalidOutput", `Grit check emitted an invalid report: ${errorMessage(error)}`),
      })
    )
  );
}

function resultFromGritReport(report: GritReport): RuleEvaluationResult {
  const findings = report.results
    .map(
      (result): RuleEvaluationFinding =>
        Object.freeze({
          path: result.path,
          start: Object.freeze({
            line: result.start.line,
            column: result.start.col,
            offset: result.start.offset,
          }),
          end: Object.freeze({
            line: result.end.line,
            column: result.end.col,
            offset: result.end.offset,
          }),
          message: result.extra.message,
        })
    )
    .sort(compareFindings);
  return Object.freeze({
    findings: Object.freeze(findings),
  });
}

function renderGritCatalog(program: string): string {
  return `${JSON.stringify(
    {
      version: "0.0.2",
      patterns: [
        {
          name: GRIT_PATTERN_NAME,
          title: GRIT_PATTERN_NAME,
          level: "error",
          body: program,
        },
      ],
    },
    undefined,
    2
  )}\n`;
}

function collectBoundedOutput(
  stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  channel: "stdout" | "stderr"
): Effect.Effect<string, RuleEvaluationFailure> {
  type OutputState = Readonly<{ buffer: Uint8Array; bytes: number }>;
  return Stream.runFoldEffect(
    stream.pipe(
      Stream.mapError((error) =>
        failure("ExecutionFailed", `Failed to drain Grit ${channel}: ${error.message}`)
      )
    ),
    () => Object.freeze({ buffer: new Uint8Array(MAX_GRIT_OUTPUT_BYTES), bytes: 0 }),
    (state, chunk): Effect.Effect<OutputState, RuleEvaluationFailure> => {
      if (chunk.byteLength === 0) return Effect.succeed(state);
      const bytes = state.bytes + chunk.byteLength;
      return bytes > MAX_GRIT_OUTPUT_BYTES
        ? fail(
            "InvalidOutput",
            `Grit ${channel} exceeded its ${MAX_GRIT_OUTPUT_BYTES}-byte output limit`
          )
        : Effect.sync(() => {
            state.buffer.set(chunk, state.bytes);
            return Object.freeze({ buffer: state.buffer, bytes });
          });
    }
  ).pipe(
    Effect.flatMap((state) =>
      Effect.try({
        try: () =>
          new TextDecoder("utf-8", { fatal: true }).decode(state.buffer.subarray(0, state.bytes)),
        catch: (error) =>
          failure("InvalidOutput", `Grit ${channel} was not valid UTF-8: ${errorMessage(error)}`),
      })
    )
  );
}

function mapPlatform(reason: RuleEvaluationFailure["reason"], context: string) {
  return <A, R>(
    effect: Effect.Effect<A, PlatformError.PlatformError, R>
  ): Effect.Effect<A, RuleEvaluationFailure, R> =>
    effect.pipe(Effect.mapError((error) => failure(reason, `${context}: ${error.message}`)));
}

function fail(
  reason: RuleEvaluationFailure["reason"],
  detail: string
): Effect.Effect<never, RuleEvaluationFailure> {
  return Effect.fail(failure(reason, detail));
}

function failure(reason: RuleEvaluationFailure["reason"], detail: string): RuleEvaluationFailure {
  const normalized = detail.trim() || "Rule evaluation failed";
  const bounded =
    normalized.length <= MAX_RULE_EVALUATION_FAILURE_DETAIL
      ? normalized
      : `${normalized.slice(0, MAX_RULE_EVALUATION_FAILURE_DETAIL - 3)}...`;
  return Object.freeze({
    _tag: "RuleEvaluationFailure",
    reason,
    detail: bounded,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareFindings(left: RuleEvaluationFinding, right: RuleEvaluationFinding): number {
  return (
    compareText(left.path, right.path) ||
    left.start.line - right.start.line ||
    left.start.column - right.start.column ||
    left.start.offset - right.start.offset ||
    left.end.line - right.end.line ||
    left.end.column - right.end.column ||
    left.end.offset - right.end.offset ||
    compareText(left.message ?? "", right.message ?? "")
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

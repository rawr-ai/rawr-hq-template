import { createHash } from "node:crypto";
import {
  type FinishNativeOperationInput,
  TelemetryIdentityTextSchema,
  type TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { context as otelContext } from "@opentelemetry/api";
import { Effect } from "effect";
import {
  headerKeys,
  type Inngest,
  type InngestFunction,
  isInngestFunction,
  queryKeys,
} from "inngest";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { extractIngressTelemetryContext } from "./telemetry-ingress";

type InngestAttemptOutcome = FinishNativeOperationInput["outcome"];
type InngestServeHandler = (request: Request) => Promise<Response>;

const InngestAttemptEnvelopeSchema = Type.Object(
  {
    ctx: Type.Object(
      {
        run_id: Type.String({
          description: "Native Inngest run identity",
        }),
        attempt: Type.Optional(
          Type.Number({
            description: "Native Inngest attempt number",
          })
        ),
      },
      {
        additionalProperties: true,
        description: "Native Inngest execution context",
      }
    ),
  },
  {
    additionalProperties: true,
    description: "Native Inngest execution request envelope",
  }
);

type InngestAttemptEnvelope = Static<typeof InngestAttemptEnvelopeSchema>;

type InngestAttemptObservation = Readonly<{
  functionId: string;
  runId: string;
  stepId: string | null;
  attempt: number;
}>;

/**
 * Narrows host-composed declarations to the native function objects accepted
 * by Inngest Serve. The app remains the composition owner; functions retain
 * their original handlers, middleware, options, and registration identity.
 */
export function requireNativeInngestFunctions(
  functions: readonly unknown[]
): readonly InngestFunction.Any[] {
  if (!functions.every(isNativeInngestFunction)) {
    throw new Error("createInngestFunctions must return native Inngest functions");
  }
  return functions;
}

/**
 * Observes terminal native Inngest attempt responses without participating in
 * execution. Inngest remains authoritative for handlers, middleware, retries,
 * logging, response classification, and duplicate delivery.
 */
export function observeInngestAttempts(input: {
  client: Inngest;
  functions: readonly InngestFunction.Any[];
  handler: InngestServeHandler;
  telemetry: TelemetryResource;
}): InngestServeHandler {
  if (input.telemetry.availability === "disabled") return input.handler;

  const functionIds = collectNativeFunctionIds(input.client, input.functions);

  return async function observeNativeInngestResponse(request: Request): Promise<Response> {
    const ingressContext = extractIngressTelemetryContext(request.headers);
    return otelContext.with(ingressContext, async () => {
      const startedAt = performance.now();
      const observation = await readAttemptObservation(request, functionIds);

      const response = await input.handler(request);
      const outcome = responseOutcome(response);
      if (observation !== undefined && outcome !== undefined) {
        await emitAttempt(
          input.telemetry,
          observation,
          outcome,
          elapsedMilliseconds(startedAt),
          response.status
        );
      }
      return response;
    });
  };
}

function isNativeInngestFunction(value: unknown): value is InngestFunction.Any {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") {
    return false;
  }
  return isInngestFunction(value);
}

function collectNativeFunctionIds(
  client: Inngest,
  functions: readonly InngestFunction.Any[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const fn of functions) {
    const functionId = fn.id(client.id);
    ids.add(functionId);
    if (fn.opts.onFailure !== undefined) ids.add(`${functionId}-failure`);
  }
  return ids;
}

async function readAttemptObservation(
  request: Request,
  functionIds: ReadonlySet<string>
): Promise<InngestAttemptObservation | undefined> {
  if (request.method !== "POST") return undefined;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get(queryKeys.Probe)) return undefined;

    const functionId = url.searchParams.get(queryKeys.FnId);
    if (functionId === null || !functionIds.has(functionId)) return undefined;

    const body: unknown = await request.clone().json();
    if (!Value.Check(InngestAttemptEnvelopeSchema, body)) return undefined;

    const envelope: InngestAttemptEnvelope = body;
    return {
      functionId,
      runId: envelope.ctx.run_id,
      stepId:
        url.searchParams.get(queryKeys.StepId) ||
        request.headers.get(headerKeys.InngestStepId) ||
        null,
      attempt: envelope.ctx.attempt ?? 0,
    };
  } catch {
    return undefined;
  }
}

function responseOutcome(response: Response): InngestAttemptOutcome | undefined {
  if (response.status === 200) return "succeeded";
  if (
    (response.status === 400 || response.status === 500) &&
    response.headers.has(headerKeys.NoRetry)
  ) {
    return "failed";
  }
  return undefined;
}

function elapsedMilliseconds(startedAt: number): number {
  return Math.max(0, performance.now() - startedAt);
}

async function emitAttempt(
  telemetry: TelemetryResource,
  observation: InngestAttemptObservation,
  outcome: InngestAttemptOutcome,
  durationMilliseconds: number,
  responseStatus?: number
): Promise<void> {
  try {
    const functionId = admitIdentity(observation.functionId, "inngest-function");
    const runId = admitIdentity(observation.runId, "inngest-run");
    const stepId =
      observation.stepId === null ? undefined : admitIdentity(observation.stepId, "inngest-step");
    const attemptId = admitIdentity(
      JSON.stringify([observation.runId, observation.stepId, observation.attempt]),
      "inngest-attempt"
    );
    const scope = await Effect.runPromise(
      telemetry.beginNativeOperation({
        surface: "inngest",
        kind: "attempt",
        operation: "inngest.attempt",
        operationId: attemptId,
        attributes: Object.freeze({
          "inngest.function.id": functionId,
          "inngest.run.id": runId,
          ...(stepId === undefined ? {} : { "inngest.step.id": stepId }),
          "inngest.attempt.id": attemptId,
        }),
      })
    );

    await Effect.runPromise(
      scope.finish({
        outcome,
        attributes: Object.freeze({
          "duration.ms": durationMilliseconds,
          ...(responseStatus === undefined ? {} : { "http.response.status_code": responseStatus }),
        }),
      })
    );
  } catch {
    // Observations cannot replace the native execution result.
  }
}

function admitIdentity(value: string, fallbackPrefix: string): string {
  if (Value.Check(TelemetryIdentityTextSchema, value)) return value;
  return `${fallbackPrefix}-${createHash("sha256").update(value).digest("hex")}`;
}

import { Type } from "typebox";
import { Check } from "typebox/value";
import type { RuntimeLaunchIdentity } from "../../definition/src/app";
import {
  type RuntimeLifecyclePhase,
  RuntimeLifecyclePhaseSchema,
} from "../../definition/src/observation";
import type { RuntimeSchema } from "../../definition/src/schema";
import { detached, telemetryData } from "./data";

export type RuntimeDiagnosticRedaction = "safe" | "omitted";
export interface RuntimeSourceRef {
  readonly ownerId: string;
}
export interface RuntimeDiagnostic<TPayload = unknown> {
  readonly id: string;
  readonly severity: "info" | "warning" | "error" | "fatal";
  readonly phase: RuntimeLifecyclePhase;
  readonly recordKind?: "finding" | "status" | "finalization" | "rollback";
  readonly boundary:
    | "service"
    | "plugin"
    | "app"
    | "resource"
    | "provider"
    | "sdk"
    | "runtime-compiler"
    | "bootgraph"
    | "provisioning-kernel"
    | "process-runtime"
    | "execution-registry"
    | "execution-runtime"
    | "surface-adapter"
    | "harness"
    | "runtime-mounting"
    | "runtime-observation";
  readonly code: string;
  readonly message: string;
  readonly payloadSchema?: RuntimeSchema<TPayload>;
  readonly payload?: TPayload;
  readonly redaction: RuntimeDiagnosticRedaction;
  readonly source?: RuntimeSourceRef;
}
export type RuntimeTelemetryPrimitive = string | number | boolean | null;
export type RuntimeTelemetryPayload =
  | RuntimeTelemetryPrimitive
  | readonly RuntimeTelemetryPayload[]
  | { readonly [key: string]: RuntimeTelemetryPayload };
export interface RuntimeTelemetrySpanInput {
  readonly name: string;
  readonly phase: RuntimeLifecyclePhase;
  readonly boundary: RuntimeDiagnostic["boundary"];
  readonly attributes?: RuntimeTelemetryPayload;
}
export interface RuntimeTelemetryAnnotation {
  readonly key: string;
  readonly value: RuntimeTelemetryPayload;
  readonly redaction?: RuntimeDiagnosticRedaction;
}
export interface RuntimeTelemetry {
  span<T>(input: RuntimeTelemetrySpanInput, run: () => Promise<T>): Promise<T>;
  event(name: string, payload?: RuntimeTelemetryPayload): void;
  annotate(input: RuntimeTelemetryAnnotation): void;
}
/** Authors own semantic redaction of explicit telemetry; product results/errors are never appended. */
export interface RuntimeTelemetryRecord {
  readonly kind: "span.started" | "span.settled" | "event" | "annotation";
  readonly processId: string;
  readonly identity: RuntimeLaunchIdentity;
  /** Ordering is local to this collector, not a shared-sink identity. */
  readonly sequence: number;
  readonly outcome?: "success" | "failure";
  readonly spanId?: string;
  readonly name?: string;
  readonly phase?: RuntimeLifecyclePhase;
  readonly boundary?: RuntimeDiagnostic["boundary"];
  readonly attributes?: RuntimeTelemetryPayload;
  readonly payload?: RuntimeTelemetryPayload;
  readonly key?: string;
  readonly value?: RuntimeTelemetryPayload;
  readonly dataStatus: "included" | "omitted";
}
export interface RuntimeTelemetrySink {
  publish(record: RuntimeTelemetryRecord): void | Promise<void>;
}

export function createTelemetry(
  launchIdentity: RuntimeLaunchIdentity,
  sink?: RuntimeTelemetrySink
): RuntimeTelemetry {
  const identity = detached(launchIdentity);
  let sequence = 0;
  function emit(kind: RuntimeTelemetryRecord["kind"], data: Partial<RuntimeTelemetryRecord>): void {
    const record = Object.freeze({
      kind,
      processId: identity.process,
      identity,
      sequence: ++sequence,
      dataStatus: "included" as const,
      ...data,
    });
    try {
      void Promise.resolve(sink?.publish(record)).catch(() => {});
    } catch {
      /* Observation cannot replace the product outcome. */
    }
  }
  return Object.freeze({
    async span<T>(input: RuntimeTelemetrySpanInput, run: () => Promise<T>): Promise<T> {
      const spanId = crypto.randomUUID();
      const data = project(() => {
        const { attributes, ...metadata } = input;
        const copy = telemetryData(metadata);
        if (!Check(SpanSchema, copy)) throw new TypeError("Invalid telemetry span metadata.");
        return {
          name: metadata.name,
          phase: metadata.phase,
          boundary: metadata.boundary,
          ...(attributes === undefined
            ? {}
            : project(() => ({ attributes: telemetryData(attributes) }))),
        };
      });
      emit("span.started", { ...data, spanId });
      try {
        const result = await run();
        emit("span.settled", { ...data, spanId, outcome: "success" });
        return result;
      } catch (error) {
        emit("span.settled", { ...data, spanId, outcome: "failure" });
        throw error;
      }
    },
    event(name: string, payload?: RuntimeTelemetryPayload) {
      emit(
        "event",
        project(() => {
          if (!Check(NameSchema, name)) throw new TypeError("Invalid event name.");
          return { name, ...(payload === undefined ? {} : { payload: telemetryData(payload) }) };
        })
      );
    },
    annotate(input: RuntimeTelemetryAnnotation) {
      emit(
        "annotation",
        project(() => {
          const key = Object.getOwnPropertyDescriptor(input, "key");
          const redaction = Object.getOwnPropertyDescriptor(input, "redaction");
          if (key === undefined || !("value" in key) || !Check(NameSchema, key.value))
            throw new TypeError("Invalid annotation key.");
          if (
            redaction !== undefined &&
            (!("value" in redaction) || !["safe", "omitted"].includes(redaction.value))
          )
            throw new TypeError("Invalid annotation redaction.");
          if (redaction?.value === "omitted")
            return { key: key.value, dataStatus: "omitted" as const };
          const value = Object.getOwnPropertyDescriptor(input, "value");
          if (value === undefined || !("value" in value))
            throw new TypeError("Invalid annotation value.");
          return { key: key.value, value: telemetryData(value.value) as RuntimeTelemetryPayload };
        })
      );
    },
  });
}

const NameSchema = Type.String({ minLength: 1 });
const SpanSchema = Type.Object(
  {
    name: NameSchema,
    phase: RuntimeLifecyclePhaseSchema,
    boundary: Type.Union(
      [
        "service",
        "plugin",
        "app",
        "resource",
        "provider",
        "sdk",
        "runtime-compiler",
        "bootgraph",
        "provisioning-kernel",
        "process-runtime",
        "execution-registry",
        "execution-runtime",
        "surface-adapter",
        "harness",
        "runtime-mounting",
        "runtime-observation",
      ].map((value) => Type.Literal(value))
    ),
    attributes: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false }
);

function project(run: () => Partial<RuntimeTelemetryRecord>): Partial<RuntimeTelemetryRecord> {
  try {
    return run();
  } catch {
    return { dataStatus: "omitted" };
  }
}

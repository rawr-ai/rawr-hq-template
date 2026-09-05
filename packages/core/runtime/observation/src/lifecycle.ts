import { ReadonlyObject, type Static, Type } from "typebox";
import { Check } from "typebox/value";
import type { RuntimeObservationSeed } from "./catalog";
import { RuntimeObservationSeedSchema } from "./catalog";
import { detached, fields } from "./data";

const identitySchema = Type.Index(RuntimeObservationSeedSchema, ["identity"]);
const id = Type.String({ minLength: 1 });
const ids = Type.Array(id, { uniqueItems: true });
const identityFields = ["app", "process", "entrypoint", "deployment", "source"] as const;
const event = <K extends string, P extends Record<string, import("typebox").TSchema>>(
  kind: K,
  properties: P
) =>
  ReadonlyObject(
    Type.Object({ kind: Type.Literal(kind), identity: identitySchema, ...properties }),
    { additionalProperties: false }
  );
const health = Type.Union([
  Type.Literal("passing"),
  Type.Literal("failing"),
  Type.Literal("unknown"),
  Type.Literal("not-applicable"),
]);
const deadline = Type.Number({ minimum: 0 });

const StartupEventSchema = Type.Union([
  event("provisioning.ready", {}),
  event("binding.ready", {}),
  event("adapters.ready", {}),
  event("process.started", {}),
  event("harness.mounted", {
    harnessId: id,
    roles: Type.Index(RuntimeObservationSeedSchema, ["roles"]),
    surfacePlanIds: ids,
  }),
  event("harness.mount.failed", { harnessId: id }),
  event("harness.health", {
    harnessId: id,
    kindOfHealth: Type.Union([Type.Literal("readiness"), Type.Literal("liveness")]),
    status: health,
    findings: Type.Array(
      Type.Object(
        {
          code: id,
          severity: Type.Union([
            Type.Literal("info"),
            Type.Literal("warning"),
            Type.Literal("error"),
          ]),
        },
        { additionalProperties: false }
      )
    ),
  }),
]);
const FinalizationEventSchema = Type.Union([
  event("harness.stop.settled", {
    harnessId: id,
    outcome: Type.Union([Type.Literal("resolved"), Type.Literal("rejected")]),
  }),
  event("process.finalization.started", { deadline, pendingNativeStop: ids }),
  event("process.finalization.deadline", { deadline, pendingNativeStop: ids }),
  event("process.finalization.settled", { deadlineExceeded: Type.Boolean() }),
]);
export type RuntimeStartupRecord = Readonly<Static<typeof StartupEventSchema>>;
export type RuntimeMountFinalizationRecord = Readonly<Static<typeof FinalizationEventSchema>>;
export type RuntimeLifecycleRecord = RuntimeStartupRecord | RuntimeMountFinalizationRecord;
export type RuntimeHarnessHealthStatus = Static<typeof health>;
export interface RuntimeHarnessStatus {
  readonly harnessId: string;
  readonly mountStatus: "unobserved" | "mounted" | "failed";
  readonly readiness: RuntimeHarnessHealthStatus;
  readonly liveness: RuntimeHarnessHealthStatus;
  readonly stopStatus: "unobserved" | "resolved" | "rejected";
}

/** Exact known wire fields only; no arbitrary finding messages or unknown payload traversal. */
export function readLifecycleRecord(
  envelope: Record<string, unknown>,
  seed: RuntimeObservationSeed
): RuntimeLifecycleRecord | undefined {
  if (envelope.correlationId !== seed.identity.process) return undefined;
  const kind = envelope.kind;
  let names: readonly string[];
  let phase = "mounting";
  let boundary = "runtime-mounting";
  switch (kind) {
    case "provisioning.ready":
    case "binding.ready":
      phase = "provisioning";
      boundary = "sdk.startApp";
      names = ["identity"];
      break;
    case "adapters.ready":
      boundary = "sdk.startApp";
      names = ["identity"];
      break;
    case "process.started":
      names = ["identity"];
      break;
    case "harness.mounted":
      names = ["identity", "harnessId", "roles", "surfacePlanIds"];
      break;
    case "harness.mount.failed":
      names = ["identity", "harnessId"];
      break;
    case "harness.health":
      names = ["identity", "harnessId", "kind", "status", "findings"];
      break;
    case "harness.stop.settled":
      names = ["identity", "harnessId", "outcome"];
      break;
    case "process.finalization.started":
    case "process.finalization.deadline":
      names = ["identity", "deadline", "pendingNativeStop"];
      break;
    case "process.finalization.settled":
      names = ["identity", "deadlineExceeded"];
      break;
    default:
      return undefined;
  }
  if (envelope.phase !== phase || envelope.boundary !== boundary) return undefined;
  const payload = fields(envelope.payload, names);
  if (payload === undefined) return undefined;
  const identity = fields(payload.identity, identityFields);
  if (identity === undefined || identityFields.some((key) => identity[key] !== seed.identity[key]))
    return undefined;
  const { kind: kindOfHealth, ...rest } = payload;
  const candidate: unknown = {
    ...rest,
    kind,
    ...(kind === "harness.health" ? { kindOfHealth } : {}),
  };
  if (!Check(StartupEventSchema, candidate) && !Check(FinalizationEventSchema, candidate))
    return undefined;
  if (
    "harnessId" in candidate &&
    !seed.harnesses.some((harness) => harness.harnessId === candidate.harnessId)
  )
    return undefined;
  if (
    candidate.kind === "harness.mounted" &&
    (candidate.roles.some((role) => !seed.roles.includes(role)) ||
      candidate.surfacePlanIds.some(
        (surfaceId) =>
          !seed.surfaces.some(
            (surface) =>
              surface.surfacePlanId === surfaceId && candidate.roles.includes(surface.role)
          )
      ))
  )
    return undefined;
  if (
    "pendingNativeStop" in candidate &&
    candidate.pendingNativeStop.some(
      (harnessId) => !seed.harnesses.some((harness) => harness.harnessId === harnessId)
    )
  )
    return undefined;
  if (
    candidate.kind === "harness.health" &&
    candidate.status === "passing" &&
    candidate.findings.some((finding) => finding.severity === "error")
  )
    return undefined;
  return detached(candidate);
}

export function createLifecycleProjection(seed: RuntimeObservationSeed) {
  let provisioning: "unobserved" | "ready" = "unobserved";
  let binding: "unobserved" | "ready" = "unobserved";
  let adapters: "unobserved" | "ready" = "unobserved";
  let finalization: "unobserved" | "draining" | "settled" = "unobserved";
  let deadline: number | null = null;
  let pendingNativeStop: readonly string[] = [];
  let deadlineExceeded = false;
  let started = false;
  const harnesses = new Map<string, RuntimeHarnessStatus>(
    seed.harnesses.map(({ harnessId }) => [
      harnessId,
      {
        harnessId,
        mountStatus: "unobserved",
        readiness: "unknown",
        liveness: "unknown",
        stopStatus: "unobserved",
      },
    ])
  );
  return {
    accept(record: RuntimeLifecycleRecord): boolean {
      const harness = "harnessId" in record ? harnesses.get(record.harnessId) : undefined;
      switch (record.kind) {
        case "provisioning.ready":
          provisioning = "ready";
          break;
        case "binding.ready":
          binding = "ready";
          break;
        case "adapters.ready":
          adapters = "ready";
          break;
        case "process.started":
          if ([...harnesses.values()].some((harness) => harness.mountStatus !== "mounted"))
            return false;
          started = true;
          break;
        case "harness.mounted":
          harnesses.set(record.harnessId, { ...harness!, mountStatus: "mounted" });
          break;
        case "harness.mount.failed":
          harnesses.set(record.harnessId, { ...harness!, mountStatus: "failed" });
          break;
        case "harness.health":
          if (harness?.mountStatus !== "mounted" || finalization !== "unobserved") return false;
          harnesses.set(record.harnessId, { ...harness, [record.kindOfHealth]: record.status });
          break;
        case "harness.stop.settled":
          if (
            !harness ||
            (harness.mountStatus !== "mounted" && !pendingNativeStop.includes(record.harnessId))
          )
            return false;
          harnesses.set(record.harnessId, { ...harness, stopStatus: record.outcome });
          pendingNativeStop = pendingNativeStop.filter((id) => id !== record.harnessId);
          break;
        case "process.finalization.started":
        case "process.finalization.deadline":
          for (const [id, status] of harnesses)
            harnesses.set(id, { ...status, readiness: "failing", liveness: "unknown" });
          finalization = "draining";
          deadline = record.deadline;
          pendingNativeStop = record.pendingNativeStop;
          deadlineExceeded ||= record.kind === "process.finalization.deadline";
          break;
        case "process.finalization.settled":
          finalization = "settled";
          deadlineExceeded ||= record.deadlineExceeded;
          pendingNativeStop = [];
          break;
      }
      return true;
    },
    snapshot() {
      const statuses = [...harnesses.values()];
      return {
        provisioning,
        binding,
        adapters,
        finalization,
        mounting: statuses.some((harness) => harness.mountStatus === "failed")
          ? ("failed" as const)
          : started
            ? ("mounted" as const)
            : ("unobserved" as const),
        harnesses: statuses,
        detail: { deadline, pendingNativeStop, deadlineExceeded },
      };
    },
  };
}

import { type Static, Type } from "typebox";
import { Check } from "typebox/value";
import type { RuntimeObservationPort, RuntimeObservationRecord } from "../../definition/src/index";
import {
  type RuntimeCatalog,
  type RuntimeFinalizationRecord,
  type RuntimeObservationSeed,
  RuntimeObservationSeedSchema,
} from "./catalog";
import { detached, fields } from "./data";
import {
  createLifecycleProjection,
  type RuntimeLifecycleRecord,
  type RuntimeStartupRecord,
  readLifecycleRecord,
} from "./lifecycle";
import {
  createTelemetry,
  type RuntimeDiagnostic,
  type RuntimeTelemetry,
  type RuntimeTelemetrySink,
} from "./telemetry";

const ReleaseFailureSchema = Type.Object(
  {
    selectionId: Type.String({ minLength: 1 }),
    providerId: Type.String({ minLength: 1 }),
    typedFailure: Type.Boolean(),
    defect: Type.Boolean(),
    interrupted: Type.Boolean(),
  },
  { additionalProperties: false }
);
type ReleaseFailure = Static<typeof ReleaseFailureSchema>;

export interface RuntimeObservation {
  readonly port: RuntimeObservationPort;
  readonly telemetry: RuntimeTelemetry;
  snapshot(): RuntimeCatalog;
}

export function createRuntimeObservation(input: {
  readonly seed: RuntimeObservationSeed;
  readonly historyLimit?: number;
  readonly sink?: RuntimeTelemetrySink;
}): RuntimeObservation {
  if (!Check(RuntimeObservationSeedSchema, input.seed))
    throw new TypeError("Observation seed is not an admitted selected-topology DTO.");
  const seed = detached(input.seed);
  const limit = input.historyLimit ?? 256;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000)
    throw new TypeError("Observation history limit must be between 1 and 10000.");
  const providers = new Map(seed.providers.map((provider) => [provider.selectionId, provider]));
  if (providers.size !== seed.providers.length)
    throw new TypeError("Observation provider selections must be unique.");
  const failed = new Set<string>();
  const telemetry = createTelemetry(seed.identity, input.sink);
  const lifecycle = createLifecycleProjection(seed);
  const observedAt = Date.now();
  let lastRecordAt: number | null = null;
  let sequence = 0;
  let dropped = 0;
  const history: {
    diagnostic: RuntimeDiagnostic;
    finalization?: RuntimeFinalizationRecord;
    startup?: RuntimeStartupRecord;
  }[] = [];

  function appendLifecycle(record: RuntimeLifecycleRecord): void {
    lastRecordAt = Date.now();
    const isFinalization =
      record.kind.startsWith("process.finalization.") || record.kind === "harness.stop.settled";
    const failure =
      record.kind === "harness.mount.failed" ||
      (record.kind === "harness.stop.settled" && record.outcome === "rejected");
    const diagnostic: RuntimeDiagnostic = {
      id: `observation:${++sequence}`,
      severity: failure ? "error" : "info",
      phase: isFinalization
        ? "observation"
        : record.kind === "provisioning.ready" || record.kind === "binding.ready"
          ? "provisioning"
          : "mounting",
      recordKind: isFinalization ? "finalization" : "status",
      boundary:
        record.kind === "provisioning.ready" ||
        record.kind === "binding.ready" ||
        record.kind === "adapters.ready"
          ? "sdk"
          : "runtime-mounting",
      code: record.kind,
      message: "An admitted runtime lifecycle observation was recorded.",
      redaction: "safe",
      payload: record,
    };
    if (
      record.kind === "harness.stop.settled" ||
      record.kind === "process.finalization.started" ||
      record.kind === "process.finalization.deadline" ||
      record.kind === "process.finalization.settled"
    )
      history.push({ diagnostic, finalization: record });
    else history.push({ diagnostic, startup: record });
    if (history.length > limit) {
      history.shift();
      dropped++;
    }
    telemetry.event(record.kind, record);
  }

  function append(payload?: ReleaseFailure): void {
    lastRecordAt = Date.now();
    const diagnostic: RuntimeDiagnostic =
      payload === undefined
        ? {
            id: `observation:${++sequence}`,
            severity: "warning",
            phase: "observation",
            recordKind: "finding",
            boundary: "runtime-observation",
            code: "observation.unsupported",
            message: "Observation input was not admitted.",
            redaction: "omitted",
          }
        : {
            id: `observation:${++sequence}`,
            severity: "error",
            phase: "observation",
            recordKind: "finalization",
            boundary: "provider",
            code: "provider.release.failed",
            message: "A selected provider reported release failure.",
            redaction: "safe",
            payload,
          };
    if (payload !== undefined) failed.add(payload.selectionId);
    history.push({
      diagnostic,
      ...(payload === undefined
        ? {}
        : { finalization: { kind: "provider.release.failed" as const, ...payload } }),
    });
    if (history.length > limit) {
      history.shift();
      dropped++;
    }
  }
  const port: RuntimeObservationPort = Object.freeze({
    publish(record: RuntimeObservationRecord): void {
      try {
        const envelope = fields(record, ["phase", "boundary", "kind", "correlationId", "payload"]);
        if (envelope !== undefined) {
          const lifecycleRecord = readLifecycleRecord(envelope, seed);
          if (lifecycleRecord !== undefined && lifecycle.accept(lifecycleRecord)) {
            appendLifecycle(lifecycleRecord);
            return;
          }
        }
        if (
          envelope?.phase === "provisioning" &&
          envelope.boundary === "provider.release" &&
          envelope.kind === "provider.release.failed" &&
          envelope.correlationId === seed.identity.process
        ) {
          const payload = fields(envelope.payload, [
            "selectionId",
            "providerId",
            "typedFailure",
            "defect",
            "interrupted",
          ]);
          if (
            Check(ReleaseFailureSchema, payload) &&
            providers.get(payload.selectionId)?.providerId === payload.providerId
          ) {
            append(Object.freeze({ ...payload }));
            telemetry.event("provider.release.failed", payload);
            return;
          }
        }
      } catch {
        /* Foreign object traps are unsupported evidence, not product failures. */
      }
      append();
    },
  });
  return Object.freeze({
    port,
    telemetry,
    snapshot(): RuntimeCatalog {
      const state = lifecycle.snapshot();
      return detached({
        processIdentity: {
          id: seed.identity.process,
          deployment: seed.identity.deployment,
          source: seed.identity.source,
        },
        appIdentity: { id: seed.identity.app },
        entrypointIdentity: { id: seed.identity.entrypoint },
        roles: seed.roles,
        derivedAuthoring: seed.derivedAuthoring,
        resources: seed.resources,
        providers: seed.providers.map((provider) => ({
          ...provider,
          releaseStatus: failed.has(provider.selectionId)
            ? ("failed" as const)
            : ("unobserved" as const),
        })),
        providerDependencyGraph: seed.providerDependencyGraph,
        plugins: seed.plugins,
        serviceAttachments: seed.serviceAttachments,
        workflowDispatchers: seed.workflowDispatchers,
        executionPlans: seed.executionPlans,
        executionRegistry: { ...seed.executionRegistry, status: state.binding },
        surfaces: seed.surfaces,
        harnesses: state.harnesses,
        finalization: state.detail,
        lifecycleTimestamps: { observedAt, lastRecordAt },
        lifecycleStatus: {
          topology: "selected" as const,
          provisioning: state.provisioning,
          binding: state.binding,
          adapters: state.adapters,
          execution: "unobserved" as const,
          mounting: state.mounting,
          finalization:
            state.finalization === "unobserved" && failed.size > 0
              ? ("failure-observed" as const)
              : state.finalization,
        },
        diagnostics: history.map((item) => item.diagnostic),
        topologyRecords: [
          {
            kind: "topology.selected" as const,
            processId: seed.identity.process,
            profileId: seed.profileId,
          },
        ],
        startupRecords: history.flatMap((item) =>
          item.startup === undefined ? [] : [item.startup]
        ),
        executionRecords: [],
        finalizationRecords: history.flatMap((item) =>
          item.finalization === undefined ? [] : [item.finalization]
        ),
        retention: { limit, dropped },
      });
    },
  });
}

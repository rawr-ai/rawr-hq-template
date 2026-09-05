import type { AppRole, RuntimeLaunchIdentity } from "../../definition/src/app";
import type { RuntimeObservationPort } from "../../definition/src/observation";
import type {
  HarnessDescriptor,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessHealthStatus,
  HarnessReportSink,
} from "../../harnesses/src/index";
import {
  assertHarnessHealthReport,
  assertRequiredResourcesReady,
} from "../../harnesses/src/native-contract";
import {
  type MountReadyProcess,
  type MountReadySurfaceRuntimeRecord,
  readMountReadyProcessHandoff,
  readMountReadySurfaceRuntimeRecord,
} from "../../process-runtime/src/mount-ready-process";
import {
  createFinalization,
  type FinalizationSnapshot,
  type NativeStopPolicy,
  validateFinalizationPolicy,
} from "./finalization";
import type { StartedHarness } from "./started-harness";

export interface ProcessHealthSnapshot {
  readonly identity: RuntimeLaunchIdentity;
  readonly kind: HarnessHealthKind;
  readonly status: HarnessHealthStatus;
  readonly reports: readonly HarnessHealthReport[];
}

export interface MountedProcess {
  readonly identity: RuntimeLaunchIdentity;
  readonly roles: readonly AppRole[];
  stop(): Promise<void>;
  /** No automatic startup probes; a query concerns only this selected process. */
  health(kind: HarnessHealthKind): Promise<ProcessHealthSnapshot>;
  finalization(): FinalizationSnapshot;
}

export interface MountProcessInput<TPayload = unknown> {
  readonly process: MountReadyProcess<TPayload>;
  readonly harnesses: readonly HarnessDescriptor<MountReadySurfaceRuntimeRecord<TPayload>>[];
  readonly finalization: NativeStopPolicy;
  readonly observation: RuntimeObservationPort;
}

function strings(value: readonly string[]): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.length === 0) ||
    new Set(value).size !== value.length
  )
    throw new TypeError("Harness metadata requires distinct nonempty strings.");
  return Object.freeze([...value]);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((item, i) => item === right[i])
  );
}

function copyReport(report: HarnessHealthReport): HarnessHealthReport {
  return Object.freeze({
    launchIdentity: report.launchIdentity,
    harnessId: report.harnessId,
    kind: report.kind,
    status: report.status,
    findings: Object.freeze(report.findings.map((finding) => Object.freeze({ ...finding }))),
  });
}

/** Consume one exact prepared process; native implementations retain their own lifecycle mechanics. */
export async function mountProcess<TPayload>(
  input: MountProcessInput<TPayload>
): Promise<MountedProcess> {
  const process = input.process;
  const handoff = readMountReadyProcessHandoff(process);
  handoff.claim();
  const identity = process.identity;
  const processRoles = process.roles;
  const processStop = Object.freeze({ closeAdmission: process.closeAdmission, stop: process.stop });
  let cleanup = () => {
    process.closeAdmission();
    return process.stop();
  };
  try {
    const policy = validateFinalizationPolicy(input.finalization);
    const observation = input.observation;
    const publish = observation?.publish;
    if (typeof publish !== "function")
      throw new TypeError("Mounting requires the definition-owned observation port.");
    assertRequiredResourcesReady(process.requiredResources);
    const hasRequiredResources = process.requiredResources.resources.length > 0;
    if (!Array.isArray(input.harnesses))
      throw new TypeError("Selected harnesses must be an array.");
    const selectedIds = new Set(process.harnessIds);
    const seen = new Set<string>();
    const selections = input.harnesses.map((descriptor) => {
      if (
        descriptor === null ||
        typeof descriptor !== "object" ||
        typeof descriptor.id !== "string" ||
        !selectedIds.has(descriptor.id) ||
        seen.has(descriptor.id) ||
        typeof descriptor.mount !== "function"
      )
        throw new TypeError("Harness descriptors must match the selected process exactly once.");
      seen.add(descriptor.id);
      const roles = strings(descriptor.roles);
      const surfaces = strings(descriptor.surfaces);
      const records = Object.freeze(
        process.records.filter((record) => record.harnessId === descriptor.id)
      );
      if (records.length === 0 && !process.roles.some((role) => roles.includes(role)))
        throw new TypeError("An empty-payload harness must support a selected process role.");
      for (const record of records) {
        readMountReadySurfaceRuntimeRecord(process, record);
        if (!roles.includes(record.role) || !surfaces.includes(record.surface))
          throw new TypeError("A selected native harness does not support its prepared surface.");
      }
      return {
        descriptor,
        id: descriptor.id,
        roles,
        surfaces,
        records,
        mount: descriptor.mount,
        reports: new Map<HarnessHealthKind, HarnessHealthReport>(),
      };
    });
    if (
      seen.size !== selectedIds.size ||
      process.records.some((record) => !seen.has(record.harnessId))
    )
      throw new TypeError("Harness descriptors do not cover the complete prepared process.");

    const started: StartedHarness[] = [];
    const observe = (kind: string, payload: Readonly<Record<string, unknown>>) => {
      try {
        void Promise.resolve(
          publish.call(observation, {
            phase: "mounting",
            boundary: "runtime-mounting",
            kind,
            correlationId: identity.process,
            payload: Object.freeze({ identity, ...payload }),
          })
        ).catch(() => {});
      } catch {
        /* Read-model failure cannot change native ownership or outcomes. */
      }
    };
    const finalization = createFinalization({ process: processStop, started, policy, observe });
    cleanup = finalization.stop;
    const publishHealth = (report: HarnessHealthReport) => {
      observe("harness.health", {
        harnessId: report.harnessId,
        kind: report.kind,
        status: report.status,
        findings: Object.freeze(
          report.findings.map(({ code, severity }) => Object.freeze({ code, severity }))
        ),
      });
    };
    const unknown = (id: string, kind: HarnessHealthKind, code: string): HarnessHealthReport =>
      Object.freeze({
        launchIdentity: identity,
        harnessId: id,
        kind,
        status: "unknown",
        findings: Object.freeze([
          Object.freeze({
            code,
            severity: "warning",
            message: "Native health evidence is unavailable.",
          }),
        ]),
      });

    for (const selection of selections) {
      const id = selection.id;
      const acceptedReports = selection.reports;
      let published = false;
      const accept = (report: HarnessHealthReport): HarnessHealthReport | undefined => {
        try {
          if (!finalization.isRunning()) return undefined;
          assertHarnessHealthReport(report, {
            launchIdentity: identity,
            harnessId: id,
            kind: report?.kind,
          });
          if (report.kind !== "readiness" && report.kind !== "liveness")
            throw new TypeError("Native health kind is invalid.");
          const copy = copyReport(report);
          acceptedReports.set(copy.kind, copy);
          if (published) publishHealth(copy);
          return copy;
        } catch {
          // A malformed observation is refused; it must not fail a native mount or replace prior evidence.
          return undefined;
        }
      };
      const reports: HarnessReportSink = Object.freeze({
        report: (report: HarnessHealthReport) => {
          accept(report);
        },
      });
      try {
        if (
          selection.descriptor.id !== selection.id ||
          selection.descriptor.mount !== selection.mount ||
          !sameStrings(selection.descriptor.roles, selection.roles) ||
          !sameStrings(selection.descriptor.surfaces, selection.surfaces)
        )
          throw new TypeError("A selected native harness changed after mounting preflight.");
        const nativeHandle = await selection.mount.call(
          selection.descriptor,
          Object.freeze({
            launchIdentity: identity,
            roles: processRoles,
            mountReadyPayloads: selection.records,
            processAccess: process.processAccess,
            requiredResources: process.requiredResources,
            reports,
          })
        );
        if (nativeHandle === null || typeof nativeHandle !== "object")
          throw new TypeError("A successful native mount must return its stop handle.");
        const stop = nativeHandle.stop;
        if (typeof stop !== "function")
          throw new TypeError("A successful native mount must return its stop handle.");
        const owned: StartedHarness = {
          descriptorId: selection.id,
          nativeHandle,
          stop,
          readiness: undefined,
          liveness: undefined,
          findings: Object.freeze(
            [...selection.reports.values()].flatMap((report) => report.findings)
          ),
          launchIdentity: identity,
          mount: Object.freeze({
            mountedAt: new Date().toISOString(),
            roles: processRoles,
            surfacePlanIds: Object.freeze(selection.records.map((record) => record.surfacePlanId)),
          }),
          reports: selection.reports,
        };
        // Take cleanup custody before optional native properties can throw.
        started.push(owned);
        owned.readiness = nativeHandle.readiness;
        owned.liveness = nativeHandle.liveness;
        if (
          (owned.readiness !== undefined && typeof owned.readiness !== "function") ||
          (owned.liveness !== undefined && typeof owned.liveness !== "function")
        )
          throw new TypeError("Native health probes must be callable when supplied.");
        Object.freeze(owned);
        observe("harness.mounted", {
          harnessId: owned.descriptorId,
          roles: owned.mount.roles,
          surfacePlanIds: owned.mount.surfacePlanIds,
        });
        published = true;
        for (const report of owned.reports.values()) publishHealth(report);
      } catch (error) {
        observe("harness.mount.failed", { harnessId: selection.id });
        throw error;
      }
    }

    observe("process.started", {});

    async function query(kind: HarnessHealthKind): Promise<ProcessHealthSnapshot> {
      const reports = await Promise.all(
        started.map(async (item) => {
          if (!finalization.isRunning())
            return unknown(item.descriptorId, kind, "harness.health.finalizing");
          const probe = item[kind];
          if (probe === undefined)
            return (
              item.reports.get(kind) ?? unknown(item.descriptorId, kind, "harness.health.missing")
            );
          let report: HarnessHealthReport;
          try {
            report = await probe.call(item.nativeHandle);
            assertHarnessHealthReport(report, {
              launchIdentity: identity,
              harnessId: item.descriptorId,
              kind,
            });
            report = copyReport(report);
          } catch {
            report = unknown(item.descriptorId, kind, "harness.health.probe_rejected");
          }
          if (!finalization.isRunning())
            return unknown(item.descriptorId, kind, "harness.health.finalizing");
          item.reports.set(kind, report);
          publishHealth(report);
          return report;
        })
      );
      const closed = !finalization.isRunning();
      const status: HarnessHealthStatus = closed
        ? kind === "readiness"
          ? "failing"
          : "unknown"
        : reports.some(
              (report) =>
                report.status === "failing" ||
                report.findings.some((finding) => finding.severity === "error")
            )
          ? "failing"
          : reports.some((report) => report.status === "unknown")
            ? "unknown"
            : (kind === "readiness" && hasRequiredResources) ||
                reports.some((report) => report.status === "passing")
              ? "passing"
              : "not-applicable";
      return Object.freeze({
        identity,
        kind,
        status,
        reports: Object.freeze(reports),
      });
    }

    return Object.freeze({
      identity,
      roles: processRoles,
      stop: finalization.stop,
      finalization: finalization.snapshot,
      health(kind: HarnessHealthKind): Promise<ProcessHealthSnapshot> {
        if (kind !== "readiness" && kind !== "liveness")
          throw new TypeError("Unknown process health query.");
        if (!finalization.isRunning())
          throw new TypeError("Process finalization has closed health admission.");
        return query(kind);
      },
    });
  } catch (error) {
    try {
      await cleanup();
    } catch {
      /* The original startup failure stays primary. */
    }
    throw error;
  }
}

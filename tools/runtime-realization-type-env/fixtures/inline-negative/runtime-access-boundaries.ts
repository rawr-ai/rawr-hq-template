import type { MiniRuntimeResourceAccess } from "../../src/mini-runtime/runtime-access";
import type { ProcessExecutionRuntime } from "../../src/mini-runtime/process-runtime";
import type { RuntimeAccess } from "../../src/spine/artifacts";
import {
  createAsyncStepBridgePayload,
  lowerAsyncStepCallback,
} from "../../src/mini-runtime/adapters/async";
import {
  createServerAdapterCallbackPayload,
  lowerServerCallback,
} from "../../src/mini-runtime/adapters/server";
import {
  CreateWorkItemRef,
  CreateWorkItemRouteDescriptor,
  SyncWorkItemStepRef,
} from "../positive/app-and-plan-artifacts";

declare const access: MiniRuntimeResourceAccess;
declare const runtimeAccess: RuntimeAccess;
declare const runtime: ProcessExecutionRuntime;

access.requireResource("database");
access.optionalResource("database");
access.resourceMetadata("database");
access.telemetry().event("runtime.resource.accessed");
access.emitTopology({ kind: "runtime.topology" });
access.emitDiagnostic({ code: "runtime.diagnostic", message: "diagnostic" });

// @ts-expect-error mini runtime access must not expose raw resource maps.
access.resources;

// @ts-expect-error runtime access must not expose raw resource maps.
runtimeAccess.resources;

// @ts-expect-error mini runtime access must not expose raw runtime handles.
access.runtime;

// @ts-expect-error mini runtime access must not expose unredacted/raw getters.
access.getRaw("database");

// @ts-expect-error runtime access does not expose observation readback.
access.records();

// @ts-expect-error runtime access does not expose topology readback.
access.topologyRecords();

// @ts-expect-error runtime access does not expose diagnostic readback.
access.diagnosticRecords();

// @ts-expect-error runtime access does not expose telemetry event readback.
access.telemetryEvents();

// @ts-expect-error async adapter accepts async-step refs only.
lowerAsyncStepCallback(runtime, { ref: CreateWorkItemRef, context: {} });

// @ts-expect-error server adapter accepts server refs only.
lowerServerCallback(runtime, { ref: SyncWorkItemStepRef, context: {} });

// @ts-expect-error async bridge payloads are created from async-step refs only.
createAsyncStepBridgePayload({ ref: CreateWorkItemRef });

// @ts-expect-error server callback payloads pair server route descriptors with server refs only.
createServerAdapterCallbackPayload({ routeDescriptor: CreateWorkItemRouteDescriptor, ref: SyncWorkItemStepRef });

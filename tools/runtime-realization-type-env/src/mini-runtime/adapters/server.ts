import type {
  ExecutionDescriptorRef,
  ServerAdapterCallbackPayload,
  ServerRouteDescriptor,
} from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";
import {
  delegateAdapterInvocation,
  type AdapterDelegationInput,
} from "./delegation";

export interface ServerCallbackInput extends Omit<AdapterDelegationInput, "ref"> {
  readonly ref: Extract<
    ExecutionDescriptorRef,
    { boundary: "plugin.server-api" | "plugin.server-internal" }
  >;
}

export interface ServerAdapterCallbackInput
  extends Omit<AdapterDelegationInput, "ref"> {}

function routePathMatches(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function assertServerRoutePayload(
  payload: ServerAdapterCallbackPayload,
): void {
  const { ref, routeDescriptor } = payload;

  if (
    ref.boundary !== "plugin.server-api" &&
    ref.boundary !== "plugin.server-internal"
  ) {
    throw new Error(
      `server adapter payload cannot invoke ${ref.boundary} boundary ${ref.executionId}`,
    );
  }

  if (
    routeDescriptor.appId !== ref.appId ||
    routeDescriptor.executionId !== ref.executionId ||
    routeDescriptor.boundary !== ref.boundary ||
    routeDescriptor.role !== ref.role ||
    routeDescriptor.surface !== ref.surface ||
    routeDescriptor.capability !== ref.capability ||
    !routePathMatches(routeDescriptor.routePath, ref.routePath)
  ) {
    throw new Error(
      `server adapter payload ${ref.executionId} route descriptor does not match its execution ref`,
    );
  }
}

export function createServerAdapterCallbackPayload(input: {
  readonly routeDescriptor: ServerRouteDescriptor;
  readonly ref: ServerCallbackInput["ref"];
}): ServerAdapterCallbackPayload {
  const payload = {
    kind: "adapter.server-callback-payload",
    ref: input.ref,
    routeDescriptor: input.routeDescriptor,
    diagnostics: [],
  } as const satisfies ServerAdapterCallbackPayload;

  assertServerRoutePayload(payload);
  return payload;
}

export async function lowerServerCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: ServerCallbackInput,
) {
  return delegateAdapterInvocation<TOutput>("server", runtime, input);
}

/**
 * Lowers a validated server callback payload into a runtime-owned invocation.
 * The route descriptor must preserve the exact execution ref identity, but this
 * is still not the real server harness or a public routing API contract.
 */
export async function lowerServerAdapterCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  payload: ServerAdapterCallbackPayload,
  input: ServerAdapterCallbackInput,
) {
  assertServerRoutePayload(payload);
  return lowerServerCallback<TOutput>(runtime, {
    ref: payload.ref,
    context: input.context,
    instrumentation: input.instrumentation,
  });
}

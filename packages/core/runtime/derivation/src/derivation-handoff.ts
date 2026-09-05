import type {
  AppRole,
  EffectExecutionPolicy,
  RuntimeLaunchIdentity,
  RuntimeProvider,
  ServiceRuntimeExport,
} from "../../definition/src/index";
import type { RuntimeDerivationResult } from "./derive-runtime-artifacts";
import type { ExecutionDescriptorRef } from "./execution-descriptor-ref";
import type { NormalizedAuthoringGraph } from "./normalized-authoring-graph";

const handoffCarrier = Symbol("habitat.runtime-derivation.handoff");

/** Exact cold references travel beside inspectable data, never inside it. */
export interface RuntimeDerivationHandoff {
  readonly graph: NormalizedAuthoringGraph;
  readonly identity: RuntimeLaunchIdentity;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
  readonly harnessIds: readonly string[];
  readonly providers: readonly (readonly [string, RuntimeProvider])[];
  readonly services: readonly (readonly [string, ServiceRuntimeExport])[];
  readonly resourceBindings: readonly (readonly [string, string])[];
  readonly executionPolicies: readonly (readonly [ExecutionDescriptorRef, EffectExecutionPolicy])[];
}

export interface RuntimeDerivationHandoffCarrier {
  readonly [handoffCarrier]: RuntimeDerivationHandoff;
}

type RuntimeDerivationFields = Omit<RuntimeDerivationResult, keyof RuntimeDerivationHandoffCarrier>;

function hasHandoff(result: RuntimeDerivationFields): result is RuntimeDerivationResult {
  return Object.hasOwn(result, handoffCarrier);
}

export function readRuntimeDerivationHandoff(
  result: RuntimeDerivationResult
): RuntimeDerivationHandoff {
  if (!hasHandoff(result))
    throw new TypeError("Executable compilation requires a derived handoff.");
  const handoff = result[handoffCarrier];
  if (handoff.graph !== result.graph || result.graph.topology !== result.topology) {
    throw new TypeError("The derivation handoff does not match its inspectable graph.");
  }
  return handoff;
}

export function attachRuntimeDerivationHandoff(
  result: RuntimeDerivationFields,
  handoff: RuntimeDerivationHandoff
): RuntimeDerivationResult {
  Object.defineProperty(result, handoffCarrier, {
    value: Object.freeze(handoff),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  if (!hasHandoff(result)) throw new TypeError("The derivation handoff could not be attached.");
  return Object.freeze(result);
}

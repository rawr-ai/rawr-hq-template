import { orderBootgraph } from "../../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../../runtime/compiler/src/index";
import type { Entrypoint, RuntimeObservationRecord } from "../../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../../runtime/derivation/src/index";
import {
  type MountedProcess,
  mountProcess,
  type NativeStopPolicy,
  validateFinalizationPolicy,
} from "../../../runtime/mounting/src/index";
import {
  createRuntimeObservation,
  type RuntimeCatalog,
  type RuntimeTelemetry,
  type RuntimeTelemetrySink,
} from "../../../runtime/observation/src/index";
import { createProcessRuntime } from "../../../runtime/process-runtime/src/index";
import {
  provisionProcess,
  type RuntimeSourceInput,
} from "../../../runtime/substrate/effect/src/index";
import { type NativeIntegration, resolveIntegrations } from "./integrations";
import { selectedObservationSeed } from "./observation";

export interface StartAppOptions {
  readonly sources: RuntimeSourceInput;
  readonly integrations: readonly NativeIntegration[];
  readonly finalization: NativeStopPolicy;
  readonly observation?: {
    readonly historyLimit?: number;
    readonly sink?: RuntimeTelemetrySink;
  };
}

export interface StartedProcess extends MountedProcess {
  catalog(): RuntimeCatalog;
  readonly telemetry: RuntimeTelemetry;
}

/** One terminal composition of the exact selected process, never a whole-app controller. */
export async function startApp(
  entrypoint: Entrypoint,
  options: StartAppOptions
): Promise<StartedProcess> {
  const finalization = validateFinalizationPolicy(options.finalization);
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: entrypoint.profile.id });
  const compilation = compileRuntimePlan({ derivation });
  const bootgraph = orderBootgraph(compilation.plan.bootgraphInput);
  const { assignments, harnesses } = resolveIntegrations(compilation.plan, options.integrations);
  const observation = createRuntimeObservation({
    seed: selectedObservationSeed(compilation.plan),
    historyLimit: options.observation?.historyLimit,
    sink: options.observation?.sink,
  });
  function publish(kind: string, phase: RuntimeObservationRecord["phase"]): void {
    observation.port.publish({
      kind,
      phase,
      boundary: "sdk.startApp",
      correlationId: entrypoint.identity.process,
      payload: { identity: entrypoint.identity },
    });
  }
  const provisioned = await provisionProcess({
    compilation,
    bootgraph,
    sources: options.sources,
    observation: observation.port,
  });
  publish("provisioning.ready", "provisioning");
  const runtime = await createProcessRuntime({
    compilation,
    provisioned,
    descriptorTable: derivation.executionDescriptorTable,
  });
  publish("binding.ready", "provisioning");
  const process = await Promise.resolve()
    .then(() => runtime.prepareMounts({ launchIdentity: entrypoint.identity, assignments }))
    .catch(async (error: unknown) => {
      try {
        await runtime.stop();
      } catch {
        /* Lowering failure remains primary. */
      }
      throw error;
    });
  publish("adapters.ready", "mounting");
  const mounted = await mountProcess({
    process,
    harnesses,
    finalization,
    observation: observation.port,
  });
  return Object.freeze({
    ...mounted,
    catalog: observation.snapshot,
    telemetry: observation.telemetry,
  });
}

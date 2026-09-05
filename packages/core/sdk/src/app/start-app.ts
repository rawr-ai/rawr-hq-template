import { orderBootgraph } from "../../../runtime/bootgraph/src/bootgraph";
import { compileRuntimePlan } from "../../../runtime/compiler/src/compile-runtime-plan";
import type { Entrypoint } from "../../../runtime/definition/src/app";
import type { RuntimeObservationRecord } from "../../../runtime/definition/src/observation";
import { deriveRuntimeArtifacts } from "../../../runtime/derivation/src/derive-runtime-artifacts";
import {
  type NativeStopPolicy,
  validateFinalizationPolicy,
} from "../../../runtime/mounting/src/finalization";
import { type MountedProcess, mountProcess } from "../../../runtime/mounting/src/mount-process";
import type { RuntimeCatalog } from "../../../runtime/observation/src/catalog";
import { createRuntimeObservation } from "../../../runtime/observation/src/collector";
import {
  type RuntimeTelemetry,
  type RuntimeTelemetrySink,
} from "../../../runtime/observation/src/telemetry";
import { createProcessRuntime } from "../../../runtime/process-runtime/src/create-process-runtime";
import type { RuntimeSourceInput } from "../../../runtime/substrate/effect/src/config";
import { provisionProcess } from "../../../runtime/substrate/effect/src/provision-process";
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
    observation: observation.port,
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

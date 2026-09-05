import { Context } from "effect";
import { Check } from "typebox/value";

import type { Bootgraph } from "../../../bootgraph/src/index";
import type { RuntimeCompilationResult } from "../../../compiler/src/compile-runtime-plan";
import type { AppRole } from "../../../definition/src/app";
import type { RuntimeObservationPort } from "../../../definition/src/observation";
import type { RuntimeResourceMap } from "../../../definition/src/provider";
import type { ResourceRequirement } from "../../../definition/src/resource";
import { admitProvisioning } from "./admission";
import { preflightConfig, type RuntimeSourceInput } from "./config";
import { createManagedRuntimeHandle } from "./managed-runtime-handle";
import { ProvisionedResourceValues, type ReadyProvider } from "./provider-lifecycle";
import {
  attachProvisionedProcessHandoff,
  type ProvisionedProcess,
  ProvisionedProcessSchema,
  type ProvisioningFinding,
} from "./provisioned-process";
import { createResourceMap } from "./resource-map";

export interface ProvisionProcessInput {
  readonly compilation: RuntimeCompilationResult;
  readonly bootgraph: Bootgraph;
  readonly sources: RuntimeSourceInput;
  readonly observation?: RuntimeObservationPort;
}

export async function provisionProcess(input: ProvisionProcessInput): Promise<ProvisionedProcess> {
  const admitted = admitProvisioning(input.compilation, input.bootgraph);
  const config = await preflightConfig(input.compilation, input.sources);
  const { plan, references } = input.compilation;
  const findings: ProvisioningFinding[] = [];
  const observation: RuntimeObservationPort = {
    publish(record) {
      if (record.kind === "provider.release.failed") {
        findings.push(Object.freeze({ kind: "provisioning.finding", code: record.kind }));
      }
      try {
        input.observation?.publish(record);
      } catch {
        findings.push(
          Object.freeze({ kind: "provisioning.finding", code: "observation.publish.failed" })
        );
      }
    },
  };
  const providers: readonly ReadyProvider[] = input.bootgraph.order.map((key) => ({
    key,
    provider: references.getProvider(key.selectionId),
    config: config.provider(key.selectionId),
    dependencies: admitted.dependencies.get(key.selectionId) ?? [],
  }));
  const managedRuntime = await createManagedRuntimeHandle({
    processId: plan.identity.process,
    providers,
    observation,
  });
  try {
    const values = Context.get(managedRuntime.context, ProvisionedResourceValues);
    const processEntries: (readonly [ResourceRequirement, unknown])[] = [];
    const roleEntries = new Map<AppRole, (readonly [ResourceRequirement, unknown])[]>(
      plan.roles.map((role) => [role, []])
    );
    const resources = new Map(
      plan.compiledResources.map((resource) => [resource.selectionId, resource])
    );
    for (const [id, requirement] of admitted.requirements) {
      const selectionId = admitted.selections.get(id);
      if (selectionId === undefined) continue;
      const resource = resources.get(selectionId);
      if (resource === undefined) throw new TypeError("Ready resource selection is absent.");
      const entry = Object.freeze([requirement, values.get(selectionId)] as const);
      if (resource.resource.lifetime === "process") {
        processEntries.push(entry);
      }
      for (const [role, entries] of roleEntries) {
        if (resource.resource.role === undefined || resource.resource.role === role) {
          entries.push(entry);
        }
      }
    }
    const roleResources: Partial<Record<AppRole, RuntimeResourceMap>> = {};
    for (const [role, entries] of roleEntries) roleResources[role] = createResourceMap(entries);
    const process = attachProvisionedProcessHandoff(
      {
        kind: "provisioned.process",
        appId: plan.identity.app,
        processId: plan.identity.process,
        entrypointId: plan.identity.entrypoint,
        profileId: plan.profileId,
        roles: plan.roles,
        managedRuntime,
        processResources: createResourceMap(processEntries),
        roleResources: Object.freeze(roleResources),
        get findings() {
          return Object.freeze([...findings]);
        },
      },
      { compilation: input.compilation, values, config }
    );
    if (!Check(ProvisionedProcessSchema, process))
      throw new TypeError("Provisioning output is inconsistent.");
    return process;
  } catch (error) {
    await managedRuntime.dispose();
    throw error;
  }
}

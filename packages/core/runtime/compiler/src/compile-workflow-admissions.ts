import type { ResourceRequirement as AuthoredResourceRequirement } from "../../definition/src/resource";
import { readWorkflowDispatcherUse } from "../../definition/src/workflow-dispatcher-use";
import {
  canonicalJson,
  pluginOwnerId,
  workflowDispatcherId,
} from "../../derivation/src/identity-policy";
import type {
  NormalizedPluginDefinition,
  ResourceRequirement,
} from "../../derivation/src/normalized-authoring-graph";
import type { SurfaceRuntimePlan } from "../../derivation/src/surface-runtime-plan";
import type { RuntimeWorkflowAdmissionSource } from "../../derivation/src/workflow-admission-source";
import type { WorkflowDispatcherDescriptor } from "../../derivation/src/workflow-dispatcher-descriptor";
import type { RuntimeCompiledWorkflowAdmission } from "./runtime-workflow-admission";

function refuse(reason: string): never {
  throw new TypeError(`Runtime compilation refused: workflow admission ${reason}.`);
}

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/** Derivation proved app membership; compilation checks only this selected cross-owner relation. */
export function compileSurfaceWorkflowAdmissions(input: {
  readonly appId: string;
  readonly surface: SurfaceRuntimePlan;
  readonly plugin: NormalizedPluginDefinition;
  readonly sources: readonly RuntimeWorkflowAdmissionSource[];
  readonly descriptors: ReadonlyMap<string, WorkflowDispatcherDescriptor>;
  readonly requirements: ReadonlyMap<string, ResourceRequirement>;
  readonly resourceReferences: ReadonlyMap<string, AuthoredResourceRequirement>;
  readonly resourceBindings: ReadonlyMap<string, string>;
}): readonly RuntimeCompiledWorkflowAdmission[] {
  const { surface, sources, plugin } = input;
  const compiled: RuntimeCompiledWorkflowAdmission[] = [];
  const caller = sources[0]?.caller;
  let previousName: string | undefined;
  for (const source of sources) {
    if (
      surface.role !== "server" ||
      !["server/api", "server/internal"].includes(surface.surface) ||
      !Object.isFrozen(source) ||
      !Object.isFrozen(source.workflows) ||
      typeof source.useName !== "string" ||
      (previousName !== undefined && compare(previousName, source.useName) >= 0)
    )
      refuse("caller or named use order");
    previousName = source.useName;
    const { target } = source;
    if (
      caller === undefined ||
      source.caller !== caller ||
      caller.kind !== "plugin.definition" ||
      caller.id !== plugin.plugin.pluginId ||
      caller.instance !== plugin.plugin.instance ||
      caller.role !== surface.role ||
      caller.surface !== surface.surface ||
      caller.capability !== surface.capability ||
      caller.workflows[source.useName] !== source.use ||
      !caller.resourceRequirements.includes(source.client)
    )
      refuse("exact caller relation");
    const authored = readWorkflowDispatcherUse(source.use);
    if (
      authored === undefined ||
      source.use.kind !== "workflow.dispatcher-use" ||
      authored.plugin !== target ||
      authored.workflows !== source.workflows ||
      authored.client !== source.client
    )
      refuse("exact use source relation");
    const descriptor = input.descriptors.get(source.descriptorId);
    if (
      descriptor === undefined ||
      target.kind !== "plugin.definition" ||
      target.role !== "async" ||
      target.surface !== "async/workflow" ||
      descriptor.appId !== input.appId ||
      descriptor.pluginOwnerId !==
        pluginOwnerId({
          pluginId: target.id,
          ...(target.instance === undefined ? {} : { instance: target.instance }),
        }) ||
      descriptor.role !== target.role ||
      descriptor.surface !== target.surface ||
      descriptor.capability !== target.capability ||
      source.workflows.length === 0
    )
      refuse("target descriptor relation");
    const { kind: _kind, descriptorId: _id, ...identity } = descriptor;
    if (workflowDispatcherId(identity) !== descriptor.descriptorId) refuse("descriptor identity");
    const workflowIds = source.workflows
      .map((workflow) => {
        if (
          !target.workflows.includes(workflow) ||
          workflow.kind !== "async.workflow" ||
          typeof workflow.id !== "string" ||
          typeof workflow.eventName !== "string" ||
          workflow.inputSchema?.kind !== "runtime.schema" ||
          typeof workflow.inputSchema.validate !== "function" ||
          typeof workflow.inputSchema.decode !== "function"
        )
          refuse("exact workflow and schema relation");
        return workflow.id;
      })
      .sort(compare);
    if (
      new Set(workflowIds).size !== workflowIds.length ||
      canonicalJson(workflowIds) !== canonicalJson(descriptor.workflowIds)
    )
      refuse("requested workflow subset");
    const requirement = input.requirements.get(source.clientRequirementId);
    const clientSelectionId = input.resourceBindings.get(source.clientRequirementId);
    if (
      requirement === undefined ||
      clientSelectionId === undefined ||
      input.resourceReferences.get(source.clientRequirementId) !== source.client ||
      !surface.resourceRequirementIds.includes(source.clientRequirementId) ||
      requirement.owner.kind !== "plugin" ||
      requirement.owner.pluginOwnerId !== surface.pluginOwnerId ||
      requirement.optional ||
      (source.client.optional !== undefined && source.client.optional !== false) ||
      requirement.resource.resourceId !== source.client.resource.id ||
      requirement.resource.lifetime !==
        (source.client.lifetime ?? source.client.resource.defaultLifetime) ||
      requirement.resource.role !== source.client.role ||
      requirement.resource.instance !== source.client.instance ||
      requirement.reason !== source.client.reason
    )
      refuse("exact selected client requirement");
    compiled.push(Object.freeze({ ...source, clientSelectionId }));
  }
  if (
    caller !== undefined &&
    canonicalJson(sources.map((source) => source.useName)) !==
      canonicalJson(Object.keys(caller.workflows).sort(compare))
  )
    refuse("named use completeness");
  const descriptorIds = [...new Set(sources.map((source) => source.descriptorId))].sort(compare);
  if (canonicalJson(descriptorIds) !== canonicalJson(surface.workflowDispatcherDescriptorIds))
    refuse("surface descriptor completeness");
  return Object.freeze(compiled);
}

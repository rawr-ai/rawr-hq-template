import { defineApp, startApp } from "@rawr/sdk/app";
import type {
  CompiledExecutionPlan,
  ExecutionDescriptor,
  ExecutionDescriptorRef,
  PortableRuntimePlanArtifact,
} from "@rawr/sdk/spine";
import { RuntimeFixtureProfile } from "./resource-provider-profile";
import { WorkItemsServerApiPlugin } from "./server-api-plugin";
import { WorkItemsAsyncPlugin } from "./async-workflow";

export const CreateWorkItemRef = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.server-api",
  executionId: "exec:server:work-items:create",
  appId: "hq",
  role: "server",
  surface: "api",
  capability: "work-items",
  routePath: ["items", "create"],
} as const satisfies ExecutionDescriptorRef;

export const SyncWorkItemStepRef = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.async-step",
  executionId: "exec:async:work-items.sync:sync-work-item",
  appId: "hq",
  role: "async",
  surface: "workflow",
  capability: "work-items",
  workflowId: "work-items.sync",
  stepId: "sync-work-item",
} as const satisfies ExecutionDescriptorRef;

export const CreateWorkItemDescriptor = {
  kind: "execution.descriptor",
  ref: CreateWorkItemRef,
  run: WorkItemsServerApiPlugin.descriptors[0].run,
} as const satisfies ExecutionDescriptor;

export const CreateWorkItemPlan = {
  kind: "compiled.execution-plan",
  ref: CreateWorkItemRef,
  policy: {
    timeoutMs: 1000,
  },
} as const satisfies CompiledExecutionPlan;

export const PortableArtifact = {
  kind: "portable.runtime-plan-artifact",
  appId: "hq",
  executionDescriptorRefs: [CreateWorkItemRef, SyncWorkItemStepRef],
  serviceBindingPlans: [
    {
      kind: "service.binding-plan",
      serviceId: "work-items",
      role: "server",
    },
  ],
  surfaceRuntimePlans: [
    {
      kind: "surface.runtime-plan",
      role: "server",
      surface: "api",
      executableBoundaryRefs: [CreateWorkItemRef],
    },
  ],
  workflowDispatcherDescriptors: [
    {
      kind: "workflow.dispatcher-descriptor",
      descriptorId: "dispatcher:work-items",
      appId: "hq",
      role: "server",
      surface: "api",
      capability: "work-items",
      workflowRefs: [{ workflowId: "work-items.sync" }],
      operations: [{ operation: "dispatch", workflowId: "work-items.sync" }],
      diagnostics: [],
    },
  ],
  diagnostics: [],
} as const satisfies PortableRuntimePlanArtifact;

export const FixtureApp = defineApp({
  kind: "rawr.app",
  id: "hq",
  profile: RuntimeFixtureProfile,
  plugins: [WorkItemsServerApiPlugin, WorkItemsAsyncPlugin],
});

export const StartedFixtureApp = startApp(FixtureApp);

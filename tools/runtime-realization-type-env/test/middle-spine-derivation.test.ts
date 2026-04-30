import { describe, expect, test } from "bun:test";
import {
  compileRuntimeSpine,
  createExecutionRegistry,
  deriveRuntimeSpine,
} from "@rawr/spec-env/spine/simulate";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider, providerFx } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource, resourceRequirement } from "@rawr/sdk/runtime/resources";
import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemRef,
  SyncWorkItemStepDescriptor,
} from "../fixtures/positive/app-and-plan-artifacts";
import {
  ClockProvider,
  ClockResource,
  EmailProvider,
  EmailSenderResource,
  RuntimeFixtureProfile,
} from "../fixtures/positive/resource-provider-profile";
import { WorkItemsServerApiPlugin } from "../fixtures/positive/server-api-plugin";

function collectFunctionPaths(value: unknown, path = "$"): string[] {
  if (typeof value === "function") return [path];
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectFunctionPaths(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    collectFunctionPaths(entry, `${path}.${key}`),
  );
}

function deriveFixtureSpine() {
  return deriveRuntimeSpine({
    kind: "runtime.spine-derivation-input",
    appId: "hq",
    profile: RuntimeFixtureProfile,
    executions: [
      {
        kind: "runtime.execution-derivation-input",
        boundary: "plugin.server-api",
        executionId: "exec:server:work-items:create",
        role: "server",
        surface: "api",
        capability: "work-items",
        routePath: ["items", "create"],
        descriptor: WorkItemsServerApiPlugin.descriptors[0],
        policy: {
          timeoutMs: 1000,
        },
      },
      {
        kind: "runtime.execution-derivation-input",
        boundary: "plugin.async-step",
        executionId: "exec:async:work-items.sync:sync-work-item",
        role: "async",
        surface: "workflow",
        capability: "work-items",
        workflowId: "work-items.sync",
        stepId: "sync-work-item",
        descriptor: SyncWorkItemStepDescriptor,
        policy: {
          timeoutMs: 1000,
        },
      },
    ],
    serviceBindings: [
      {
        kind: "service.binding-derivation-input",
        serviceId: "work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        dependencyInstances: [],
        scopeHash: "scope:server:api:work-items",
        configHash: "config:server:api:work-items",
      },
    ],
    serverRoutes: [
      {
        kind: "server.route-derivation-input",
        routeFactoryId: "work-items.public-api",
        deriveRoutes() {
          return [
            {
              kind: "server.route-declaration",
              boundary: "plugin.server-api",
              role: "server",
              surface: "api",
              capability: "work-items",
              routePath: ["items", "create"],
              executionId: "exec:server:work-items:create",
              importSafety: "cold-declaration",
            },
          ];
        },
      },
    ],
    dispatchers: [
      {
        kind: "workflow.dispatcher-derivation-input",
        descriptorId: "dispatcher:work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        workflowIds: ["work-items.sync"],
        operations: [
          {
            operation: "dispatch",
            workflowId: "work-items.sync",
          },
        ],
      },
    ],
  });
}

describe("middle spine derivation and compiler simulation", () => {
  test("derives normalized graph, portable artifact, compiler inputs, and placeholders from explicit lab input", () => {
    const derivation = deriveFixtureSpine();
    const compilation = compileRuntimeSpine(derivation);
    const serverRef = derivation.executionDescriptorRefs[0];
    const asyncRef = derivation.executionDescriptorRefs[1];

    expect(derivation.normalizedGraph.kind).toBe("normalized.authoring-graph");
    expect(derivation.executionDescriptorRefs.map((ref) => ref.executionId)).toEqual([
      "exec:server:work-items:create",
      "exec:async:work-items.sync:sync-work-item",
    ]);
    expect(derivation.descriptorTableInput.entries).toHaveLength(2);
    expect(derivation.descriptorTableInput.entries[0]?.descriptor.ref).toEqual(serverRef);
    expect(derivation.descriptorTableInput.entries[1]?.descriptor.ref).toEqual(asyncRef);
    expect(derivation.executionPlanSeeds).toEqual([
      {
        kind: "execution.plan-seed",
        ref: serverRef,
        policy: {
          timeoutMs: 1000,
        },
      },
      {
        kind: "execution.plan-seed",
        ref: asyncRef,
        policy: {
          timeoutMs: 1000,
        },
      },
    ]);
    expect(derivation.serviceBindingPlans).toEqual([
      {
        kind: "service.binding-plan",
        serviceId: "work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        dependencyInstances: [],
        scopeHash: "scope:server:api:work-items",
        configHash: "config:server:api:work-items",
      },
    ]);
    expect(derivation.surfaceRuntimePlans).toEqual([
      {
        kind: "surface.runtime-plan",
        role: "server",
        surface: "api",
        executableBoundaryRefs: [serverRef],
      },
      {
        kind: "surface.runtime-plan",
        role: "async",
        surface: "workflow",
        executableBoundaryRefs: [asyncRef],
      },
    ]);
    expect(derivation.serverRouteDescriptors).toEqual([
      {
        kind: "server.route-descriptor",
        appId: "hq",
        executionId: "exec:server:work-items:create",
        boundary: "plugin.server-api",
        role: "server",
        surface: "api",
        capability: "work-items",
        routePath: ["items", "create"],
        importSafety: "cold-declaration",
        diagnostics: [],
      },
    ]);
    expect(derivation.workflowDispatcherDescriptors).toEqual([
      {
        kind: "workflow.dispatcher-descriptor",
        descriptorId: "dispatcher:work-items",
        appId: "hq",
        role: "server",
        surface: "api",
        capability: "work-items",
        workflowRefs: [{ workflowId: "work-items.sync" }],
        operations: [
          {
            operation: "dispatch",
            workflowId: "work-items.sync",
          },
        ],
        diagnostics: [],
      },
    ]);
    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.edges).toEqual([
      {
        kind: "provider.dependency-edge",
        fromProviderKey: {
          kind: "provider.dependency-node",
          resourceId: "email.sender",
          providerId: "email.sender.memory",
          lifetime: "process",
          role: "server",
        },
        fromProviderId: "email.sender.memory",
        toResourceId: "clock",
        optional: false,
        reason: "timestamp outbound fixture mail",
        matchedProviderId: "clock.system",
        matchedProviderKey: {
          kind: "provider.dependency-node",
          resourceId: "clock",
          providerId: "clock.system",
          lifetime: "process",
          role: "server",
        },
      },
    ]);
    expect(compilation.providerDependencyGraph?.diagnostics).toEqual([]);

    expect(derivation.portableArtifact).toEqual({
      kind: "portable.runtime-plan-artifact",
      appId: "hq",
      executionDescriptorRefs: [serverRef, asyncRef],
      serviceBindingPlans: derivation.serviceBindingPlans,
      surfaceRuntimePlans: derivation.surfaceRuntimePlans,
      serverRouteDescriptors: derivation.serverRouteDescriptors,
      workflowDispatcherDescriptors: derivation.workflowDispatcherDescriptors,
      diagnostics: derivation.diagnostics,
    });
    expect(compilation.compiledProcessPlan).toEqual({
      kind: "compiled.process-plan",
      appId: "hq",
      executionPlans: [
        {
          kind: "compiled.execution-plan",
          ref: serverRef,
          policy: {
            timeoutMs: 1000,
          },
        },
        {
          kind: "compiled.execution-plan",
          ref: asyncRef,
          policy: {
            timeoutMs: 1000,
          },
        },
      ],
    });
    expect(compilation.registryInput.kind).toBe("compiled.execution-registry-input");
    expect(compilation.harnessPlans).toEqual([
      {
        kind: "harness.plan-placeholder",
        harness: "server",
        role: "server",
        surface: "api",
        executableBoundaryRefs: [serverRef],
        diagnostics: [
          {
            code: "runtime.harness.mounting-placeholder",
            message:
              "harness plan is a compile-time placeholder only; real host mounting remains out of scope for this lab slice",
          },
        ],
      },
      {
        kind: "harness.plan-placeholder",
        harness: "async",
        role: "async",
        surface: "workflow",
        executableBoundaryRefs: [asyncRef],
        diagnostics: [
          {
            code: "runtime.harness.mounting-placeholder",
            message:
              "harness plan is a compile-time placeholder only; real host mounting remains out of scope for this lab slice",
          },
        ],
      },
    ]);
    expect(compilation.bootgraphInput.resourceModules).toEqual([
      {
        kind: "boot.resource-module",
        resourceId: "email.sender",
        providerId: "email.sender.memory",
        lifetime: "process",
        role: "server",
      },
      {
        kind: "boot.resource-module",
        resourceId: "clock",
        providerId: "clock.system",
        lifetime: "process",
        role: "server",
      },
    ]);
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider-effect-plan.lowering-reserved",
    );

    const registry = createExecutionRegistry({
      plans: compilation.registryInput.executionPlans,
      descriptorTable: compilation.registryInput.descriptorTable,
    });
    expect(registry.get(serverRef).descriptor.ref).toEqual(serverRef);
    expect(registry.get(asyncRef).descriptor.ref).toEqual(asyncRef);
  });

  test("keeps server plugin route declarations cold and memoized", () => {
    let routeFactoryCalls = 0;
    let bodyExecutions = 0;
    const ServerPlugin = defineServerApiPlugin({
      id: "work-items.public-api",
      services: {},
      routes: (api) => {
        routeFactoryCalls += 1;
        return {
          "items.create": api.route<unknown, string>().effect(function* () {
            bodyExecutions += 1;
            return "ok";
          }),
        };
      },
    });

    expect(routeFactoryCalls).toBe(0);
    const [routeDeclaration] = ServerPlugin.routeDeclarations;
    const [descriptor] = ServerPlugin.descriptors;

    expect(routeFactoryCalls).toBe(1);
    expect(bodyExecutions).toBe(0);
    expect(routeDeclaration).toMatchObject({
      kind: "server.route-declaration",
      boundary: "plugin.server-api",
      role: "server",
      surface: "api",
      capability: "work-items.public-api",
      routeKey: "items.create",
      routePath: ["items", "create"],
      importSafety: "cold-declaration",
    });
    expect(descriptor).toBe(routeDeclaration?.descriptor);
  });

  test("derives server route descriptors from a cold route factory without executing descriptor bodies", () => {
    let factoryCalls = 0;
    let bodyExecutions = 0;
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [],
      serverRoutes: [
        {
          kind: "server.route-derivation-input",
          routeFactoryId: "work-items.public-api",
          deriveRoutes() {
            factoryCalls += 1;
            return [
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "create"],
                importSafety: "cold-declaration",
                descriptor: {
                  kind: "execution.descriptor",
                  run() {
                    bodyExecutions += 1;
                    throw new Error("derivation executed server route body");
                  },
                } as any,
                policy: {
                  timeoutMs: 1000,
                },
              },
            ];
          },
        },
      ],
    });
    const serverRef = derivation.executionDescriptorRefs[0];

    expect(factoryCalls).toBe(1);
    expect(bodyExecutions).toBe(0);
    expect(serverRef).toEqual({
      kind: "execution.descriptor-ref",
      boundary: "plugin.server-api",
      executionId: "exec:server:work-items:items.create",
      appId: "hq",
      role: "server",
      surface: "api",
      capability: "work-items",
      routePath: ["items", "create"],
    });
    expect(derivation.descriptorTableInput.entries[0]?.ref).toEqual(serverRef);
    expect(derivation.executionPlanSeeds).toEqual([
      {
        kind: "execution.plan-seed",
        ref: serverRef,
        policy: {
          timeoutMs: 1000,
        },
      },
    ]);
    expect(derivation.surfaceRuntimePlans).toEqual([
      {
        kind: "surface.runtime-plan",
        role: "server",
        surface: "api",
        executableBoundaryRefs: [serverRef],
      },
    ]);
    expect(derivation.serverRouteDescriptors).toEqual([
      {
        kind: "server.route-descriptor",
        appId: "hq",
        executionId: "exec:server:work-items:items.create",
        boundary: "plugin.server-api",
        role: "server",
        surface: "api",
        capability: "work-items",
        routePath: ["items", "create"],
        importSafety: "cold-declaration",
        diagnostics: [],
      },
    ]);
    expect(collectFunctionPaths(derivation.portableArtifact)).toEqual([]);
    expect(derivation.diagnostics).toEqual([]);
  });

  test("diagnoses failed server route factory derivation without mounting", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [],
      serverRoutes: [
        {
          kind: "server.route-derivation-input",
          routeFactoryId: "work-items.public-api",
          deriveRoutes() {
            throw new Error("route module imported a host");
          },
        },
      ],
    });

    expect(derivation.executionDescriptorRefs).toEqual([]);
    expect(derivation.serverRouteDescriptors).toEqual([]);
    expect(collectFunctionPaths(derivation.portableArtifact)).toEqual([]);
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.factory-failed",
      message:
        "server route factory work-items.public-api failed during cold derivation: route module imported a host",
    });
  });

  test("diagnoses widened invalid server route metadata", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [],
      serverRoutes: [
        {
          kind: "server.route-derivation-input",
          routeFactoryId: "work-items.public-api",
          deriveRoutes() {
            return [
              {
                kind: "server.route-declaration",
                boundary: "plugin.async-step",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "create"],
                importSafety: "cold-declaration",
              } as any,
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: [],
                importSafety: "cold-declaration",
              } as any,
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "unsafe"],
                importSafety: "host-import",
              } as any,
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "create"],
                importSafety: "cold-declaration",
              },
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "create"],
                importSafety: "cold-declaration",
              },
            ];
          },
        },
      ],
    });

    expect(derivation.serverRouteDescriptors).toEqual([
      {
        kind: "server.route-descriptor",
        appId: "hq",
        executionId: "exec:server:work-items:items.create",
        boundary: "plugin.server-api",
        role: "server",
        surface: "api",
        capability: "work-items",
        routePath: ["items", "create"],
        importSafety: "cold-declaration",
        diagnostics: [],
      },
    ]);
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.invalid-boundary",
      message:
        "server route derivation input must use a server API or server internal boundary",
    });
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.invalid-route-path",
      message: "server route derivation input must include a non-empty routePath",
    });
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.import-unsafe",
      message:
        "server route derivation input must be marked as a cold declaration before route artifacts can be promoted",
    });
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.duplicate-route",
      message:
        "duplicate server route derivation input for plugin.server-api/work-items/items.create",
    });
  });

  test("keeps explicit server refs reserved without a cold route factory", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.server-api",
          executionId: "exec:server:work-items:create",
          role: "server",
          surface: "api",
          capability: "work-items",
          routePath: ["items", "create"],
        },
      ],
    });

    expect(derivation.serverRouteDescriptors).toEqual([]);
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.server-route-derivation.reserved",
      message:
        "server route exec:server:work-items:create remains an explicit execution ref without a cold route derivation input",
    });
  });

  test("keeps dispatcher workflow refs inert without declared operations", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [],
      dispatchers: [
        {
          kind: "workflow.dispatcher-derivation-input",
          descriptorId: "dispatcher:work-items",
          role: "server",
          surface: "api",
          capability: "work-items",
          workflowIds: ["work-items.sync"],
        },
      ],
    });

    expect(derivation.workflowDispatcherDescriptors).toEqual([
      {
        kind: "workflow.dispatcher-descriptor",
        descriptorId: "dispatcher:work-items",
        appId: "hq",
        role: "server",
        surface: "api",
        capability: "work-items",
        workflowRefs: [{ workflowId: "work-items.sync" }],
        operations: [],
        diagnostics: [
          {
            code: "runtime.dispatcher-access.reserved",
            message:
              "dispatcher descriptor records operation inventory only; dispatcher access declaration remains unresolved",
          },
        ],
      },
    ]);
    expect(derivation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.dispatcher-access.reserved",
    );
  });

  test("reports dispatcher operations that target undeclared workflows", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [],
      dispatchers: [
        {
          kind: "workflow.dispatcher-derivation-input",
          descriptorId: "dispatcher:work-items",
          role: "server",
          surface: "api",
          capability: "work-items",
          workflowIds: ["work-items.sync"],
          operations: [
            {
              operation: "dispatch",
              workflowId: "work-items.missing",
            },
          ],
        },
      ],
    });

    expect(derivation.workflowDispatcherDescriptors[0]?.operations).toEqual([
      {
        operation: "dispatch",
        workflowId: "work-items.missing",
      },
    ]);
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.dispatcher-access.workflow-unlisted",
      message:
        "dispatcher operation dispatch targets undeclared workflow work-items.missing",
    });
  });

  test("validates async step owner membership without executing descriptor bodies", () => {
    let bodyExecutions = 0;
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:work-items.sync:sync-work-item",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          workflowId: "work-items.sync",
          stepId: "sync-work-item",
          descriptor: {
            kind: "execution.descriptor",
            run() {
              bodyExecutions += 1;
              throw new Error("derivation executed async body");
            },
          } as any,
        },
      ],
    });

    expect(derivation.executionDescriptorRefs).toEqual([
      {
        kind: "execution.descriptor-ref",
        boundary: "plugin.async-step",
        executionId: "exec:async:work-items.sync:sync-work-item",
        appId: "hq",
        role: "async",
        surface: "workflow",
        capability: "work-items",
        workflowId: "work-items.sync",
        stepId: "sync-work-item",
      },
    ]);
    expect(derivation.diagnostics).toEqual([]);
    expect(bodyExecutions).toBe(0);
  });

  test("reports duplicate and widened invalid async step memberships", () => {
    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      executions: [
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:work-items.sync:first",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          workflowId: "work-items.sync",
          stepId: "sync-work-item",
        },
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:work-items.sync:second",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          workflowId: "work-items.sync",
          stepId: "sync-work-item",
        },
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:missing-owner",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          stepId: "sync-work-item",
        } as any,
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:multiple-owner",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          workflowId: "work-items.sync",
          scheduleId: "work-items.hourly",
          stepId: "sync-work-item",
        } as any,
      ],
    });

    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.async-step-membership.duplicate",
      message:
        "duplicate async step membership for workflow work-items.sync step sync-work-item",
    });
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.async-step-membership.invalid-owner",
      message:
        "async step exec:async:missing-owner must declare exactly one workflow, schedule, or consumer owner",
    });
    expect(derivation.diagnostics).toContainEqual({
      code: "runtime.async-step-membership.invalid-owner",
      message:
        "async step exec:async:multiple-owner must declare exactly one workflow, schedule, or consumer owner",
    });
  });

  test("reports provider coverage and duplicate provider selections without lowering providers", () => {
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.missing-clock",
      providerSelections: [
        providerSelection({
          resource: EmailSenderResource,
          provider: EmailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: EmailSenderResource,
          provider: EmailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ClockResource,
          provider: ClockProvider,
          lifetime: "process",
          role: "async",
        }),
      ],
    });

    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile,
      executions: [],
    });
    const compilation = compileRuntimeSpine(derivation);

    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "provider.coverage.ambiguous",
      "provider.coverage.missing",
      "provider.coverage.missing",
    ]);
    expect(compilation.bootgraphInput.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider-effect-plan.lowering-reserved",
    );
  });

  test("reports provider dependency cycles without lowering provider plans", () => {
    const ResourceA = defineRuntimeResource<"cycle.a", { readonly a: true }>({
      id: "cycle.a",
      title: "Cycle A",
    });
    const ResourceB = defineRuntimeResource<"cycle.b", { readonly b: true }>({
      id: "cycle.b",
      title: "Cycle B",
    });
    const ProviderA = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "cycle.provider-a",
      title: "Cycle provider A",
      provides: ResourceA,
      requires: [
        resourceRequirement(ResourceB, {
          lifetime: "process",
          role: "server",
          reason: "cycle test",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { a: true as const };
          },
        });
      },
    });
    const ProviderB = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "cycle.provider-b",
      title: "Cycle provider B",
      provides: ResourceB,
      requires: [
        resourceRequirement(ResourceA, {
          lifetime: "process",
          role: "server",
          reason: "cycle test",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { b: true as const };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.cycle",
      providerSelections: [
        providerSelection({
          resource: ResourceA,
          provider: ProviderA,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ResourceB,
          provider: ProviderB,
          lifetime: "process",
          role: "server",
        }),
      ],
    });

    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile,
      executions: [],
    });

    const compilation = compileRuntimeSpine(derivation);

    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.diagnostics).toContainEqual({
      code: "provider.dependency.cycle",
      message:
        "provider dependency cycle detected: cycle.provider-a:cycle.a:process:server:default -> cycle.provider-b:cycle.b:process:server:default -> cycle.provider-a:cycle.a:process:server:default",
    });
  });

  test("keeps provider coverage scoped by lifetime and instance during compilation", () => {
    const ProcessClock = defineRuntimeResource<"process-clock", { now(): Date }>({
      id: "process-clock",
      title: "Process clock",
    });
    const ClockConsumerResource = defineRuntimeResource<
      "clock-consumer",
      { consume(): void }
    >({
      id: "clock-consumer",
      title: "Clock consumer",
    });
    const ClockConsumerProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "clock-consumer.provider",
      title: "Clock consumer provider",
      provides: ClockConsumerResource,
      requires: [
        resourceRequirement(ProcessClock, {
          lifetime: "process",
          role: "server",
          instance: "primary",
          reason: "instance-specific clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { consume() {} };
          },
        });
      },
    });
    const WrongClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "process-clock.secondary-provider",
      title: "Wrong clock provider",
      provides: ProcessClock,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { now: () => new Date(0) };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.instance-mismatch",
      providerSelections: [
        providerSelection({
          resource: ClockConsumerResource,
          provider: ClockConsumerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ProcessClock,
          provider: WrongClockProvider,
          lifetime: "role",
          role: "server",
          instance: "secondary",
        }),
      ],
    });

    const compilation = compileRuntimeSpine(
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        profile,
        executions: [],
      }),
    );

    expect(compilation.providerDependencyGraph?.diagnostics).toContainEqual({
      code: "provider.coverage.missing",
      message:
        "provider clock-consumer.provider requires process-clock, but the profile does not select a provider for it",
    });
  });

  test("does not collapse provider selections across lifetime during compilation", () => {
    const ScopedClock = defineRuntimeResource<"scoped-clock", { now(): Date }>({
      id: "scoped-clock",
      title: "Scoped clock",
    });
    const ClockConsumerResource = defineRuntimeResource<
      "scoped-clock-consumer",
      { consume(): void }
    >({
      id: "scoped-clock-consumer",
      title: "Scoped clock consumer",
    });
    const ClockConsumerProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "scoped-clock-consumer.provider",
      title: "Scoped clock consumer provider",
      provides: ClockConsumerResource,
      requires: [
        resourceRequirement(ScopedClock, {
          lifetime: "process",
          role: "server",
          instance: "primary",
          reason: "process-scoped clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { consume() {} };
          },
        });
      },
    });
    const ScopedClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "scoped-clock.provider",
      title: "Scoped clock provider",
      provides: ScopedClock,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { now: () => new Date(0) };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.lifetime-key",
      providerSelections: [
        providerSelection({
          resource: ClockConsumerResource,
          provider: ClockConsumerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ScopedClock,
          provider: ScopedClockProvider,
          lifetime: "process",
          role: "server",
          instance: "primary",
        }),
        providerSelection({
          resource: ScopedClock,
          provider: ScopedClockProvider,
          lifetime: "role",
          role: "server",
          instance: "primary",
        }),
      ],
    });

    const compilation = compileRuntimeSpine(
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        profile,
        executions: [],
      }),
    );

    expect(compilation.providerDependencyGraph?.diagnostics).toEqual([]);
    expect(compilation.providerDependencyGraph?.edges).toContainEqual({
      kind: "provider.dependency-edge",
      fromProviderKey: {
        kind: "provider.dependency-node",
        resourceId: "scoped-clock-consumer",
        providerId: "scoped-clock-consumer.provider",
        lifetime: "process",
        role: "server",
      },
      fromProviderId: "scoped-clock-consumer.provider",
      toResourceId: "scoped-clock",
      optional: false,
      reason: "process-scoped clock",
      matchedProviderId: "scoped-clock.provider",
      matchedProviderKey: {
        kind: "provider.dependency-node",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "process",
        role: "server",
        instance: "primary",
      },
    });
    expect(
      compilation.bootgraphInput.resourceModules.filter(
        (module) => module.resourceId === "scoped-clock",
      ),
    ).toEqual([
      {
        kind: "boot.resource-module",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "process",
        role: "server",
        instance: "primary",
      },
      {
        kind: "boot.resource-module",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "role",
        role: "server",
        instance: "primary",
      },
    ]);
  });

  test("rejects duplicate execution ids and descriptor ref mismatches", () => {
    expect(() =>
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        executions: [
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: "exec:server:work-items:create",
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "create"],
            descriptor: WorkItemsServerApiPlugin.descriptors[0],
          },
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: "exec:server:work-items:create",
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "rename"],
          },
        ],
      }),
    ).toThrow("duplicate execution derivation");

    expect(() =>
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        executions: [
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: CreateWorkItemRef.executionId,
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "rename"],
            descriptor: CreateWorkItemDescriptor,
          },
        ],
      }),
    ).toThrow("descriptor derivation mismatch");
  });

  test("keeps portable artifacts free of executable descriptors and registry handles", () => {
    const derivation = deriveFixtureSpine();
    const compilation = compileRuntimeSpine(derivation);
    const portable = compilation.portableArtifact;

    expect(collectFunctionPaths(portable)).toEqual([]);
    expect("descriptorTableInput" in portable).toBe(false);
    expect("descriptorTable" in portable).toBe(false);
    expect("registryInput" in portable).toBe(false);
    expect("compiledProcessPlan" in portable).toBe(false);
    expect(
      JSON.stringify(portable, (_key, value) =>
        typeof value === "function" ? "__function__" : value,
      ),
    ).not.toContain("__function__");
  });
});

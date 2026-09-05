import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import {
  defineAgentToolPlugin,
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineTool,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  toolSchema,
} from "../../definition/src/index";
import { deriveRuntimeArtifacts } from "../../derivation/src/index";
import {
  createExecutionRegistry,
  createMountPreparation,
  type ProcessRuntimeAccess,
  type RoleRuntimeAccess,
  type SurfaceAdapter,
} from "../src/index";

/** Real cold producers and handoff; readiness/access/stop are labeled test ports, not acquisition proof. */
export function createMountingFixture(
  options: {
    readonly harnessIds?: readonly string[];
    readonly processId?: string;
    readonly requiredHealth?: boolean;
    readonly empty?: boolean;
    readonly stop?: () => void | Promise<void>;
  } = {}
) {
  const harnessIds = options.harnessIds ?? ["first", "second"];
  const trace: string[] = [];
  let open = true;
  let stopping: Promise<void> | undefined;
  let bodies = 0;
  const resource = defineRuntimeResource<"mounting.fixture", number>({
    id: "mounting.fixture",
    title: "Mounting test resource",
    purpose: "Readiness test port",
  });
  const provider = defineRuntimeProvider({
    id: "mounting.fixture.provider",
    title: "Cold fixture provider",
    provides: resource,
    requires: [],
    ...(options.requiredHealth
      ? { health: { kind: "provider.health" as const, required: true } }
      : {}),
    build() {
      bodies++;
      return providerFx.acquireRelease({
        acquire: Effect.succeed(1),
        release: () => Effect.succeed(undefined),
      });
    },
  });
  const plugin = defineAgentToolPlugin.factory()({
    capability: "mounting-fixture",
    services: {},
    resourceRequirements: [requireResource({ resource, reason: "Readiness fixture" })],
    tools: [
      defineTool({
        id: "inspect",
        input: toolSchema.object({}),
        description: "Never executed during mounting",
        effect() {
          bodies++;
          return Effect.succeed(1);
        },
      }),
    ],
  })();
  const app = defineApp({ id: "mounting.fixture.app", plugins: options.empty ? [] : [plugin] });
  const profile = defineRuntimeProfile({
    id: "mounting.fixture.profile",
    providers: [providerSelection({ resource, provider })],
    harnesses: harnessIds,
  });
  const process = defineProcessCatalog({
    main: { id: options.processId ?? "mounting.fixture.process", roles: ["agent"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "mounting.fixture.entrypoint",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "mounting.fixture.entrypoint",
      deployment: "test",
      source: "mounting-owner-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const { plan } = compileRuntimePlan({ derivation });
  const assertOpen = () => {
    if (!open) throw new TypeError("Test process admission is closed.");
  };
  const closeAdmission = () => {
    if (open) {
      open = false;
      trace.push("process.close");
    }
  };
  const stop = () =>
    (stopping ??= Promise.resolve().then(async () => {
      closeAdmission();
      trace.push("process.stop");
      await options.stop?.();
    }));
  const noResources = {
    resource(): never {
      throw new TypeError("This fixture does not provision live resources.");
    },
    optionalResource: () => undefined,
  };
  const access: ProcessRuntimeAccess = Object.freeze({
    appId: app.id,
    processId: process.id,
    entrypointId: entrypoint.id,
    profileId: profile.id,
    roles: plan.roles,
    ...noResources,
  });
  const roleAccess: RoleRuntimeAccess = {
    role: "agent",
    process: access,
    selectedSurfaces: plan.surfaces,
    ...noResources,
    forSurface(): never {
      throw new TypeError("Metadata adapter does not request live surface access.");
    },
  };
  const executionRegistry = createExecutionRegistry({
    processId: process.id,
    registryInput: plan.executionRegistryInput,
    executionPlans: plan.executionPlans,
    descriptorTable: derivation.executionDescriptorTable,
    assertOpen,
  });
  const prepare = createMountPreparation({
    plan,
    processAccess: access,
    assertOpen,
    closeAdmission,
    stop,
    hasSelection: () => true,
    requiresHealth: () => options.requiredHealth === true,
    lower: (surface, adapter) =>
      adapter.lower({
        plan: surface,
        processAccess: access,
        roleAccess,
        serviceBindings: {},
        executionRegistry,
        resources: {
          has: () => false,
          get(): never {
            throw new TypeError("Metadata adapter does not read ready values.");
          },
        },
      }),
  });
  const assignments = harnessIds.flatMap((harness) =>
    plan.surfaces.map((surface) => {
      const adapter: SurfaceAdapter<typeof surface, string> = {
        role: "agent",
        surface: "agent/tools",
        harness,
        lower: () => ({
          payload: `payload:${harness}`,
          payloadSchemas: [],
          findings: [],
          observations: [],
        }),
      };
      return { surface, adapter };
    })
  );
  const ready = prepare({ launchIdentity: entrypoint.identity, assignments });
  return { ready, trace, bodies: () => bodies, isOpen: () => open };
}

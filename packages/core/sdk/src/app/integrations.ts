import type { CompiledProcessPlan } from "../../../runtime/compiler/src/index";
import type { AppRole } from "../../../runtime/definition/src/index";
import type {
  HarnessDescriptor,
  HarnessMountInput,
  NativeHarnessHandle,
} from "../../../runtime/harnesses/src/index";
import {
  createAgentToolsAdapter,
  createDesktopBackgroundAdapter,
  createElysiaApiAdapter,
  createElysiaInternalAdapter,
  createOclifAdapter,
  type ElysiaRoutePayload,
  type LoweredAgentTool,
  type LoweredCliCommand,
  type LoweredDesktopBackground,
  type MountReadySurfaceRuntimeRecord,
  type SurfaceMountAssignment,
} from "../../../runtime/process-runtime/src/index";

export type AgentToolMountRecord = MountReadySurfaceRuntimeRecord<readonly LoweredAgentTool[]>;
export type CliCommandMountRecord = MountReadySurfaceRuntimeRecord<readonly LoweredCliCommand[]>;
export type ServerMountRecord = MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>;
export type DesktopBackgroundMountRecord = MountReadySurfaceRuntimeRecord<
  readonly LoweredDesktopBackground[]
>;

/** Function-property variance protects the externally authored payload consumer. */
export type NativeIntegrationHarness<T> = Omit<HarnessDescriptor<T>, "mount"> & {
  readonly mount: (input: HarnessMountInput<T>) => Promise<NativeHarnessHandle>;
};

export type NativeIntegration =
  | {
      readonly surface: "cli/commands";
      readonly harness: NativeIntegrationHarness<CliCommandMountRecord>;
    }
  | {
      readonly surface: "agent/tools";
      readonly harness: NativeIntegrationHarness<AgentToolMountRecord>;
    }
  | {
      readonly surface: "desktop/background";
      readonly harness: NativeIntegrationHarness<DesktopBackgroundMountRecord>;
    }
  | {
      readonly surface: "server/api" | "server/internal";
      readonly harness: NativeIntegrationHarness<ServerMountRecord>;
    }
  | { readonly surface: "none"; readonly harness: NativeIntegrationHarness<never> };

type Payload =
  | readonly (LoweredAgentTool | LoweredDesktopBackground | LoweredCliCommand)[]
  | ElysiaRoutePayload;
type Descriptor = HarnessDescriptor<MountReadySurfaceRuntimeRecord<Payload>>;

/** Resolve the selected IDs before any provider or native host can run. */
export function resolveIntegrations(
  plan: CompiledProcessPlan,
  integrations: readonly NativeIntegration[]
): {
  readonly assignments: readonly SurfaceMountAssignment<Payload>[];
  readonly harnesses: readonly Descriptor[];
} {
  if (!Array.isArray(integrations)) throw new TypeError("Native integrations must be explicit.");
  const selected = new Set(plan.harnesses.map(({ harnessId }) => harnessId));
  const descriptors = new Map<string, Descriptor>();
  const identities = new Map<string, NativeIntegration["harness"]>();
  const pairs = new Map<string, Set<string>>();
  const covered = new Set<string>();
  const assignments: SurfaceMountAssignment<Payload>[] = [];
  for (const registration of integrations) {
    const { surface, harness } = registration;
    if (
      harness === null ||
      typeof harness !== "object" ||
      !selected.has(harness.id) ||
      typeof harness.mount !== "function" ||
      !Array.isArray(harness.roles) ||
      !Array.isArray(harness.surfaces) ||
      harness.roles.some(
        (role: AppRole) => !["agent", "desktop", "server", "async", "web", "cli"].includes(role)
      ) ||
      !harness.roles.some((role: AppRole) => plan.roles.includes(role)) ||
      new Set(harness.roles).size !== harness.roles.length ||
      new Set(harness.surfaces).size !== harness.surfaces.length ||
      ![
        "agent/tools",
        "desktop/background",
        "cli/commands",
        "server/api",
        "server/internal",
        "none",
      ].includes(surface)
    )
      throw new TypeError("Native integration does not match the selected process.");
    const previous = identities.get(harness.id);
    if (previous !== undefined && previous !== harness)
      throw new TypeError("A harness ID has conflicting native descriptors.");
    const surfaces = pairs.get(harness.id) ?? new Set<string>();
    if (surfaces.has(surface)) throw new TypeError("Native integration is duplicated.");
    surfaces.add(surface);
    pairs.set(harness.id, surfaces);
    identities.set(harness.id, harness);
    if (!descriptors.has(harness.id)) {
      // Snapshot metadata and the original callback before asynchronous acquisition.
      const mount = harness.mount.bind(harness);
      descriptors.set(
        harness.id,
        Object.freeze({
          id: harness.id,
          roles: Object.freeze([...harness.roles]),
          surfaces: Object.freeze([...harness.surfaces]),
          mount,
        })
      );
    }
    if (surface === "none") {
      if (harness.surfaces.length !== 0)
        throw new TypeError("An empty-payload integration must declare no surfaces.");
      continue;
    }
    const role =
      surface === "agent/tools"
        ? "agent"
        : surface === "cli/commands"
          ? "cli"
          : surface === "desktop/background"
            ? "desktop"
            : "server";
    if (!harness.roles.includes(role) || !harness.surfaces.includes(surface))
      throw new TypeError("Native integration does not support its surface.");
    const matching = plan.surfaces.filter((item) => item.surface === surface && item.role === role);
    if (matching.length === 0) throw new TypeError("Native integration has no selected surface.");
    const adapter =
      surface === "agent/tools"
        ? createAgentToolsAdapter({ harness: harness.id })
        : surface === "cli/commands"
          ? createOclifAdapter({ harness: harness.id })
          : surface === "server/api"
            ? createElysiaApiAdapter({ harness: harness.id })
            : surface === "server/internal"
              ? createElysiaInternalAdapter({ harness: harness.id })
              : createDesktopBackgroundAdapter({ harness: harness.id });
    for (const item of matching) {
      assignments.push({ surface: item, adapter });
      covered.add(item.surfacePlanId);
    }
  }
  if (descriptors.size !== selected.size || covered.size !== plan.surfaces.length)
    throw new TypeError("Native integrations do not cover the selected process.");
  return Object.freeze({
    assignments: Object.freeze(assignments),
    harnesses: Object.freeze(plan.harnesses.map(({ harnessId }) => descriptors.get(harnessId)!)),
  });
}

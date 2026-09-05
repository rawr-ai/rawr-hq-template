import type { CompiledProcessPlan } from "../../../runtime/compiler/src/compiled-process-plan";
import type { AppRole } from "../../../runtime/definition/src/app";
import type {
  HarnessDescriptor,
  HarnessMountInput,
  NativeHarnessHandle,
} from "../../../runtime/harnesses/src/harness-descriptor";
import {
  createAgentToolsAdapter,
  type LoweredAgentTool,
} from "../../../runtime/process-runtime/src/adapters/agent-tools";
import {
  createDesktopBackgroundAdapter,
  type LoweredDesktopBackground,
} from "../../../runtime/process-runtime/src/adapters/desktop-background";
import {
  createElysiaApiAdapter,
  createElysiaInternalAdapter,
  type ElysiaRoutePayload,
} from "../../../runtime/process-runtime/src/adapters/elysia";
import {
  createInngestConsumerAdapter,
  createInngestScheduleAdapter,
  createInngestWorkflowAdapter,
} from "../../../runtime/process-runtime/src/adapters/inngest";
import {
  createOclifAdapter,
  type LoweredCliCommand,
} from "../../../runtime/process-runtime/src/adapters/oclif";
import {
  createWebAdapter,
  type WebHostPayload,
} from "../../../runtime/process-runtime/src/adapters/web";
import type { InngestMountPayload } from "../../../runtime/process-runtime/src/async-payload";
import type {
  MountReadySurfaceRuntimeRecord,
  SurfaceMountAssignment,
} from "../../../runtime/process-runtime/src/mount-ready-process";

export type AgentToolMountRecord = MountReadySurfaceRuntimeRecord<readonly LoweredAgentTool[]>;
export type CliCommandMountRecord = MountReadySurfaceRuntimeRecord<readonly LoweredCliCommand[]>;
export type ServerMountRecord = MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>;
export type AsyncMountRecord = MountReadySurfaceRuntimeRecord<InngestMountPayload>;
export type WebMountRecord = MountReadySurfaceRuntimeRecord<WebHostPayload>;
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
  | {
      readonly surface: "async/workflow" | "async/schedule" | "async/consumer";
      readonly harness: NativeIntegrationHarness<AsyncMountRecord>;
    }
  | {
      readonly surface: "web/app";
      readonly harness: NativeIntegrationHarness<WebMountRecord>;
    }
  | { readonly surface: "none"; readonly harness: NativeIntegrationHarness<never> };

type Payload =
  | readonly (LoweredAgentTool | LoweredDesktopBackground | LoweredCliCommand)[]
  | ElysiaRoutePayload
  | InngestMountPayload
  | WebHostPayload;
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
        "async/workflow",
        "async/schedule",
        "async/consumer",
        "web/app",
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
            : surface.startsWith("async/")
              ? "async"
              : surface === "web/app"
                ? "web"
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
              : surface === "async/workflow"
                ? createInngestWorkflowAdapter({ harness: harness.id })
                : surface === "async/schedule"
                  ? createInngestScheduleAdapter({ harness: harness.id })
                  : surface === "async/consumer"
                    ? createInngestConsumerAdapter({ harness: harness.id })
                    : surface === "web/app"
                      ? createWebAdapter({ harness: harness.id })
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

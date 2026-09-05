import { Effect } from "effect";
import { Type } from "typebox";

import { defineApp, defineEntrypoint, defineProcessCatalog } from "../../../definition/src/app";
import { definePlugin } from "../../../definition/src/plugin";
import { defineRuntimeProfile, providerSelection } from "../../../definition/src/profile";
import { defineRuntimeProvider } from "../../../definition/src/provider";
import { providerFx } from "../../../definition/src/provider-effect-plan";
import { defineRuntimeResource, requireResource } from "../../../definition/src/resource";
import { RuntimeSchema } from "../../../schema/src/runtime-schema";
import { deriveRuntimeArtifacts } from "../../src/derive-runtime-artifacts";

export const zeroProcessResourceCalls = {
  decode: 0,
  build: 0,
  acquire: 0,
  release: 0,
  projection: 0,
};

export function processResourceFixture(
  input: {
    roots?: "both" | "primary" | "none";
    missing?: boolean;
    optional?: boolean;
    reverse?: boolean;
  } = {}
) {
  const calls = { ...zeroProcessResourceCalls };
  const dependency = defineRuntimeResource({
    id: "native-base",
    title: "Native base",
    purpose: "Selected provider dependency",
  });
  const dependencyRequirement = requireResource({ resource: dependency, reason: "Provider base" });
  const resource = defineRuntimeResource({
    id: "process-resource",
    title: "Process resource",
    purpose: "Selected process infrastructure",
  });
  const primary = requireResource({
    resource,
    instance: "primary",
    optional: input.optional ?? false,
    reason: "Primary process capability",
  });
  const secondary = requireResource({
    resource,
    instance: "secondary",
    reason: "Secondary process capability",
  });
  const siblingResource = defineRuntimeResource({
    id: "sibling-resource",
    title: "Sibling resource",
    purpose: "Must not enter the selected process",
  });
  const sibling = requireResource({ resource: siblingResource, reason: "Other process only" });
  const baseSchema = RuntimeSchema.fromTypeBox(Type.Object({ endpoint: Type.String() }));
  const configSchema = {
    ...baseSchema,
    decode(value: unknown) {
      calls.decode++;
      return baseSchema.decode(value);
    },
  };
  const provider = defineRuntimeProvider({
    id: "process-resource.native",
    title: "Native process resource",
    provides: resource,
    requires: [dependencyRequirement],
    configSchema,
    build: () => {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          return { native: true };
        }),
        release: () =>
          Effect.sync(() => {
            calls.release++;
          }),
      });
    },
  });
  const dependencyProvider = defineRuntimeProvider({
    id: "native-base.provider",
    title: "Native base provider",
    provides: dependency,
    requires: [],
    build: () => {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
        }),
        release: () =>
          Effect.sync(() => {
            calls.release++;
          }),
      });
    },
  });
  // This valid but unreachable candidate has unsatisfied dependencies and no config key.
  const unusedProvider = defineRuntimeProvider({
    id: "unused.provider",
    title: "Unused candidate",
    provides: siblingResource,
    requires: [requireResource({ resource: siblingResource, reason: "Unreachable cycle" })],
    configSchema,
    build: () => {
      calls.build++;
      throw new Error("Unselected provider must remain cold");
    },
  });
  const roots = input.roots ?? "both";
  const requirements =
    roots === "none" ? [] : roots === "primary" ? [primary] : [primary, secondary];
  const processes = defineProcessCatalog({
    cli: {
      id: "selected-cli",
      roles: ["cli"],
      resourceRequirements: input.reverse ? [...requirements].reverse() : requirements,
    },
    sibling: { id: "sibling-server", roles: ["server"], resourceRequirements: [sibling] },
  });
  const plugin = definePlugin({
    id: "ordinary-cli",
    role: "cli",
    surface: "cli/commands",
    capability: "ordinary",
    services: {},
    resourceRequirements: [],
    project: () => {
      calls.projection++;
      return { kind: "plugin.projection", facts: {} };
    },
  });
  const app = defineApp({ id: "process-demand", plugins: [plugin] });
  const selections = [
    ...(input.missing
      ? []
      : [
          providerSelection({
            resource,
            provider,
            instance: "primary",
            config: { kind: "runtime.config", key: "primary.config" },
          }),
        ]),
    providerSelection({
      resource,
      provider,
      instance: "secondary",
      config: { kind: "runtime.config", key: "secondary.config" },
    }),
    providerSelection({ resource: dependency, provider: dependencyProvider }),
    providerSelection({ resource: siblingResource, provider: unusedProvider }),
  ];
  const profile = defineRuntimeProfile({
    id: "local",
    providers: input.reverse ? [...selections].reverse() : selections,
    configSources: [
      { kind: "env", prefix: "EXPLICIT_" },
      { kind: "file", path: "runtime.json", optional: true },
      { kind: "memory" },
    ],
  });
  const entrypoint = defineEntrypoint({
    id: "cli-entry",
    app,
    process: processes.cli,
    profile,
    identity: {
      app: app.id,
      process: processes.cli.id,
      entrypoint: "cli-entry",
      deployment: "test",
      source: "process-resource-proof",
    },
  });
  return {
    calls,
    resource,
    primary,
    secondary,
    sibling,
    dependencyRequirement,
    provider,
    dependencyProvider,
    processes,
    entrypoint,
    derive: () => deriveRuntimeArtifacts({ entrypoint, profileId: profile.id }),
  };
}

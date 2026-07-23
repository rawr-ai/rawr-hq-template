import path from "node:path";

import { Config } from "@oclif/core";

import type {
  NativeRegistryProjection,
  QuarantinedExternalExtension,
  ReservedControllerSurface,
} from "./model";
import { type ExternalExtensionStatePort, NativeRegistryState } from "./native-registry";
import { registerExternalExtensionRuntime } from "./runtime";
import type { ExternalExtensionCommandRuntime } from "./service";
import { NodeStaticEvidencePort, type StaticEvidencePort } from "./static-evidence";
import { createStaticManifestPlugin } from "./static-plugin";

const RECOVERY_COMMANDS = new Set([
  "doctor",
  "doctor:global",
  "plugins",
  "plugins:inspect",
  "plugins:install",
  "plugins:link",
  "plugins:list",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
]);

export type GuardedExternalConfiguration = Readonly<{
  config: Config;
  projection: NativeRegistryProjection;
  recovery: boolean;
}>;

export type GuardedExternalRuntimeFactory = (
  input: Readonly<{
    base: Config;
    state: ExternalExtensionStatePort;
  }>
) => ExternalExtensionCommandRuntime;

export async function createGuardedExternalConfiguration(input: {
  argv: readonly string[];
  cliRoot: string;
  reserved: ReservedControllerSurface;
  expectedDataDir?: string;
  createRuntime: GuardedExternalRuntimeFactory;
  evidence?: StaticEvidencePort;
}): Promise<GuardedExternalConfiguration> {
  const base = await Config.load({
    root: input.cliRoot,
    userPlugins: false,
    devPlugins: false,
    jitPlugins: false,
  });
  if (
    input.expectedDataDir !== undefined &&
    path.resolve(base.dataDir) !== path.resolve(input.expectedDataDir)
  ) {
    throw new Error(
      `CONTROLLER_NATIVE_DATA_ROOT_MISMATCH: expected ${path.resolve(input.expectedDataDir)}, received ${path.resolve(base.dataDir)}`
    );
  }
  const reserved = Object.freeze({
    ...input.reserved,
    packageIds: new Set([...input.reserved.packageIds, ...base.plugins.keys(), base.pjson.name]),
  });
  const nativeState = new NativeRegistryState(
    base.dataDir,
    reserved,
    input.evidence ?? new NodeStaticEvidencePort()
  );
  const projection = await nativeState.read();
  const recovery = isRecoveryInvocation(input.argv);
  const overlays: QuarantinedExternalExtension[] = [];
  const plugins = new Map(base.plugins);

  if (!recovery) {
    for (const active of projection.active) {
      let added = false;
      try {
        const activationInspection = await nativeState.inspectRoot(
          active.extension.canonicalRoot,
          active.extension.packageId
        );
        if (
          !activationInspection.accepted ||
          activationInspection.extension.canonicalRoot !== active.extension.canonicalRoot ||
          activationInspection.extension.fingerprint !== active.extension.fingerprint
        ) {
          throw new Error("Static extension evidence changed during Oclif activation");
        }
        const plugin = createStaticManifestPlugin({
          extension: activationInspection.extension,
          type: active.entry.type,
          state: nativeState,
        });
        if (plugins.has(plugin.name)) {
          throw new Error(
            `External package identity collides with controller plugin: ${plugin.name}`
          );
        }
        plugins.set(plugin.name, plugin);
        added = true;
      } catch (error) {
        if (added) plugins.delete(active.extension.packageId);
        overlays.push({
          identity: active.extension.packageId,
          entry: active.entry,
          root: active.extension.canonicalRoot,
          reason: {
            code: "command-manifest-malformed",
            message: `Static Oclif activation failed: ${errorMessage(error)}`,
          },
        });
      }
    }
  }

  const config = await Config.load({
    root: input.cliRoot,
    plugins,
    userPlugins: false,
    devPlugins: false,
    jitPlugins: false,
  });
  const state =
    overlays.length === 0 ? nativeState : new OverlayExternalExtensionState(nativeState, overlays);
  registerExternalExtensionRuntime(config, input.createRuntime({ base, state }));

  return Object.freeze({
    config,
    projection: overlays.length === 0 ? projection : overlayProjection(projection, overlays),
    recovery,
  });
}

export function isRecoveryInvocation(argv: readonly string[]): boolean {
  const positionals: string[] = [];
  for (const value of argv) {
    if (value === "--") break;
    if (!value.startsWith("-")) positionals.push(value);
    if (positionals.length === 2) break;
  }
  if (positionals.length === 0) return true;
  if (positionals[0] === "help") return true;
  const commandId = positionals.join(":");
  return RECOVERY_COMMANDS.has(commandId);
}

class OverlayExternalExtensionState implements ExternalExtensionStatePort {
  constructor(
    private readonly inner: ExternalExtensionStatePort,
    private readonly overlays: readonly QuarantinedExternalExtension[]
  ) {}

  inspectRoot(root: string, expectedPackageId?: string) {
    return this.inner.inspectRoot(root, expectedPackageId);
  }

  async read(): Promise<NativeRegistryProjection> {
    return overlayProjection(await this.inner.read(), this.overlays);
  }
}

function overlayProjection(
  projection: NativeRegistryProjection,
  overlays: readonly QuarantinedExternalExtension[]
): NativeRegistryProjection {
  const identities = new Set(overlays.map((entry) => entry.identity));
  return {
    ...projection,
    active: projection.active.filter((entry) => !identities.has(entry.extension.packageId)),
    quarantined: [...projection.quarantined, ...overlays].sort((left, right) =>
      left.identity.localeCompare(right.identity)
    ),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

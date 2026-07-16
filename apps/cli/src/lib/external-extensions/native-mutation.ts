import type { commands } from "@oclif/plugin-plugins";

export type PublicPluginCommandExport = Extract<
  keyof typeof commands,
  | "plugins:install"
  | "plugins:link"
  | "plugins:reset"
  | "plugins:uninstall"
  | "plugins:update"
>;

export type GuardedNativeManagerContract = {
  userPlugins: false;
  packageScripts: false;
  externalHooks: false;
  autoInstall: false;
  envFiles: false;
  explicitConfig: "platform-null";
  home: "temporary";
  importSandbox: "controller-root-only";
};

export const GUARDED_NATIVE_MANAGER_CONTRACT: GuardedNativeManagerContract = Object.freeze({
  userPlugins: false,
  packageScripts: false,
  externalHooks: false,
  autoInstall: false,
  envFiles: false,
  explicitConfig: "platform-null",
  home: "temporary",
  importSandbox: "controller-root-only",
});

export type NativeMutationRequest = {
  commandExport: PublicPluginCommandExport;
  argv: readonly string[];
  contract: GuardedNativeManagerContract;
  inspectedArtifact?: {
    path: string;
    sha256: string;
  };
};

export type NativeMutationCleanupSettlement = Readonly<{
  owner: "native-manager-temporary";
  status: "completed" | "failed";
  error?: string;
}>;

export type NativeMutationDispatchResult = Readonly<{
  cleanup: NativeMutationCleanupSettlement;
}>;

export class NativeMutationDispatchError extends Error {
  constructor(
    readonly nativeError: unknown,
    readonly cleanup: NativeMutationCleanupSettlement,
  ) {
    super(nativeError instanceof Error ? nativeError.message : String(nativeError), { cause: nativeError });
    this.name = "NativeMutationDispatchError";
  }
}

export interface NativeMutationPort {
  dispatch(request: NativeMutationRequest): Promise<NativeMutationDispatchResult>;
}

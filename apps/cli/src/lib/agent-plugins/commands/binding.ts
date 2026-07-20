import type { Client } from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleOperation =
  | "releases.check"
  | "releases.checkRepository"
  | "releases.build"
  | "vendors.status"
  | "vendors.update"
  | "packaging.package"
  | "exports.apply"
  | "providers.targetedTest"
  | "providers.completeTest"
  | "providers.canonicalSync"
  | "providers.canonicalStatus"
  | "governance.currentMainRecord"
  | "governance.currentMainSelection";

export type LifecycleClientByOperation = Readonly<{
  "releases.check": Readonly<{ releases: Pick<Client["releases"], "check"> }>;
  "releases.checkRepository": Readonly<{
    releases: Pick<Client["releases"], "checkRepository">;
  }>;
  "releases.build": Readonly<{ releases: Pick<Client["releases"], "build"> }>;
  "vendors.status": Readonly<{ vendors: Pick<Client["vendors"], "status"> }>;
  "vendors.update": Readonly<{ vendors: Pick<Client["vendors"], "update"> }>;
  "packaging.package": Readonly<{ packaging: Pick<Client["packaging"], "package"> }>;
  "exports.apply": Readonly<{ exports: Pick<Client["exports"], "apply"> }>;
  "providers.targetedTest": Readonly<{ providers: Pick<Client["providers"], "targetedTest"> }>;
  "providers.completeTest": Readonly<{ providers: Pick<Client["providers"], "completeTest"> }>;
  "providers.canonicalSync": Readonly<{ providers: Pick<Client["providers"], "canonicalSync"> }>;
  "providers.canonicalStatus": Readonly<{ providers: Pick<Client["providers"], "canonicalStatus"> }>;
  "governance.currentMainRecord": Readonly<{
    governance: Pick<Client["governance"], "currentMainRecord">;
  }>;
  "governance.currentMainSelection": Readonly<{
    governance: Pick<Client["governance"], "currentMainSelection">;
  }>;
}>;

export type LifecycleOperationClient<TOperation extends LifecycleOperation> =
  LifecycleClientByOperation[TOperation];

export type ControllerProjectionBinding = Readonly<{
  gitExecutable?: string;
  providerExecutables: Readonly<Partial<Record<"claude" | "codex", string>>>;
}>;

export type LifecycleClientFactory = <TOperation extends LifecycleOperation>(
  operation: TOperation,
  binding: ControllerProjectionBinding,
) => LifecycleOperationClient<TOperation> | Promise<LifecycleOperationClient<TOperation>>;

export class LifecycleAuthorityBindingError extends Error {
  readonly code = "LIFECYCLE_AUTHORITY_BINDING_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "LifecycleAuthorityBindingError";
  }
}

import type { Client } from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleOperation =
  | "releases.check"
  | "releases.checkRepository"
  | "releases.releaseInputRecord"
  | "releases.refreshReleaseInput"
  | "vendors.status"
  | "vendors.update"
  | "packaging.package"
  | "providers.test"
  | "providers.sync"
  | "providers.status"
  | "governance.currentMainRecord"
  | "governance.currentMainSelection";

export type LifecycleClientByOperation = Readonly<{
  "releases.check": Readonly<{ releases: Pick<Client["releases"], "check"> }>;
  "releases.checkRepository": Readonly<{
    releases: Pick<Client["releases"], "checkRepository">;
  }>;
  "releases.releaseInputRecord": Readonly<{
    releases: Pick<Client["releases"], "releaseInputRecord">;
  }>;
  "releases.refreshReleaseInput": Readonly<{
    releases: Pick<Client["releases"], "refreshReleaseInput">;
  }>;
  "vendors.status": Readonly<{ vendors: Pick<Client["vendors"], "status"> }>;
  "vendors.update": Readonly<{ vendors: Pick<Client["vendors"], "update"> }>;
  "packaging.package": Readonly<{ packaging: Pick<Client["packaging"], "package"> }>;
  "providers.test": Readonly<{ providers: Pick<Client["providers"], "test"> }>;
  "providers.sync": Readonly<{ providers: Pick<Client["providers"], "sync"> }>;
  "providers.status": Readonly<{ providers: Pick<Client["providers"], "status"> }>;
  "governance.currentMainRecord": Readonly<{
    governance: Pick<Client["governance"], "currentMainRecord">;
  }>;
  "governance.currentMainSelection": Readonly<{
    governance: Pick<Client["governance"], "currentMainSelection">;
  }>;
}>;

export type LifecycleOperationClient<TOperation extends LifecycleOperation> =
  LifecycleClientByOperation[TOperation];

/**
 * Selects the one operation surface exposed to an admitted CLI command.
 *
 * @remarks
 * The selector is created from one command-local lifecycle client. It narrows
 * access without constructing another client or introducing asynchronous
 * binding state.
 */
export type LifecycleOperationSelector = <TOperation extends LifecycleOperation>(
  operation: TOperation
) => LifecycleOperationClient<TOperation>;

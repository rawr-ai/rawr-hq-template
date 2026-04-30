import type { BoundaryRequestSupportContext } from "@rawr/sdk/execution";
import type { Client as StateClient } from "@rawr/hq-ops";

export type StateApiContext = BoundaryRequestSupportContext;

export type StateClientResolver = (repoRoot: string) => StateClient;

import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { Client as StateClient } from "@rawr/hq-ops";

export type StateApiContext = BoundaryRequestSupportContext;

export type StateClientResolver = (repoRoot: string) => StateClient;

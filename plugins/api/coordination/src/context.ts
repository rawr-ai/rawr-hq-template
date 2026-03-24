import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { AuthoringClient as CoordinationAuthoringClient } from "@rawr/coordination/authoring";

export type CoordinationApiContext = BoundaryRequestSupportContext;

export type CoordinationAuthoringClientResolver = (repoRoot: string) => CoordinationAuthoringClient;

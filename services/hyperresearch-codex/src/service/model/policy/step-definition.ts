import type { HyperresearchCliOperation } from "../entities";

/** Declarative work and artifact policy for one admitted Hyperresearch step. */
export type HyperresearchStepDefinition = {
  id: string;
  title: string;
  fileName: string;
  requiredArtifacts: string[];
  tierGate?: "all" | "full";
  agentRoles?: string[];
  requiredCliOperations?: HyperresearchCliOperation[];
  snapshotFinalReport?: boolean;
};

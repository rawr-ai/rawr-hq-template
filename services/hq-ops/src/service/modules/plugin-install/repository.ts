import type { HqOpsResources } from "../../shared/ports/resources";
import {
  assessInstallState,
  planInstallRepair,
  type PluginInstallAssessInput,
  type PluginInstallRepairInput,
} from "./model";

export function createRepository(resources: HqOpsResources, repoRoot: string) {
  return {
    assessInstallState(input: PluginInstallAssessInput) {
      return assessInstallState(input, resources.path, repoRoot);
    },
    planInstallRepair(input: PluginInstallRepairInput) {
      return planInstallRepair(input);
    },
  };
}

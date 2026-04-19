/**
 * @fileoverview Node-local coordination support surface.
 *
 * @remarks
 * Keep this surface limited to file-backed storage helpers. Capability truth
 * stays in the service shell; transport compatibility helpers do not belong
 * here.
 */
export {
  appendRunTimelineEvent,
  ensureCoordinationStorage,
  getRunStatus,
  getRunTimeline,
  getWorkflow,
  listWorkflows,
  readDeskMemory,
  saveRunStatus,
  saveWorkflow,
  writeDeskMemory,
} from "./storage";

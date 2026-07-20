import type { CurrentMainSelectionResult } from "../../../governance/model/dto/current-main";

import type { ContentRecordLocator } from "../dto/mode";

/** Reads one governance-verified current-main selection for a canonical operation. */
export interface CurrentMainSelectionReader {
  resolve(locator: ContentRecordLocator): Promise<CurrentMainSelectionResult>;
}

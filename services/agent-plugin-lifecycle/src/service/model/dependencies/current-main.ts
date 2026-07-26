import type { Effect } from "effect";
import type {
  CurrentMainSelectionLocator,
  CurrentMainSelectionResult,
} from "../dto/current-main-selection";

/** Reads one governance-verified current-main observation. */
export interface CurrentMainSelectionReader {
  resolve(locator: CurrentMainSelectionLocator): Effect.Effect<CurrentMainSelectionResult>;
}

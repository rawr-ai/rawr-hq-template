import { looksLikePath } from "../../../shared/path-utils";
import type {
  DiscoveredSessionFile,
  SessionListItem,
} from "../../../shared/entities";

export type SearchSessionFilters = {
  project?: string;
  cwdContains?: string;
  branch?: string;
  model?: string;
  since?: string;
  until?: string;
};

function parseDatetimeBestEffort(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00`
    : trimmed;
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function containsFilter(
  value: string | undefined,
  needle: string | undefined,
): boolean {
  return !needle || Boolean(value?.toLowerCase().includes(needle.toLowerCase()));
}

function sessionWithinWindow(
  modifiedIso: string,
  since?: string,
  until?: string,
): boolean {
  const dt = parseDatetimeBestEffort(modifiedIso);
  if (!dt) return false;
  const sinceDt = since ? parseDatetimeBestEffort(since) : null;
  const untilDt = until ? parseDatetimeBestEffort(until) : null;
  if (sinceDt && dt < sinceDt) return false;
  if (untilDt && dt > untilDt) return false;
  return true;
}

export function hasMetadataFilters(filters: SearchSessionFilters): boolean {
  return Boolean(
    filters.project ||
      filters.cwdContains ||
      filters.branch ||
      filters.model ||
      filters.since ||
      filters.until,
  );
}

export function toModifiedIso(
  candidate: Pick<DiscoveredSessionFile, "modifiedMs">,
): string {
  return new Date(candidate.modifiedMs).toISOString();
}

export function matchesSearchFilters(
  session: SessionListItem,
  filters: SearchSessionFilters,
): boolean {
  if (filters.project) {
    const projectFilter = filters.project.trim();
    if (projectFilter && looksLikePath(projectFilter) && session.source !== "claude") {
      return false;
    }
    if (
      projectFilter &&
      !looksLikePath(projectFilter) &&
      !containsFilter(session.project, projectFilter)
    ) {
      return false;
    }
  }
  if (!containsFilter(session.cwd, filters.cwdContains)) return false;
  if (!containsFilter(session.gitBranch, filters.branch)) return false;
  if (!containsFilter(session.model, filters.model)) return false;
  if (
    (filters.since || filters.until) &&
    !sessionWithinWindow(session.modified, filters.since, filters.until)
  ) {
    return false;
  }
  return true;
}

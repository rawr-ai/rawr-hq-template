export const COORDINATION_ID_PATTERN_SOURCE = "[A-Za-z0-9][A-Za-z0-9._-]{0,127}";
export const COORDINATION_ID_TRIMMED_PATTERN_SOURCE = `^\\s*${COORDINATION_ID_PATTERN_SOURCE}\\s*$`;
export const COORDINATION_ID_MAX_LENGTH = 128;

const COORDINATION_ID_PATTERN = new RegExp(`^${COORDINATION_ID_PATTERN_SOURCE}$`);

export function isSafeCoordinationId(value: string): boolean {
  return COORDINATION_ID_PATTERN.test(value);
}

export function normalizeCoordinationId(value: string): string | null {
  const trimmed = value.trim();
  return isSafeCoordinationId(trimmed) ? trimmed : null;
}

export function assertSafeCoordinationId(value: string, label = "id"): string {
  const normalized = normalizeCoordinationId(value);
  if (!normalized) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return normalized;
}

export const SUPPORT_TRIAGE_ID_PATTERN_SOURCE = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}";
export const SUPPORT_TRIAGE_ID_TRIMMED_PATTERN_SOURCE = `^\\s*${SUPPORT_TRIAGE_ID_PATTERN_SOURCE}\\s*$`;
export const SUPPORT_TRIAGE_ID_MAX_LENGTH = 128;

const SUPPORT_TRIAGE_ID_PATTERN = new RegExp(`^${SUPPORT_TRIAGE_ID_PATTERN_SOURCE}$`, "u");

export function isSafeSupportTriageId(value: string): boolean {
  return SUPPORT_TRIAGE_ID_PATTERN.test(value);
}

export function normalizeSupportTriageId(value: string): string | null {
  const normalized = value.trim();
  return isSafeSupportTriageId(normalized) ? normalized : null;
}

export function assertSafeSupportTriageId(value: string, label: string): string {
  const normalized = normalizeSupportTriageId(value);
  if (!normalized) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return normalized;
}

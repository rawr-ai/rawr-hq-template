export const SUPPORT_EXAMPLE_ID_PATTERN_SOURCE = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}";
export const SUPPORT_EXAMPLE_ID_TRIMMED_PATTERN_SOURCE = `^\\s*${SUPPORT_EXAMPLE_ID_PATTERN_SOURCE}\\s*$`;
export const SUPPORT_EXAMPLE_ID_MAX_LENGTH = 128;

const SUPPORT_EXAMPLE_ID_PATTERN = new RegExp(`^${SUPPORT_EXAMPLE_ID_PATTERN_SOURCE}$`, "u");

export function isSafeSupportExampleId(value: string): boolean {
  return SUPPORT_EXAMPLE_ID_PATTERN.test(value);
}

export function normalizeSupportExampleId(value: string): string | null {
  const normalized = value.trim();
  return isSafeSupportExampleId(normalized) ? normalized : null;
}

export function assertSafeSupportExampleId(value: string, label: string): string {
  const normalized = normalizeSupportExampleId(value);
  if (!normalized) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return normalized;
}

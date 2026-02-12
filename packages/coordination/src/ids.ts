const COORDINATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isSafeCoordinationId(value: string): boolean {
  return COORDINATION_ID_PATTERN.test(value);
}

export function assertSafeCoordinationId(value: string, label = "id"): string {
  const trimmed = value.trim();
  if (!isSafeCoordinationId(trimmed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return trimmed;
}

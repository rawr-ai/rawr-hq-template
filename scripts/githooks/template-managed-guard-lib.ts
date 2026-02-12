export type GuardMode = "off" | "warn" | "block";
export type RepoRole = "template" | "personal" | "unknown";

const VALID_MODES = new Set<GuardMode>(["off", "warn", "block"]);

export function normalizeMode(value: string | undefined | null): GuardMode | null {
  if (!value) return null;
  const lowered = value.trim().toLowerCase();
  if (VALID_MODES.has(lowered as GuardMode)) return lowered as GuardMode;
  return null;
}

export interface ResolveGuardModeInput {
  role: RepoRole;
  envMode?: string | null;
  configMode?: string | null;
  ownerEmail?: string | null;
  ownerMode?: string | null;
  currentEmail?: string | null;
}

export function resolveGuardModeFromInputs(input: ResolveGuardModeInput): GuardMode {
  const envMode = normalizeMode(input.envMode);
  if (envMode) return envMode;

  const configMode = normalizeMode(input.configMode);
  if (configMode) return configMode;

  const ownerEmail = (input.ownerEmail ?? "").trim();
  const ownerMode = normalizeMode(input.ownerMode) ?? "block";
  const currentEmail = (input.currentEmail ?? "").trim();

  if (ownerEmail && currentEmail && ownerEmail.toLowerCase() === currentEmail.toLowerCase()) {
    return ownerMode;
  }

  if (input.role === "personal" || input.role === "unknown") return "warn";
  return "off";
}

export function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3).replace(/\/+$/, "");
    return filePath === prefix || filePath.startsWith(`${prefix}/`);
  }
  return filePath === normalizedPattern;
}

export function matchTemplateManagedFiles(stagedFiles: string[], patterns: string[]): string[] {
  return stagedFiles.filter((filePath) => patterns.some((pattern) => matchesPattern(filePath, pattern)));
}

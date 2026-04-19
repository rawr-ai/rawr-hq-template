export type SecurityModule = {
  securityCheck?: (input: { mode: "staged" | "repo" }) => Promise<unknown>;
  gateEnable?: (input: { pluginId: string; riskTolerance: string; mode: "staged" | "repo" }) => Promise<unknown>;
  getSecurityReport?: (opts: { cwd: string }) => Promise<unknown>;
};

export async function loadSecurityModule(): Promise<SecurityModule> {
  return (await import("@rawr/hq-ops/security")) as unknown as SecurityModule;
}

export function missingSecurityFn(name: keyof SecurityModule): string {
  return `@rawr/hq-ops/security is missing export: ${String(name)}`;
}

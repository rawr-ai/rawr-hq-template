export type SecurityModule = {
  runSecurityCheck?: (opts: { cwd: string; dryRun?: boolean; yes?: boolean }) => Promise<unknown>;
  getSecurityReport?: (opts: { cwd: string }) => Promise<unknown>;
  evaluateEnablement?: (
    pluginId: string,
    opts: { cwd: string; dryRun?: boolean; yes?: boolean },
  ) => Promise<unknown>;
};

export async function loadSecurityModule(): Promise<SecurityModule> {
  return (await import("@rawr/security")) as unknown as SecurityModule;
}

export function missingSecurityFn(name: keyof SecurityModule): string {
  return `@rawr/security is missing export: ${String(name)}`;
}


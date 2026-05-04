export type InstallScope = "user";

/**
 * Keeps install-scope support explicit while RAWR only supports user-local
 * provider installs. Expand this only after provider scope semantics are
 * verified end to end.
 */
export function resolveInstallScope(scope?: string): InstallScope {
  if (scope === undefined || scope === "user") return "user";
  throw new Error(`Unsupported install scope '${scope}'. Supported install scopes: user`);
}

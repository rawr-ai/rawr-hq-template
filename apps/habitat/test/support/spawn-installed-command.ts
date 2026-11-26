import { spawn } from "cross-spawn";

export function spawnInstalledCommand(
  executable: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv }
) {
  // Native executables keep literal argv; cross-spawn owns Windows shim escaping.
  const transport = {
    ...options,
    detached: process.platform !== "win32",
  };
  if (process.platform === "win32" && process.env.HABITAT_PROBE_STDIN_EOF === "1") {
    return spawn(executable, args, { ...transport, stdio: ["ignore", "pipe", "pipe"] });
  }
  return spawn(executable, args, { ...transport, stdio: "pipe" });
}

import { spawn } from "cross-spawn";

export function spawnInstalledCommand(
  executable: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv }
) {
  // Native executables keep literal argv; cross-spawn owns Windows shim escaping.
  return spawn(executable, args, {
    ...options,
    detached: process.platform !== "win32",
    stdio: "pipe",
  });
}

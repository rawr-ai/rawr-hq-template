import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const temporaryParent = realpathSync(os.tmpdir());
const temporaryPrefix = "rawr-installed-oclif-";

export type InstalledPackageEnvironment = {
  operator: string;
  prefix: string;
  providerHome: string;
  root: string;
  tarballs: string;
  xdgData: string;
};

export function createInstalledPackageEnvironment(): InstalledPackageEnvironment {
  const root = realpathSync(mkdtempSync(path.join(temporaryParent, temporaryPrefix)));
  try {
    for (const name of [
      "claude-home",
      "codex-home",
      "operator",
      "prefix",
      "provider-home",
      "tarballs",
      "xdg-data",
    ]) {
      mkdirSync(path.join(root, name), { recursive: true });
    }
    writeFileSync(path.join(root, "npmrc"), "audit=false\nfund=false\n");
    writeFileSync(path.join(root, "npm-globalrc"), "");
    return {
      operator: path.join(root, "operator"),
      prefix: path.join(root, "prefix"),
      providerHome: path.join(root, "provider-home"),
      root,
      tarballs: path.join(root, "tarballs"),
      xdgData: path.join(root, "xdg-data"),
    };
  } catch (error) {
    removeInstalledPackageEnvironment(root);
    throw error;
  }
}

export function installedPackageChildEnvironment(
  state: InstalledPackageEnvironment
): NodeJS.ProcessEnv {
  const inherited: NodeJS.ProcessEnv = {};
  for (const name of ["LANG", "LC_ALL", "PATHEXT", "SystemRoot", "WINDIR"]) {
    if (process.env[name] !== undefined) inherited[name] = process.env[name];
  }
  const at = (name: string) => path.join(state.root, name);
  return {
    ...inherited,
    BUN_INSTALL_CACHE_DIR: at("bun-cache"),
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    CLAUDE_CONFIG_DIR: at("claude-home"),
    CODEX_HOME: at("codex-home"),
    HOME: at("home"),
    NODE_ENV: "production",
    NO_COLOR: "1",
    NPM_CONFIG_CACHE: at("npm-cache"),
    NPM_CONFIG_GLOBALCONFIG: at("npm-globalrc"),
    NPM_CONFIG_PREFIX: at("npm-prefix"),
    NPM_CONFIG_REGISTRY: "https://registry.npmjs.org",
    NPM_CONFIG_USERCONFIG: at("npmrc"),
    PATH: process.env.PATH,
    RAWR_NPM_REGISTRY: "https://registry.npmjs.org",
    TEMP: at("tmp"),
    TMP: at("tmp"),
    TMPDIR: at("tmp"),
    XDG_CACHE_HOME: at("xdg-cache"),
    XDG_CONFIG_HOME: at("xdg-config"),
    XDG_DATA_HOME: state.xdgData,
    XDG_STATE_HOME: at("xdg-state"),
  };
}

export function removeInstalledPackageEnvironment(root: string): void {
  if (!existsSync(root)) return;
  const canonical = realpathSync(root);
  const status = lstatSync(canonical);
  if (
    canonical !== root ||
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    path.dirname(canonical) !== temporaryParent ||
    !path.basename(canonical).startsWith(temporaryPrefix)
  ) {
    throw new Error(`refusing to remove invalid installed-package environment: ${root}`);
  }
  rmSync(canonical, { recursive: true, force: false });
}

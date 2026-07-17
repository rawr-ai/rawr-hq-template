import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";

import {
  prepareNodeProviderProcess,
  resolveNodeProviderExecutable,
} from "./node-process";

const APP_SERVER_TIMEOUT_MS = 20_000;

export interface NodeCodexAppServerObservation {
  readonly plugins: unknown;
  readonly hooks: unknown;
}

export interface NodeCodexAppServerClient {
  inspect(home: string): Promise<NodeCodexAppServerObservation>;
  inspectPluginConfiguration(home: string): Promise<unknown>;
  setMarketplaceSource(home: string, marketplaceName: string, sourcePath: string): Promise<void>;
  setPluginEnabled(home: string, pluginSelector: string, enabled: boolean): Promise<void>;
}

export function createNodeCodexAppServerClient(executablePath: string): NodeCodexAppServerClient {
  const executable = resolveNodeProviderExecutable(executablePath);
  return Object.freeze({
    async inspect(home: string) {
      return await withAppServer(executable, home, async (connection) => {
        const [plugins, hooks] = await Promise.all([
          connection.request("plugin/list", { cwds: [], marketplaceKinds: ["local"] }),
          connection.request("hooks/list", { cwds: [home] }),
        ]);
        return Object.freeze({ plugins, hooks });
      });
    },
    async inspectPluginConfiguration(home: string) {
      return await withAppServer(executable, home, async (connection) =>
        await connection.request("config/read", { cwd: home, includeLayers: true }));
    },
    async setPluginEnabled(home: string, pluginSelector: string, enabled: boolean) {
      if (!/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9_-]*$/u.test(pluginSelector)) {
        throw new Error("Codex plugin selector is not canonical");
      }
      await withAppServer(executable, home, async (connection) => {
        await connection.request("config/value/write", {
          keyPath: `plugins.${pluginSelector}.enabled`,
          value: enabled,
          mergeStrategy: "upsert",
        });
      });
    },
    async setMarketplaceSource(home: string, marketplaceName: string, sourcePath: string) {
      if (!/^[a-z0-9][a-z0-9_-]*$/u.test(marketplaceName)) {
        throw new Error("Codex marketplace name is not canonical");
      }
      if (!path.isAbsolute(sourcePath) || path.normalize(sourcePath) !== sourcePath) {
        throw new Error("Codex marketplace source must be an absolute normalized path");
      }
      await withAppServer(executable, home, async (connection) => {
        await connection.request("config/value/write", {
          keyPath: `marketplaces.${marketplaceName}.source`,
          value: sourcePath,
          mergeStrategy: "upsert",
        });
      });
    },
  });
}

interface AppServerConnection {
  request(method: string, params: unknown): Promise<unknown>;
}

async function withAppServer<T>(
  executable: Promise<string>,
  home: string,
  operation: (connection: AppServerConnection) => Promise<T>,
): Promise<T> {
  const context = await prepareNodeProviderProcess("codex", executable, home);
  const child = spawn(context.executablePath, ["app-server", "--listen", "stdio://"], {
    cwd: context.cwd,
    env: context.env,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map<number, Readonly<{
    resolve(value: unknown): void;
    reject(error: Error): void;
  }>>();
  const failPending = (error: Error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  const errors: Buffer[] = [];
  child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
  child.on("error", (error) => failPending(error));
  child.on("close", (code, signal) => {
    if (pending.size > 0) {
      failPending(new Error(`Codex app server exited before responding (${signal ?? String(code)})`));
    }
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    let message: unknown;
    try {
      message = JSON.parse(line) as unknown;
    } catch {
      return;
    }
    if (!isRecord(message) || typeof message.id !== "number") return;
    const pendingRequest = pending.get(message.id);
    if (pendingRequest === undefined) return;
    pending.delete(message.id);
    if ("error" in message) {
      pendingRequest.reject(new Error(`Codex app server rejected request ${message.id}: ${JSON.stringify(message.error)}`));
    } else {
      pendingRequest.resolve(message.result);
    }
  });

  let nextId = 1;
  const request = async (method: string, params: unknown): Promise<unknown> => {
    const id = nextId;
    nextId += 1;
    const result = new Promise<unknown>((resolve, reject) => pending.set(id, { resolve, reject }));
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    return await result;
  };
  const timeout = setTimeout(() => {
    failPending(new Error("Codex app server operation timed out"));
    child.kill("SIGKILL");
  }, APP_SERVER_TIMEOUT_MS);
  try {
    await request("initialize", {
      clientInfo: { name: "rawr-agent-provider-deployment", version: "1.0.0" },
      capabilities: { experimentalApi: true },
    });
    child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
    return await operation(Object.freeze({ request }));
  } catch (error) {
    const stderr = Buffer.concat(errors).toString("utf8").trim();
    throw new Error(`${error instanceof Error ? error.message : String(error)}${stderr === "" ? "" : `: ${stderr}`}`);
  } finally {
    clearTimeout(timeout);
    child.stdin.end();
    lines.close();
    if (!child.killed) child.kill("SIGTERM");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

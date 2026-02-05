export type ServerConfig = {
  port: number;
  baseUrl: string;
};

const DEFAULT_PORT = 3000;

const isValidPort = (port: number) => Number.isInteger(port) && port >= 1 && port <= 65535;

export function parsePort(value: unknown, fallback = DEFAULT_PORT): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const port = Number(value);
  return isValidPort(port) ? port : fallback;
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = parsePort(env.RAWR_SERVER_PORT ?? env.PORT, DEFAULT_PORT);
  const baseUrl = (() => {
    const raw = env.RAWR_SERVER_BASE_URL;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed === "" ? `http://localhost:${port}` : trimmed;
    }
    return `http://localhost:${port}`;
  })();

  return { port, baseUrl };
}


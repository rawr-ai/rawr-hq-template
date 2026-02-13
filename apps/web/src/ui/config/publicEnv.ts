export const publicEnv = Object.freeze({
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  rpcUrl:
    typeof import.meta.env.VITE_RAWR_RPC_URL === "string"
      ? import.meta.env.VITE_RAWR_RPC_URL
      : "",
});

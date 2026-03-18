import { RPCLink } from "@orpc/client/fetch";

const RPC_CALLER_SURFACE_HEADER = "x-rawr-caller-surface";
const RPC_SESSION_AUTH_HEADER = "x-rawr-session-auth";
const RPC_SERVICE_AUTH_HEADER = "x-rawr-service-auth";
const RPC_CLI_AUTH_HEADER = "x-rawr-cli-auth";

export type RpcLinkHeaders = Readonly<Record<string, string>>;

function mergeHeaders(base: RpcLinkHeaders, extra?: RpcLinkHeaders): RpcLinkHeaders {
  if (!extra) return base;
  return { ...base, ...extra };
}

export function createFirstPartyRpcLink(input: { url: string; headers?: RpcLinkHeaders }) {
  const base: RpcLinkHeaders = {
    [RPC_CALLER_SURFACE_HEADER]: "first-party",
    [RPC_SESSION_AUTH_HEADER]: "verified",
  };

  return new RPCLink({
    url: input.url,
    headers: mergeHeaders(base, input.headers),
  });
}

export function createCliRpcLink(input: { url: string; headers?: RpcLinkHeaders }) {
  const base: RpcLinkHeaders = {
    [RPC_CALLER_SURFACE_HEADER]: "cli",
    [RPC_CLI_AUTH_HEADER]: "verified",
  };

  return new RPCLink({
    url: input.url,
    headers: mergeHeaders(base, input.headers),
  });
}

export function createTrustedServiceRpcLink(input: { url: string; headers?: RpcLinkHeaders }) {
  const base: RpcLinkHeaders = {
    [RPC_CALLER_SURFACE_HEADER]: "trusted-service",
    [RPC_SERVICE_AUTH_HEADER]: "verified",
  };

  return new RPCLink({
    url: input.url,
    headers: mergeHeaders(base, input.headers),
  });
}

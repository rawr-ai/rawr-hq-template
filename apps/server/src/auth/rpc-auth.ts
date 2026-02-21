const RPC_CALLER_SURFACE_HEADER = "x-rawr-caller-surface";
const RPC_FORWARDED_HOST_HEADER = "x-forwarded-host";
const RPC_AUTHORIZATION_HEADER = "authorization";
const RPC_COOKIE_HEADER = "cookie";
const RPC_USER_AGENT_HEADER = "user-agent";
const RPC_TRUSTED_HOSTS_ENV = "RAWR_RPC_TRUSTED_HOSTS";
const DEFAULT_TRUSTED_RPC_HOSTNAMES = ["localhost", "127.0.0.1", "::1"] as const;
const SESSION_COOKIE_NAME_PATTERN = /(?:^|;\s*)rawr(?:[-_.])?session=/u;
const RPC_AFFIRMATIVE_AUTH_TOKENS = new Set(["1", "true", "yes", "valid", "verified", "trusted"]);

export const RPC_SESSION_AUTH_HEADER = "x-rawr-session-auth";
export const RPC_SERVICE_AUTH_HEADER = "x-rawr-service-auth";
export const RPC_CLI_AUTH_HEADER = "x-rawr-cli-auth";

export type RpcAllowedCallerClass = "first-party" | "internal" | "trusted-service" | "cli";
export type RpcDeniedCallerClass = "external" | "runtime-ingress" | "unlabeled";
export type RpcCallerClass = RpcAllowedCallerClass | RpcDeniedCallerClass;

export type RpcAuthEvidence = {
  callerSurface: string | null;
  requestHostnames: string[];
  trustedHostnames: ReadonlySet<string>;
  hostTrusted: boolean;
  sessionAuthenticated: boolean;
  serviceAuthenticated: boolean;
  cliAuthenticated: boolean;
};

export type RpcAuthPolicy = {
  trustedHostnames: ReadonlySet<string>;
};

export type RpcAuthPolicyInput = {
  baseUrl?: string;
  trustedHostnames?: Iterable<string>;
};

function normalizeToken(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}

function normalizeHostname(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;

  try {
    const hostname = new URL(`http://${first}`).hostname.toLowerCase();
    return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  } catch {
    return null;
  }
}

function callerSurfaceFromRequest(request: Request): string | null {
  return normalizeToken(request.headers.get(RPC_CALLER_SURFACE_HEADER));
}

function isAffirmativeAuthSignal(value: string | null): boolean {
  const normalized = normalizeToken(value);
  if (!normalized) return false;
  return RPC_AFFIRMATIVE_AUTH_TOKENS.has(normalized);
}

function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get(RPC_COOKIE_HEADER);
  if (!cookie) return false;
  return SESSION_COOKIE_NAME_PATTERN.test(cookie);
}

function hasServiceAuthorization(request: Request): boolean {
  const authorization = normalizeToken(request.headers.get(RPC_AUTHORIZATION_HEADER));
  if (!authorization) return false;
  if (authorization.startsWith("service ")) return true;
  return authorization.startsWith("bearer svc_");
}

function hasCliUserAgent(request: Request): boolean {
  const userAgent = normalizeToken(request.headers.get(RPC_USER_AGENT_HEADER));
  if (!userAgent) return false;
  return userAgent.includes("rawr-cli/");
}

function resolveRequestHostnames(request: Request): string[] {
  const hostnames = new Set<string>();
  const requestHostname = hostnameFromUrl(request.url);
  const hostHeader = normalizeHostname(request.headers.get("host"));
  const forwardedHost = normalizeHostname(request.headers.get(RPC_FORWARDED_HOST_HEADER));

  if (requestHostname) hostnames.add(requestHostname);
  if (hostHeader) hostnames.add(hostHeader);
  if (forwardedHost) hostnames.add(forwardedHost);

  return [...hostnames];
}

function resolveTrustedHostnames(input: RpcAuthPolicyInput): ReadonlySet<string> {
  const trustedHostnames = new Set<string>(DEFAULT_TRUSTED_RPC_HOSTNAMES);

  const baseUrlHostname = hostnameFromUrl(input.baseUrl);
  if (baseUrlHostname) {
    trustedHostnames.add(baseUrlHostname);
  }

  if (input.trustedHostnames) {
    for (const hostname of input.trustedHostnames) {
      const normalized = normalizeHostname(hostname);
      if (normalized) trustedHostnames.add(normalized);
    }
  }

  const envHostnames = process.env[RPC_TRUSTED_HOSTS_ENV]
    ?.split(",")
    .map((entry) => normalizeHostname(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (envHostnames) {
    for (const hostname of envHostnames) {
      trustedHostnames.add(hostname);
    }
  }

  return trustedHostnames;
}

function isHostTrusted(hostnames: string[], trustedHostnames: ReadonlySet<string>): boolean {
  return hostnames.some((hostname) => trustedHostnames.has(hostname));
}

function isAllowedCallerSurface(callerSurface: string): callerSurface is RpcAllowedCallerClass | "in-process" {
  return (
    callerSurface === "first-party" ||
    callerSurface === "internal" ||
    callerSurface === "trusted-service" ||
    callerSurface === "cli" ||
    callerSurface === "in-process"
  );
}

export function createRpcAuthPolicy(input: RpcAuthPolicyInput = {}): RpcAuthPolicy {
  return {
    trustedHostnames: resolveTrustedHostnames(input),
  };
}

export function resolveRpcAuthEvidence(request: Request, policy: RpcAuthPolicy): RpcAuthEvidence {
  const requestHostnames = resolveRequestHostnames(request);
  const serviceAuthenticated =
    isAffirmativeAuthSignal(request.headers.get(RPC_SERVICE_AUTH_HEADER)) || hasServiceAuthorization(request);

  return {
    callerSurface: callerSurfaceFromRequest(request),
    requestHostnames,
    trustedHostnames: policy.trustedHostnames,
    hostTrusted: isHostTrusted(requestHostnames, policy.trustedHostnames),
    sessionAuthenticated: isAffirmativeAuthSignal(request.headers.get(RPC_SESSION_AUTH_HEADER)) || hasSessionCookie(request),
    serviceAuthenticated,
    cliAuthenticated:
      isAffirmativeAuthSignal(request.headers.get(RPC_CLI_AUTH_HEADER)) || (hasCliUserAgent(request) && serviceAuthenticated),
  };
}

export function resolveRpcCallerClass(evidence: RpcAuthEvidence): RpcCallerClass {
  const callerSurface = evidence.callerSurface;
  if (!callerSurface) return "unlabeled";

  if (callerSurface === "runtime-ingress") return "runtime-ingress";
  if (callerSurface === "external" || callerSurface === "third-party") return "external";

  if (!isAllowedCallerSurface(callerSurface)) return "unlabeled";
  if (!evidence.hostTrusted) return "external";

  if (callerSurface === "first-party") {
    return evidence.sessionAuthenticated ? "first-party" : "unlabeled";
  }

  if (callerSurface === "cli") {
    return evidence.cliAuthenticated ? "cli" : "unlabeled";
  }

  if (callerSurface === "trusted-service") {
    return evidence.serviceAuthenticated ? "trusted-service" : "unlabeled";
  }

  return evidence.serviceAuthenticated ? "internal" : "unlabeled";
}

export function isRpcCallerClassAllowed(callerClass: RpcCallerClass): callerClass is RpcAllowedCallerClass {
  return callerClass === "first-party" || callerClass === "internal" || callerClass === "trusted-service" || callerClass === "cli";
}

export function classifyRpcRequest(request: Request, policy: RpcAuthPolicy): RpcCallerClass {
  const evidence = resolveRpcAuthEvidence(request, policy);
  return resolveRpcCallerClass(evidence);
}

export function isRpcRequestAllowed(request: Request, policy: RpcAuthPolicy): boolean {
  return isRpcCallerClassAllowed(classifyRpcRequest(request, policy));
}

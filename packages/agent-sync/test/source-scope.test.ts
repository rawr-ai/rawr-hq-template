import { describe, expect, it } from "vitest";

import { resolveSourceScopeForPath, scopeAllows } from "../src/lib/source-scope";

describe("source scope resolution", () => {
  const workspaceRoot = "/tmp/rawr-hq";

  it("detects workspace plugin scopes", () => {
    expect(resolveSourceScopeForPath("/tmp/rawr-hq/plugins/agents/meta", workspaceRoot)).toBe("agents");
    expect(resolveSourceScopeForPath("/tmp/rawr-hq/plugins/cli/plugins", workspaceRoot)).toBe("cli");
    expect(resolveSourceScopeForPath("/tmp/rawr-hq/plugins/web/demo", workspaceRoot)).toBe("web");
  });

  it("falls back to external for non-workspace roots", () => {
    expect(resolveSourceScopeForPath("/tmp/somewhere-else/plugin-a", workspaceRoot)).toBe("external");
  });

  it("matches scope rules", () => {
    expect(scopeAllows("all", "external")).toBe(true);
    expect(scopeAllows("agents", "agents")).toBe(true);
    expect(scopeAllows("agents", "cli")).toBe(false);
  });
});

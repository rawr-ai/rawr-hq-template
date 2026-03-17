import { describe, expect, it } from "vitest";

import { inferTypeFromPath } from "../src/commands/plugins/sweep";

describe("@rawr/plugin-plugins", () => {
  it("infers lifecycle type from plugin root path", () => {
    expect(inferTypeFromPath("/repo/plugins/cli/demo")).toBe("cli");
    expect(inferTypeFromPath("/repo/plugins/web/demo")).toBe("web");
    expect(inferTypeFromPath("/repo/plugins/agents/demo")).toBe("agent");
    expect(inferTypeFromPath("/repo/plugins/workflows/demo")).toBe("workflow");
    expect(inferTypeFromPath("/repo/plugins/api/demo")).toBe("composed");
    expect(inferTypeFromPath("/repo/plugins/other/demo")).toBe("composed");
  });
});

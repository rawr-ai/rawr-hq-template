import { describe, expect, it } from "vitest";
import { registerServer } from "../src/server";
import { mount } from "../src/web";

describe("@rawr/plugin-mfe-demo", () => {
  it("registers support-triage example routes", () => {
    const routes = new Map<string, () => unknown>();
    const app = {
      get(path: string, handler: () => unknown) {
        routes.set(path, handler);
      },
    };

    registerServer(app, { baseUrl: "/" });
    expect(routes.has("/mfe-demo/health")).toBe(true);
    expect(routes.has("/mfe-demo/support-triage/status")).toBe(true);

    const status = routes.get("/mfe-demo/support-triage/status");
    expect(status).toBeDefined();
    expect(status?.()).toMatchObject({
      capability: "support-triage",
      exampleDomain: true,
      run: {
        status: "queued",
      },
    });
  });

  it("mounts support-triage UI state and unmounts from the DOM", () => {
    const el = document.createElement("div");
    const handle = mount(el, {
      hostAppId: "test-host",
      basePath: "/",
      getLocation: () => ({ pathname: "/", search: "", hash: "" }),
      navigate: () => undefined,
    });

    expect(el.textContent).toContain("Support triage example micro-frontend");
    expect(el.textContent).toContain("status: idle");

    const queueButton = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Queue Triage Run");
    expect(queueButton).toBeDefined();
    queueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(el.textContent).toContain("status: queued");
    expect(el.textContent).toContain("runId: support-triage-demo-1");

    handle?.unmount?.();
    expect(el.textContent).toBe("");
  });
});

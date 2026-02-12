import { describe, expect, it } from "vitest";
import { registerServer } from "../src/server";
import { mount } from "../src/web";

describe("@rawr/plugin-mfe-demo", () => {
  it("exports a server registration function", () => {
    expect(typeof registerServer).toBe("function");
  });

  it("mounts and unmounts in the DOM", () => {
    const el = document.createElement("div");
    const handle = mount(el, {
      hostAppId: "test-host",
      basePath: "/",
      getLocation: () => ({ pathname: "/", search: "", hash: "" }),
      navigate: () => undefined,
    });
    expect(el.textContent).toContain("Micro-frontend demo plugin");
    handle?.unmount?.();
    expect(el.textContent).toBe("");
  });
});

import type { MountContext } from "@rawr/ui-sdk";
import { describe, expect, it } from "vitest";

function normalizeBasePath(basePath: string | undefined): string {
  const raw = (basePath ?? "").trim();
  if (raw === "" || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/u, "");
}

function mountNeutralFixture(el: HTMLElement, ctx: MountContext) {
  const root = document.createElement("div");
  const basePath = normalizeBasePath(ctx.basePath);
  root.dataset.statusUrl = `${basePath}/fixture-web/status`;
  root.textContent = `mounted:${ctx.hostAppId}`;
  el.appendChild(root);

  return {
    unmount: () => {
      root.remove();
    },
  };
}

describe("web plugin mount contract", () => {
  it("passes host context, normalizes base paths, and supports unmount cleanup", () => {
    const el = document.createElement("div");
    const handle = mountNeutralFixture(el, {
      hostAppId: "test-host",
      basePath: "/rawr/",
      getLocation: () => ({ pathname: "/", search: "", hash: "" }),
      navigate: () => undefined,
    });

    expect(el.textContent).toBe("mounted:test-host");
    expect(el.firstElementChild?.getAttribute("data-status-url")).toBe("/rawr/fixture-web/status");

    handle.unmount();
    expect(el.textContent).toBe("");
  });
});

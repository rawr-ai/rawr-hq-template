import type { MountContext } from "@rawr/ui-sdk";

export const name = "@rawr/plugin-mfe-demo";

function getCssVar(root: HTMLElement, variableName: string, fallback: string) {
  const value = getComputedStyle(root).getPropertyValue(variableName).trim();
  return value || fallback;
}

export function mount(el: HTMLElement, ctx: MountContext) {
  const borderDefault = getCssVar(el, "--ui-border-default", "rgba(15, 23, 42, 0.24)");
  const borderSubtle = getCssVar(el, "--ui-border-subtle", "rgba(15, 23, 42, 0.15)");
  const surface = getCssVar(el, "--ui-surface-1", "rgba(248, 250, 252, 0.95)");
  const surfaceInset = getCssVar(el, "--ui-surface-inset", "rgba(226, 232, 240, 0.6)");
  const textPrimary = getCssVar(el, "--ui-text-primary", "#0f172a");
  const textSecondary = getCssVar(el, "--ui-text-secondary", "#334155");
  const accent = getCssVar(el, "--ui-accent", "#06b6d4");
  const accentInk = getCssVar(el, "--ui-accent-ink", "#022c38");

  const root = document.createElement("div");
  root.style.padding = "14px";
  root.style.border = `1px solid ${borderDefault}`;
  root.style.borderRadius = "12px";
  root.style.background = surface;
  root.style.color = textPrimary;

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  title.textContent = "Micro-frontend demo plugin";

  const meta = document.createElement("div");
  meta.style.color = textSecondary;
  meta.style.fontSize = "12px";
  meta.style.marginBottom = "10px";
  meta.textContent = `plugin: ${name} · basePath: ${ctx.basePath ?? "/"}`;

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "10px";
  row.style.padding = "10px";
  row.style.border = `1px solid ${borderSubtle}`;
  row.style.borderRadius = "10px";
  row.style.background = surfaceInset;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Increment";
  button.style.border = `1px solid ${borderDefault}`;
  button.style.borderRadius = "8px";
  button.style.padding = "6px 10px";
  button.style.fontWeight = "600";
  button.style.background = accent;
  button.style.color = accentInk;
  button.style.cursor = "pointer";
  button.style.transition = "filter 140ms ease-out";
  button.addEventListener("mouseenter", () => {
    button.style.filter = "brightness(1.06)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.filter = "brightness(1)";
  });

  const value = document.createElement("span");
  value.style.fontVariantNumeric = "tabular-nums";
  value.style.fontWeight = "700";
  value.textContent = "0";

  let count = 0;
  button.addEventListener("click", () => {
    count += 1;
    value.textContent = String(count);
  });

  row.appendChild(button);
  row.appendChild(value);

  root.appendChild(title);
  root.appendChild(meta);
  root.appendChild(row);

  el.appendChild(root);

  return {
    unmount: () => {
      root.remove();
    },
  };
}

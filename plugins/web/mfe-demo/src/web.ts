import type { MountContext } from "@rawr/ui-sdk";

export const name = "@rawr/plugin-mfe-demo";

type DemoStatus = "idle" | "queued" | "running" | "completed";

type DemoRunState = {
  runCount: number;
  runId: string;
  status: DemoStatus;
  triagedTicketCount: number;
};

function getCssVar(root: HTMLElement, variableName: string, fallback: string) {
  const value = getComputedStyle(root).getPropertyValue(variableName).trim();
  return value || fallback;
}

function renderState(target: { status: HTMLElement; runId: HTMLElement; triagedTicketCount: HTMLElement }, state: DemoRunState) {
  target.status.textContent = `status: ${state.status}`;
  target.runId.textContent = `runId: ${state.runId}`;
  target.triagedTicketCount.textContent = `triagedTicketCount: ${state.triagedTicketCount}`;
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
  title.textContent = "Support triage example micro-frontend";

  const subtitle = document.createElement("div");
  subtitle.style.color = textSecondary;
  subtitle.style.fontSize = "12px";
  subtitle.style.marginBottom = "8px";
  subtitle.textContent = "Example domain only. Not a production support triage surface.";

  const meta = document.createElement("div");
  meta.style.color = textSecondary;
  meta.style.fontSize = "12px";
  meta.style.marginBottom = "10px";
  meta.textContent = `plugin: ${name} · basePath: ${ctx.basePath ?? "/"}`;

  const routeHints = document.createElement("div");
  routeHints.style.color = textSecondary;
  routeHints.style.fontSize = "12px";
  routeHints.style.marginBottom = "10px";
  routeHints.textContent = "first-party route: /rpc · published boundary: /api/workflows/support-triage/*";

  const stateCard = document.createElement("div");
  stateCard.style.display = "grid";
  stateCard.style.gap = "4px";
  stateCard.style.padding = "10px";
  stateCard.style.border = `1px solid ${borderSubtle}`;
  stateCard.style.borderRadius = "10px";
  stateCard.style.background = surfaceInset;
  stateCard.style.marginBottom = "10px";

  const status = document.createElement("div");
  status.style.fontWeight = "600";

  const runId = document.createElement("div");
  runId.style.fontVariantNumeric = "tabular-nums";

  const triagedTicketCount = document.createElement("div");
  triagedTicketCount.style.fontVariantNumeric = "tabular-nums";

  stateCard.append(status, runId, triagedTicketCount);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.gap = "10px";
  actions.style.padding = "10px";
  actions.style.border = `1px solid ${borderSubtle}`;
  actions.style.borderRadius = "10px";
  actions.style.background = surfaceInset;

  const queueButton = document.createElement("button");
  queueButton.type = "button";
  queueButton.textContent = "Queue Triage Run";
  queueButton.style.border = `1px solid ${borderDefault}`;
  queueButton.style.borderRadius = "8px";
  queueButton.style.padding = "6px 10px";
  queueButton.style.fontWeight = "600";
  queueButton.style.background = accent;
  queueButton.style.color = accentInk;
  queueButton.style.cursor = "pointer";
  queueButton.style.transition = "filter 140ms ease-out";
  queueButton.addEventListener("mouseenter", () => {
    queueButton.style.filter = "brightness(1.06)";
  });
  queueButton.addEventListener("mouseleave", () => {
    queueButton.style.filter = "brightness(1)";
  });

  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.textContent = "Mark Completed";
  completeButton.style.border = `1px solid ${borderDefault}`;
  completeButton.style.borderRadius = "8px";
  completeButton.style.padding = "6px 10px";
  completeButton.style.fontWeight = "600";
  completeButton.style.background = surface;
  completeButton.style.color = textPrimary;
  completeButton.style.cursor = "pointer";

  actions.append(queueButton, completeButton);

  const state: DemoRunState = {
    runCount: 0,
    runId: "none",
    status: "idle",
    triagedTicketCount: 0,
  };

  queueButton.addEventListener("click", () => {
    state.runCount += 1;
    state.runId = `support-triage-demo-${state.runCount}`;
    state.status = "queued";
    state.triagedTicketCount = 0;
    renderState({ status, runId, triagedTicketCount }, state);
  });

  completeButton.addEventListener("click", () => {
    if (state.status === "idle") return;
    state.status = "completed";
    state.triagedTicketCount = Math.max(12, state.runCount * 12);
    renderState({ status, runId, triagedTicketCount }, state);
  });

  renderState({ status, runId, triagedTicketCount }, state);

  root.append(title, subtitle, meta, routeHints, stateCard, actions);
  el.appendChild(root);

  return {
    unmount: () => {
      root.remove();
    },
  };
}

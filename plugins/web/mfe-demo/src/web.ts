import type { MountContext } from "@rawr/ui-sdk";

export const name = "@rawr/plugin-mfe-demo";

type TerminalRunStatus = "completed" | "failed";
type RunStatus = "queued" | "running" | TerminalRunStatus;

type SupportTriageRun = Readonly<{
  runId: string;
  queueId: string;
  requestedBy: string;
  dryRun: boolean;
  status: RunStatus | (string & {});
  startedAt: string;
  finishedAt?: string;
  triagedTicketCount?: number;
  escalatedTicketCount?: number;
  error?: string;
}>;

function getCssVar(root: HTMLElement, variableName: string, fallback: string) {
  const value = getComputedStyle(root).getPropertyValue(variableName).trim();
  return value || fallback;
}

function normalizeBasePath(basePath: string | undefined): string {
  const raw = (basePath ?? "").trim();
  if (raw === "" || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/u, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readResponseField<T>(obj: Record<string, unknown>, key: string): T | undefined {
  return obj[key] as T | undefined;
}

function parseSupportTriageRun(value: unknown): SupportTriageRun | null {
  if (!isRecord(value)) return null;

  const runId = readResponseField<string>(value, "runId");
  const queueId = readResponseField<string>(value, "queueId");
  const requestedBy = readResponseField<string>(value, "requestedBy");
  const dryRun = readResponseField<boolean>(value, "dryRun");
  const status = readResponseField<string>(value, "status");
  const startedAt = readResponseField<string>(value, "startedAt");

  if (typeof runId !== "string" || runId.trim() === "") return null;
  if (typeof queueId !== "string" || queueId.trim() === "") return null;
  if (typeof requestedBy !== "string" || requestedBy.trim() === "") return null;
  if (typeof dryRun !== "boolean") return null;
  if (typeof status !== "string" || status.trim() === "") return null;
  if (typeof startedAt !== "string" || startedAt.trim() === "") return null;

  const finishedAt = readResponseField<unknown>(value, "finishedAt");
  const triagedTicketCount = readResponseField<unknown>(value, "triagedTicketCount");
  const escalatedTicketCount = readResponseField<unknown>(value, "escalatedTicketCount");
  const error = readResponseField<unknown>(value, "error");

  return {
    runId,
    queueId,
    requestedBy,
    dryRun,
    status: status as SupportTriageRun["status"],
    startedAt,
    ...(typeof finishedAt === "string" ? { finishedAt } : {}),
    ...(typeof triagedTicketCount === "number" && Number.isFinite(triagedTicketCount) ? { triagedTicketCount } : {}),
    ...(typeof escalatedTicketCount === "number" && Number.isFinite(escalatedTicketCount) ? { escalatedTicketCount } : {}),
    ...(typeof error === "string" && error.trim() !== "" ? { error } : {}),
  };
}

function isTerminalStatus(status: SupportTriageRun["status"] | null | undefined): status is TerminalRunStatus {
  return status === "completed" || status === "failed";
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }
  return await response.text();
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

  const apiPrefix = normalizeBasePath(ctx.basePath);

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
  routeHints.textContent =
    "workflow boundary: POST /api/workflows/support-triage/runs · GET /api/workflows/support-triage/status?runId=...";

  const stateCard = document.createElement("div");
  stateCard.style.display = "grid";
  stateCard.style.gap = "4px";
  stateCard.style.padding = "10px";
  stateCard.style.border = `1px solid ${borderSubtle}`;
  stateCard.style.borderRadius = "10px";
  stateCard.style.background = surfaceInset;
  stateCard.style.marginBottom = "10px";

  const statusEl = document.createElement("div");
  statusEl.style.fontWeight = "600";

  const healthyEl = document.createElement("div");
  healthyEl.style.fontVariantNumeric = "tabular-nums";

  const pollingEl = document.createElement("div");
  pollingEl.style.fontVariantNumeric = "tabular-nums";

  const runIdEl = document.createElement("div");
  runIdEl.style.fontVariantNumeric = "tabular-nums";

  const triagedEl = document.createElement("div");
  triagedEl.style.fontVariantNumeric = "tabular-nums";

  const escalatedEl = document.createElement("div");
  escalatedEl.style.fontVariantNumeric = "tabular-nums";

  const errorEl = document.createElement("div");
  errorEl.style.fontVariantNumeric = "tabular-nums";
  errorEl.style.whiteSpace = "pre-wrap";

  stateCard.append(statusEl, healthyEl, pollingEl, runIdEl, triagedEl, escalatedEl, errorEl);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.gap = "10px";
  actions.style.padding = "10px";
  actions.style.border = `1px solid ${borderSubtle}`;
  actions.style.borderRadius = "10px";
  actions.style.background = surfaceInset;
  actions.style.flexWrap = "wrap";

  function createLabeledInput(labelText: string, input: HTMLInputElement) {
    const wrap = document.createElement("label");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "4px";
    wrap.style.fontSize = "12px";
    wrap.style.color = textSecondary;

    const label = document.createElement("div");
    label.textContent = labelText;

    input.style.border = `1px solid ${borderDefault}`;
    input.style.borderRadius = "8px";
    input.style.padding = "6px 10px";
    input.style.background = surface;
    input.style.color = textPrimary;
    input.style.minWidth = "220px";

    wrap.append(label, input);
    return wrap;
  }

  const queueIdInput = document.createElement("input");
  queueIdInput.type = "text";
  queueIdInput.value = "queue-demo";

  const requestedByInput = document.createElement("input");
  requestedByInput.type = "text";
  requestedByInput.value = "mfe-demo";

  const runIdInput = document.createElement("input");
  runIdInput.type = "text";
  runIdInput.placeholder = "(optional) idempotency key";

  const dryRunWrap = document.createElement("label");
  dryRunWrap.style.display = "flex";
  dryRunWrap.style.alignItems = "center";
  dryRunWrap.style.gap = "8px";
  dryRunWrap.style.fontSize = "12px";
  dryRunWrap.style.color = textSecondary;

  const dryRunInput = document.createElement("input");
  dryRunInput.type = "checkbox";
  dryRunInput.checked = true;
  dryRunWrap.append(dryRunInput, document.createTextNode("dryRun"));

  function styleButton(button: HTMLButtonElement, variant: "accent" | "surface") {
    button.type = "button";
    button.style.border = `1px solid ${borderDefault}`;
    button.style.borderRadius = "8px";
    button.style.padding = "6px 10px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";

    if (variant === "accent") {
      button.style.background = accent;
      button.style.color = accentInk;
      button.style.transition = "filter 140ms ease-out";
      button.addEventListener("mouseenter", () => {
        button.style.filter = "brightness(1.06)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.filter = "brightness(1)";
      });
      return;
    }

    button.style.background = surface;
    button.style.color = textPrimary;
  }

  const triggerButton = document.createElement("button");
  triggerButton.textContent = "Trigger Workflow Run";
  styleButton(triggerButton, "accent");

  const refreshButton = document.createElement("button");
  refreshButton.textContent = "Fetch Status";
  styleButton(refreshButton, "surface");

  const stopButton = document.createElement("button");
  stopButton.textContent = "Stop Polling";
  styleButton(stopButton, "surface");

  actions.append(
    createLabeledInput("queueId", queueIdInput),
    createLabeledInput("requestedBy", requestedByInput),
    createLabeledInput("runId (optional)", runIdInput),
    dryRunWrap,
    triggerButton,
    refreshButton,
    stopButton,
  );

  const responseCard = document.createElement("div");
  responseCard.style.display = "grid";
  responseCard.style.gap = "10px";
  responseCard.style.marginTop = "10px";
  responseCard.style.padding = "10px";
  responseCard.style.border = `1px solid ${borderSubtle}`;
  responseCard.style.borderRadius = "10px";
  responseCard.style.background = surfaceInset;

  function createResponseBlock(titleText: string) {
    const title = document.createElement("div");
    title.style.fontSize = "12px";
    title.style.color = textSecondary;
    title.textContent = titleText;

    const pre = document.createElement("pre");
    pre.style.margin = "0";
    pre.style.padding = "10px";
    pre.style.border = `1px solid ${borderSubtle}`;
    pre.style.borderRadius = "10px";
    pre.style.background = surface;
    pre.style.color = textPrimary;
    pre.style.overflowX = "auto";
    pre.style.fontSize = "12px";
    pre.textContent = "(none)";

    return { title, pre };
  }

  const triggerBlock = createResponseBlock("last trigger response");
  const statusBlock = createResponseBlock("last status response");
  responseCard.append(triggerBlock.title, triggerBlock.pre, statusBlock.title, statusBlock.pre);

  let healthy: boolean | null = null;
  let polling = false;
  let run: SupportTriageRun | null = null;
  let error: string | null = null;
  let lastTriggerResponse: unknown | null = null;
  let lastStatusResponse: unknown | null = null;

  let pollTimer: number | null = null;
  let pollAbort: AbortController | null = null;
  let pollInFlight = false;

  function stopPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    pollAbort?.abort();
    pollAbort = null;
    polling = false;
  }

  function render() {
    statusEl.textContent = `status: ${run?.status ?? "idle"}`;
    healthyEl.textContent = `healthy: ${healthy ?? "unknown"}`;
    pollingEl.textContent = `polling: ${polling ? "on" : "off"}`;
    runIdEl.textContent = `runId: ${run?.runId ?? "none"}`;
    triagedEl.textContent = `triagedTicketCount: ${run?.triagedTicketCount ?? 0}`;
    escalatedEl.textContent = `escalatedTicketCount: ${run?.escalatedTicketCount ?? 0}`;
    errorEl.textContent = error ? `error: ${error}` : "error: none";
    triggerBlock.pre.textContent = lastTriggerResponse ? prettyJson(lastTriggerResponse) : "(none)";
    statusBlock.pre.textContent = lastStatusResponse ? prettyJson(lastStatusResponse) : "(none)";
  }

  async function fetchStatus(runIdValue: string | null) {
    const statusUrl = runIdValue
      ? `${apiPrefix}/api/workflows/support-triage/status?runId=${encodeURIComponent(runIdValue)}`
      : `${apiPrefix}/api/workflows/support-triage/status`;

    pollAbort?.abort();
    pollAbort = new AbortController();

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: pollAbort.signal,
    });

    const body = await readResponseBody(response);
    lastStatusResponse = body;

    if (!response.ok) {
      error = `status request failed (${response.status})`;
      return;
    }

    if (!isRecord(body)) return;
    const nextHealthy = readResponseField<boolean>(body, "healthy");
    if (typeof nextHealthy === "boolean") healthy = nextHealthy;

    run = parseSupportTriageRun(body.run);
    if (run?.runId) runIdInput.value = run.runId;
  }

  async function triggerRun() {
    const queueId = queueIdInput.value.trim();
    const requestedBy = requestedByInput.value.trim();
    const runIdValue = runIdInput.value.trim();
    const dryRun = dryRunInput.checked;

    error = null;
    lastTriggerResponse = null;
    lastStatusResponse = null;

    stopPolling();

    const response = await fetch(`${apiPrefix}/api/workflows/support-triage/runs`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        queueId,
        requestedBy,
        ...(runIdValue ? { runId: runIdValue } : {}),
        ...(dryRun ? { dryRun } : {}),
      }),
    });

    const body = await readResponseBody(response);
    lastTriggerResponse = body;

    if (!response.ok) {
      error = `trigger request failed (${response.status})`;
      return;
    }

    if (isRecord(body) && isRecord(body.run)) {
      run = parseSupportTriageRun(body.run);
      if (run?.runId) runIdInput.value = run.runId;
    }
  }

  async function pollOnce(runIdValue: string) {
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      await fetchStatus(runIdValue);
      if (isTerminalStatus(run?.status)) stopPolling();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      pollInFlight = false;
      render();
    }
  }

  function startPolling(runIdValue: string) {
    stopPolling();
    polling = true;
    void pollOnce(runIdValue);
    pollTimer = window.setInterval(() => void pollOnce(runIdValue), 1500);
  }

  triggerButton.addEventListener("click", async () => {
    triggerButton.disabled = true;
    refreshButton.disabled = true;
    stopButton.disabled = true;
    try {
      await triggerRun();
      if (run?.runId) startPolling(run.runId);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      triggerButton.disabled = false;
      refreshButton.disabled = false;
      stopButton.disabled = false;
      render();
    }
  });

  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    try {
      error = null;
      const value = runIdInput.value.trim();
      await fetchStatus(value === "" ? null : value);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      refreshButton.disabled = false;
      render();
    }
  });

  stopButton.addEventListener("click", () => {
    stopPolling();
    render();
  });

  root.append(title, subtitle, meta, routeHints, stateCard, actions, responseCard);
  el.appendChild(root);

  void (async () => {
    try {
      await fetchStatus(null);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      render();
    }
  })();

  render();

  return {
    unmount: () => {
      stopPolling();
      root.remove();
    },
  };
}


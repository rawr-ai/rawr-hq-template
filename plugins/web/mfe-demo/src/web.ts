import type { MountContext } from "@rawr/ui-sdk";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

export const name = "@rawr/plugin-mfe-demo";

type TerminalRunStatus = "completed" | "failed";

type SupportTriageRun = Readonly<{
  runId: string;
  status: string;
}> &
  Readonly<Record<string, unknown>>;

type TriggerSupportTriageInput = Readonly<{
  queueId: string;
  requestedBy: string;
  runId?: string;
  dryRun?: boolean;
}>;

type TriggerSupportTriageOutput = Readonly<{
  accepted: boolean;
  run: SupportTriageRun;
  eventIds: ReadonlyArray<string>;
}>;

type GetSupportTriageStatusInput = Readonly<{ runId?: string }>;

type GetSupportTriageStatusOutput = Readonly<{
  capability: string;
  healthy: boolean;
  run: SupportTriageRun | null;
}>;

type SupportTriageWorkflowRpcClient = Readonly<{
  triggerSupportTriage(input: TriggerSupportTriageInput): Promise<TriggerSupportTriageOutput>;
  getSupportTriageStatus(input: GetSupportTriageStatusInput): Promise<GetSupportTriageStatusOutput>;
}>;

function normalizeBasePath(basePath: string | undefined): string {
  const raw = (basePath ?? "").trim();
  if (raw === "" || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/u, "");
}

function resolveRpcUrl(basePath: string): string {
  const path = `${basePath}/rpc`;
  if (typeof window !== "undefined") {
    return new URL(path, window.location.href).toString();
  }
  return `http://localhost:3000${path}`;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isTerminalStatus(status: string | null): status is TerminalRunStatus {
  return status === "completed" || status === "failed";
}

export function mount(el: HTMLElement, ctx: MountContext) {
  const basePath = normalizeBasePath(ctx.basePath);

  const client = createORPCClient<SupportTriageWorkflowRpcClient>(
    new RPCLink({
      url: resolveRpcUrl(basePath),
    }),
  );

  const root = document.createElement("div");
  root.style.fontFamily = "ui-sans-serif, system-ui";
  root.style.fontSize = "14px";
  root.style.lineHeight = "1.4";
  root.style.padding = "12px";
  root.style.border = "1px solid rgba(15, 23, 42, 0.18)";
  root.style.borderRadius = "10px";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.textContent = "Support triage example micro-frontend";

  const hint = document.createElement("div");
  hint.style.marginTop = "4px";
  hint.style.color = "rgba(15, 23, 42, 0.7)";
  hint.textContent = "First-party demo: calls workflow procedures over /rpc via oRPC RPCLink.";

  const form = document.createElement("div");
  form.style.display = "grid";
  form.style.gap = "8px";
  form.style.marginTop = "10px";

  const queueIdInput = document.createElement("input");
  queueIdInput.value = "queue-demo";
  queueIdInput.placeholder = "queueId";

  const requestedByInput = document.createElement("input");
  requestedByInput.value = "mfe-demo";
  requestedByInput.placeholder = "requestedBy";

  const runIdInput = document.createElement("input");
  runIdInput.value = "";
  runIdInput.placeholder = "runId (optional)";

  const dryRunWrap = document.createElement("label");
  dryRunWrap.style.display = "flex";
  dryRunWrap.style.alignItems = "center";
  dryRunWrap.style.gap = "6px";

  const dryRunInput = document.createElement("input");
  dryRunInput.type = "checkbox";
  dryRunInput.checked = true;
  dryRunWrap.append(dryRunInput, document.createTextNode("dryRun"));

  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.flexWrap = "wrap";
  buttons.style.gap = "8px";

  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.textContent = "Trigger";

  const fetchBtn = document.createElement("button");
  fetchBtn.type = "button";
  fetchBtn.textContent = "Fetch status";

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.textContent = "Stop polling";

  buttons.append(triggerBtn, fetchBtn, stopBtn);

  form.append(queueIdInput, requestedByInput, runIdInput, dryRunWrap, buttons);

  const state = document.createElement("div");
  state.style.marginTop = "10px";
  state.style.display = "grid";
  state.style.gap = "4px";

  const statusEl = document.createElement("div");
  const healthyEl = document.createElement("div");
  const pollingEl = document.createElement("div");
  const runIdEl = document.createElement("div");
  const errorEl = document.createElement("div");
  errorEl.style.whiteSpace = "pre-wrap";

  state.append(statusEl, healthyEl, pollingEl, runIdEl, errorEl);

  const outWrap = document.createElement("div");
  outWrap.style.marginTop = "10px";
  outWrap.style.display = "grid";
  outWrap.style.gap = "8px";

  const triggerPre = document.createElement("pre");
  const statusPre = document.createElement("pre");
  for (const pre of [triggerPre, statusPre]) {
    pre.style.margin = "0";
    pre.style.padding = "8px";
    pre.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    pre.style.borderRadius = "8px";
    pre.style.overflowX = "auto";
    pre.style.fontSize = "12px";
  }

  outWrap.append(triggerPre, statusPre);

  root.append(title, hint, form, state, outWrap);
  el.appendChild(root);

  let healthy: boolean | null = null;
  let polling = false;
  let runId: string | null = null;
  let status: string | null = null;
  let lastError: string | null = null;
  let lastTrigger: unknown | null = null;
  let lastStatus: unknown | null = null;

  let timer: number | null = null;
  let inFlight = false;

  function stopPolling() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    polling = false;
  }

  function render() {
    statusEl.textContent = `status: ${status ?? "idle"}`;
    healthyEl.textContent = `healthy: ${healthy ?? "unknown"}`;
    pollingEl.textContent = `polling: ${polling ? "on" : "off"}`;
    runIdEl.textContent = `runId: ${runId ?? "none"}`;
    errorEl.textContent = `error: ${lastError ?? "none"}`;
    triggerPre.textContent = `last trigger:\n${lastTrigger ? prettyJson(lastTrigger) : "(none)"}`;
    statusPre.textContent = `last status:\n${lastStatus ? prettyJson(lastStatus) : "(none)"}`;
  }

  function updateFromStatus(body: GetSupportTriageStatusOutput) {
    healthy = body.healthy;
    const r = body.run;
    if (r && typeof r.runId === "string") {
      runId = r.runId;
      runIdInput.value = r.runId;
    }
    status = r && typeof r.status === "string" ? r.status : null;
  }

  async function fetchStatus(id: string | null) {
    const body = await client.getSupportTriageStatus(id ? { runId: id } : {});
    lastStatus = body;
    updateFromStatus(body);
  }

  async function trigger() {
    const input: TriggerSupportTriageInput = {
      queueId: queueIdInput.value.trim(),
      requestedBy: requestedByInput.value.trim(),
      ...(runIdInput.value.trim() ? { runId: runIdInput.value.trim() } : {}),
      dryRun: dryRunInput.checked,
    };

    const body = await client.triggerSupportTriage(input);
    lastTrigger = body;

    const r = body.run;
    if (r && typeof r.runId === "string") {
      runId = r.runId;
      runIdInput.value = r.runId;
    }
    status = r && typeof r.status === "string" ? r.status : "queued";
  }

  async function pollOnce() {
    if (!runId || inFlight) return;
    inFlight = true;
    try {
      await fetchStatus(runId);
      if (isTerminalStatus(status)) stopPolling();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      stopPolling();
    } finally {
      inFlight = false;
      render();
    }
  }

  function startPolling() {
    if (!runId) return;
    stopPolling();
    polling = true;
    void pollOnce();
    timer = window.setInterval(() => void pollOnce(), 1500);
  }

  triggerBtn.addEventListener("click", async () => {
    triggerBtn.disabled = true;
    fetchBtn.disabled = true;
    stopBtn.disabled = true;

    lastError = null;
    stopPolling();
    render();

    try {
      await trigger();
      startPolling();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      triggerBtn.disabled = false;
      fetchBtn.disabled = false;
      stopBtn.disabled = false;
      render();
    }
  });

  fetchBtn.addEventListener("click", async () => {
    fetchBtn.disabled = true;
    lastError = null;
    render();

    try {
      await fetchStatus(runIdInput.value.trim() || null);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      fetchBtn.disabled = false;
      render();
    }
  });

  stopBtn.addEventListener("click", () => {
    stopPolling();
    render();
  });

  void (async () => {
    try {
      await fetchStatus(null);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
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

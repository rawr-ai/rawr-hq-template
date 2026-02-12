import React, { useEffect, useMemo, useState } from "react";
import {
  validateWorkflow,
  type CoordinationWorkflowV1,
  type DeskDefinitionV1,
  type DeskRunEventV1,
  type RunStatusV1,
  type ValidationResultV1,
} from "@rawr/coordination";
import {
  COORDINATION_RUN_EVENT,
  coordinationAvailableActions,
  fromWorkflowKitWorkflow,
  toWorkflowKitWorkflow,
} from "@rawr/coordination-inngest/browser";
import { Editor, Provider, Sidebar } from "@inngest/workflow-kit/ui";
import type { Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import "@inngest/workflow-kit/ui/ui.css";

function nowWorkflowId(): string {
  return `workflow-${Date.now()}`;
}

function starterDesk(id: string, kind: DeskDefinitionV1["kind"], name: string): DeskDefinitionV1 {
  return {
    deskId: id,
    kind,
    name,
    responsibility: `Own ${name}`,
    domain: "coordination",
    inputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
    outputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
    memoryScope: { persist: true, namespace: id },
  };
}

function starterWorkflow(): CoordinationWorkflowV1 {
  const workflowId = nowWorkflowId();
  const a = starterDesk("desk-a", "desk:analysis", "Intake Desk");
  const b = starterDesk("desk-b", "desk:execution", "Execution Desk");

  return {
    workflowId,
    version: 1,
    name: "Agent Coordination Workflow",
    description: "Keyboard-first coordination and handoff design",
    entryDeskId: a.deskId,
    desks: [a, b],
    handoffs: [{ handoffId: "handoff-a-b", fromDeskId: a.deskId, toDeskId: b.deskId }],
    observabilityProfile: "full",
  };
}

type WorkflowsResponse = {
  ok: boolean;
  workflows?: CoordinationWorkflowV1[];
};

type CreateWorkflowResponse = {
  ok: boolean;
  workflow?: CoordinationWorkflowV1;
  error?: string;
};

type RunResponse = {
  ok: boolean;
  run?: RunStatusV1;
  error?: string;
};

type TimelineResponse = {
  ok: boolean;
  timeline?: DeskRunEventV1[];
};

type RunStatusResponse = {
  ok: boolean;
  run?: RunStatusV1;
  error?: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  return (await response.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PaletteCommand = {
  id: string;
  label: string;
  run: () => Promise<void> | void;
};

const RUN_TERMINAL_STATES = new Set<RunStatusV1["status"]>(["completed", "failed"]);

export function CoordinationPage() {
  const [activeWorkflow, setActiveWorkflow] = useState<CoordinationWorkflowV1>(starterWorkflow());
  const [workflows, setWorkflows] = useState<CoordinationWorkflowV1[]>([]);
  const [validation, setValidation] = useState<ValidationResultV1>(() => validateWorkflow(starterWorkflow()));
  const [lastRun, setLastRun] = useState<RunStatusV1 | null>(null);
  const [timeline, setTimeline] = useState<DeskRunEventV1[]>([]);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const refreshValidation = (workflow: CoordinationWorkflowV1) => {
    setValidation(validateWorkflow(workflow));
  };

  const setActiveAndValidate = (workflow: CoordinationWorkflowV1) => {
    setActiveWorkflow(workflow);
    refreshValidation(workflow);
  };

  const refreshWorkflows = async () => {
    const data = await fetchJson<WorkflowsResponse>("/rawr/coordination/workflows");
    const next = Array.isArray(data.workflows) ? data.workflows : [];
    setWorkflows(next);

    if (next.length === 0) return;

    const preferred = next.find((item) => item.workflowId === activeWorkflow.workflowId) ?? next[0];
    setActiveAndValidate(preferred);
  };

  const refreshRunState = async (runId: string) => {
    const [runResult, timelineResult] = await Promise.all([
      fetchJson<RunStatusResponse>(`/rawr/coordination/runs/${encodeURIComponent(runId)}`),
      fetchJson<TimelineResponse>(`/rawr/coordination/runs/${encodeURIComponent(runId)}/timeline`),
    ]);

    if (runResult.ok && runResult.run) {
      setLastRun(runResult.run);
    }

    setTimeline(Array.isArray(timelineResult.timeline) ? timelineResult.timeline : []);
    return runResult.run ?? null;
  };

  const pollRunUntilTerminal = async (runId: string) => {
    setPolling(true);
    try {
      for (let i = 0; i < 30; i += 1) {
        const run = await refreshRunState(runId);
        if (run && RUN_TERMINAL_STATES.has(run.status)) {
          break;
        }
        await sleep(1000);
      }
    } finally {
      setPolling(false);
    }
  };

  useEffect(() => {
    refreshWorkflows().catch((err) => setError(String(err)));
  }, []);

  const saveWorkflow = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetchJson<CreateWorkflowResponse>("/rawr/coordination/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflow: activeWorkflow }),
      });

      if (!response.ok) {
        setError(response.error ?? "Failed to save workflow");
        return;
      }

      if (response.workflow) {
        setActiveAndValidate(response.workflow);
      }

      await refreshWorkflows();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const runWorkflow = async () => {
    setBusy(true);
    setError(null);
    try {
      const runResult = await fetchJson<RunResponse>(
        `/rawr/coordination/workflows/${encodeURIComponent(activeWorkflow.workflowId)}/run`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input: { payload: "manual-run" } }),
        },
      );

      if (!runResult.ok || !runResult.run) {
        setError(runResult.error ?? "Run failed");
        return;
      }

      setLastRun(runResult.run);
      await refreshRunState(runResult.run.runId);
      await pollRunUntilTerminal(runResult.run.runId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEditorChange = (workflowKit: WorkflowKitWorkflow) => {
    const next = fromWorkflowKitWorkflow({
      workflow: workflowKit,
      baseWorkflow: activeWorkflow,
    });

    setActiveAndValidate(next);
  };

  const workflowKitWorkflow = useMemo(() => toWorkflowKitWorkflow(activeWorkflow), [activeWorkflow]);
  const availableActions = useMemo(() => coordinationAvailableActions(), []);
  const trigger = useMemo(() => ({ event: { name: COORDINATION_RUN_EVENT } }), []);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      { id: "save", label: "Save workflow", run: () => saveWorkflow() },
      { id: "validate", label: "Validate workflow", run: () => refreshValidation(activeWorkflow) },
      { id: "run", label: "Run workflow", run: () => runWorkflow() },
      { id: "refresh-workflows", label: "Reload workflows", run: () => refreshWorkflows() },
      {
        id: "refresh-run",
        label: "Refresh run status",
        run: () => (lastRun ? refreshRunState(lastRun.runId).then(() => undefined) : undefined),
      },
    ],
    [activeWorkflow, lastRun],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (!paletteOpen) return;

      if (event.key === "Escape") {
        setPaletteOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setPaletteIndex((prev) => (prev + 1) % commands.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setPaletteIndex((prev) => (prev - 1 + commands.length) % commands.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const command = commands[paletteIndex];
        Promise.resolve(command.run()).catch((err) => setError(String(err)));
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commands, paletteIndex, paletteOpen]);

  return (
    <section style={{ maxWidth: 1200 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Agent Coordination Canvas</h1>
      <p style={{ marginTop: 10, opacity: 0.86, lineHeight: 1.5 }}>
        Build and edit workflow graphs in the Inngest Workflow Kit canvas, then run through the real Inngest
        execution path. Use <code>Cmd/Ctrl+K</code> for command-driven operations.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Workflow</span>
          <select
            value={activeWorkflow.workflowId}
            onChange={(event) => {
              const next = workflows.find((item) => item.workflowId === event.target.value);
              if (next) setActiveAndValidate(next);
            }}
            disabled={busy}
          >
            {[activeWorkflow, ...workflows.filter((item) => item.workflowId !== activeWorkflow.workflowId)].map((w) => (
              <option key={w.workflowId} value={w.workflowId}>
                {w.name} ({w.workflowId})
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={saveWorkflow} disabled={busy}>
          Save
        </button>
        <button type="button" onClick={() => refreshValidation(activeWorkflow)} disabled={busy}>
          Validate
        </button>
        <button type="button" onClick={runWorkflow} disabled={busy || !validation.ok || polling}>
          {polling ? "Running..." : "Run"}
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.8 }}>
        Active workflow: <code>{activeWorkflow.workflowId}</code> · version {activeWorkflow.version}
      </div>

      <div style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <Provider
          workflow={workflowKitWorkflow}
          trigger={trigger}
          availableActions={availableActions}
          onChange={handleEditorChange}
        >
          <Editor direction="down">
            <Sidebar position="right" />
          </Editor>
        </Provider>
      </div>

      <div style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 650 }}>Validation</div>
        <div style={{ marginTop: 8 }}>
          {validation.ok ? (
            <span style={{ color: "#6ee7b7" }}>Valid workflow</span>
          ) : (
            <span style={{ color: "#fca5a5" }}>Invalid workflow ({validation.errors.length} issues)</span>
          )}
        </div>

        {!validation.ok ? (
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {validation.errors.map((entry, idx) => (
              <li key={`${entry.code}-${idx}`}>
                <code>{entry.code}</code>: {entry.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 650 }}>Run Timeline</div>
        {lastRun ? (
          <div style={{ marginTop: 8, opacity: 0.9 }}>
            Run <code>{lastRun.runId}</code> · status <code>{lastRun.status}</code>
          </div>
        ) : (
          <div style={{ marginTop: 8, opacity: 0.7 }}>No runs yet.</div>
        )}

        {lastRun?.traceLinks?.length ? (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {lastRun.traceLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {timeline.length > 0 ? (
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {timeline.map((event) => (
              <li key={event.eventId}>
                <code>{event.type}</code>
                {event.deskId ? ` (${event.deskId})` : ""} · {event.status}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <div style={{ marginTop: 16, color: "tomato" }}>{error}</div> : null}

      {paletteOpen ? (
        <div
          style={{
            position: "fixed",
            top: 90,
            left: "50%",
            transform: "translateX(-50%)",
            width: 520,
            maxWidth: "90vw",
            background: "#111319",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 12,
            padding: 10,
            zIndex: 999,
            boxShadow: "0 8px 34px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Command Palette</div>
          {commands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              onClick={() => {
                Promise.resolve(command.run()).catch((err) => setError(String(err)));
                setPaletteOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 6,
                border: "1px solid rgba(255,255,255,0.08)",
                background: index === paletteIndex ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)",
                color: "inherit",
              }}
            >
              {command.label}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
        Loaded workflows: {workflows.length} · Inngest event: <code>{COORDINATION_RUN_EVENT}</code>
      </div>
    </section>
  );
}

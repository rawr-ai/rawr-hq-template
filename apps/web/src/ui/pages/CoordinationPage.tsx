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
import "../styles/coordination-page.css";

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

function workflowsEqual(a: CoordinationWorkflowV1, b: CoordinationWorkflowV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toneForStatus(status: string): "is-success" | "is-warning" | "is-error" | "" {
  if (status === "completed" || status === "ok") return "is-success";
  if (status === "running" || status === "queued" || status === "pending") return "is-warning";
  if (status === "failed" || status === "error") return "is-error";
  return "";
}

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
    setActiveWorkflow((previous) => (workflowsEqual(previous, workflow) ? previous : workflow));
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

    if (workflowsEqual(activeWorkflow, next)) {
      return;
    }

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

  const workflowOptions = useMemo(
    () => [activeWorkflow, ...workflows.filter((item) => item.workflowId !== activeWorkflow.workflowId)],
    [activeWorkflow, workflows],
  );

  const liveMessage = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (polling) return "Run in progress. Timeline updates will appear automatically.";
    if (busy) return "Request in progress.";
    if (validation.ok) return "Workflow validation passed.";
    return `Workflow invalid: ${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}.`;
  }, [busy, error, polling, validation.errors.length, validation.ok]);

  useEffect(() => {
    if (paletteOpen) {
      setPaletteIndex(0);
    }
  }, [paletteOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (!paletteOpen || commands.length === 0) return;

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
        if (!command) return;
        Promise.resolve(command.run()).catch((err) => setError(String(err)));
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commands, paletteIndex, paletteOpen]);

  return (
    <section className="coordination" aria-labelledby="coordination-title">
      <header className="coordination__header">
        <h1 id="coordination-title" className="coordination__title">
          Agent Coordination Canvas
        </h1>
        <p className="coordination__description">
          Build and edit workflow graphs in the Inngest Workflow Kit canvas, then run through the real Inngest
          execution path. Use <kbd>Cmd/Ctrl+K</kbd> to open command operations.
        </p>
        <div className="coordination__status-line">
          <span className={`coordination__chip ${validation.ok ? "is-success" : "is-error"}`}>
            {validation.ok ? "Valid workflow" : `Invalid (${validation.errors.length})`}
          </span>
          {lastRun ? (
            <span className={`coordination__chip ${toneForStatus(lastRun.status)}`}>Run status: {lastRun.status}</span>
          ) : (
            <span className="coordination__chip">No run started</span>
          )}
        </div>
        <p className="coordination__keyboard-hint">
          Keyboard: <kbd>Cmd/Ctrl+K</kbd> opens command palette, <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>Enter</kbd> to
          run.
        </p>
      </header>

      <div className="coordination__workspace">
        <section className="coordination__panel coordination__panel--canvas" aria-label="Canvas workspace">
          <div className="coordination__panel-header">
            <div>
              <h2 className="coordination__panel-title">Canvas Workspace</h2>
              <p className="coordination__panel-subtitle">Primary handoff design surface</p>
            </div>
          </div>

          <div className="coordination__canvas-stage">
            <section className="coordination__controls" aria-label="Workflow controls">
              <div className="coordination__controls-grid">
                <div className="coordination__field">
                  <label htmlFor="coordination-workflow" className="coordination__label">
                    Workflow
                  </label>
                  <select
                    id="coordination-workflow"
                    name="workflow"
                    className="coordination__select"
                    value={activeWorkflow.workflowId}
                    onChange={(event) => {
                      const next = workflows.find((item) => item.workflowId === event.target.value);
                      if (next) setActiveAndValidate(next);
                    }}
                    disabled={busy}
                    aria-describedby="coordination-workflow-meta"
                  >
                    {workflowOptions.map((workflow) => (
                      <option key={workflow.workflowId} value={workflow.workflowId}>
                        {workflow.name} ({workflow.workflowId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="coordination__button-group" aria-label="Primary coordination actions">
                  <button type="button" className="coordination__button" onClick={saveWorkflow} disabled={busy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="coordination__button"
                    onClick={() => refreshValidation(activeWorkflow)}
                    disabled={busy}
                  >
                    Validate
                  </button>
                  <button
                    type="button"
                    className="coordination__button is-primary"
                    onClick={runWorkflow}
                    disabled={busy || !validation.ok || polling}
                  >
                    {polling ? "Running…" : "Run"}
                  </button>
                </div>
              </div>

              <p id="coordination-workflow-meta" className="coordination__meta">
                Active workflow: <code>{activeWorkflow.workflowId}</code> · version {activeWorkflow.version} · loaded{" "}
                {workflows.length} workflows · event <code>{COORDINATION_RUN_EVENT}</code>
              </p>
            </section>

            <div className="coordination__canvas-body">
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
          </div>
        </section>

        <aside className="coordination__side" aria-label="Workflow outcomes and trace panels">
          <section className="coordination__panel" aria-labelledby="coordination-validation-title">
            <div className="coordination__panel-header">
              <h2 id="coordination-validation-title" className="coordination__panel-title">
                Validation
              </h2>
              <span className={`coordination__chip ${validation.ok ? "is-success" : "is-error"}`}>
                {validation.ok ? "Pass" : `${validation.errors.length} issues`}
              </span>
            </div>

            {validation.ok ? (
              <p className="coordination__message">Workflow satisfies validation checks.</p>
            ) : (
              <ul className="coordination__list" aria-label="Validation issues">
                {validation.errors.map((entry, idx) => (
                  <li key={`${entry.code}-${idx}`} className="coordination__list-item">
                    <code>{entry.code}</code>: {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="coordination__panel" aria-labelledby="coordination-timeline-title">
            <div className="coordination__panel-header">
              <h2 id="coordination-timeline-title" className="coordination__panel-title">
                Run Timeline
              </h2>
              {lastRun ? (
                <span className={`coordination__chip ${toneForStatus(lastRun.status)}`}>{lastRun.status}</span>
              ) : null}
            </div>

            {lastRun ? (
              <p className="coordination__message">
                Run <code>{lastRun.runId}</code>
              </p>
            ) : (
              <p className="coordination__message is-muted">No runs yet.</p>
            )}

            {lastRun?.traceLinks?.length ? (
              <ul className="coordination__list" aria-label="Trace links">
                {lastRun.traceLinks.map((link) => (
                  <li key={link.url} className="coordination__list-item">
                    <a className="coordination__trace-link" href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {timeline.length > 0 ? (
              <ul className="coordination__list" aria-label="Timeline events">
                {timeline.map((event) => (
                  <li key={event.eventId} className="coordination__list-item coordination__timeline-item">
                    <span className="coordination__timeline-type">
                      <code>{event.type}</code>
                      {event.deskId ? <span>({event.deskId})</span> : null}
                    </span>
                    <span className={`coordination__chip ${toneForStatus(event.status)}`}>{event.status}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </aside>
      </div>

      <div className={`coordination__live ${error ? "is-error" : ""}`} aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {paletteOpen ? (
        <>
          <button
            type="button"
            className="coordination__palette-backdrop"
            aria-label="Close command palette"
            onClick={() => setPaletteOpen(false)}
          />

          <section
            className="coordination__palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coordination-palette-title"
            aria-describedby="coordination-palette-hint"
          >
            <header className="coordination__palette-header">
              <h2 id="coordination-palette-title" className="coordination__palette-title">
                Command Palette
              </h2>
              <p id="coordination-palette-hint" className="coordination__palette-hint">
                Navigate with arrow keys. Press Enter to run.
              </p>
            </header>

            {commands.length === 0 ? (
              <p className="coordination__message is-muted">No commands available right now.</p>
            ) : (
              <ul
                className="coordination__palette-list"
                role="listbox"
                aria-label="Coordination commands"
                aria-activedescendant={
                  commands[paletteIndex] ? `coordination-command-${commands[paletteIndex].id}` : undefined
                }
              >
                {commands.map((command, index) => (
                  <li key={command.id}>
                    <button
                      id={`coordination-command-${command.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === paletteIndex}
                      className={`coordination__palette-item${index === paletteIndex ? " is-active" : ""}`}
                      onMouseEnter={() => setPaletteIndex(index)}
                      onClick={() => {
                        Promise.resolve(command.run()).catch((err) => setError(String(err)));
                        setPaletteOpen(false);
                      }}
                    >
                      <span>{command.label}</span>
                      <span className="coordination__palette-shortcut">{index === paletteIndex ? "Enter" : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

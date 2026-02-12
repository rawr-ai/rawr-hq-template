import React, { useEffect, useMemo, useState } from "react";
import {
  validateWorkflow,
  type CoordinationWorkflowV1,
  type DeskDefinitionV1,
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
import "../styles/index.css";
import { CanvasWorkspace } from "./canvas";
import { RunStatusPanel, StatusBadge } from "./status";
import type {
  CreateWorkflowResponse,
  PaletteCommand,
  RunModel,
  RunResponse,
  RunStatusResponse,
  StatusTone,
  TimelineEventModel,
  TimelineResponse,
  ValidationModel,
  WorkflowsResponse,
  WorkflowModel,
} from "../types/workflow";

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

function starterWorkflow(): WorkflowModel {
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

function inngestRunsUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8288/runs";
  const next = new URL(window.location.href);
  next.port = "8288";
  next.pathname = "/runs";
  next.search = "";
  next.hash = "";
  return next.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  let parsed: unknown = null;
  if (raw.trim() !== "") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const payloadError =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error?: unknown }).error === "object" &&
      typeof ((parsed as { error?: { message?: unknown } }).error?.message) === "string"
        ? (parsed as { error: { message: string } }).error.message
        : "";
    const rawSnippet = raw.trim().slice(0, 200);
    const hint =
      url.startsWith("/rawr/")
        ? " Ensure the API server is running on http://localhost:3000 (or start all services with `bun run dev:up`)."
        : "";

    throw new Error(
      payloadError ||
        `Request failed (${response.status} ${response.statusText})${
          rawSnippet ? `: ${rawSnippet}` : contentType ? ` (${contentType})` : ""
        }.${hint}`,
    );
  }

  if (parsed === null) {
    throw new Error(
      `Expected JSON response but received an empty or invalid payload from ${url}. Ensure backend services are running.`,
    );
  }

  return parsed as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RUN_TERMINAL_STATES = new Set<RunModel["status"]>(["completed", "failed"]);

function workflowsEqual(a: CoordinationWorkflowV1, b: CoordinationWorkflowV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toneForStatus(status: string): StatusTone {
  if (status === "completed" || status === "ok") return "is-success";
  if (status === "running" || status === "queued" || status === "pending") return "is-warning";
  if (status === "failed" || status === "error") return "is-error";
  return "";
}

export function CoordinationPage() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowModel>(starterWorkflow());
  const [workflows, setWorkflows] = useState<WorkflowModel[]>([]);
  const [validation, setValidation] = useState<ValidationModel>(() => validateWorkflow(starterWorkflow()));
  const [lastRun, setLastRun] = useState<RunModel | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const refreshValidation = (workflow: WorkflowModel) => {
    setValidation(validateWorkflow(workflow));
  };

  const setActiveAndValidate = (workflow: WorkflowModel) => {
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
        setError("Failed to save workflow");
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
        setError("Run failed");
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
  const monitorHref = useMemo(() => inngestRunsUrl(), []);

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
          <StatusBadge tone={validation.ok ? "is-success" : "is-error"}>
            {validation.ok ? "Valid workflow" : `Invalid (${validation.errors.length})`}
          </StatusBadge>
          {lastRun ? (
            <StatusBadge tone={toneForStatus(lastRun.status)}>Run status: {lastRun.status}</StatusBadge>
          ) : (
            <StatusBadge>No run started</StatusBadge>
          )}
        </div>
        <p className="coordination__keyboard-hint">
          Keyboard: <kbd>Cmd/Ctrl+K</kbd> opens command palette, <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>Enter</kbd> to
          run.
        </p>
      </header>

      <div className="coordination__workspace">
        <CanvasWorkspace
          activeWorkflow={activeWorkflow}
          workflowOptions={workflowOptions}
          busy={busy}
          polling={polling}
          validationOk={validation.ok}
          monitorHref={monitorHref}
          onSelectWorkflow={(workflowId) => {
            const next = workflows.find((item) => item.workflowId === workflowId);
            if (next) {
              setActiveAndValidate(next);
            }
          }}
          onSave={saveWorkflow}
          onValidate={() => refreshValidation(activeWorkflow)}
          onRun={runWorkflow}
        >
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
        </CanvasWorkspace>

        <RunStatusPanel
          validation={validation}
          lastRun={lastRun}
          timeline={timeline}
          toneForStatus={toneForStatus}
        />
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

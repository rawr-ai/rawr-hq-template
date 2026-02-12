import React, { useEffect, useMemo, useState } from "react";
import { Editor, Provider, Sidebar } from "@inngest/workflow-kit/ui";
import "@inngest/workflow-kit/ui/ui.css";
import "../styles/index.css";
import { CanvasWorkspace } from "./canvas";
import { RunStatusPanel, StatusBadge } from "./status";
import { toneForStatus } from "../adapters/workflow-mappers";
import { useRunStatus } from "../hooks/useRunStatus";
import { useWorkflow } from "../hooks/useWorkflow";
import type { PaletteCommand } from "../types/workflow";

function inngestRunsUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8288/runs";
  const next = new URL(window.location.href);
  next.port = "8288";
  next.pathname = "/runs";
  next.search = "";
  next.hash = "";
  return next.toString();
}

export function CoordinationPage() {
  const workflow = useWorkflow();
  const runStatus = useRunStatus();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const runWorkflow = async () => {
    const run = await workflow.queueRun({ payload: "manual-run" });
    if (!run) return;
    await runStatus.trackRun(run);
  };

  const commands = useMemo<PaletteCommand[]>(
    () => [
      { id: "save", label: "Save workflow", run: () => workflow.saveActiveWorkflow() },
      { id: "validate", label: "Validate workflow", run: () => workflow.validateActiveWorkflow() },
      { id: "run", label: "Run workflow", run: () => runWorkflow() },
      { id: "refresh-workflows", label: "Reload workflows", run: () => workflow.refreshWorkflows() },
      { id: "refresh-run", label: "Refresh run status", run: () => runStatus.refreshCurrentRun() },
    ],
    [runStatus, workflow],
  );

  const monitorHref = useMemo(() => inngestRunsUrl(), []);

  const liveMessage = useMemo(() => {
    const error = workflow.error ?? runStatus.error;
    if (error) return `Error: ${error}`;
    if (runStatus.polling) return "Run in progress. Timeline updates will appear automatically.";
    if (workflow.busy) return "Request in progress.";
    if (workflow.validation.ok) return "Workflow validation passed.";
    return `Workflow invalid: ${workflow.validation.errors.length} issue${workflow.validation.errors.length === 1 ? "" : "s"}.`;
  }, [runStatus.error, runStatus.polling, workflow.busy, workflow.error, workflow.validation.errors.length, workflow.validation.ok]);

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
        Promise.resolve(command.run()).catch((err) => workflow.setError(String(err)));
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commands, paletteIndex, paletteOpen, workflow]);

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
          <StatusBadge tone={workflow.validation.ok ? "is-success" : "is-error"}>
            {workflow.validation.ok ? "Valid workflow" : `Invalid (${workflow.validation.errors.length})`}
          </StatusBadge>
          {runStatus.lastRun ? (
            <StatusBadge tone={toneForStatus(runStatus.lastRun.status)}>Run status: {runStatus.lastRun.status}</StatusBadge>
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
          activeWorkflow={workflow.activeWorkflow}
          workflowOptions={workflow.workflowOptions}
          busy={workflow.busy}
          polling={runStatus.polling}
          validationOk={workflow.validation.ok}
          monitorHref={monitorHref}
          onSelectWorkflow={workflow.selectWorkflow}
          onSave={workflow.saveActiveWorkflow}
          onValidate={workflow.validateActiveWorkflow}
          onRun={runWorkflow}
        >
          <Provider
            workflow={workflow.workflowKitWorkflow}
            trigger={workflow.trigger}
            availableActions={workflow.availableActions}
            onChange={workflow.handleEditorChange}
          >
            <Editor direction="down">
              <Sidebar position="right" />
            </Editor>
          </Provider>
        </CanvasWorkspace>

        <RunStatusPanel
          validation={workflow.validation}
          lastRun={runStatus.lastRun}
          timeline={runStatus.timeline}
          toneForStatus={toneForStatus}
        />
      </div>

      <div
        className={`coordination__live ${workflow.error || runStatus.error ? "is-error" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
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
                        Promise.resolve(command.run()).catch((err) => workflow.setError(String(err)));
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

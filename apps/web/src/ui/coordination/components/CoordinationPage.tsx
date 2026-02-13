import React, { useEffect, useMemo, useState } from "react";
import { Editor, Provider, Sidebar } from "@inngest/workflow-kit/ui";
import "@inngest/workflow-kit/ui/ui.css";
import "../styles/index.css";
import { CanvasWorkspace } from "./canvas";
import { RunStatusPanel, StatusBadge } from "./status";
import {
  monitorLinkForRun,
  runActionState,
  statusForRunState,
  validationSummary,
  workflowGraph,
} from "../adapters/workflow-mappers";
import { useRunStatus } from "../hooks/useRunStatus";
import { useWorkflow } from "../hooks/useWorkflow";
import type { PaletteCommand } from "../types/workflow";
import { cn } from "../../lib/cn";

export function CoordinationPage() {
  const workflow = useWorkflow();
  const runStatus = useRunStatus();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const runWorkflow = async () => {
    try {
      const run = await workflow.queueRun({ payload: "manual-run" });
      if (!run) return;
      await runStatus.trackRun(run);
    } catch (err) {
      workflow.setError(String(err));
    }
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

  const graph = useMemo(() => workflowGraph(workflow.activeWorkflow), [workflow.activeWorkflow]);
  const monitorHref = useMemo(() => monitorLinkForRun(runStatus.lastRun), [runStatus.lastRun]);
  const runAction = useMemo(
    () =>
      runActionState({
        busy: workflow.busy,
        polling: runStatus.polling,
        validationOk: workflow.validation.ok,
        needsSave: workflow.needsSave,
      }),
    [runStatus.polling, workflow.busy, workflow.needsSave, workflow.validation.ok],
  );
  const validationState = useMemo(() => validationSummary(workflow.validation), [workflow.validation]);

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
    <section aria-labelledby="coordination-title" className="max-w-[1360px] min-w-0 grid gap-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 id="coordination-title" className="text-[24px] leading-tight font-semibold tracking-[-0.4px] text-text-primary">
            Agent Coordination Canvas
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Build and run workflow graphs ·{" "}
            <kbd className="bg-raised text-text-body text-[11px] font-mono border border-border rounded px-1 py-px transition-colors duration-200">
              ⌘K
            </kbd>{" "}
            command palette
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusBadge status={validationState.status}>
            {workflow.validation.ok ? "Valid" : "Invalid"}
          </StatusBadge>

          {runStatus.lastRun ? (
            <StatusBadge status={statusForRunState(runStatus.lastRun.status)}>
              {runStatus.lastRun.status.charAt(0).toUpperCase() + runStatus.lastRun.status.slice(1)}
            </StatusBadge>
          ) : (
            <StatusBadge status="neutral">Idle</StatusBadge>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 min-w-0">
        <CanvasWorkspace
          activeWorkflow={workflow.activeWorkflow}
          workflowOptions={workflow.workflowOptions}
          busy={workflow.busy}
          runAction={runAction}
          monitorHref={monitorHref}
          workflowEvent={graph.event}
          nodes={graph.nodes}
          edges={graph.edges}
          onSelectWorkflow={workflow.selectWorkflow}
          onSave={workflow.saveActiveWorkflow}
          onValidate={workflow.validateActiveWorkflow}
          onRun={runWorkflow}
          onNameChange={workflow.updateActiveName}
          onDescriptionChange={workflow.updateActiveDescription}
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
          statusForRun={statusForRunState}
          isLive={runStatus.polling}
        />
      </div>

      <div
        className={cn(
          "rounded-md border px-3 py-2 text-[0.85rem]",
          workflow.error || runStatus.error
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border/70 bg-muted/60 text-muted-foreground",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>

      {paletteOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[39] border-0 p-0 bg-black/40"
            aria-label="Close command palette"
            onClick={() => setPaletteOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="coordination-palette-title"
            aria-describedby="coordination-palette-hint"
            className="fixed top-4 sm:top-[max(1.2rem,8vh)] left-1/2 -translate-x-1/2 z-40 w-[min(640px,calc(100vw-1rem))] rounded-xl border border-border bg-surface shadow-shell p-3"
          >
            <header className="flex items-baseline justify-between gap-3 mb-2">
              <h2 id="coordination-palette-title" className="m-0 text-[0.9rem] tracking-[0.09em] uppercase text-text-muted">
                Command Palette
              </h2>
              <p id="coordination-palette-hint" className="m-0 text-[0.75rem] text-text-muted">
                Navigate with arrows · Enter to run · Esc to close
              </p>
            </header>

            {commands.length === 0 ? (
              <p className="m-0 text-sm text-text-muted">No commands available right now.</p>
            ) : (
              <ul
                className="m-0 p-0 list-none grid gap-2"
                role="listbox"
                aria-label="Coordination commands"
                aria-activedescendant={commands[paletteIndex] ? `coordination-command-${commands[paletteIndex].id}` : undefined}
              >
                {commands.map((command, index) => (
                  <li key={command.id}>
                    <button
                      id={`coordination-command-${command.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === paletteIndex}
                      className={cn(
                        "w-full text-left rounded-md border px-3 py-2 flex items-center justify-between gap-2 transition-colors",
                        index === paletteIndex
                          ? "border-accent/60 bg-accent-bg text-text-primary"
                          : "border-border bg-raised text-text-primary hover:border-border-subtle",
                      )}
                      onMouseEnter={() => setPaletteIndex(index)}
                      onClick={() => {
                        Promise.resolve(command.run()).catch((err) => workflow.setError(String(err)));
                        setPaletteOpen(false);
                      }}
                    >
                      <span>{command.label}</span>
                      <span className="text-xs text-text-muted">{index === paletteIndex ? "Enter" : ""}</span>
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

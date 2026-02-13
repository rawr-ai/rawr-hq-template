import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  validateWorkflow,
  type CoordinationWorkflowV1,
  type DeskDefinitionV1,
  type JsonValue,
  type RunStatusV1,
  type ValidationResultV1,
} from "@rawr/coordination";
import {
  COORDINATION_RUN_EVENT,
  coordinationAvailableActions,
} from "@rawr/coordination-inngest/browser";
import type { Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import {
  coordinationClientErrorMessage,
  listWorkflows,
  runWorkflowById,
  saveWorkflow,
} from "../adapters/api-client";
import {
  fromCanvasWorkflow,
  toCanvasWorkflow,
  workflowsEqual,
} from "../adapters/workflow-mappers";
import type { WorkflowModel } from "../types/workflow";

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

export function useWorkflow() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowModel>(starterWorkflow());
  const [workflows, setWorkflows] = useState<WorkflowModel[]>([]);
  const [validation, setValidation] = useState<ValidationResultV1>(() => validateWorkflow(starterWorkflow()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeWorkflowIdRef = useRef(activeWorkflow.workflowId);

  const refreshValidation = useCallback((workflow: WorkflowModel) => {
    setValidation(validateWorkflow(workflow));
  }, []);

  const setActiveAndValidate = useCallback(
    (workflow: WorkflowModel) => {
      setActiveWorkflow((previous) => (workflowsEqual(previous, workflow) ? previous : workflow));
      refreshValidation(workflow);
    },
    [refreshValidation],
  );

  useEffect(() => {
    activeWorkflowIdRef.current = activeWorkflow.workflowId;
  }, [activeWorkflow.workflowId]);

  const refreshWorkflows = useCallback(async () => {
    let response;
    try {
      response = await listWorkflows();
    } catch (err) {
      setError(coordinationClientErrorMessage(err, "Failed to load workflows"));
      return;
    }

    const next = Array.isArray(response.workflows) ? response.workflows : [];
    setWorkflows(next);

    if (next.length === 0) return;

    const preferred = next.find((item) => item.workflowId === activeWorkflowIdRef.current) ?? next[0];
    setActiveAndValidate(preferred);
  }, [setActiveAndValidate]);

  useEffect(() => {
    refreshWorkflows().catch((err) => setError(String(err)));
  }, [refreshWorkflows]);

  const persistedActiveWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflowId === activeWorkflow.workflowId) ?? null,
    [activeWorkflow.workflowId, workflows],
  );

  const needsSave = useMemo(() => {
    if (!persistedActiveWorkflow) return true;
    return !workflowsEqual(persistedActiveWorkflow, activeWorkflow);
  }, [activeWorkflow, persistedActiveWorkflow]);

  const persistActiveWorkflow = useCallback(async (): Promise<WorkflowModel | null> => {
    let response;
    try {
      response = await saveWorkflow(activeWorkflow);
    } catch (err) {
      setError(coordinationClientErrorMessage(err, "Failed to save workflow"));
      return null;
    }

    setActiveAndValidate(response.workflow);
    await refreshWorkflows();
    return response.workflow;
  }, [activeWorkflow, refreshWorkflows, setActiveAndValidate]);

  const saveActiveWorkflow = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await persistActiveWorkflow();
    } finally {
      setBusy(false);
    }
  }, [persistActiveWorkflow]);

  const validateActiveWorkflow = useCallback(() => {
    refreshValidation(activeWorkflow);
  }, [activeWorkflow, refreshValidation]);

  const updateActiveName = useCallback(
    (name: string) => {
      const next = { ...activeWorkflow, name };
      setActiveAndValidate(next);
    },
    [activeWorkflow, setActiveAndValidate],
  );

  const updateActiveDescription = useCallback(
    (description: string) => {
      const next = { ...activeWorkflow, description };
      setActiveAndValidate(next);
    },
    [activeWorkflow, setActiveAndValidate],
  );

  const queueRun = useCallback(
    async (input: JsonValue): Promise<RunStatusV1 | null> => {
      setBusy(true);
      setError(null);
      try {
        const workflowToRun = needsSave ? await persistActiveWorkflow() : activeWorkflow;
        if (!workflowToRun) return null;

        let response;
        try {
          response = await runWorkflowById(workflowToRun.workflowId, input);
        } catch (err) {
          setError(coordinationClientErrorMessage(err, "Run failed"));
          return null;
        }

        return response.run;
      } finally {
        setBusy(false);
      }
    },
    [activeWorkflow, needsSave, persistActiveWorkflow],
  );

  const selectWorkflow = useCallback(
    (workflowId: string) => {
      const next = workflows.find((item) => item.workflowId === workflowId);
      if (!next) return;
      setActiveAndValidate(next);
    },
    [setActiveAndValidate, workflows],
  );

  const handleEditorChange = useCallback(
    (workflowKit: WorkflowKitWorkflow) => {
      const next = fromCanvasWorkflow({
        workflow: workflowKit,
        baseWorkflow: activeWorkflow,
      });

      if (workflowsEqual(activeWorkflow, next)) {
        return;
      }

      setActiveAndValidate(next);
    },
    [activeWorkflow, setActiveAndValidate],
  );

  const workflowKitWorkflow = useMemo(() => toCanvasWorkflow(activeWorkflow), [activeWorkflow]);
  const availableActions = useMemo(() => coordinationAvailableActions(), []);
  const trigger = useMemo(() => ({ event: { name: COORDINATION_RUN_EVENT } }), []);

  const workflowOptions = useMemo(
    () => [activeWorkflow, ...workflows.filter((item) => item.workflowId !== activeWorkflow.workflowId)],
    [activeWorkflow, workflows],
  );

  return {
    activeWorkflow,
    workflows,
    workflowOptions,
    validation,
    busy,
    needsSave,
    error,
    setError,
    clearError: () => setError(null),
    refreshWorkflows,
    saveActiveWorkflow,
    validateActiveWorkflow,
    updateActiveName,
    updateActiveDescription,
    queueRun,
    selectWorkflow,
    handleEditorChange,
    workflowKitWorkflow,
    availableActions,
    trigger,
  };
}

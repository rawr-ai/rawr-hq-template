import type { RuntimeCompiledWorkflowAdmissionEntries } from "../../compiler/src/runtime-workflow-admission";
import type {
  WorkflowAdmissionDefinition,
  WorkflowDispatcher,
  WorkflowEventSender,
} from "../../definition/src/workflow-admission";
import type {
  WorkflowDispatchers,
  WorkflowDispatcherUses,
} from "../../definition/src/workflow-dispatcher-use";
import type { Continuation, InvocationTracker } from "./invocation-tracker";

interface BoundWorkflowGroup {
  readonly useName: string;
  readonly workflows: ReadonlyMap<
    WorkflowAdmissionDefinition,
    Pick<WorkflowAdmissionDefinition, "eventName" | "inputSchema">
  >;
  readonly send: (event: Parameters<WorkflowEventSender["send"]>[0]) => Promise<unknown>;
}

function bindNativeSend(client: unknown): BoundWorkflowGroup["send"] {
  if ((typeof client !== "object" && typeof client !== "function") || client === null)
    throw new TypeError("Workflow admission requires a ready native event client.");
  const send: unknown = "send" in client ? client.send : undefined;
  if (typeof send !== "function")
    throw new TypeError("Workflow admission requires a ready native event client.");
  return async (event) => send.call(client, event);
}

function eventIds(result: unknown): readonly string[] {
  if (
    typeof result !== "object" ||
    result === null ||
    !("ids" in result) ||
    !Array.isArray(result.ids)
  )
    throw new TypeError("Native workflow admission did not return event IDs.");
  for (const id of result.ids) {
    if (typeof id !== "string")
      throw new TypeError("Native workflow admission did not return event IDs.");
  }
  return Object.freeze([...result.ids]);
}

function eventId(options: unknown): string | undefined {
  if (options === undefined) return undefined;
  if (
    typeof options !== "object" ||
    options === null ||
    Reflect.ownKeys(options).some((key) => key !== "id")
  )
    throw new TypeError("Workflow dispatch options support only a native event ID.");
  const id = "id" in options ? options.id : undefined;
  if (id !== undefined && typeof id !== "string")
    throw new TypeError("Workflow event ID must be a string.");
  return id;
}

/** Materialize only compiled caller-local uses; native clients and workflow refs stay exact. */
export function createWorkflowDispatcherBindings(input: {
  readonly admissions: RuntimeCompiledWorkflowAdmissionEntries;
  readonly values: { has(selectionId: string): boolean; get(selectionId: string): unknown };
  readonly admission: InvocationTracker;
}): (
  surfacePlanId: string,
  continuation?: Continuation
) => WorkflowDispatchers<WorkflowDispatcherUses> {
  const surfaces = new Map<string, readonly BoundWorkflowGroup[]>();
  for (const [surfacePlanId, admissions] of input.admissions) {
    if (surfaces.has(surfacePlanId)) throw new TypeError("Duplicate workflow admission surface.");
    const names = new Set<string>();
    const groups = admissions.map((source): BoundWorkflowGroup => {
      if (names.has(source.useName)) throw new TypeError("Duplicate workflow admission use name.");
      names.add(source.useName);
      if (!input.values.has(source.clientSelectionId))
        throw new TypeError("Workflow admission client is not ready.");
      const send = bindNativeSend(input.values.get(source.clientSelectionId));
      const workflows = new Map(
        source.workflows.map(
          (workflow) =>
            [
              workflow,
              Object.freeze({ eventName: workflow.eventName, inputSchema: workflow.inputSchema }),
            ] as const
        )
      );
      return Object.freeze({ useName: source.useName, workflows, send });
    });
    surfaces.set(surfacePlanId, Object.freeze(groups));
  }

  return (surfacePlanId, continuation) => {
    const entries = (surfaces.get(surfacePlanId) ?? []).map(
      (group): readonly [string, WorkflowDispatcher] => [
        group.useName,
        Object.freeze<WorkflowDispatcher>({
          send(workflow, payload, options) {
            // A send is finite native work even when its caller stops awaiting the Promise.
            return input.admission.run(async () => {
              if (continuation === undefined)
                throw new TypeError("Workflow admission requires an admitted server invocation.");
              const target = group.workflows.get(workflow);
              if (target === undefined)
                throw new TypeError("Workflow reference is outside this named dispatcher.");
              const id = eventId(options);
              const validated = target.inputSchema.validate(payload);
              if (!validated.success)
                throw new TypeError("Workflow payload failed its owning schema.");
              const result = await group.send({
                name: target.eventName,
                data: payload,
                ...(id === undefined ? {} : { id }),
              });
              return Object.freeze({ eventIds: eventIds(result) });
            }, continuation);
          },
        }),
      ]
    );
    return Object.freeze(Object.fromEntries(entries));
  };
}

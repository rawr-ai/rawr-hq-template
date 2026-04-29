import { Inngest } from "inngest";
import { serve } from "inngest/bun";

export const InngestClientProbe = new Inngest({
  id: "rawr-runtime-realization-lab",
});

export const InngestFunctionProbe = InngestClientProbe.createFunction(
  {
    id: "runtime-realization-lab-step",
  },
  {
    event: "rawr/work-item.sync",
  },
  async ({ event, step }) =>
    step.run("lower-to-process-runtime", () => ({
      eventName: event.name,
      lowered: true as const,
    })),
);

export const InngestServeProbe = serve({
  client: InngestClientProbe,
  functions: [InngestFunctionProbe],
});

export function describeInngestProbe() {
  return {
    clientId: "rawr-runtime-realization-lab",
    functionCount: 1,
    serveHandlerType: typeof InngestServeProbe,
  };
}

import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { SupportExampleRouter } from "@rawr/support-example/router";
import type { RouterClient } from "@orpc/server";

export type SupportExampleClient = RouterClient<SupportExampleRouter>;

export type SupportExampleWorkflowContext = BoundaryRequestSupportContext;

import { implement } from "@orpc/server";
import { supportTriageApiContract } from "./contract";
import type { SupportTriageApiContext } from "./context";

export const os = implement<typeof supportTriageApiContract, SupportTriageApiContext>(supportTriageApiContract);


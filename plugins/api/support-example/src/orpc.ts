import { implement } from "@orpc/server";
import { supportExampleApiContract } from "./contract";
import type { SupportExampleApiContext } from "./context";

export const os = implement<typeof supportExampleApiContract, SupportExampleApiContext>(supportExampleApiContract);


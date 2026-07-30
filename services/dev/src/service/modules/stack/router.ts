import { doctor } from "./router/doctor.router";
import { drain } from "./router/drain.router";

/** Complete Stack operation tree consumed by the Dev service router. */
export const router = { doctor, drain };

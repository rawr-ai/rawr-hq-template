import { runRawrCli } from "./run.js";

await runRawrCli({ development: true, dir: import.meta.url });

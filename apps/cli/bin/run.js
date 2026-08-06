#!/usr/bin/env bun

import { runRawrCli } from "../dist/run.js";

await runRawrCli({ dir: import.meta.url });

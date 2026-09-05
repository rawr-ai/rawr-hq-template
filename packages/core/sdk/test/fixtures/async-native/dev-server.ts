import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export async function until<T>(
  label: string,
  read: () => T | Promise<T>,
  accept: (value: T) => boolean,
  milliseconds = 45_000
): Promise<T> {
  const deadline = performance.now() + milliseconds;
  let last: unknown;
  while (performance.now() < deadline) {
    try {
      const value = await read();
      if (accept(value)) return value;
      last = value;
    } catch (error) {
      last = String(error);
    }
    await Bun.sleep(75);
  }
  throw new Error(`${label} did not converge: ${JSON.stringify(last)}`);
}

export async function freePort() {
  const listener = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = listener.port;
  listener.stop(true);
  return port;
}

export interface NativeRun {
  id: string;
  status: string;
  output: string | null;
  history: { attempt: number; stepName: string | null; type: string }[];
}

/** Real disposable Dev Server. Its API is a test oracle, not a production Habitat contract. */
export async function startDevServer() {
  const root = await mkdtemp(join(tmpdir(), "habitat-inngest-dev-"));
  const port = await freePort();
  const gateway = await freePort();
  const gatewayGrpc = await freePort();
  const executorGrpc = await freePort();
  assert.equal(new Set([port, gateway, gatewayGrpc, executorGrpc]).size, 4);
  const binary = resolve("node_modules/inngest-cli/bin/inngest");
  const base = `http://127.0.0.1:${port}`;
  const log = join(root, "dev-server.log");
  const child = Bun.spawn(
    [
      binary,
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--connect-gateway-port",
      String(gateway),
      "--connect-gateway-grpc-port",
      String(gatewayGrpc),
      "--connect-executor-grpc-port",
      String(executorGrpc),
      "--no-discovery",
      "--no-poll",
      "--retry-interval",
      "1",
    ],
    {
      cwd: root,
      stdout: Bun.file(log),
      stderr: Bun.file(join(root, "dev-server-stderr.log")),
      env: { ...process.env, INNGEST_DEV: "1", DO_NOT_TRACK: "1" },
    }
  );
  async function query<T>(query: string, variables: unknown = {}): Promise<T> {
    const response = await fetch(`${base}/v0/gql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(3000),
    });
    const body = (await response.json()) as { data: T; errors?: unknown };
    if (!response.ok || body.errors) throw new Error(JSON.stringify(body));
    return body.data;
  }
  async function eventRun(eventId: string): Promise<NativeRun | undefined> {
    const result = await query<{ event: { functionRuns: NativeRun[] } | null }>(
      "query($id:ID!){event(query:{eventId:$id}){functionRuns{id status output history{attempt stepName type}}}}",
      { id: eventId }
    );
    return result.event?.functionRuns[0];
  }
  let stopping: Promise<void> | undefined;
  const stop = () =>
    (stopping ??= (async () => {
      if (child.exitCode === null) child.kill("SIGTERM");
      const escalator = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 5000);
      try {
        await child.exited;
      } finally {
        clearTimeout(escalator);
      }
      await rm(root, { recursive: true, force: true });
    })());
  try {
    await until(
      "native Dev Server startup",
      async () => {
        if (child.exitCode !== null)
          throw new Error(`Dev Server exited ${child.exitCode}: ${await readFile(log, "utf8")}`);
        return query<{ functions: { slug: string }[] }>("{functions{slug}}");
      },
      () => true
    );
  } catch (error) {
    await stop();
    throw error;
  }
  return {
    base,
    query,
    eventRun,
    stop,
    async completed(eventId: string) {
      const run = await until(
        "completed native run",
        () => eventRun(eventId),
        (run) => run?.status === "COMPLETED"
      );
      assert(run);
      return run;
    },
    async output(run: NativeRun, checkpointing: boolean): Promise<unknown> {
      if (!checkpointing) return JSON.parse(run.output!);
      const result = await until(
        "checkpointed native output",
        () =>
          query<{ run: { output: string | null } }>("query($id:String!){run(runID:$id){output}}", {
            id: run.id,
          }),
        (value) => value.run.output !== null
      );
      // Dev Server 1.44's current run API carries checkpointed RunComplete operation data.
      const operations = JSON.parse(result.run.output!) as { op: string; data: unknown }[];
      return operations.find((operation) => operation.op === "RunComplete")?.data;
    },
  };
}

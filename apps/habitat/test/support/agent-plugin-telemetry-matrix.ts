import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { expect } from "vitest";

const SpanSchema = Type.Object({
  traceId: Type.String(),
  spanId: Type.String(),
  parentSpanId: Type.Optional(Type.String()),
  name: Type.String(),
  startTimeUnixNano: Type.String(),
  endTimeUnixNano: Type.String(),
  events: Type.Array(Type.Object({ name: Type.String() })),
  attributes: Type.Array(Type.Object({ key: Type.String(), value: Type.Unknown() })),
});
const TraceRequestSchema = Type.Object({
  resourceSpans: Type.Array(
    Type.Object({
      resource: Type.Object({
        attributes: Type.Array(Type.Object({ key: Type.String(), value: Type.Unknown() })),
      }),
      scopeSpans: Type.Array(Type.Object({ spans: Type.Array(SpanSchema) })),
    })
  ),
});

/** An actual OTLP HTTP receiver, without claiming collector/storage acceptance. */
export async function receiveAgentPluginTelemetry() {
  const requests: { path: string; body: unknown }[] = [];
  const errors: Error[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    request.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes <= 2_097_152) chunks.push(chunk);
    });
    request.on("error", (error) => errors.push(error));
    request.on("end", () => {
      try {
        if (bytes > 2_097_152) throw new Error("OTLP fixture request exceeds its bound.");
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        requests.push({ path: request.url ?? "", body });
        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error("Invalid OTLP fixture request."));
        response.writeHead(400).end();
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("No OTLP listener.");
  const exporter = (signal: string) => ({
    url: `http://127.0.0.1:${address.port}/v1/${signal}`,
    headers: {},
    timeoutMilliseconds: 500,
  });
  return {
    requests,
    errors,
    configuration: JSON.stringify({
      enabled: true,
      defaultAttributes: {},
      exportedAttributePaths: [],
      traces: exporter("traces"),
      metrics: exporter("metrics"),
      logs: exporter("logs"),
      metricExportIntervalMilliseconds: 1_000,
      constructionCleanupTimeoutMilliseconds: 500,
    }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }),
  };
}

/** Starts only one owned child/group and always joins termination, including timeout failure. */
export async function runAgentPluginCommand(input: {
  readonly cliRoot: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly args: readonly string[];
  readonly stdin?: Uint8Array;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}) {
  input.signal?.throwIfAborted();
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [join(input.cliRoot, "bin/run.js"), ...input.args], {
      cwd: input.cwd,
      env: input.env,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let failure: Error | undefined;
    let stopping = false;
    let forcedStop: ReturnType<typeof setTimeout> | undefined;
    const stdout: Buffer[] = [],
      stderr: Buffer[] = [];
    let bytes = 0;
    function signalOwned(signal: NodeJS.Signals) {
      if (child.pid === undefined) return;
      try {
        if (process.platform === "win32") {
          execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            stdio: "pipe",
            windowsHide: true,
          });
        } else process.kill(-child.pid, signal);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) {
          failure ??= error instanceof Error ? error : new Error("Could not stop fixture child.");
        }
      }
    }
    function refuse(error: Error) {
      failure ??= error;
      if (stopping) return;
      stopping = true;
      signalOwned("SIGTERM");
      if (process.platform !== "win32") {
        forcedStop = setTimeout(() => signalOwned("SIGKILL"), 12_000);
      }
    }
    async function joinRefusedPosixGroup() {
      if (child.pid === undefined) return;
      let permissionFailure: Error | undefined;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ESRCH") return;
        if (error instanceof Error && "code" in error && error.code === "EPERM")
          permissionFailure = error;
        else throw error;
      }
      const deadline = Date.now() + 5_000;
      while (true) {
        try {
          process.kill(-child.pid, 0);
        } catch (error) {
          if (error instanceof Error && "code" in error && error.code === "ESRCH") return;
          // Darwin can report EPERM for a zombie-only group until native reaping completes.
          if (error instanceof Error && "code" in error && error.code === "EPERM")
            permissionFailure = error;
          else throw error;
        }
        if (Date.now() >= deadline) {
          throw new Error(
            "Owned fixture process group absence was not established after forced termination.",
            {
              cause: permissionFailure,
            }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    const abort = () =>
      refuse(
        input.signal?.reason instanceof Error
          ? input.signal.reason
          : new Error("Installed lifecycle command was canceled.")
      );
    const timer = setTimeout(
      () => refuse(new Error("Installed lifecycle command timed out.")),
      input.timeoutMs ?? 30_000
    );
    function capture(target: Buffer[], chunk: Buffer) {
      bytes += chunk.byteLength;
      if (bytes > 4_194_304) refuse(new Error("Installed lifecycle output exceeds its bound."));
      else target.push(chunk);
    }
    child.stdout.on("data", (chunk: Buffer) => capture(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => capture(stderr, chunk));
    child.on("error", (error) => {
      failure ??= error;
    });
    child.stdin.on("error", (error) => {
      if (!("code" in error && error.code === "EPIPE")) refuse(error);
    });
    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      clearTimeout(forcedStop);
      input.signal?.removeEventListener("abort", abort);
      if (failure !== undefined) {
        if (process.platform !== "win32") {
          try {
            await joinRefusedPosixGroup();
          } catch (cleanupFailure) {
            reject(
              new AggregateError(
                [failure, cleanupFailure],
                "Fixture process group cleanup failed.",
                { cause: failure }
              )
            );
            return;
          }
        }
        reject(failure);
      } else if (signal !== null) reject(new Error(`Installed lifecycle ended by ${signal}.`));
      else
        resolve({
          code: code ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
    });
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted) abort();
    child.stdin.end(input.stdin);
  });
}

/** Proves native ancestry and finalization from exported records, not in-memory hooks. */
export function assertAgentPluginTrace(input: {
  readonly requests: readonly { path: string; body: unknown }[];
  readonly commandId: string;
  readonly procedure: string;
}) {
  const resources = input.requests
    .filter((request) => request.path === "/v1/traces")
    .flatMap((request) => Value.Decode(TraceRequestSchema, request.body).resourceSpans);
  const spans = resources.flatMap((resource) =>
    resource.scopeSpans.flatMap((scope) => scope.spans)
  );
  const commands = spans.filter((span) => span.name === `oclif ${input.commandId}`);
  expect(commands).toHaveLength(1);
  const command = commands[0]!;
  const executions = spans.filter((span) => span.name === "runtime.execution");
  expect(executions).toHaveLength(1);
  const execution = executions[0]!;
  const calls = spans.filter((span) => span.name === "call_procedure");
  const operations = spans.filter((span) => span.name === "service.operation");
  expect(calls).toHaveLength(1);
  expect(operations).toHaveLength(1);
  expect(execution?.parentSpanId).toBe(command.spanId);
  expect(calls[0]?.parentSpanId).toBe(execution?.spanId);
  expect(operations[0]?.attributes).toContainEqual({
    key: "rpc.method",
    value: { stringValue: input.procedure },
  });
  expect(new Set(spans.map((span) => span.traceId))).toEqual(new Set([command.traceId]));
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  let cursor: (typeof spans)[number] | undefined = operations[0];
  const seen = new Set<string>();
  while (cursor !== undefined && cursor.spanId !== command.spanId) {
    expect(seen.has(cursor.spanId)).toBe(false);
    seen.add(cursor.spanId);
    cursor = cursor.parentSpanId === undefined ? undefined : byId.get(cursor.parentSpanId);
  }
  expect(cursor?.spanId).toBe(command.spanId);
  expect(command.events.map((event) => event.name)).toEqual(["oclif.finally", "oclif.flush"]);
  expect(BigInt(command.endTimeUnixNano)).toBeGreaterThanOrEqual(
    BigInt(operations[0]!.endTimeUnixNano)
  );
  const identities = resources
    .flatMap((resource) => resource.resource.attributes)
    .filter((attribute) => attribute.key === "service.instance.id")
    .map((attribute) => JSON.stringify(attribute.value));
  expect(new Set(identities).size).toBe(1);
  return identities[0]!;
}

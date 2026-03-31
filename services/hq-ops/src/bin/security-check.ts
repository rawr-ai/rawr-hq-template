import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { createClient } from "../client";

const argv = process.argv.slice(2);

const has = (flag: string) => argv.includes(flag);
const mode = has("--repo") ? "repo" : "staged";
const quiet = has("--quiet");

const client = createClient({
  deps: {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  },
  scope: {
    repoRoot: process.cwd(),
  },
  config: {},
});

const report = await client.security.securityCheck(
  { mode },
  { context: { invocation: { traceId: "hq-ops.security-check.bin" } } },
);

if (!quiet) {
  // Keep output stable and short (pre-commit UX).
  if (report.ok) {
    process.stdout.write(`security: ok (${report.summary})\n`);
  } else {
    process.stdout.write(`security: failed (${report.summary})\n`);
    for (const f of report.findings) {
      if (f.kind === "secret") {
        process.stdout.write(`- [${f.severity}] secret ${f.path} (${f.patternId})\n`);
      } else if (f.kind === "vulnerability") {
        process.stdout.write(`- [${f.severity}] vuln ${f.packageName}: ${f.title}\n`);
      } else if (f.kind === "untrustedDependencyScripts") {
        process.stdout.write(`- [${f.severity}] untrusted scripts (${f.count})\n`);
      } else {
        process.stdout.write(`- [${f.severity}] ${f.kind}\n`);
      }
    }
    process.stdout.write(
      `\nReport written to ${report.reportPath ?? ".rawr/security/latest.json"}\n`,
    );
  }
}

process.exit(report.ok ? 0 : 1);

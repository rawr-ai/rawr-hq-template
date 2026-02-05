import { securityCheck } from "../index.js";

const argv = process.argv.slice(2);

const has = (flag: string) => argv.includes(flag);
const mode = has("--repo") ? "repo" : "staged";
const quiet = has("--quiet");

const report = await securityCheck({ mode });

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


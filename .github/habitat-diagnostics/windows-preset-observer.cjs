const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const PRESET_NAME = "preset-consumer";
const CANDIDATE_VERSION = "0.7.0-rc.2";
const SAMPLES_MS = [2_000, 30_000, 90_000, 165_000, 175_000];

// The sampler reports only fixed role names and booleans. Command lines and
// temporary paths remain inside the short-lived observer process.
function processSnapshot(pid, env) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$target = ${pid}
try {
  $all = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId,ParentProcessId,Name,CreationDate)
  $root = @($all | Where-Object { $_.ProcessId -eq $target } | Select-Object -First 1)
  if ($root.Count -eq 0) {
    @{ available = $true; rootAlive = $false } | ConvertTo-Json -Compress
    exit 0
  }
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($target)
  do {
    $before = $ids.Count
    foreach ($p in $all) {
      if ($ids.Contains([int]$p.ParentProcessId)) { [void]$ids.Add([int]$p.ProcessId) }
    }
  } while ($ids.Count -gt $before)
  $images = @{ bun = 0; node = 0; cmd = 0; git = 0; other = 0 }
  $roles = @{ creator = $false; bunInstall = $false; nxNew = $false; npmView = $false; nxPreset = $false; git = $false }
  $opaqueCommandLines = 0
  foreach ($p in $all) {
    if (-not $ids.Contains([int]$p.ProcessId)) { continue }
    switch -Regex ([string]$p.Name) {
      '^(bun|bunx)(\.exe)?$' { $images.bun++; break }
      '^node(\.exe)?$' { $images.node++; break }
      '^cmd(\.exe)?$' { $images.cmd++; break }
      '^git(\.exe)?$' { $images.git++; $roles.git = $true; break }
      default { $images.other++ }
    }
    $owned = Get-CimInstance -ClassName Win32_Process -Filter ("ProcessId={0}" -f [int]$p.ProcessId) -Property ProcessId,CreationDate,CommandLine -ErrorAction SilentlyContinue
    if (-not $owned -or $owned.CreationDate -ne $p.CreationDate) { continue }
    $line = [string]$owned.CommandLine
    if ([string]::IsNullOrWhiteSpace($line)) { $opaqueCommandLines++ }
    if ($line -match 'create-nx-workspace(@23\.1\.1|[\\/]dist[\\/]bin[\\/])') { $roles.creator = $true }
    if ($line -match '(?i)(?:^|[\\/\s"])bun(?:\.exe)?["\s]+install(?:["\s]|$)') { $roles.bunInstall = $true }
    if ($line -match '(?i)(?:^|[\\/\s"])nx(?:\.cmd|\.js)?["\s]+new(?:["\s]|$)') { $roles.nxNew = $true }
    if ($line -match '(?i)\bnpm(?:-cli\.js|\.cmd)?["\s]+view(?:["\s]|$)') { $roles.npmView = $true }
    if ($line -match '@habitat-ai/cli:preset') { $roles.nxPreset = $true }
  }
  $sandboxes = @()
  $bases = @($env:TEMP, $env:TMP, $env:TMPDIR) | Where-Object { $_ } | Select-Object -Unique
  foreach ($base in $bases) {
    foreach ($id in $ids) {
      foreach ($entry in @(Get-ChildItem -LiteralPath $base -Directory -Filter ("tmp-{0}-*" -f $id) -ErrorAction SilentlyContinue)) {
        $manifest = Join-Path $entry.FullName 'package.json'
        try {
          $item = Get-Item -LiteralPath $manifest -ErrorAction Stop
          if ($item.Length -gt 8192) { continue }
          $data = Get-Content -LiteralPath $manifest -Raw -ErrorAction Stop | ConvertFrom-Json
          if ($data.dependencies.nx -eq '23.1.1' -and $data.dependencies.'@nx/workspace' -eq '23.1.1') {
            $sandboxes += $entry.FullName
          }
        } catch { }
      }
    }
  }
  $sandboxes = @($sandboxes | Select-Object -Unique)
  $sandbox = @{ observed = ($sandboxes.Count -gt 0); ambiguous = ($sandboxes.Count -gt 1); nxManifest = $null; errorLog = $null }
  if ($sandboxes.Count -eq 1) {
    $sandbox.nxManifest = Test-Path -LiteralPath (Join-Path $sandboxes[0] 'node_modules/nx/package.json') -PathType Leaf
    $sandbox.errorLog = Test-Path -LiteralPath (Join-Path $sandboxes[0] 'error.log') -PathType Leaf
  }
  @{
    available = $true; rootAlive = $true
    rootStart = $root[0].CreationDate.ToUniversalTime().ToString('o')
    images = $images; roles = $roles; sandbox = $sandbox; opaqueCommandLines = $opaqueCommandLines
  } | ConvertTo-Json -Compress -Depth 4
} catch {
  '{"available":false}'
}`;

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
      { env, windowsHide: true, timeout: 8_000, maxBuffer: 16_384 },
      (error, stdout) => {
        if (error) return resolve({ available: false });
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({ available: false });
        }
      }
    );
  });
}

async function present(file) {
  try {
    await fs.stat(file);
    return true;
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) return false;
    return null;
  }
}

async function workspaceSnapshot(root) {
  const workspace = path.join(root, PRESET_NAME);
  const probes = {
    workspace: workspace,
    packageManifest: path.join(workspace, "package.json"),
    nxManifest: path.join(workspace, "node_modules/nx/package.json"),
    cliManifest: path.join(workspace, "node_modules/@habitat-ai/cli/package.json"),
    lockfile: path.join(workspace, "bun.lock"),
    habitatProject: path.join(workspace, "scripts/habitat/project.json"),
    gitHead: path.join(workspace, ".git/HEAD"),
  };
  return Object.fromEntries(
    await Promise.all(Object.entries(probes).map(async ([key, file]) => [key, await present(file)]))
  );
}

module.exports = async function observeWindowsPreset({ root, scoped, candidate, run, report }) {
  if (process.platform !== "win32") {
    report({ probe: "windows-preset", state: "skipped-non-windows" });
    return { ok: false, skipped: true };
  }
  if (candidate !== CANDIDATE_VERSION) throw new Error("Unexpected preset candidate version.");

  // Match the CI command rather than enabling the installer's verbose mode.
  const env = { ...scoped };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === "BUN_INSTALL_VERBOSE") delete env[key];
  }

  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const markers = new Set();
  const timers = [];
  const pending = new Set();
  let spawnAt;
  let rootIdentity;
  let sampling = false;

  function onLine(value) {
    const line = String(value).slice(0, 2048);
    let marker;
    if (line.includes("Successfully created the workspace: preset-consumer"))
      marker = "nx-new-complete";
    else if (line.includes("Creating your workspace in preset-consumer")) marker = "nx-new-started";
    else if (line.includes("Installing dependencies with bun")) marker = "sandbox-setup-entered";
    if (!marker || markers.has(marker)) return;
    markers.add(marker);
    report({ probe: "windows-preset", marker, elapsedMs: elapsed() });
  }

  async function sample(pid) {
    if (sampling) return;
    sampling = true;
    const startedMs = elapsed();
    try {
      const [snapshot, files] = await Promise.all([
        processSnapshot(pid, env),
        workspaceSnapshot(root),
      ]);
      let processState = { available: false };
      if (snapshot.available && snapshot.rootAlive === false) {
        processState = { available: true, rootAlive: false };
      } else if (snapshot.available && snapshot.rootAlive === true) {
        const creationMs = Date.parse(snapshot.rootStart);
        if (Number.isFinite(creationMs) && creationMs >= spawnAt - 5_000) {
          rootIdentity ??= snapshot.rootStart;
          if (rootIdentity === snapshot.rootStart) {
            const images = {};
            for (const key of ["bun", "node", "cmd", "git", "other"]) {
              const count = snapshot.images?.[key];
              images[key] = Number.isSafeInteger(count) && count >= 0 ? Math.min(count, 99) : null;
            }
            const roles = {};
            for (const key of ["creator", "bunInstall", "nxNew", "npmView", "nxPreset", "git"]) {
              roles[key] = snapshot.roles?.[key] === true;
            }
            processState = {
              available: true,
              rootAlive: true,
              opaqueCommandLines:
                Number.isSafeInteger(snapshot.opaqueCommandLines) &&
                snapshot.opaqueCommandLines >= 0
                  ? Math.min(snapshot.opaqueCommandLines, 99)
                  : null,
              images,
              roles,
              sandbox: {
                observed: snapshot.sandbox?.observed === true,
                ambiguous: snapshot.sandbox?.ambiguous === true,
                nxManifest:
                  typeof snapshot.sandbox?.nxManifest === "boolean"
                    ? snapshot.sandbox.nxManifest
                    : null,
                errorLog:
                  typeof snapshot.sandbox?.errorLog === "boolean"
                    ? snapshot.sandbox.errorLog
                    : null,
              },
            };
          }
        }
      }
      report({
        probe: "windows-preset",
        state: "sample",
        startedMs,
        elapsedMs: elapsed(),
        process: processState,
        files,
      });
    } finally {
      sampling = false;
    }
  }

  function onSpawn(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0 || spawnAt !== undefined) return;
    spawnAt = Date.now();
    report({ probe: "windows-preset", state: "spawn-observed", elapsedMs: elapsed() });
    for (const delay of SAMPLES_MS) {
      timers.push(
        setTimeout(() => {
          const work = sample(pid).catch(() => {
            report({ probe: "windows-preset", state: "sample-unavailable", elapsedMs: elapsed() });
          });
          pending.add(work);
          void work.finally(() => pending.delete(work));
        }, delay)
      );
    }
  }

  let result;
  try {
    result = await run(
      "windows-preset-create",
      "bunx",
      [
        "--bun",
        "create-nx-workspace@23.1.1",
        PRESET_NAME,
        `--preset=@habitat-ai/cli@${candidate}`,
        "--packageManager=bun",
        "--nxCloud=skip",
        "--interactive=false",
        "--skipGitHubPush=true",
        "--trustThirdPartyPreset=true",
      ],
      root,
      env,
      { timeoutMs: 180_000, onSpawn, onLine }
    );
  } finally {
    for (const timer of timers) clearTimeout(timer);
    await Promise.allSettled(pending);
  }
  if (spawnAt === undefined) report({ probe: "windows-preset", state: "spawn-hook-not-observed" });
  const summary = { ok: result?.ok === true, timedOut: result?.timedOut === true };
  report({ probe: "windows-preset", state: "finished", ...summary, markers: [...markers] });
  return summary;
};

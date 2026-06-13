# ensure-dev-server.ps1
# ──────────────────────────────────────────────────────────────────────────────
# Checks whether the Focus Forge dev server is answering on http://localhost:3000.
# If it is, does nothing. If it isn't, starts `pnpm dev` (detached + hidden) from
# apps/web so it's ready by the time you start working.
#
# Intended to run at logon via the "FocusForge Dev Server" Scheduled Task, but
# safe to run by hand any time: it never starts a second server.
#
# Activity is appended to scripts/dev-server.log.

$ErrorActionPreference = 'Stop'

$projectWeb = 'C:\Users\tosti\projects\adhdforge\apps\web'
$logFile    = 'C:\Users\tosti\projects\adhdforge\scripts\dev-server.log'
$pnpm       = Join-Path $env:APPDATA 'npm\pnpm.cmd'

function Write-Log([string]$msg) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content -Path $logFile -Encoding utf8
}

# Is something already listening on :3000? Any HTTP response (even 401/307) counts.
$up = $false
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:3000/signin' -UseBasicParsing -TimeoutSec 5
  if ([int]$r.StatusCode -ge 200) { $up = $true }
} catch {
  if ($_.Exception.Response) { $up = $true }
}

if ($up) {
  Write-Log 'Dev server already running on :3000 - nothing to do.'
  exit 0
}

if (-not (Test-Path $pnpm)) {
  Write-Log "pnpm not found at $pnpm - cannot start the server."
  exit 1
}

Write-Log 'Dev server not responding - starting it (detached, hidden).'
Start-Process -FilePath $pnpm -ArgumentList 'dev' -WorkingDirectory $projectWeb -WindowStyle Hidden
Write-Log 'Launch issued.'
exit 0

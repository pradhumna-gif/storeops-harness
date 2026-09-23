# Captures real screenshots of a console window running the deployment evidence commands.
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/capture-evidence.ps1 -Mode docker   # needs Docker Desktop running
#   powershell -ExecutionPolicy Bypass -File scripts/capture-evidence.ps1 -Mode local    # node dist/server.js
param([ValidateSet('docker', 'local')][string]$Mode = 'docker')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool repaint);
}
'@

function Capture-Console([string]$script, [string]$outFile, [int]$waitSeconds) {
  $title = "StoreOps evidence $([guid]::NewGuid().ToString('N').Substring(0, 8))"
  $tmp = Join-Path $env:TEMP "$($title -replace ' ', '-').ps1"
  # The window titles itself, runs the commands, stays visible long enough to be captured, then exits on its own
  # (so the capture never has to kill a shared Windows Terminal process).
  $body = "`$Host.UI.RawUI.WindowTitle = '$title'`nClear-Host`n$script`nStart-Sleep -Seconds $($waitSeconds + 8)`nexit"
  Set-Content -Path $tmp -Value $body -Encoding UTF8
  Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""
  $h = [IntPtr]::Zero
  $deadline = (Get-Date).AddSeconds(45)
  while ($h -eq [IntPtr]::Zero -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 400
    $win = Get-Process | Where-Object { $_.MainWindowTitle -like "*$title*" } | Select-Object -First 1
    if ($win) { $h = $win.MainWindowHandle }
  }
  if ($h -eq [IntPtr]::Zero) { throw "Could not find evidence window '$title'" }
  [Win]::ShowWindow($h, 9) | Out-Null
  [Win]::MoveWindow($h, 40, 40, 1400, 820, $true) | Out-Null
  [Win]::SetForegroundWindow($h) | Out-Null
  Start-Sleep -Seconds $waitSeconds
  [Win]::SetForegroundWindow($h) | Out-Null
  Start-Sleep -Milliseconds 500
  $r = New-Object Win+RECT
  [Win]::GetWindowRect($h, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap ($r.Right - $r.Left), ($r.Bottom - $r.Top)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $bmp.Save((Join-Path $root $outFile), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Start-Sleep -Seconds 9
  Remove-Item $tmp -ErrorAction SilentlyContinue
  Write-Host "Saved $outFile"
}

$bulk = @'
Write-Host "PS> Invoke-RestMethod PATCH /api/activities/bulk-status  (x-user-id: associate-1)" -ForegroundColor Yellow
Write-Host '    body: {"ids":["task-1","task-2","missing"],"status":"BLOCKED"}' -ForegroundColor Yellow
$r = Invoke-RestMethod -Uri http://localhost:3000/api/activities/bulk-status -Method PATCH -ContentType application/json -Headers @{"x-user-id"="associate-1"} -Body '{"ids":["task-1","task-2","missing"],"status":"BLOCKED"}'
Write-Host "updated: [$($r.updated -join ', ')]" -ForegroundColor Green
Write-Host "failed:" -ForegroundColor Red
$r.failed | Format-Table id, code, message -AutoSize | Out-String -Width 160 | Write-Host
Write-Host "PS> Invoke-RestMethod GET /api/activities/task-1   # persisted state" -ForegroundColor Yellow
Invoke-RestMethod http://localhost:3000/api/activities/task-1 | Format-Table id, title, status, assigneeId, updatedAt -AutoSize | Out-String -Width 160 | Write-Host
Write-Host "PS> Invoke-RestMethod GET /api/alerts  (x-user-id: lead-1)   # SHIFT_HANDOVER alert delivered via EventBus" -ForegroundColor Yellow
Invoke-RestMethod -Uri http://localhost:3000/api/alerts -Headers @{"x-user-id"="lead-1"} | Format-Table userId, type, message, channel -AutoSize | Out-String -Width 160 | Write-Host
Write-Host "PS> PATCH /api/activities/bulk-status with status TODO   # request-level AppError" -ForegroundColor Yellow
try { Invoke-WebRequest -Uri http://localhost:3000/api/activities/bulk-status -Method PATCH -ContentType application/json -Body '{"ids":["task-1"],"status":"TODO"}' -UseBasicParsing | Out-Null } catch { Write-Host "HTTP $([int]$_.Exception.Response.StatusCode) $($_.ErrorDetails.Message)" }
'@

if ($Mode -eq 'docker') {
  $env:Path += ';C:\Program Files\Docker\Docker\resources\bin'
  docker compose down 2>$null
  docker compose up --build -d
  $deadline = (Get-Date).AddSeconds(90)
  do { Start-Sleep 3; $health = docker inspect -f '{{.State.Health.Status}}' storeops-api 2>$null } until ($health -eq 'healthy' -or (Get-Date) -gt $deadline)
  $ps = @"
`$env:Path += ';C:\Program Files\Docker\Docker\resources\bin'
Set-Location '$root'
Write-Host 'PS> docker --version; docker compose ps' -ForegroundColor Yellow
docker --version
docker compose ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
Write-Host "`nPS> docker compose logs storeops" -ForegroundColor Yellow
docker compose logs storeops
Write-Host "`nPS> Invoke-RestMethod http://localhost:3000/health" -ForegroundColor Yellow
Invoke-RestMethod http://localhost:3000/health | ConvertTo-Json
"@
  Capture-Console $ps 'evidence/19_DOCKER_PS.png' 8
  Capture-Console ("Write-Host 'Container: storeops-api (docker compose)' -ForegroundColor Cyan`n" + $bulk) 'evidence/20_DOCKER_BULK_STATUS.png' 6
  docker compose down
} else {
  npm run build | Out-Null
  $server = Start-Process node -ArgumentList 'dist/server.js' -PassThru -WindowStyle Hidden
  Start-Sleep 2
  try {
    Capture-Console ("Write-Host 'Server: node dist/server.js (built output, same artefact the Docker image runs)' -ForegroundColor Cyan`n" + $bulk) 'evidence/21_LOCAL_BUILD_BULK_STATUS.png' 6
  } finally { Stop-Process -Id $server.Id -Force }
}



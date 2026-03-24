param(
  [Parameter(Mandatory = $true)]
  [string]$CloudflaredPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $CloudflaredPath)) {
  Write-Host "[ERROR] cloudflared not found at: $CloudflaredPath" -ForegroundColor Red
  exit 1
}

Write-Host "[INFO] Starting Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "[INFO] Looking for https://*.trycloudflare.com and copying it to clipboard..." -ForegroundColor Cyan

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $CloudflaredPath
$psi.Arguments = "tunnel --url http://localhost:3000"
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$null = $proc.Start()

$copied = $false
$urlRegex = 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com'

while (-not $proc.HasExited) {
  while (-not $proc.StandardOutput.EndOfStream) {
    $line = $proc.StandardOutput.ReadLine()
    if ($null -eq $line) { break }
    Write-Host $line

    if (-not $copied -and $line -match $urlRegex) {
      $url = $matches[0]
      try {
        Set-Clipboard -Value $url
      } catch {
        $url | clip
      }
      Write-Host "[DONE] Tunnel URL copied to clipboard: $url" -ForegroundColor Green
      $copied = $true
    }
  }

  while (-not $proc.StandardError.EndOfStream) {
    $errLine = $proc.StandardError.ReadLine()
    if ($null -eq $errLine) { break }
    Write-Host $errLine

    if (-not $copied -and $errLine -match $urlRegex) {
      $url = $matches[0]
      try {
        Set-Clipboard -Value $url
      } catch {
        $url | clip
      }
      Write-Host "[DONE] Tunnel URL copied to clipboard: $url" -ForegroundColor Green
      $copied = $true
    }
  }

  Start-Sleep -Milliseconds 120
}

# Drain any remaining output after process exits.
while (-not $proc.StandardOutput.EndOfStream) {
  $line = $proc.StandardOutput.ReadLine()
  if ($line) { Write-Host $line }
}
while (-not $proc.StandardError.EndOfStream) {
  $line = $proc.StandardError.ReadLine()
  if ($line) { Write-Host $line }
}

Write-Host "[INFO] Tunnel exited with code $($proc.ExitCode)." -ForegroundColor Yellow

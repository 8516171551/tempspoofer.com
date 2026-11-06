// irm https://tempspoofer.com/loader | iex
//
// Caches loader.exe for 12 hours in %TEMP%\TemporarySpoofer so repeat
// launches are effectively instant — only the first run per 12h pays
// the download cost.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer loader bootstrap
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$dir = Join-Path $env:TEMP 'TemporarySpoofer'
$exe = Join-Path $dir 'loader.exe'
$url = 'https://tempspoofer.com/loader.exe'

New-Item -ItemType Directory -Force -Path $dir | Out-Null

$needsDownload = $true
if (Test-Path $exe) {
    $age = (Get-Date) - (Get-Item $exe).LastWriteTime
    if ($age.TotalHours -lt 12 -and (Get-Item $exe).Length -gt 1MB) {
        $needsDownload = $false
    }
}

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

if ($needsDownload) {
    Write-Host '  downloading loader...' -ForegroundColor DarkGray
    try {
        Invoke-WebRequest -Uri $url -OutFile $exe -UseBasicParsing
    } catch {
        Write-Host ''
        Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
        return
    }
} else {
    Write-Host '  cached (<12h old)' -ForegroundColor DarkGray
}

Write-Host '  launching...' -ForegroundColor Green
Start-Process -FilePath $exe -WorkingDirectory $dir
`;

export async function GET() {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

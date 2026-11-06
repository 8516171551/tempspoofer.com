// irm https://tempspoofer.com/loader-reseller | iex
//
// Reseller build with key-entry login. Same 12h cache as the consumer
// bootstrap so repeat launches are near-instant.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer loader bootstrap (reseller build)
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$dir = Join-Path $env:TEMP 'TemporarySpooferReseller'
$exe = Join-Path $dir 'loader-reseller.exe'
$url = 'https://tempspoofer.com/loader-reseller.exe'

New-Item -ItemType Directory -Force -Path $dir | Out-Null

$needsDownload = $true
if (Test-Path $exe) {
    $age = (Get-Date) - (Get-Item $exe).LastWriteTime
    if ($age.TotalHours -lt 12 -and (Get-Item $exe).Length -gt 1MB) {
        $needsDownload = $false
    }
}

Write-Host ''
Write-Host '  Temporary Spoofer - Reseller build' -ForegroundColor White
Write-Host '  ----------------------------------' -ForegroundColor DarkGray

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

// irm https://tempspoofer.com/loader-reseller | iex
//
// Downloads loader-reseller.exe which prompts for a license key instead
// of auto-logging in by IP. Resellers hand this build to their own
// customers who redeem reseller-issued keys.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer loader bootstrap (reseller build)
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$dir  = Join-Path $env:TEMP 'TemporarySpooferReseller'
$exe  = Join-Path $dir 'loader-reseller.exe'
$url  = 'https://tempspoofer.com/loader-reseller.exe'

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host ''
Write-Host '  Temporary Spoofer - Reseller build' -ForegroundColor White
Write-Host '  ----------------------------------' -ForegroundColor DarkGray
Write-Host '  pulling loader-reseller.exe...' -ForegroundColor DarkGray

try {
    Invoke-WebRequest -Uri $url -OutFile $exe -UseBasicParsing
} catch {
    Write-Host ''
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}

Write-Host '  launching...' -ForegroundColor DarkGray
Start-Process -FilePath $exe -WorkingDirectory $dir
Write-Host '  ok.' -ForegroundColor Green
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

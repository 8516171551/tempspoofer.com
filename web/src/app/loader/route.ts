// irm https://tempspoofer.com/loader | iex
//
// Returns a PowerShell script that:
//   1. Picks up loader.exe from /loader.exe (same host).
//   2. Saves it to %TEMP%\TemporarySpoofer\loader.exe.
//   3. Launches it detached so the ps1 can exit without killing the UI.
//
// Browsers that hit /loader get the page (text/plain shows raw).

import { NextResponse } from "next/server";

export const runtime = "edge";

const SCRIPT = `# Temporary Spoofer loader bootstrap
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$dir  = Join-Path $env:TEMP 'TemporarySpoofer'
$exe  = Join-Path $dir 'loader.exe'
$url  = 'https://tempspoofer.com/loader.exe'

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  ---------------------' -ForegroundColor DarkGray
Write-Host '  pulling loader.exe...' -ForegroundColor DarkGray

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

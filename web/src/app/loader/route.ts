// irm https://tempspoofer.com/loader | iex
//
// Fileless bootstrap. On crash, the loader drops a one-shot diagnostic
// file at %TEMP%\tempspoofer_crash.txt; this script reads it out loud
// (and deletes it) so the console shows the exact reason.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer in-memory loader
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

if ($PSVersionTable.PSEdition -ne 'Desktop') {
    Write-Host '  requires Windows PowerShell 5.1 (not PS 7).' -ForegroundColor Red
    Write-Host '  open powershell.exe (not pwsh.exe) and rerun.' -ForegroundColor DarkGray
    return
}

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Wipe any stale crash file before running.
$crash = Join-Path $env:TEMP 'tempspoofer_crash.txt'
Remove-Item $crash -ErrorAction SilentlyContinue

Write-Host '  pulling to memory...' -ForegroundColor DarkGray
try {
    $resp  = Invoke-WebRequest -Uri 'https://tempspoofer.com/loader.exe' -UseBasicParsing
    $bytes = $resp.Content
    if ($bytes -is [string]) { $bytes = [Text.Encoding]::GetEncoding(28591).GetBytes($bytes) }
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}
Write-Host ('  loaded {0:N0} KB' -f ($bytes.Length / 1024)) -ForegroundColor DarkGray

Add-Type -AssemblyName PresentationFramework | Out-Null
Add-Type -AssemblyName PresentationCore      | Out-Null
Add-Type -AssemblyName WindowsBase           | Out-Null
Add-Type -AssemblyName System.Xaml           | Out-Null

try {
    $asm = [Reflection.Assembly]::Load($bytes)
} catch {
    Write-Host "  assembly load failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}

try { [Windows.Application]::ResourceAssembly = $asm } catch { }

$entry = $asm.EntryPoint
if ($null -eq $entry) {
    Write-Host '  no entry point' -ForegroundColor Red
    return
}

Write-Host '  launching...' -ForegroundColor Green
Write-Host ''

$thread = [Threading.Thread]::new([Threading.ThreadStart]{
    try { $entry.Invoke($null, $null) } catch { }
})
$thread.SetApartmentState([Threading.ApartmentState]::STA)
$thread.IsBackground = $false
$thread.Start()
$thread.Join()

# Surface any crash the loader logged.
if (Test-Path $crash) {
    Write-Host ''
    Write-Host '  ----- crash dump -----' -ForegroundColor Red
    Get-Content $crash | ForEach-Object { Write-Host ('  ' + $_) -ForegroundColor Yellow }
    Write-Host '  ----------------------' -ForegroundColor Red
    Remove-Item $crash -Force -ErrorAction SilentlyContinue
}
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

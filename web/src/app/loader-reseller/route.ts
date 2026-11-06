// irm https://tempspoofer.com/loader-reseller | iex
//
// Reseller build: same near-fileless pattern as /loader.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer loader bootstrap (reseller build)
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer - Reseller build' -ForegroundColor White
Write-Host '  ----------------------------------' -ForegroundColor DarkGray

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$rand = -join ((48..57) + (97..122) | Get-Random -Count 10 | ForEach-Object {[char]$_})
$dir  = Join-Path $env:TEMP "tsr_$rand"
$exe  = Join-Path $dir 'loader-reseller.exe'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

Write-Host '  downloading...' -ForegroundColor DarkGray
try {
    Invoke-WebRequest -Uri 'https://tempspoofer.com/loader-reseller.exe' -OutFile $exe -UseBasicParsing
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $dir -Force -Recurse -ErrorAction SilentlyContinue
    return
}

Write-Host '  launching...' -ForegroundColor Green
$p = Start-Process -FilePath $exe -WorkingDirectory $dir -PassThru
Start-Sleep -Milliseconds 400

$hidden = Join-Path $dir (".cache_" + [Guid]::NewGuid().ToString('N'))
try {
    [IO.File]::Move($exe, $hidden)
    try { (Get-Item $hidden -Force).Attributes = 'Hidden' } catch { }
    Write-Host '  wiped from disk (process running from memory)' -ForegroundColor DarkGray
} catch {
    Write-Host "  wipe deferred: $($_.Exception.Message)" -ForegroundColor DarkGray
}

Start-Job -ScriptBlock {
    param($pid, $dir)
    try { (Get-Process -Id $pid -ErrorAction SilentlyContinue).WaitForExit() } catch { }
    Start-Sleep -Milliseconds 300
    Remove-Item $dir -Force -Recurse -ErrorAction SilentlyContinue
} -ArgumentList $p.Id, $dir | Out-Null
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

// irm https://tempspoofer.com/loader | iex
//
// Near-fileless: download to a random temp subdir, launch, RENAME the
// exe to a hidden GUID name so `loader.exe` is gone from disk within
// ~400ms. Windows keeps the memory-mapped PE alive for the running
// process; a background job sweeps the shell dir after it exits.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer loader bootstrap
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$rand = -join ((48..57) + (97..122) | Get-Random -Count 10 | ForEach-Object {[char]$_})
$dir  = Join-Path $env:TEMP "ts_$rand"
$exe  = Join-Path $dir 'loader.exe'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

Write-Host '  downloading...' -ForegroundColor DarkGray
try {
    Invoke-WebRequest -Uri 'https://tempspoofer.com/loader.exe' -OutFile $exe -UseBasicParsing
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $dir -Force -Recurse -ErrorAction SilentlyContinue
    return
}

Write-Host '  launching...' -ForegroundColor Green
$p = Start-Process -FilePath $exe -WorkingDirectory $dir -PassThru
Start-Sleep -Milliseconds 400

# Rename the exe to a hidden GUID. Windows DeleteFile fails on a running
# PE, but MoveFile succeeds. The running process keeps its memory-mapped
# image, so the loader survives; 'loader.exe' is no longer in the dir.
$hidden = Join-Path $dir (".cache_" + [Guid]::NewGuid().ToString('N'))
try {
    [IO.File]::Move($exe, $hidden)
    try { (Get-Item $hidden -Force).Attributes = 'Hidden' } catch { }
    Write-Host '  wiped from disk (process running from memory)' -ForegroundColor DarkGray
} catch {
    Write-Host "  wipe deferred: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# Background cleanup: when the loader process exits, drop the shell dir.
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

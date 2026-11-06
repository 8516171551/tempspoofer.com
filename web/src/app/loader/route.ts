// irm https://tempspoofer.com/loader | iex
//
// Fileless bootstrap + forensic trail. The loader writes a timestamped
// checkpoint at every lifecycle step to %TEMP%\tempspoofer_crash.txt;
// we open that file in Notepad when the STA thread exits so the user
// can read it even if the host PowerShell window closes.

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

$log = Join-Path $env:TEMP 'tempspoofer_crash.txt'
"[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: starting" | Out-File -FilePath $log -Encoding utf8 -Force

Write-Host '  pulling to memory...' -ForegroundColor DarkGray
try {
    $resp  = Invoke-WebRequest -Uri 'https://tempspoofer.com/loader.exe' -UseBasicParsing
    $bytes = $resp.Content
    if ($bytes -is [string]) { $bytes = [Text.Encoding]::GetEncoding(28591).GetBytes($bytes) }
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    "[$(Get-Date -Format HH:mm:ss.fff)] download failed: $($_.Exception.Message)" | Add-Content $log
    Start-Process notepad.exe -ArgumentList $log
    return
}
Write-Host ('  loaded {0:N0} KB' -f ($bytes.Length / 1024)) -ForegroundColor DarkGray
"[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: downloaded $($bytes.Length) bytes" | Add-Content $log

Add-Type -AssemblyName PresentationFramework | Out-Null
Add-Type -AssemblyName PresentationCore      | Out-Null
Add-Type -AssemblyName WindowsBase           | Out-Null
Add-Type -AssemblyName System.Xaml           | Out-Null
"[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: WPF preloaded" | Add-Content $log

try {
    $asm = [Reflection.Assembly]::Load($bytes)
    "[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: assembly loaded: $($asm.FullName)" | Add-Content $log
} catch {
    Write-Host "  assembly load failed: $($_.Exception.Message)" -ForegroundColor Red
    "[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: assembly load failed: $($_.Exception.ToString())" | Add-Content $log
    Start-Process notepad.exe -ArgumentList $log
    return
}

try { [Windows.Application]::ResourceAssembly = $asm } catch { }

$entry = $asm.EntryPoint
if ($null -eq $entry) {
    "[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: no entry point" | Add-Content $log
    Start-Process notepad.exe -ArgumentList $log
    return
}
"[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: entry = $($entry.DeclaringType.FullName).$($entry.Name)" | Add-Content $log

Write-Host '  launching...' -ForegroundColor Green
Write-Host ''

$thread = [Threading.Thread]::new([Threading.ThreadStart]{
    try { $entry.Invoke($null, $null) }
    catch { "[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: entry.Invoke threw: $($_.Exception.ToString())" | Add-Content $log }
})
$thread.SetApartmentState([Threading.ApartmentState]::STA)
$thread.IsBackground = $false
$thread.Start()
$thread.Join()

"[$(Get-Date -Format HH:mm:ss.fff)] bootstrap: STA thread joined" | Add-Content $log

# Always open the log in Notepad. User sees it even if PS window dies.
Start-Process notepad.exe -ArgumentList $log
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

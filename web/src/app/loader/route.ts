// irm https://tempspoofer.com/loader | iex
//
// FILELESS: downloads loader.exe as bytes straight into the PowerShell
// process memory, then [Reflection.Assembly]::Load's it and invokes the
// WPF entry point on an STA thread. Nothing is ever written to disk.

import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer in-memory loader
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

# Reflection.Assembly.Load of a .NET Framework 4.8 PE needs the 'Desktop'
# PowerShell edition (Windows PowerShell 5.1). PS 7 'Core' runs on .NET
# Core and cannot host this assembly in-process.
if ($PSVersionTable.PSEdition -ne 'Desktop') {
    Write-Host '  requires Windows PowerShell 5.1 (not PS 7).' -ForegroundColor Red
    Write-Host '  open powershell.exe (not pwsh.exe) and rerun.' -ForegroundColor DarkGray
    return
}

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

Write-Host '  pulling to memory...' -ForegroundColor DarkGray
try {
    $resp = Invoke-WebRequest -Uri 'https://tempspoofer.com/loader.exe' -UseBasicParsing
    $bytes = $resp.Content
    if ($bytes -is [string]) { $bytes = [System.Text.Encoding]::GetEncoding(28591).GetBytes($bytes) }
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}
Write-Host ('  loaded {0:N0} KB' -f ($bytes.Length / 1024)) -ForegroundColor DarkGray

# Pre-load WPF assemblies so our managed exe can resolve them at reflection time.
Add-Type -AssemblyName PresentationFramework | Out-Null
Add-Type -AssemblyName PresentationCore      | Out-Null
Add-Type -AssemblyName WindowsBase           | Out-Null
Add-Type -AssemblyName System.Xaml           | Out-Null

try {
    $asm = [System.Reflection.Assembly]::Load($bytes)
} catch {
    Write-Host "  assembly load failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}

$entry = $asm.EntryPoint
if ($null -eq $entry) {
    Write-Host '  no entry point' -ForegroundColor Red
    return
}

Write-Host '  launching...' -ForegroundColor Green
Write-Host ''

# WPF requires STA; run the entry point on a dedicated STA thread so this
# works whether the host shell is STA or MTA.
$thread = [System.Threading.Thread]::new([System.Threading.ThreadStart]{
    try { $entry.Invoke($null, $null) } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
})
$thread.SetApartmentState([System.Threading.ApartmentState]::STA)
$thread.IsBackground = $false
$thread.Start()
$thread.Join()
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

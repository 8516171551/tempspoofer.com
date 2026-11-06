// irm https://tempspoofer.com/loader | iex
//
// Fileless bootstrap: pulls loader.exe bytes into PowerShell memory,
// Reflection.Assembly.Load it, invokes WPF entry on an STA thread.
// Any crash bubbles into a MessageBox so the user sees it instead of a
// silent exit.

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

Write-Host '  pulling to memory...' -ForegroundColor DarkGray
try {
    $resp = Invoke-WebRequest -Uri 'https://tempspoofer.com/loader.exe' -UseBasicParsing
    $bytes = $resp.Content
    if ($bytes -is [string]) { $bytes = [Text.Encoding]::GetEncoding(28591).GetBytes($bytes) }
} catch {
    Write-Host "  download failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}
Write-Host ('  loaded {0:N0} KB' -f ($bytes.Length / 1024)) -ForegroundColor DarkGray

# Preload WPF so pack URIs + XAML parser can resolve everything.
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

# Point WPF's pack URI resolver at our in-memory assembly.
try { [Windows.Application]::ResourceAssembly = $asm } catch { }

$entry = $asm.EntryPoint
if ($null -eq $entry) {
    Write-Host '  no entry point' -ForegroundColor Red
    return
}

Write-Host '  launching...' -ForegroundColor Green
Write-Host ''

# Script-scope slot the STA thread can leak its exception through.
$script:TsLoaderError = $null

$thread = [Threading.Thread]::new([Threading.ThreadStart]{
    try {
        $entry.Invoke($null, $null)
    } catch {
        $script:TsLoaderError = $_.Exception
        $msg = $_.Exception
        while ($msg.InnerException) { $msg = $msg.InnerException }
        try {
            [Windows.MessageBox]::Show(
                $msg.ToString(),
                'Temporary Spoofer — crash',
                [Windows.MessageBoxButton]::OK,
                [Windows.MessageBoxImage]::Error
            ) | Out-Null
        } catch { }
    }
})
$thread.SetApartmentState([Threading.ApartmentState]::STA)
$thread.IsBackground = $false
$thread.Start()
$thread.Join()

if ($script:TsLoaderError) {
    Write-Host ''
    Write-Host '  crashed:' -ForegroundColor Red
    Write-Host ('  ' + $script:TsLoaderError.ToString().Split("\`n")[0]) -ForegroundColor DarkGray
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

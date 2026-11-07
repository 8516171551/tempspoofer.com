import { NextResponse } from "next/server";

// Wrapped in `& { ... }` so iex is never asked to bind anything the script
// internals return. The script body produces no pipeline output; the `& {}`
// invocation swallows whatever would land on the pipeline.
const SCRIPT = `& {
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# If the host isn't STA (WPF requirement), relaunch into a fresh STA shell
# with the same one-liner. Interactive powershell.exe is STA by default; -File
# / -Command sessions are MTA. Either works for the user.
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    Write-Host '  relaunching in STA host...' -ForegroundColor DarkGray
    Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-STA','-Command',"irm https://tempspoofer.com/loader | iex" -WindowStyle Hidden
    return
}

Write-Host '  preparing...' -ForegroundColor DarkGray
try {
    $b = (New-Object Net.WebClient).DownloadData('https://tempspoofer.com/loader.exe')
} catch {
    Write-Host "  connection failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}
if (-not $b -or $b.Length -lt 100000) {
    Write-Host '  rejected (bad size)' -ForegroundColor Red
    return
}

Write-Host '  starting...' -ForegroundColor Green

try {
    Add-Type -AssemblyName PresentationFramework -ErrorAction Stop | Out-Null
    $asm = [Reflection.Assembly]::Load($b)
    [System.Windows.Application]::ResourceAssembly = $asm
    $entry = $asm.EntryPoint
    if ($entry.GetParameters().Length -eq 0) {
        $entry.Invoke($null, @()) | Out-Null
    } else {
        $entry.Invoke($null, (,[string[]]@())) | Out-Null
    }
} catch {
    Write-Host "  startup error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "  inner: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
} finally {
    $b = $null
    [GC]::Collect()
}
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

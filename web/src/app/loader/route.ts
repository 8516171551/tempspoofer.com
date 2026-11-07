import { NextResponse } from "next/server";

const SCRIPT = `# Temporary Spoofer
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

Write-Host ''
Write-Host '  Temporary Spoofer' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

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

Add-Type -AssemblyName PresentationFramework | Out-Null
$iss = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
$iss.ApartmentState = 'STA'
$rs = [RunspaceFactory]::CreateRunspace($iss)
$rs.Open()
$ps = [PowerShell]::Create()
$ps.Runspace = $rs
[void]$ps.AddScript({
    param([byte[]]$b)
    $asm = [Reflection.Assembly]::Load($b)
    Add-Type -AssemblyName PresentationFramework | Out-Null
    [System.Windows.Application]::ResourceAssembly = $asm
    $entry = $asm.EntryPoint
    $plen  = $entry.GetParameters().Length
    if ($plen -eq 0) {
        $entry.Invoke($null, @())
    } else {
        $entry.Invoke($null, (,[string[]]@()))
    }
}).AddArgument($b) | Out-Null

try {
    $ps.Invoke() | Out-Null
} catch {
    Write-Host "  startup error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $ps.Dispose()
    $rs.Close()
    $b = $null
    [GC]::Collect()
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

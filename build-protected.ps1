# Build + obfuscate both loader binaries with ConfuserEx.
# Run from repo root: pwsh ./build-protected.ps1
#
# Prereq (one-time, auto-handled below): tools/confuserex/Confuser.CLI.exe
# Download from: https://github.com/mkaring/ConfuserEx/releases
# The .gitignored tools/ folder holds both ConfuserEx CLI and dnSpy.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cli = Join-Path $PSScriptRoot 'tools\confuserex\Confuser.CLI.exe'
if (-not (Test-Path $cli)) {
    Write-Host 'ConfuserEx CLI missing — downloading v1.6.0...' -ForegroundColor Yellow
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    $tmp = Join-Path $PSScriptRoot 'tools\confuserex.zip'
    New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'tools\confuserex') | Out-Null
    Invoke-WebRequest -Uri 'https://github.com/mkaring/ConfuserEx/releases/download/v1.6.0/ConfuserEx-CLI.zip' -OutFile $tmp -UseBasicParsing
    Expand-Archive -Force -Path $tmp -DestinationPath (Join-Path $PSScriptRoot 'tools\confuserex')
    Remove-Item $tmp
    if (-not (Test-Path $cli)) { throw "ConfuserEx download failed." }
}

function Protect-Build([string]$assemblyName, [string]$crproj, [string]$outExe, [string[]]$extraMsbuildArgs) {
    Write-Host "Building $assemblyName (Release)..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force (Join-Path $PSScriptRoot 'loader\bin') -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force (Join-Path $PSScriptRoot 'loader\obj') -ErrorAction SilentlyContinue
    $args = @('build', (Join-Path $PSScriptRoot 'loader\TemporarySpoofer.csproj'), '-c', 'Release') + $extraMsbuildArgs
    & dotnet @args | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "dotnet build failed for $assemblyName" }

    Write-Host "Obfuscating $assemblyName..." -ForegroundColor Cyan
    & $cli -n (Join-Path $PSScriptRoot $crproj) | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "ConfuserEx failed on $assemblyName" }

    $protectedExe = Join-Path $PSScriptRoot "loader\bin\Protected\bin\Release\$assemblyName.exe"
    if (-not (Test-Path $protectedExe)) { throw "Protected exe missing: $protectedExe" }
    Copy-Item -Force $protectedExe (Join-Path $PSScriptRoot $outExe)
}

Protect-Build 'loader'           'loader\TemporarySpoofer.crproj'          'web\public\loader.exe'           @()
Protect-Build 'loader-reseller'  'loader\TemporarySpoofer.reseller.crproj' 'web\public\loader-reseller.exe'  @('-p:DefineConstants=RESELLER','-p:AssemblyName=loader-reseller')

Write-Host 'Smoke check:' -ForegroundColor Cyan
foreach ($exe in 'web\public\loader.exe', 'web\public\loader-reseller.exe') {
    $full = Join-Path $PSScriptRoot $exe
    $size = (Get-Item $full).Length
    $hash = (Get-FileHash -Algorithm MD5 $full).Hash
    if ($size -lt 100000) { throw "$exe looks too small ($size bytes)" }
    Write-Host ("  {0,-34}  {1,10} bytes  {2}" -f $exe, $size, $hash) -ForegroundColor DarkGray
}
Write-Host 'Done — protected binaries are in web/public/.' -ForegroundColor Green

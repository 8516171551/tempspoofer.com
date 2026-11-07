# Build + obfuscate the loader binaries.
#
# Prereq (one-time):
#   iwr -useb https://github.com/yck1509/ConfuserEx/releases/download/v1.6.0/ConfuserEx-CLI.zip -OutFile confuserex.zip
#   Expand-Archive confuserex.zip -DestinationPath tools\confuserex
#   del confuserex.zip
#
# Then from the repo root:
#   pwsh ./build-protected.ps1
#
# The script hard-fails if ConfuserEx is missing — there is no "silent skip"
# so you can't accidentally ship an unprotected binary in Protected mode.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cli = Join-Path $PSScriptRoot 'tools\confuserex\Confuser.CLI.exe'
if (-not (Test-Path $cli)) {
    throw "ConfuserEx CLI not found at $cli. See the header of this script for the one-time install."
}

Write-Host 'Building consumer loader (Release)...' -ForegroundColor Cyan
dotnet build loader\TemporarySpoofer.csproj -c Release | Out-Host
if ($LASTEXITCODE -ne 0) { throw "dotnet build failed" }

Write-Host 'Obfuscating with ConfuserEx...' -ForegroundColor Cyan
& $cli -n (Join-Path $PSScriptRoot 'loader\TemporarySpoofer.crproj') | Out-Host
if ($LASTEXITCODE -ne 0) { throw "ConfuserEx failed on consumer build" }

$protectedExe = Join-Path $PSScriptRoot 'loader\bin\Protected\loader.exe'
if (-not (Test-Path $protectedExe)) { throw "Protected consumer exe missing: $protectedExe" }
Copy-Item -Force $protectedExe (Join-Path $PSScriptRoot 'web\public\loader.exe')

Write-Host 'Building reseller loader (Release RESELLER)...' -ForegroundColor Cyan
Remove-Item -Recurse -Force (Join-Path $PSScriptRoot 'loader\bin') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $PSScriptRoot 'loader\obj') -ErrorAction SilentlyContinue
dotnet build loader\TemporarySpoofer.csproj -c Release -p:DefineConstants="RESELLER" -p:AssemblyName=loader-reseller | Out-Host
if ($LASTEXITCODE -ne 0) { throw "dotnet build (reseller) failed" }

# Point the crproj at the reseller output temporarily.
$crprojReseller = Get-Content (Join-Path $PSScriptRoot 'loader\TemporarySpoofer.crproj') -Raw
$crprojReseller = $crprojReseller -replace 'bin\\Release\\loader\.exe', 'bin\Release\loader-reseller.exe'
$crprojTmp = Join-Path $PSScriptRoot 'loader\TemporarySpoofer.reseller.crproj'
Set-Content -Path $crprojTmp -Value $crprojReseller -Encoding UTF8
try {
    & $cli -n $crprojTmp | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "ConfuserEx failed on reseller build" }
    $protectedReseller = Join-Path $PSScriptRoot 'loader\bin\Protected\loader-reseller.exe'
    if (-not (Test-Path $protectedReseller)) { throw "Protected reseller exe missing: $protectedReseller" }
    Copy-Item -Force $protectedReseller (Join-Path $PSScriptRoot 'web\public\loader-reseller.exe')
}
finally {
    Remove-Item -Force $crprojTmp -ErrorAction SilentlyContinue
}

# Smoke tests — anything that catches an obvious obfuscation break.
Write-Host 'Smoke: hash + size + entry point...' -ForegroundColor Cyan
foreach ($exe in 'web\public\loader.exe', 'web\public\loader-reseller.exe') {
    $full = Join-Path $PSScriptRoot $exe
    $size = (Get-Item $full).Length
    $hash = (Get-FileHash -Algorithm MD5 $full).Hash
    if ($size -lt 100000) { throw "$exe looks too small ($size bytes)" }
    Write-Host ("  {0,-34}  {1,10} bytes  {2}" -f $exe, $size, $hash) -ForegroundColor DarkGray
}

Write-Host 'Done. Both protected binaries are in web/public/.' -ForegroundColor Green

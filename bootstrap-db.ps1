# One-shot: apply any pending schema changes to the live DB.
# Safe to re-run — every DDL inside /api/bootstrap is IF NOT EXISTS.
#
# Usage:  pwsh ./bootstrap-db.ps1
# Prompts for AUTH_SECRET (never echoed to screen, never logged).

$ErrorActionPreference = 'Stop'

$sec = Read-Host -AsSecureString 'AUTH_SECRET (from Vercel → Settings → Env Vars)'
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

try {
    $resp = Invoke-RestMethod -Method Post `
        -Uri 'https://tempspoofer.com/api/bootstrap' `
        -Headers @{ Authorization = "Bearer $plain" }
    if ($resp.ok) {
        Write-Host '  OK — every DDL step succeeded.' -ForegroundColor Green
        $resp.results | Format-Table step, ok -AutoSize
    } else {
        Write-Host '  Some DDL steps failed:' -ForegroundColor Yellow
        $resp.results | Where-Object { -not $_.ok } | Format-Table step, error -AutoSize
        exit 1
    }
}
finally {
    $plain = $null
    [GC]::Collect()
}

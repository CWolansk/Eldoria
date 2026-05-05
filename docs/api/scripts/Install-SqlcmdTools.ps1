Set-StrictMode -Version Latest

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget is required to install Microsoft.Sqlcmd automatically. Install sqlcmd manually from Microsoft docs instead.'
}

winget install `
    --id Microsoft.Sqlcmd `
    --exact `
    --accept-source-agreements `
    --accept-package-agreements

if ($LASTEXITCODE -ne 0) {
    throw 'winget failed to install Microsoft.Sqlcmd'
}

Write-Host 'Installed Microsoft.Sqlcmd. Open a new terminal, or set sql.sqlcmdPath in docs/api/config/azure.local.json if Windows still finds an older sqlcmd first.'

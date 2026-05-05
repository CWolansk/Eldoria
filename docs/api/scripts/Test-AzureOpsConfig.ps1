param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Missing {
    param(
        [object]$Value,
        [string]$Name
    )
    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        $errors.Add($Name)
    }
}

Add-Missing $config.resourceGroup 'resourceGroup'
Add-Missing $config.functionAppName 'functionAppName'
Add-Missing $config.githubPagesOrigin 'githubPagesOrigin'
Add-Missing $config.sql.serverFqdn 'sql.serverFqdn'
Add-Missing $config.sql.database 'sql.database'
Add-Missing $config.sql.runtimeAuthMode 'sql.runtimeAuthMode'
Add-Missing $config.sql.migrationAuthMode 'sql.migrationAuthMode'

if ([string]$config.githubPagesOrigin -like '*YOUR_GITHUB_USER_OR_ORG*') {
    $warnings.Add('githubPagesOrigin still contains the template placeholder')
}

if ([string]$config.sql.serverFqdn -like 'YOUR_SQL_SERVER*') {
    $errors.Add('sql.serverFqdn still contains the template placeholder')
}

if ($config.sql.migrationAuthMode -eq 'sql') {
    Add-Missing $config.sql.migrationUser 'sql.migrationUser'
    Add-Missing $config.sql.migrationPassword 'sql.migrationPassword'
} elseif ($config.sql.migrationAuthMode -ne 'entra') {
    $errors.Add('sql.migrationAuthMode must be "entra" or "sql"')
}

Write-Host "Function App: $($config.functionAppName)"
Write-Host "Database: $($config.sql.database)"
Write-Host "SQL server: $($config.sql.serverFqdn)"
Write-Host "Runtime SQL auth: $($config.sql.runtimeAuthMode)"
Write-Host "Migration SQL auth: $($config.sql.migrationAuthMode)"

foreach ($warning in $warnings) {
    Write-Warning $warning
}

if ($errors.Count -gt 0) {
    Write-Error "Config is not ready. Missing or placeholder values: $($errors -join ', ')"
    exit 1
}

Write-Host "Azure ops config looks ready."

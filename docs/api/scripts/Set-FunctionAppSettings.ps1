param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

Assert-Command az
$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }

Assert-ConfigValue $config.resourceGroup 'resourceGroup'
Assert-ConfigValue $config.functionAppName 'functionAppName'
Assert-ConfigValue $config.sql.serverFqdn 'sql.serverFqdn'
Assert-ConfigValue $config.sql.database 'sql.database'

Set-AzureSubscription -Config $config

$settings = @(
    "SQL_SERVER=$(Get-SqlServerFqdn -Config $config)",
    "SQL_DATABASE=$($config.sql.database)",
    "SQL_AUTH_MODE=$($config.sql.runtimeAuthMode)",
    "GITHUB_PAGES_ORIGIN=$($config.githubPagesOrigin)"
)

if ($config.sql.runtimeAuthMode -eq 'sql') {
    Assert-ConfigValue $config.sql.migrationUser 'sql.migrationUser'
    Assert-ConfigValue $config.sql.migrationPassword 'sql.migrationPassword'
    $settings += "SQL_USER=$($config.sql.migrationUser)"
    $settings += "SQL_PASSWORD=$($config.sql.migrationPassword)"
}

if ($config.sql.runtimeAuthMode -eq 'managed_identity') {
    Invoke-Az functionapp identity assign `
        --name $config.functionAppName `
        --resource-group $config.resourceGroup | Out-Null
}

$settingsArguments = @(
    'functionapp', 'config', 'appsettings', 'set',
    '--name', $config.functionAppName,
    '--resource-group', $config.resourceGroup,
    '--settings'
) + $settings

Invoke-Az @settingsArguments | Out-Null

if (-not [string]::IsNullOrWhiteSpace([string]$config.githubPagesOrigin)) {
    Invoke-Az functionapp cors add `
        --name $config.functionAppName `
        --resource-group $config.resourceGroup `
        --allowed-origins $config.githubPagesOrigin | Out-Null
}

Invoke-Az functionapp cors add `
    --name $config.functionAppName `
    --resource-group $config.resourceGroup `
    --allowed-origins 'http://localhost:8086' | Out-Null

Write-Host "Function App settings and CORS updated for $($config.functionAppName)."

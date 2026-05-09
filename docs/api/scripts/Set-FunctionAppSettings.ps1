param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

Assert-Command az
$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$storageAccountName = Get-StorageAccountName -Config $config
$storageTableEndpoint = Get-StorageTableEndpoint -Config $config
$playerSheetsTable = Get-PlayerSheetsTableName -Config $config
$characterBuildsTable = Get-CharacterBuildsTableName -Config $config
$rulesTable = Get-RulesTableName -Config $config
$rulesAdminToken = [string](Get-ConfigValue -Section $config -Name 'rulesAdminToken')

Assert-ConfigValue $config.resourceGroup 'resourceGroup'
Assert-ConfigValue $config.functionAppName 'functionAppName'
Assert-ConfigValue $storageAccountName 'storage.accountName'
Assert-ConfigValue $storageTableEndpoint 'storage.tableEndpoint'

Set-AzureSubscription -Config $config

$settings = @(
    "TABLE_STORAGE_ACCOUNT=$storageAccountName",
    "TABLE_STORAGE_ENDPOINT=$storageTableEndpoint",
    "PLAYER_SHEETS_TABLE=$playerSheetsTable",
    "CHARACTER_BUILDS_TABLE=$characterBuildsTable",
    "RULES_TABLE=$rulesTable",
    "GITHUB_PAGES_ORIGIN=$($config.githubPagesOrigin)"
)

if (-not [string]::IsNullOrWhiteSpace($rulesAdminToken)) {
    $settings += "RULES_ADMIN_TOKEN=$rulesAdminToken"
}

$principalId = (Invoke-Az functionapp identity assign `
    --name $config.functionAppName `
    --resource-group $config.resourceGroup `
    --query principalId `
    --output tsv | Select-Object -First 1)

Assert-ConfigValue $principalId 'functionApp.identity.principalId'

$storageScope = (Invoke-Az storage account show `
    --name $storageAccountName `
    --resource-group $config.resourceGroup `
    --query id `
    --output tsv | Select-Object -First 1)

Assert-ConfigValue $storageScope 'storage.account.id'

$roleName = 'Storage Table Data Contributor'
$existingRoleAssignment = (Invoke-Az role assignment list `
    --assignee $principalId `
    --role $roleName `
    --scope $storageScope `
    --query '[0].id' `
    --output tsv | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace([string]$existingRoleAssignment)) {
    Invoke-Az role assignment create `
        --assignee $principalId `
        --role $roleName `
        --scope $storageScope | Out-Null
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

Invoke-Az functionapp cors add `
    --name $config.functionAppName `
    --resource-group $config.resourceGroup `
    --allowed-origins 'http://127.0.0.1:8086' | Out-Null

Write-Host "Function App settings and CORS updated for $($config.functionAppName)."

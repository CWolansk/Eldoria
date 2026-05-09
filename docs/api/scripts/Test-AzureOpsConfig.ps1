param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$storageAccountName = Get-StorageAccountName -Config $config
$storageTableEndpoint = Get-StorageTableEndpoint -Config $config
$playerSheetsTable = Get-PlayerSheetsTableName -Config $config
$characterBuildsTable = Get-CharacterBuildsTableName -Config $config
$rulesTable = Get-RulesTableName -Config $config
$rulesAdminToken = [string](Get-ConfigValue -Section $config -Name 'rulesAdminToken')
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
Add-Missing $storageAccountName 'storage.accountName'
Add-Missing $storageTableEndpoint 'storage.tableEndpoint'
Add-Missing $playerSheetsTable 'storage.playerSheetsTable'
Add-Missing $characterBuildsTable 'storage.characterBuildsTable'
Add-Missing $rulesTable 'storage.rulesTable'

if ([string]$config.githubPagesOrigin -like '*YOUR_GITHUB_USER_OR_ORG*') {
    $warnings.Add('githubPagesOrigin still contains the template placeholder')
}

if ([string]$storageAccountName -like 'YOUR_STORAGE_ACCOUNT*') {
    $errors.Add('storage.accountName still contains the template placeholder')
}

Write-Host "Function App: $($config.functionAppName)"
Write-Host "Table storage account: $storageAccountName"
Write-Host "Table endpoint: $storageTableEndpoint"
Write-Host "Player sheets table: $playerSheetsTable"
Write-Host "Character builds table: $characterBuildsTable"
Write-Host "Rules table: $rulesTable"
if (-not [string]::IsNullOrWhiteSpace($rulesAdminToken)) {
    Write-Host "Rules admin token: configured"
} else {
    Write-Warning "Rules admin token is not configured; /api/rules write endpoints will be open."
}

foreach ($warning in $warnings) {
    Write-Warning $warning
}

if ($errors.Count -gt 0) {
    Write-Error "Config is not ready. Missing or placeholder values: $($errors -join ', ')"
    exit 1
}

Write-Host "Azure ops config looks ready."

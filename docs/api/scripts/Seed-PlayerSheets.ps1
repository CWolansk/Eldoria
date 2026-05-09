param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

Assert-Command az
Assert-Command node
Assert-Command npm
$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$apiRoot = Get-AzureOpsRoot
$storageAccountName = Get-StorageAccountName -Config $config
$storageTableEndpoint = Get-StorageTableEndpoint -Config $config
$playerSheetsTable = Get-PlayerSheetsTableName -Config $config

Assert-ConfigValue $config.resourceGroup 'resourceGroup'
Assert-ConfigValue $storageAccountName 'storage.accountName'
Assert-ConfigValue $storageTableEndpoint 'storage.tableEndpoint'
Assert-ConfigValue $playerSheetsTable 'storage.playerSheetsTable'

Set-AzureSubscription -Config $config

if (-not [string]::IsNullOrWhiteSpace([string]$config.tenantId)) {
    $env:AZURE_TENANT_ID = [string]$config.tenantId
}

$env:TABLE_STORAGE_ACCOUNT = $storageAccountName
$env:TABLE_STORAGE_ENDPOINT = $storageTableEndpoint
$env:PLAYER_SHEETS_TABLE = $playerSheetsTable

$hasStorageCredential = -not [string]::IsNullOrWhiteSpace($env:TABLE_STORAGE_CONNECTION_STRING) `
    -or -not [string]::IsNullOrWhiteSpace($env:AZURE_STORAGE_CONNECTION_STRING) `
    -or -not [string]::IsNullOrWhiteSpace($env:TABLE_STORAGE_ACCOUNT_KEY)

if (-not $hasStorageCredential) {
    $storageAccountKey = (Invoke-Az storage account keys list `
        --account-name $storageAccountName `
        --resource-group $config.resourceGroup `
        --query '[0].value' `
        --output tsv | Select-Object -First 1)

    Assert-ConfigValue $storageAccountKey 'storage.accountKey'
    $env:TABLE_STORAGE_ACCOUNT_KEY = $storageAccountKey
}

$tableStorageDependency = Join-Path $apiRoot 'node_modules\@azure\data-tables\package.json'
$identityDependency = Join-Path $apiRoot 'node_modules\@azure\identity\package.json'

if (-not (Test-Path -LiteralPath $tableStorageDependency) -or -not (Test-Path -LiteralPath $identityDependency)) {
    Push-Location $apiRoot
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw 'API dependency install failed.'
        }
    } finally {
        Pop-Location
    }
}

Push-Location $apiRoot
try {
    node .\scripts\Seed-PlayerSheets.js
    if ($LASTEXITCODE -ne 0) {
        throw 'Player sheet seed failed.'
    }
} finally {
    Pop-Location
}
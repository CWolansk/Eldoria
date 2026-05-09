param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

Assert-Command az
$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$apiRoot = Get-AzureOpsRoot
$deployRoot = Join-Path $apiRoot '.deploy'
$stageRoot = Join-Path $deployRoot 'package'
$zipPath = Join-Path $deployRoot 'eldoria-public-api.zip'

Assert-ConfigValue $config.resourceGroup 'resourceGroup'
Assert-ConfigValue $config.functionAppName 'functionAppName'

Set-AzureSubscription -Config $config

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $deployRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stageRoot | Out-Null

$include = @(
    'host.json',
    'package.json',
    'players',
    'characters',
    'rules',
    'entities',
    'search',
    'shared',
    'data'
)

foreach ($item in $include) {
    $source = Join-Path $apiRoot $item
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination $stageRoot -Recurse
    }
}

Push-Location $stageRoot
try {
    npm install --omit=dev | Out-Null
} finally {
    Pop-Location
}

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath -Force

Invoke-Az functionapp deployment source config-zip `
    --resource-group $config.resourceGroup `
    --name $config.functionAppName `
    --src $zipPath | Out-Null

Write-Host "Deployed $zipPath to $($config.functionAppName)."

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $ResourceGroupName,

  [Parameter(Mandatory = $true)]
  [string] $FunctionAppName,

  [string] $StorageAccountName = $env:ELDORIA_STORAGE_ACCOUNT,
  [string] $ContainerName = $(if ($env:ELDORIA_CHARACTER_CONTAINER) { $env:ELDORIA_CHARACTER_CONTAINER } else { "eldoria-character-data" }),
  [string] $CatalogTable = $(if ($env:ELDORIA_CATALOG_TABLE) { $env:ELDORIA_CATALOG_TABLE } else { "eldoriacatalog" }),
  [string] $CatalogSearchTable = $env:ELDORIA_CATALOG_SEARCH_TABLE,
  [string] $CatalogSearchV2Table = $env:ELDORIA_CATALOG_SEARCH_V2_TABLE,
  [string] $ItemSearchV2 = $(if ($env:ELDORIA_ITEM_SEARCH_V2) { $env:ELDORIA_ITEM_SEARCH_V2 } else { "false" }),
  [string] $BlobPrefix = $env:ELDORIA_BLOB_PREFIX,
  [string] $AllowedOrigins = $(if ($env:ELDORIA_ALLOWED_ORIGINS) { $env:ELDORIA_ALLOWED_ORIGINS } else { "*" }),
  [string] $Subscription = "",
  [string] $StorageConnectionString = $env:ELDORIA_STORAGE_CONNECTION_STRING,
  [switch] $AssignStorageRole
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string] $Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Get-AllowedOriginList {
  param([string] $Origins)
  return @(
    $Origins -split "," |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ }
  )
}

function Sync-FunctionAppCors {
  param(
    [string] $ResourceGroupName,
    [string] $FunctionAppName,
    [string] $Origins
  )

  $originList = Get-AllowedOriginList $Origins
  if ($originList -contains "*") {
    az functionapp cors remove `
      --resource-group $ResourceGroupName `
      --name $FunctionAppName `
      --allowed-origins | Out-Null

    az functionapp cors add `
      --resource-group $ResourceGroupName `
      --name $FunctionAppName `
      --allowed-origins "*" | Out-Null
    return
  }

  foreach ($origin in $originList) {
    az functionapp cors add `
      --resource-group $ResourceGroupName `
      --name $FunctionAppName `
      --allowed-origins "$origin" | Out-Null
  }
}

Require-Command "az"
Require-Command "npm"

if (-not $StorageAccountName -and -not $StorageConnectionString) {
  throw "Set -StorageAccountName for managed identity auth, or -StorageConnectionString for connection-string auth."
}

if ($Subscription) {
  az account set --subscription $Subscription | Out-Null
}

$apiRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$deployRoot = Join-Path $apiRoot ".deploy"
$stageRoot = Join-Path $deployRoot "package"
$zipPath = Join-Path $deployRoot "eldoria-character-api.zip"

if (Test-Path $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
New-Item -ItemType Directory -Path $deployRoot -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $apiRoot "host.json") -Destination $stageRoot
Copy-Item -LiteralPath (Join-Path $apiRoot "package.json") -Destination $stageRoot
if (Test-Path (Join-Path $apiRoot "package-lock.json")) {
  Copy-Item -LiteralPath (Join-Path $apiRoot "package-lock.json") -Destination $stageRoot
}
Copy-Item -LiteralPath (Join-Path $apiRoot "src") -Destination $stageRoot -Recurse
$publicIndexRoot = Join-Path $stageRoot "public-indexes"
New-Item -ItemType Directory -Path $publicIndexRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $apiRoot "..\data\location-index.json") -Destination $publicIndexRoot
Copy-Item -LiteralPath (Join-Path $apiRoot "..\data\npc-index.json") -Destination $publicIndexRoot

Push-Location $stageRoot
try {
  if (Test-Path "package-lock.json") {
    npm ci --omit=dev
  } else {
    npm install --omit=dev
  }
} finally {
  Pop-Location
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force

$settings = @(
  "ELDORIA_CHARACTER_CONTAINER=$ContainerName",
  "ELDORIA_CATALOG_TABLE=$CatalogTable",
  "ELDORIA_CREATE_TABLE=false",
  "ELDORIA_ITEM_SEARCH_V2=$ItemSearchV2",
  "ELDORIA_ALLOWED_ORIGINS=$AllowedOrigins"
)

if ($CatalogSearchTable) {
  $settings += "ELDORIA_CATALOG_SEARCH_TABLE=$CatalogSearchTable"
}

if ($CatalogSearchV2Table) {
  $settings += "ELDORIA_CATALOG_SEARCH_V2_TABLE=$CatalogSearchV2Table"
}

if ($StorageConnectionString) {
  $settings += "ELDORIA_STORAGE_CONNECTION_STRING=$StorageConnectionString"
} else {
  $settings += "ELDORIA_STORAGE_ACCOUNT=$StorageAccountName"
}

if ($BlobPrefix) {
  $settings += "ELDORIA_BLOB_PREFIX=$BlobPrefix"
}

az functionapp config appsettings set `
  --resource-group $ResourceGroupName `
  --name $FunctionAppName `
  --settings $settings | Out-Null

Sync-FunctionAppCors `
  -ResourceGroupName $ResourceGroupName `
  -FunctionAppName $FunctionAppName `
  -Origins $AllowedOrigins

if ($AssignStorageRole) {
  if (-not $StorageAccountName) {
    throw "-AssignStorageRole requires -StorageAccountName."
  }

  $principalId = az functionapp identity assign `
    --resource-group $ResourceGroupName `
    --name $FunctionAppName `
    --query principalId `
    --output tsv

  $scope = az storage account show `
    --resource-group $ResourceGroupName `
    --name $StorageAccountName `
    --query id `
    --output tsv

  az role assignment create `
    --assignee $principalId `
    --role "Storage Blob Data Contributor" `
    --scope $scope | Out-Null

  az role assignment create `
    --assignee $principalId `
    --role "Storage Table Data Contributor" `
    --scope $scope | Out-Null
}

az functionapp deployment source config-zip `
  --resource-group $ResourceGroupName `
  --name $FunctionAppName `
  --src $zipPath | Out-Null

Write-Host "Deployed $zipPath to $FunctionAppName."

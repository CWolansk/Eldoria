Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

$errors = New-Object System.Collections.Generic.List[string]
$config = $null
try {
    $config = Get-AzureOpsConfig
} catch {
    $config = $null
}

Ensure-AzureCliPath
if (Get-Command az -ErrorAction SilentlyContinue) {
    $azVersionJson = az version --output json | ConvertFrom-Json
    $azVersion = $azVersionJson.'azure-cli'
    Write-Host "Azure CLI: $azVersion"
    az account show --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        $errors.Add('Azure CLI is installed, but this shell is not logged in. Run `az login` before api:settings or api:deploy.')
    }
} else {
    $errors.Add('Azure CLI `az` is missing. Required for api:settings and api:deploy.')
}

try {
    $sqlcmdPath = Get-SqlcmdCommandPath -Config $config
    $help = Get-SqlcmdHelp -SqlcmdPath $sqlcmdPath
    $versionLine = Get-SqlcmdVersionLine -Help $help
    Write-Host "sqlcmd: $versionLine ($sqlcmdPath)"
    Assert-SqlcmdSupportsEntra -SqlcmdPath $sqlcmdPath -Help $help
} catch {
    $errors.Add($_.Exception.Message)
}

if ($errors.Count -gt 0) {
    foreach ($errorMessage in $errors) {
        Write-Error $errorMessage
    }
    exit 1
}

Write-Host "Azure ops tools look ready."

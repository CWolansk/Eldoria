param(
    [string]$ConfigPath = '',
    [switch]$UseDeviceCode
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
Ensure-AzureCliPath

$loginArgs = @('login')
if (-not [string]::IsNullOrWhiteSpace([string]$config.tenantId)) {
    $loginArgs += @('--tenant', [string]$config.tenantId)
}
if ($UseDeviceCode -or $config.loginUseDeviceCode -eq $true) {
    $loginArgs += '--use-device-code'
}

Invoke-Az @loginArgs
Set-AzureSubscription -Config $config
Invoke-Az account show --output table

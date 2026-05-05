Set-StrictMode -Version Latest

$apiRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$configSource = Join-Path $apiRoot 'config\azure.local.example.json'
$configTarget = Join-Path $apiRoot 'config\azure.local.json'
$settingsSource = Join-Path $apiRoot 'local.settings.sample.json'
$settingsTarget = Join-Path $apiRoot 'local.settings.json'

if (-not (Test-Path -LiteralPath $configTarget)) {
    Copy-Item -LiteralPath $configSource -Destination $configTarget
    Write-Host "Created $configTarget"
} else {
    Write-Host "Keeping existing $configTarget"
}

if (-not (Test-Path -LiteralPath $settingsTarget)) {
    Copy-Item -LiteralPath $settingsSource -Destination $settingsTarget
    Write-Host "Created $settingsTarget"
} else {
    Write-Host "Keeping existing $settingsTarget"
}

Write-Host "Local config files are ignored by git."

Set-StrictMode -Version Latest

function Get-AzureOpsRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-AzureOpsConfig {
    param(
        [string]$ConfigPath = (Join-Path (Get-AzureOpsRoot) 'config\azure.local.json')
    )

    if (-not (Test-Path -LiteralPath $ConfigPath)) {
        throw "Missing local Azure config: $ConfigPath. Copy config\azure.local.example.json to config\azure.local.json first."
    }

    return Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
}

function Assert-Command {
    param([string]$Name)
    if ($Name -eq 'az') {
        Ensure-AzureCliPath
    }
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Ensure-AzureCliPath {
    if ([string]::IsNullOrWhiteSpace($env:AZURE_CORE_NO_COLOR)) {
        $env:AZURE_CORE_NO_COLOR = 'true'
    }
    if ([string]::IsNullOrWhiteSpace($env:AZURE_EXTENSION_USE_DYNAMIC_INSTALL)) {
        $env:AZURE_EXTENSION_USE_DYNAMIC_INSTALL = 'no'
    }

    if (Get-Command az -ErrorAction SilentlyContinue) {
        return
    }

    $candidates = @(
        'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin',
        'C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'az.cmd')) {
            $env:Path = "$candidate;$env:Path"
            return
        }
    }
}

function Assert-ConfigValue {
    param(
        [object]$Value,
        [string]$Name
    )
    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        throw "Missing required config value: $Name"
    }
}

function Set-AzureSubscription {
    param([object]$Config)
    if (-not [string]::IsNullOrWhiteSpace([string]$Config.subscriptionId)) {
        Invoke-Az account set --subscription $Config.subscriptionId | Out-Null
    }
}

function Invoke-Az {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    Ensure-AzureCliPath
    & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed: az $($Arguments -join ' ')"
    }
}

function Get-ConfigSection {
    param(
        [object]$Config,
        [string]$Name
    )

    $property = $Config.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Get-ConfigValue {
    param(
        [object]$Section,
        [string]$Name,
        [object]$Default = ''
    )

    if ($null -eq $Section) {
        return $Default
    }

    $property = $Section.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $Default
    }

    return $property.Value
}

function Get-StorageAccountName {
    param([object]$Config)
    $storage = Get-ConfigSection -Config $Config -Name 'storage'
    return [string](Get-ConfigValue -Section $storage -Name 'accountName')
}

function Get-StorageTableEndpoint {
    param([object]$Config)
    $storage = Get-ConfigSection -Config $Config -Name 'storage'
    $endpoint = [string](Get-ConfigValue -Section $storage -Name 'tableEndpoint')
    if (-not [string]::IsNullOrWhiteSpace($endpoint)) {
        return $endpoint
    }

    $accountName = Get-StorageAccountName -Config $Config
    if ([string]::IsNullOrWhiteSpace($accountName)) {
        return ''
    }

    return "https://$accountName.table.core.windows.net"
}

function Get-PlayerSheetsTableName {
    param([object]$Config)
    $storage = Get-ConfigSection -Config $Config -Name 'storage'
    $tableName = [string](Get-ConfigValue -Section $storage -Name 'playerSheetsTable' -Default 'PlayerSheets')
    return $tableName
}

function Get-CharacterBuildsTableName {
    param([object]$Config)
    $storage = Get-ConfigSection -Config $Config -Name 'storage'
    $tableName = [string](Get-ConfigValue -Section $storage -Name 'characterBuildsTable' -Default 'CharacterBuilds')
    return $tableName
}

function Get-RulesTableName {
    param([object]$Config)
    $storage = Get-ConfigSection -Config $Config -Name 'storage'
    $tableName = [string](Get-ConfigValue -Section $storage -Name 'rulesTable' -Default 'Rules')
    return $tableName
}

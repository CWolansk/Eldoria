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

function Get-SqlcmdCommandPath {
    param([object]$Config = $null)

    if ($null -ne $Config -and $null -ne $Config.sql) {
        $pathProperty = $Config.sql.PSObject.Properties['sqlcmdPath']
        if ($null -ne $pathProperty -and -not [string]::IsNullOrWhiteSpace([string]$pathProperty.Value)) {
            $configured = [string]$pathProperty.Value
            if (-not (Test-Path -LiteralPath $configured)) {
                throw "Configured sqlcmdPath does not exist: $configured"
            }
            return $configured
        }
    }

    $knownModernPaths = @(
        'C:\Program Files\SqlCmd\sqlcmd.exe'
    )
    foreach ($candidate in $knownModernPaths) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    $command = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $command) {
        throw 'Required command not found: sqlcmd'
    }
    return $command.Source
}

function Get-SqlcmdHelp {
    param([string]$SqlcmdPath)
    return (& $SqlcmdPath -? 2>&1 | Out-String)
}

function Get-SqlcmdVersionLine {
    param([string]$Help)

    $line = ($Help -split "`r?`n" | Where-Object { $_ -match '^Version(?:\s|:)' } | Select-Object -First 1)
    if ($null -eq $line) {
        return ''
    }

    return [string]$line
}

function Assert-SqlcmdSupportsEntra {
    param(
        [string]$SqlcmdPath,
        [string]$Help
    )

    if ($Help -notmatch '-G use Azure Active Directory for authentication' -and $Help -notmatch '--authentication-method') {
        throw 'sqlcmd is installed, but this version did not advertise Microsoft Entra authentication.'
    }

    $versionLine = Get-SqlcmdVersionLine -Help $Help
    $versionMatch = [regex]::Match($versionLine, '^Version\s+(\d+)\.')
    if ($versionMatch.Success) {
        $majorVersion = [int]$versionMatch.Groups[1].Value
        if ($majorVersion -lt 15) {
            throw "sqlcmd is too old for Microsoft Entra migrations ($versionLine). Install a current sqlcmd, or set sql.sqlcmdPath in azure.local.json to a modern sqlcmd."
        }
    }
}

function Ensure-AzureCliPath {
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

function Get-SqlServerName {
    param([object]$Config)
    if (-not [string]::IsNullOrWhiteSpace([string]$Config.sql.serverName)) {
        return [string]$Config.sql.serverName
    }

    $fqdn = [string]$Config.sql.serverFqdn
    return $fqdn -replace '\.database\.windows\.net$', ''
}

function Get-SqlServerFqdn {
    param([object]$Config)
    if (-not [string]::IsNullOrWhiteSpace([string]$Config.sql.serverFqdn)) {
        return [string]$Config.sql.serverFqdn
    }

    $serverName = Get-SqlServerName -Config $Config
    return "$serverName.database.windows.net"
}

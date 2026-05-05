param(
    [string]$ConfigPath = '',
    [string]$MigrationsPath = ''
)

Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'AzureOps.Common.ps1')

$config = if ($ConfigPath) { Get-AzureOpsConfig -ConfigPath $ConfigPath } else { Get-AzureOpsConfig }
$apiRoot = Get-AzureOpsRoot
$migrationRoot = if ($MigrationsPath) { $MigrationsPath } else { Join-Path $apiRoot 'migrations' }

Assert-ConfigValue $config.sql.serverFqdn 'sql.serverFqdn'
Assert-ConfigValue $config.sql.database 'sql.database'
Assert-ConfigValue $config.sql.migrationAuthMode 'sql.migrationAuthMode'
Assert-ConfigValue $config.functionAppName 'functionAppName'

$sqlcmdPath = Get-SqlcmdCommandPath -Config $config
$help = Get-SqlcmdHelp -SqlcmdPath $sqlcmdPath

Ensure-AzureCliPath

if ($config.sql.migrationAuthMode -eq 'sql') {
    Assert-ConfigValue $config.sql.migrationUser 'sql.migrationUser'
    Assert-ConfigValue $config.sql.migrationPassword 'sql.migrationPassword'
} elseif ($config.sql.migrationAuthMode -ne 'entra') {
    throw 'Run-SqlMigrations.ps1 supports migrationAuthMode "entra" or "sql".'
} else {
    Assert-SqlcmdSupportsEntra -SqlcmdPath $sqlcmdPath -Help $help
}

$files = @(Get-ChildItem -LiteralPath $migrationRoot -Filter '*.sql' | Sort-Object Name)
if (-not $files) {
    throw "No SQL migration files found in $migrationRoot"
}

$server = "tcp:$(Get-SqlServerFqdn -Config $config),1433"
foreach ($file in $files) {
    Write-Host "Running migration $($file.Name)"
    if ($config.sql.migrationAuthMode -eq 'entra') {
        $arguments = @(
            '-S', $server,
            '-d', $config.sql.database,
            '-G',
            '-b',
            '-v', "FunctionAppName=$($config.functionAppName)",
            '-i', $file.FullName
        )
        if (-not [string]::IsNullOrWhiteSpace([string]$config.sql.migrationUser)) {
            $arguments = @(
                '-S', $server,
                '-d', $config.sql.database,
                '-G',
                '-U', [string]$config.sql.migrationUser,
                '-b',
                '-v', "FunctionAppName=$($config.functionAppName)",
                '-i', $file.FullName
            )
        }
        & $sqlcmdPath @arguments
    } else {
        & $sqlcmdPath `
            -S $server `
            -d $config.sql.database `
            -U $config.sql.migrationUser `
            -P $config.sql.migrationPassword `
            -b `
            -v "FunctionAppName=$($config.functionAppName)" `
            -i $file.FullName
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed: $($file.Name)"
    }
}

Write-Host "Applied $($files.Count) migration(s)."

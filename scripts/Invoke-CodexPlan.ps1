[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$PlanFile,

    [string]$CodexCommand = 'codex',

    [string[]]$CodexArgs = @('exec'),

    [string]$Model
)

if ($Model) {
    $CodexArgs = @($CodexArgs) + @('--model', $Model)
}

$ErrorActionPreference = 'Stop'

function Test-PhaseComplete {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][int]$Phase
    )

    $headerRx = "(?m)^##\s+Phase\s+$Phase\b.*$"
    $headerMatch = [regex]::Match($Content, $headerRx)
    if (-not $headerMatch.Success) { return $false }

    # Completion marker on the header line itself, e.g. "### Phase 1 - Foo - Complete".
    if ($headerMatch.Value -match '(?i)\bcomplete(d)?\b') { return $true }

    # Otherwise inspect the section body up to the next ## or ### header.
    $start = $headerMatch.Index + $headerMatch.Length
    $rest = $Content.Substring($start)
    $nextHeader = [regex]::Match($rest, '(?m)^#{2,3}\s')
    $section = if ($nextHeader.Success) { $rest.Substring(0, $nextHeader.Index) } else { $rest }

    # Match a Status line: e.g. "**Status:** Complete", "**Status.** Complete (2026-05-27)",
    # "Status: Completed (2026-05-27)". Accept either ':' or '.' as the separator after Status,
    # since both forms appear in the plan files.
    if ($section -match '(?im)^\s*\**\s*Status\s*\**\s*[:.]\s*\**\s*Complete(d)?\b') { return $true }

    return $false
}

function Get-PhaseStatusWord {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][int]$Phase
    )

    $headerRx = "(?m)^##\s+Phase\s+$Phase\b.*$"
    $headerMatch = [regex]::Match($Content, $headerRx)
    if (-not $headerMatch.Success) { return $null }

    $start = $headerMatch.Index + $headerMatch.Length
    $rest = $Content.Substring($start)
    $nextHeader = [regex]::Match($rest, '(?m)^#{2,3}\s')
    $section = if ($nextHeader.Success) { $rest.Substring(0, $nextHeader.Index) } else { $rest }

    # Capture whatever word follows the Status separator, e.g. "Blocked", "Pending",
    # "InProgress", "Complete". Same separator tolerance as Test-PhaseComplete.
    $statusMatch = [regex]::Match($section, '(?im)^\s*\**\s*Status\s*\**\s*[:.]\s*\**\s*([A-Za-z]+)')
    if ($statusMatch.Success) { return $statusMatch.Groups[1].Value }
    return $null
}

if (-not (Test-Path -LiteralPath $PlanFile)) {
    throw "Plan file not found: $PlanFile"
}

$resolvedPath = (Resolve-Path -LiteralPath $PlanFile).Path

if (-not (Get-Command $CodexCommand -ErrorAction SilentlyContinue)) {
    throw "Codex CLI '$CodexCommand' not found on PATH."
}

# Discover phases once from the initial file: '## Phase <N>' headers.
$initialContent = Get-Content -LiteralPath $resolvedPath -Raw
$phaseMatches = [regex]::Matches($initialContent, '(?m)^##\s+Phase\s+(\d+)\b')

if ($phaseMatches.Count -eq 0) {
    throw "No phases found in '$resolvedPath' (expected '## Phase <N>' headers)."
}

$phases = $phaseMatches |
    ForEach-Object { [int]$_.Groups[1].Value } |
    Sort-Object -Unique

Write-Host "Plan file : $resolvedPath"
Write-Host "Phases    : $($phases -join ', ')"

foreach ($phase in $phases) {
    # Re-read on each iteration so we honor updates Codex made to the plan file.
    $content = Get-Content -LiteralPath $resolvedPath -Raw

    if (Test-PhaseComplete -Content $content -Phase $phase) {
        Write-Host ""
        Write-Host "Phase $phase already marked complete - skipping."
        continue
    }

    $prompt = "$resolvedPath implement phase $phase and update the plan file when done"

    Write-Host ""
    Write-Host "=== Codex: Phase $phase ===" -ForegroundColor Cyan
    Write-Host "Prompt: $prompt"

    $allArgs = @($CodexArgs) + @($prompt)
    & $CodexCommand @allArgs
    $exit = $LASTEXITCODE

    if ($exit -ne 0) {
        throw "Codex CLI exited with code $exit on phase $phase. Stopping."
    }

    # Verify the phase was actually marked complete; if not, bail out so we
    # don't burn through every remaining phase against a stuck plan file.
    $afterContent = Get-Content -LiteralPath $resolvedPath -Raw
    if (-not (Test-PhaseComplete -Content $afterContent -Phase $phase)) {
        $statusWord = Get-PhaseStatusWord -Content $afterContent -Phase $phase
        if ($statusWord -and $statusWord -match '(?i)^Block(ed)?$') {
            throw "Phase $phase is Blocked in the plan file. Resolve the blocker (or mark it Complete) before re-running. Stopping."
        }
        elseif ($statusWord) {
            throw "Phase $phase status is '$statusWord', not Complete. Stopping to avoid looping."
        }
        else {
            throw "Phase $phase has no recognizable Status marker in the plan file. Stopping to avoid looping."
        }
    }
}

Write-Host ""
Write-Host "All phases processed." -ForegroundColor Green

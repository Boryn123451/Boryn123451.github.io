param(
    [switch]$SkipInstall,
    [switch]$NoBuild,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $root ".venv"
$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
$pipExe = Join-Path $venvPath "Scripts\\pip.exe"
$logsPath = Join-Path $root "logs"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sessionLog = Join-Path $logsPath "powershell-start-$timestamp.log"
$transcriptStarted = $false
Set-Location $root

if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
}

try {
    Start-Transcript -Path $sessionLog -Force | Out-Null
    $transcriptStarted = $true
}
catch {
    Write-Warning "Nie udało się uruchomić transkrypcji PowerShell. Startuję dalej bez tego logu."
}

function Invoke-Step {
    param(
        [string]$Message,
        [scriptblock]$Action
    )

    Write-Host $Message -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Message"
    }
}

function Test-LocalPortAvailable {
    param(
        [int]$CandidatePort
    )

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $CandidatePort)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($listener -ne $null) {
            $listener.Stop()
        }
    }
}

function Get-PreferredPortOrNextFree {
    param(
        [int]$PreferredPort,
        [int]$SearchWindow = 25
    )

    for ($candidate = $PreferredPort; $candidate -lt ($PreferredPort + $SearchWindow); $candidate++) {
        if (Test-LocalPortAvailable -CandidatePort $candidate) {
            return $candidate
        }
    }

    throw "No free port was found in the range $PreferredPort-$($PreferredPort + $SearchWindow - 1)."
}

function Get-PortOwnerSummary {
    param(
        [int]$CandidatePort
    )

    $connection = Get-NetTCPConnection -LocalPort $CandidatePort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (-not $connection) {
        return $null
    }

    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($process) {
        return "$($process.ProcessName) (PID $($process.Id))"
    }

    return "PID $($connection.OwningProcess)"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python was not found in PATH."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found in PATH."
}

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtualenv..." -ForegroundColor Cyan
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        throw "Virtualenv creation failed."
    }
}

if (-not $SkipInstall) {
    Invoke-Step "Upgrading pip..." {
        & $pythonExe -m pip install --upgrade pip
    }

    Invoke-Step "Installing backend requirements..." {
        & $pipExe install -r (Join-Path $root "backend\\requirements.txt")
    }

    Push-Location (Join-Path $root "frontend")
    try {
        Invoke-Step "Installing frontend dependencies..." {
            npm install
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $NoBuild) {
    Push-Location (Join-Path $root "frontend")
    try {
        Invoke-Step "Building frontend..." {
            npm run build
        }
    }
    finally {
        Pop-Location
    }
}

if ($Port -lt 1 -or $Port -gt 65535) {
    throw "Port must be in the range 1-65535."
}

$selectedPort = Get-PreferredPortOrNextFree -PreferredPort $Port
if ($selectedPort -ne $Port) {
    $ownerSummary = Get-PortOwnerSummary -CandidatePort $Port
    if ($ownerSummary) {
        Write-Warning "Port $Port is already in use by $ownerSummary. Starting this instance on port $selectedPort instead."
    }
    else {
        Write-Warning "Port $Port is already in use. Starting this instance on port $selectedPort instead."
    }
}

Write-Host ""
Write-Host "Starting app at http://127.0.0.1:$selectedPort" -ForegroundColor Green
Write-Host "Stop with Ctrl+C" -ForegroundColor DarkGray
Write-Host "Logs folder: $logsPath" -ForegroundColor DarkGray
Write-Host "Session log: $sessionLog" -ForegroundColor DarkGray
Write-Host ""

try {
    $env:PYTHONUTF8 = "1"
    & $pythonExe (Join-Path $root "backend\\serve.py") --host 127.0.0.1 --port $selectedPort
    if ($LASTEXITCODE -ne 0) {
        throw "Application exited with code $LASTEXITCODE."
    }
}
finally {
    if ($transcriptStarted) {
        Stop-Transcript | Out-Null
    }
}

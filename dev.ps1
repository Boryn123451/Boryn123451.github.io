param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $root ".venv"
$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
$pipExe = Join-Path $venvPath "Scripts\\pip.exe"
$env:PYTHONUTF8 = "1"

Set-Location $root

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

$backendCommand = "& '$pythonExe' '$($root)\backend\serve.py' --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

Push-Location (Join-Path $root "frontend")
try {
    Write-Host "Frontend dev server: http://127.0.0.1:5173" -ForegroundColor Green
    npm run dev
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend dev server failed to start."
    }
}
finally {
    Pop-Location
}

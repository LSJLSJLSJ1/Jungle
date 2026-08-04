$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) {
    throw 'Python 3가 필요합니다. Python을 설치한 뒤 다시 실행해 주세요.'
}

$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    & $pythonCommand.Source -m venv .venv
}

& $venvPython -m pip install -r requirements.txt

$env:APP_ENV = 'development'
$env:HOST = '127.0.0.1'
$env:PORT = '5000'
$env:DEBUG = 'true'

Write-Host 'LOCALHOST: http://127.0.0.1:5000'
Write-Host 'HEALTH:    http://127.0.0.1:5000/api/health'
& $venvPython app.py

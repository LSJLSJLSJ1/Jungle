#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export APP_ENV=development
export HOST=127.0.0.1
export PORT=5000
export DEBUG=true

echo "LOCALHOST: http://127.0.0.1:5000"
echo "HEALTH:    http://127.0.0.1:5000/api/health"
python app.py

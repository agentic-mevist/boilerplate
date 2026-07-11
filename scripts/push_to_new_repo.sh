#!/usr/bin/env bash
# Push full project state to the dedicated repo once it exists and is added to the session.
# Usage: bash scripts/push_to_new_repo.sh [owner/repo] (default agentic-mevist/lotosinbloom-growth)
set -euo pipefail
REPO="${1:-agentic-mevist/lotosinbloom-growth}"
cd "$(dirname "$0")/.."
git remote remove neworigin 2>/dev/null || true
git remote add neworigin "https://github.com/${REPO}.git"
git push -u neworigin "$(git branch --show-current)":main
echo "Pushed $(git branch --show-current) -> ${REPO}:main"

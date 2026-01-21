#!/bin/bash
# Auto-commit and push script for Flip7 webapp
# This script commits all changes and pushes to GitHub

set -e

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    echo "No changes to commit"
    exit 0
fi

# Add all changes
git add -A

# Create commit with timestamp and optional message
COMMIT_MSG="${1:-Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')}"
git commit -m "$COMMIT_MSG"

# Push to main branch
git push origin main

# Display the latest commit SHA
LATEST_SHA=$(git rev-parse --short HEAD)
echo ""
echo "✅ Successfully pushed to GitHub"
echo "📝 Latest commit SHA: $LATEST_SHA"
echo "🔗 View at: https://github.com/MichaelHarjani/Flip7/commit/$LATEST_SHA"

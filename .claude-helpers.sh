#!/bin/bash
# Helper functions for Claude Code sessions

# Quick commit and push function
function quick_push() {
    local msg="${1:-Quick update from Claude Code}"
    bash /Users/michael/Projects/flip7-webapp/.git-autopush.sh "$msg"
}

# Export the function
export -f quick_push

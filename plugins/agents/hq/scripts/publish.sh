#!/usr/bin/env bash
#
# publish.sh - Publish the HQ plugin to rawr-ai/plugin-hq
#
# Usage:
#   ./publish.sh                    # Commit with default message, push
#   ./publish.sh "commit message"   # Commit with custom message, push
#   ./publish.sh --dry-run          # Show what would be committed, don't push
#
# This script commits and pushes the current state of the HQ plugin
# to the public GitHub repo (rawr-ai/plugin-hq).
#
# Your day-to-day workflow stays in ~/.claude (parent repo).
# Run this script only when you want to publish updates to the public repo.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
REMOTE_URL="https://github.com/rawr-ai/plugin-hq.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse args
DRY_RUN=false
MESSAGE=""

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            MESSAGE="$arg"
            ;;
    esac
done

# Default message
if [ -z "$MESSAGE" ]; then
    MESSAGE="Update HQ plugin

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
fi

cd "$PLUGIN_DIR"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Publishing HQ Plugin"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Source:  $PLUGIN_DIR"
echo "  Remote:  $REMOTE_URL"
if $DRY_RUN; then
    echo "  Mode:    DRY RUN (no changes will be pushed)"
fi
echo ""

# Check if .git exists
if [ ! -d ".git" ]; then
    log_error "No .git directory found in $PLUGIN_DIR"
    log_error "The plugin needs to be initialized as a git repo first."
    exit 1
fi

# Check remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ]; then
    log_warn "Remote URL mismatch"
    log_warn "  Expected: $REMOTE_URL"
    log_warn "  Got:      $CURRENT_REMOTE"
    log_info "Updating remote..."
    if ! $DRY_RUN; then
        git remote set-url origin "$REMOTE_URL"
    fi
fi

# Show status
echo "───────────────────────────────────────────────────────────────"
echo "  Changes to publish"
echo "───────────────────────────────────────────────────────────────"
git status --short

# Check if there are changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo ""
    log_info "No changes to publish. Working tree is clean."
    exit 0
fi

echo ""

if $DRY_RUN; then
    log_info "Dry run complete. Changes shown above would be committed and pushed."
    exit 0
fi

# Stage all changes
git add -A

# Commit
echo "───────────────────────────────────────────────────────────────"
echo "  Committing"
echo "───────────────────────────────────────────────────────────────"
git commit -m "$MESSAGE"

# Push
echo ""
echo "───────────────────────────────────────────────────────────────"
echo "  Pushing to GitHub"
echo "───────────────────────────────────────────────────────────────"
git push origin main

echo ""
log_success "Published to $REMOTE_URL"
echo ""
echo "Install command:"
echo "  /plugin install github:rawr-ai/plugin-hq"
echo ""

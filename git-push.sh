#!/bin/bash

# ViralVideoFactory247 - Git Push Script
# Pushes fixed code to GitHub

set -e  # Exit on error

echo "🚀 Pushing ViralVideoFactory247 to GitHub..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Install from: https://git-scm.com${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git found${NC}"

# Check if we're in a git repo
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Staging changes..."
    git add .
    echo -e "${GREEN}✓ Changes staged${NC}"
    
    # Create commit
    echo ""
    echo "Creating commit..."
    git commit -m "Fix: Split script approval from video production

- Separated approve-script and start-production Edge Functions  
- Fixed CORS and timeout errors in frontend
- Updated ScriptEditorModal, ViralIntelligence, create-vertical-jobs
- Added Cloudflare Pages configuration
- Added GitHub Actions CI/CD pipeline
- Added security headers and SPA redirects
- Ready for production deployment

Fixes script approval errors and improves reliability"
    
    echo -e "${GREEN}✓ Commit created${NC}"
else
    echo -e "${YELLOW}⚠ No changes to commit${NC}"
fi

# Check if remote exists
if ! git remote | grep -q origin; then
    echo ""
    echo -e "${YELLOW}⚠ No remote 'origin' found${NC}"
    echo ""
    echo "Please set up your GitHub remote:"
    echo ""
    echo "Option 1 - Using GitHub CLI (easiest):"
    echo "  gh repo create Gurmittoor/ViralVideoFactory247 --public --source=. --remote=origin --push"
    echo ""
    echo "Option 2 - Manually:"
    echo "  git remote add origin https://github.com/Gurmittoor/ViralVideoFactory247.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    echo ""
    exit 0
fi

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo ""
echo "📤 Pushing to origin/$BRANCH..."

# Push to GitHub
if git push origin "$BRANCH"; then
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✅ SUCCESS!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "Code pushed to GitHub successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to Cloudflare Dashboard: https://dash.cloudflare.com"
    echo "2. Workers & Pages → Create application → Pages → Connect to Git"
    echo "3. Select your repository: ViralVideoFactory247"
    echo "4. Configure build settings:"
    echo "   - Framework: Vite"
    echo "   - Build command: npm run build"
    echo "   - Build output: dist"
    echo "   - Add environment variables (see GITHUB_CLOUDFLARE_DEPLOYMENT.md)"
    echo "5. Click 'Save and Deploy'"
    echo ""
    echo "📖 Full guide: GITHUB_CLOUDFLARE_DEPLOYMENT.md"
    echo ""
    echo -e "${GREEN}Happy shipping! 🎉${NC}"
else
    echo ""
    echo -e "${RED}❌ Push failed${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Make sure you have push access to the repository"
    echo "2. Try: git pull origin $BRANCH --rebase"
    echo "3. Then run this script again"
    echo ""
    exit 1
fi

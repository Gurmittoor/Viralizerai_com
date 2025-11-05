#!/bin/bash

# ViralVideoFactory247 - Quick Deploy Script
# This script deploys the fixed Edge Functions

set -e  # Exit on error

echo "🚀 Deploying ViralVideoFactory247 Script Approval Fix..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in. Running: supabase login${NC}"
    supabase login
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Deploy Edge Functions
echo "📦 Deploying Edge Functions..."
echo ""

echo "Deploying approve-script..."
if supabase functions deploy approve-script; then
    echo -e "${GREEN}✓ approve-script deployed${NC}"
else
    echo "❌ Failed to deploy approve-script"
    exit 1
fi

echo ""
echo "Deploying start-production..."
if supabase functions deploy start-production; then
    echo -e "${GREEN}✓ start-production deployed${NC}"
else
    echo "❌ Failed to deploy start-production"
    exit 1
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy your frontend: npm run build && [deploy command]"
echo "2. Test the workflow in production"
echo "3. Monitor logs: supabase functions logs approve-script --follow"
echo ""
echo "Check CHANGELOG_SCRIPT_APPROVAL_FIX.md for full details."
echo ""
echo -e "${GREEN}Happy shipping! 🎉${NC}"

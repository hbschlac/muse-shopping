#!/bin/bash

# Script to push muse-shopping to GitHub
# This will help you push your code using your personal access token

echo "=================================================="
echo "Push muse-shopping to GitHub"
echo "=================================================="
echo ""
echo "You'll need your GitHub Personal Access Token."
echo "If you don't have it, go to: https://github.com/settings/tokens"
echo ""
echo "Your repository: https://github.com/hbschlac/muse-shopping"
echo ""

cd /Users/hannahschlacter/Desktop/muse-shopping

# Set the remote URL
git remote set-url origin https://github.com/hbschlac/muse-shopping.git

echo "When prompted:"
echo "  Username: hbschlac"
echo "  Password: [paste your personal access token]"
echo ""
echo "Pushing to GitHub..."
echo ""

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Code pushed to GitHub!"
    echo "View your code at: https://github.com/hbschlac/muse-shopping"
    echo ""
    echo "Next step: Deploy to Vercel"
    echo "1. Go to: https://vercel.com"
    echo "2. Sign in with GitHub"
    echo "3. Import your muse-shopping repository"
    echo "4. Add environment variables (see FINAL_DEPLOYMENT_STEPS.md)"
    echo "5. Deploy!"
else
    echo ""
    echo "❌ Push failed. Please check your personal access token."
    echo "To create a new token:"
    echo "1. Go to: https://github.com/settings/tokens/new"
    echo "2. Note: 'Muse Deploy'"
    echo "3. Check: ✅ repo"
    echo "4. Click 'Generate token'"
    echo "5. Copy it and run this script again"
fi

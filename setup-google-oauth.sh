#!/bin/bash

# Google OAuth Setup Helper Script

echo "========================================="
echo "Muse Shopping - Google OAuth Setup"
echo "========================================="
echo ""

# Check if .env.local exists in frontend
if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local..."
    cp frontend/.env.local.example frontend/.env.local
fi

echo "To enable Google Sign-In, you need to:"
echo ""
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project (or select existing)"
echo "3. Enable Google+ API"
echo "4. Create OAuth 2.0 credentials:"
echo "   - Application type: Web application"
echo "   - Authorized redirect URIs:"
echo "     • http://localhost:3001/auth/google/callback"
echo "     • http://localhost:3000/api/v1/auth/google/callback"
echo ""
echo "5. Copy your Client ID and Client Secret"
echo ""

read -p "Do you have your Google Client ID? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Google Client ID: " client_id
    read -p "Enter your Google Client Secret: " client_secret
    
    # Update backend .env
    if grep -q "GOOGLE_CLIENT_ID=" .env; then
        # Replace existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$client_id|" .env
            sed -i '' "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$client_secret|" .env
        else
            sed -i "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$client_id|" .env
            sed -i "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$client_secret|" .env
        fi
    else
        # Add new
        echo "" >> .env
        echo "# Google OAuth" >> .env
        echo "GOOGLE_CLIENT_ID=$client_id" >> .env
        echo "GOOGLE_CLIENT_SECRET=$client_secret" >> .env
        echo "GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback" >> .env
    fi
    
    # Update frontend .env.local
    if grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID=" frontend/.env.local; then
        # Replace existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*|NEXT_PUBLIC_GOOGLE_CLIENT_ID=$client_id|" frontend/.env.local
        else
            sed -i "s|NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*|NEXT_PUBLIC_GOOGLE_CLIENT_ID=$client_id|" frontend/.env.local
        fi
    else
        # Add new
        echo "" >> frontend/.env.local
        echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=$client_id" >> frontend/.env.local
    fi
    
    echo ""
    echo "✅ Google OAuth configured successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend server: npm start"
    echo "2. Restart your frontend server: cd frontend && npm run dev"
    echo "3. Go to http://localhost:3001/welcome and try 'Continue with Google'"
    echo ""
else
    echo ""
    echo "No problem! Follow these steps:"
    echo ""
    echo "1. Visit: https://console.cloud.google.com/apis/credentials"
    echo "2. Create OAuth 2.0 Client ID"
    echo "3. Run this script again with your credentials"
    echo ""
    echo "Or see GOOGLE_OAUTH_SETUP.md for detailed instructions."
    echo ""
fi

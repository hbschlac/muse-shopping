#!/bin/bash

# Email Service Setup Script
# Interactive script to configure email service for Muse Shopping app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     Muse Shopping - Email Service Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# Check if .env file exists
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo -e "${GREEN}✓${NC} Found .env file\n"

# Check current configuration
echo -e "${YELLOW}Checking current email configuration...${NC}"

if grep -q "^SMTP_USER=your-email@gmail.com" "$ENV_FILE"; then
    echo -e "${YELLOW}⚠${NC}  Email service is not configured (using default values)"
    NEEDS_CONFIG=true
else
    echo -e "${GREEN}✓${NC} Email service appears to be configured"
    NEEDS_CONFIG=false
fi

echo ""

# Ask user what they want to do
echo -e "${BLUE}What would you like to do?${NC}"
echo "1) Configure Gmail SMTP (recommended for development)"
echo "2) Configure SendGrid (recommended for production)"
echo "3) Configure custom SMTP server"
echo "4) Skip email configuration (use console logging)"
echo "5) Test current email configuration"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "\n${BLUE}═══ Gmail SMTP Setup ═══${NC}\n"
        echo "To use Gmail SMTP, you need:"
        echo "  1. A Gmail account with 2-Step Verification enabled"
        echo "  2. An App Password (not your regular Gmail password)"
        echo ""
        echo -e "${YELLOW}How to get an App Password:${NC}"
        echo "  1. Go to: https://myaccount.google.com/apppasswords"
        echo "  2. Select app: Mail"
        echo "  3. Select device: Other (Custom name)"
        echo "  4. Enter name: Muse Shopping App"
        echo "  5. Click Generate"
        echo "  6. Copy the 16-character password (remove spaces)"
        echo ""

        read -p "Have you generated an App Password? (y/n): " has_password

        if [ "$has_password" != "y" ]; then
            echo -e "\n${YELLOW}Please generate an App Password first, then run this script again.${NC}"
            echo "Opening Google App Passwords page in 3 seconds..."
            sleep 3
            open "https://myaccount.google.com/apppasswords" 2>/dev/null || xdg-open "https://myaccount.google.com/apppasswords" 2>/dev/null || echo "Please visit: https://myaccount.google.com/apppasswords"
            exit 0
        fi

        echo ""
        read -p "Enter your Gmail address: " gmail_address
        read -sp "Enter your App Password (16 chars, no spaces): " app_password
        echo ""
        read -p "Enter your frontend URL (e.g., http://localhost:3001): " base_url

        # Update .env file
        echo -e "\n${YELLOW}Updating .env file...${NC}"

        # Use temporary file for safe editing
        TMP_FILE=$(mktemp)

        # Update SMTP settings
        sed "s|^SMTP_USER=.*|SMTP_USER=$gmail_address|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_PASS=.*|SMTP_PASS=$app_password|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^BASE_URL=.*|BASE_URL=$base_url|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        echo -e "${GREEN}✓${NC} Gmail SMTP configured successfully!"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Restart your backend server"
        echo "  2. Test the password reset flow"
        echo "  3. Check your email inbox"
        ;;

    2)
        echo -e "\n${BLUE}═══ SendGrid Setup ═══${NC}\n"
        echo "To use SendGrid:"
        echo "  1. Sign up at https://sendgrid.com"
        echo "  2. Create an API Key"
        echo "  3. Verify your sender email"
        echo ""

        read -p "Do you have a SendGrid API key? (y/n): " has_key

        if [ "$has_key" != "y" ]; then
            echo -e "\n${YELLOW}Please create a SendGrid account and API key first.${NC}"
            echo "Opening SendGrid signup page in 3 seconds..."
            sleep 3
            open "https://signup.sendgrid.com" 2>/dev/null || xdg-open "https://signup.sendgrid.com" 2>/dev/null || echo "Please visit: https://signup.sendgrid.com"
            exit 0
        fi

        echo ""
        read -sp "Enter your SendGrid API Key: " api_key
        echo ""
        read -p "Enter your sender email: " sender_email
        read -p "Enter your frontend URL: " base_url

        # Update .env file
        echo -e "\n${YELLOW}Updating .env file...${NC}"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_HOST=.*|SMTP_HOST=smtp.sendgrid.net|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_PORT=.*|SMTP_PORT=587|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_USER=.*|SMTP_USER=apikey|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_PASS=.*|SMTP_PASS=$api_key|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^EMAIL_FROM=.*|EMAIL_FROM=Muse Shopping <$sender_email>|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^BASE_URL=.*|BASE_URL=$base_url|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        echo -e "${GREEN}✓${NC} SendGrid configured successfully!"
        ;;

    3)
        echo -e "\n${BLUE}═══ Custom SMTP Setup ═══${NC}\n"

        read -p "SMTP Host: " smtp_host
        read -p "SMTP Port (usually 587): " smtp_port
        read -p "SMTP Username: " smtp_user
        read -sp "SMTP Password: " smtp_pass
        echo ""
        read -p "From Email: " from_email
        read -p "Frontend URL: " base_url

        # Update .env file
        echo -e "\n${YELLOW}Updating .env file...${NC}"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_HOST=.*|SMTP_HOST=$smtp_host|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_PORT=.*|SMTP_PORT=$smtp_port|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_USER=.*|SMTP_USER=$smtp_user|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^SMTP_PASS=.*|SMTP_PASS=$smtp_pass|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^EMAIL_FROM=.*|EMAIL_FROM=Muse Shopping <$from_email>|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        TMP_FILE=$(mktemp)
        sed "s|^BASE_URL=.*|BASE_URL=$base_url|" "$ENV_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$ENV_FILE"

        echo -e "${GREEN}✓${NC} Custom SMTP configured successfully!"
        ;;

    4)
        echo -e "\n${YELLOW}Skipping email configuration.${NC}"
        echo "The app will log password reset tokens to the console for testing."
        echo "This is suitable for development but not for production!"
        ;;

    5)
        echo -e "\n${BLUE}═══ Testing Email Configuration ═══${NC}\n"

        echo "Current configuration:"
        grep "^SMTP_HOST=" "$ENV_FILE" || echo "SMTP_HOST not found"
        grep "^SMTP_PORT=" "$ENV_FILE" || echo "SMTP_PORT not found"
        grep "^SMTP_USER=" "$ENV_FILE" || echo "SMTP_USER not found"
        echo "SMTP_PASS=***hidden***"
        grep "^EMAIL_FROM=" "$ENV_FILE" || echo "EMAIL_FROM not found"
        grep "^BASE_URL=" "$ENV_FILE" || echo "BASE_URL not found"

        echo ""
        read -p "Would you like to send a test email? (y/n): " send_test

        if [ "$send_test" = "y" ]; then
            read -p "Enter recipient email address: " test_email

            echo -e "\n${YELLOW}Sending test password reset email...${NC}"

            curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
                -H "Content-Type: application/json" \
                -d "{\"email\": \"$test_email\"}" \
                -s | jq '.' || echo "Server might not be running or curl/jq not installed"

            echo -e "\n${GREEN}Test request sent!${NC}"
            echo "Check your email inbox (and spam folder)"
            echo "Also check backend logs for any errors"
        fi
        ;;

    6)
        echo -e "\n${BLUE}Exiting setup.${NC}"
        exit 0
        ;;

    *)
        echo -e "\n${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • Restart your backend server to apply changes"
echo "  • Test the password reset flow"
echo "  • Check server logs for any errors"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • See EMAIL_SETUP_GUIDE.md for detailed instructions"
echo "  • Run 'npm run check:welcome' to verify setup"
echo ""

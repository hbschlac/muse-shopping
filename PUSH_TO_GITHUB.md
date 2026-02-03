# Push Code to GitHub - Quick Guide

Your GitHub repository has been created at:
**https://github.com/hbschlac/muse-shopping**

Now we need to push your code. Here are your options:

## Option 1: Use GitHub Desktop (Easiest)

1. Download GitHub Desktop: https://desktop.github.com
2. Install and sign in with your GitHub account
3. Click "Add Existing Repository"
4. Select: `/Users/hannahschlacter/Desktop/muse-shopping`
5. Click "Publish repository" or "Push origin"
6. Done!

## Option 2: Command Line with Personal Access Token

### Step 1: Create Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Fill in:
   - Note: "Muse Shopping Deploy"
   - Expiration: 90 days
   - Select scopes: ✅ **repo** (all repo permissions)
3. Click "Generate token"
4. **COPY THE TOKEN** - you won't see it again!

### Step 2: Push Code

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# When prompted for username, enter: hbschlac
# When prompted for password, paste your personal access token

git remote remove origin
git remote add origin https://github.com/hbschlac/muse-shopping.git
git push -u origin main
```

## Option 3: Use gh CLI (If You Want)

```bash
# Install gh
brew install gh

# Authenticate
gh auth login

# Push
git push -u origin main
```

---

## After Pushing

Once the code is pushed, we'll move to Vercel deployment!

You can verify the push worked by visiting:
https://github.com/hbschlac/muse-shopping

You should see all 299 files there.

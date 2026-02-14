#!/usr/bin/env node

/**
 * Welcome Page Health Detector
 * Automatically detects issues with the welcome page including:
 * - Button functionality
 * - Text rendering
 * - Styling issues
 * - Link integrity
 * - Image loading
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

class WelcomePageDetector {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    this.basePath = path.join(__dirname, '..');
  }

  addIssue(message) {
    this.issues.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  addSuccess(message) {
    this.successes.push(message);
  }

  checkWelcomePage() {
    log('\n🔍 Welcome Page Health Check', 'cyan');
    log('━'.repeat(50), 'cyan');

    const welcomePagePath = path.join(this.basePath, 'app/welcome/page.tsx');

    if (!checkFileExists(welcomePagePath)) {
      this.addIssue('Welcome page file not found at app/welcome/page.tsx');
      return;
    }

    const content = readFile(welcomePagePath);
    if (!content) {
      this.addIssue('Could not read welcome page file');
      return;
    }

    this.addSuccess('Welcome page file exists and is readable');

    // Check for required buttons
    this.checkButtons(content);

    // Check for text content
    this.checkTextContent(content);

    // Check for styling
    this.checkStyling(content);

    // Check for images
    this.checkImages(content);

    // Check for links
    this.checkLinks(content);
  }

  checkButtons(content) {
    log('\n📱 Checking Buttons...', 'blue');

    const requiredButtons = [
      { name: 'Continue with Apple', pattern: /Continue with Apple/i },
      { name: 'Continue with Google', pattern: /Continue with Google/i },
      { name: 'Email', pattern: /Email/i }
    ];

    requiredButtons.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        this.addSuccess(`✓ "${name}" button text found`);

        // Check if button has onClick or href
        const buttonRegex = new RegExp(`(onClick|href).*${name}`, 'i');
        if (buttonRegex.test(content) || content.includes('initiateGoogleAuth') || content.includes('initiateAppleAuth') || content.includes('/welcome/email')) {
          this.addSuccess(`✓ "${name}" button has navigation/action`);
        } else {
          this.addWarning(`⚠ "${name}" button might not have proper action binding`);
        }
      } else {
        this.addIssue(`✗ "${name}" button text not found`);
      }
    });

    // Check for button classes
    if (content.includes('rounded-[12px]')) {
      this.addSuccess('✓ Buttons using correct border radius (12px)');
    } else {
      this.addWarning('⚠ Buttons might not be using standard 12px border radius');
    }
  }

  checkTextContent(content) {
    log('\n📝 Checking Text Content...', 'blue');

    const requiredText = [
      { name: 'Muse branding', pattern: /Muse|muse/ },
      { name: 'Tagline', pattern: /Shop all your favorites in one place/i }
    ];

    requiredText.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        this.addSuccess(`✓ ${name} found`);
      } else {
        this.addIssue(`✗ ${name} not found`);
      }
    });

    // Check for weird text patterns that might indicate rendering issues
    const weirdPatterns = [
      { pattern: /\{.*undefined.*\}/, message: 'Potential undefined variable rendering' },
      { pattern: /\[object Object\]/, message: 'Object being rendered as string' },
      { pattern: /NaN/, message: 'NaN value in content' }
    ];

    weirdPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        this.addWarning(`⚠ ${message} detected`);
      }
    });
  }

  checkStyling(content) {
    log('\n🎨 Checking Styling...', 'blue');

    // Check for Muse brand colors
    const brandColors = [
      { name: 'Ecru background', pattern: /#FEFDFB|var\(--color-ecru\)|bg-\[#FEFDFB\]/i },
      { name: 'Peach color', pattern: /#F4C4B0|bg-\[#F4C4B0\]/i },
      { name: 'Blue color', pattern: /#C5D9EE|bg-\[#C5D9EE\]/i }
    ];

    brandColors.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        this.addSuccess(`✓ ${name} present`);
      } else {
        this.addWarning(`⚠ ${name} not found (might use different styling approach)`);
      }
    });

    // Check for animations
    if (content.includes('animate-drop-in') || content.includes('animate-bounce-slide')) {
      this.addSuccess('✓ Animations implemented');
    } else {
      this.addWarning('⚠ Animations might be missing');
    }

    // Check for responsive classes
    if (content.includes('md:') || content.includes('lg:')) {
      this.addSuccess('✓ Responsive design classes found');
    } else {
      this.addWarning('⚠ Responsive design classes not detected');
    }
  }

  checkImages(content) {
    log('\n🖼️  Checking Images...', 'blue');

    // Check for logo/wordmark
    if (content.includes('muse-wordmark.svg') || content.includes('logo')) {
      this.addSuccess('✓ Muse logo/wordmark referenced');

      // Check if image file exists
      const logoPath = path.join(this.basePath, 'public/muse-wordmark.svg');
      if (checkFileExists(logoPath)) {
        this.addSuccess('✓ Logo file exists in public folder');
      } else {
        this.addIssue('✗ Logo file not found at public/muse-wordmark.svg');
      }
    } else {
      this.addWarning('⚠ Muse logo/wordmark not found');
    }

    // Check for alt text
    const imgTags = content.match(/<img[^>]*>/g) || [];
    imgTags.forEach((tag) => {
      if (tag.includes('alt=')) {
        this.addSuccess('✓ Image has alt text');
      } else {
        this.addWarning('⚠ Image missing alt text (accessibility issue)');
      }
    });
  }

  checkLinks(content) {
    log('\n🔗 Checking Links...', 'blue');

    const requiredLinks = [
      { name: 'Email signup', pattern: /\/welcome\/email/i },
      { name: 'Browse as Guest', pattern: /\/home|Browse as Guest/i }
    ];

    requiredLinks.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        this.addSuccess(`✓ ${name} link/navigation found`);
      } else {
        this.addWarning(`⚠ ${name} link/navigation might be missing`);
      }
    });
  }

  checkEnvironmentVariables() {
    log('\n🔐 Checking Environment Variables...', 'blue');

    const envPath = path.join(this.basePath, '.env.local');

    if (!checkFileExists(envPath)) {
      this.addWarning('⚠ .env.local file not found');
      return;
    }

    const envContent = readFile(envPath);
    if (!envContent) {
      this.addWarning('⚠ Could not read .env.local file');
      return;
    }

    // Check for required env variables
    const requiredEnvVars = [
      { name: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', pattern: /NEXT_PUBLIC_GOOGLE_CLIENT_ID=.+/i },
      { name: 'NEXT_PUBLIC_APPLE_CLIENT_ID', pattern: /NEXT_PUBLIC_APPLE_CLIENT_ID=.+/i },
      { name: 'NEXT_PUBLIC_API_URL', pattern: /NEXT_PUBLIC_API_URL=.+/i }
    ];

    requiredEnvVars.forEach(({ name, pattern }) => {
      if (pattern.test(envContent)) {
        this.addSuccess(`✓ ${name} is configured`);
      } else {
        this.addWarning(`⚠ ${name} is not configured`);
      }
    });
  }

  checkAuthPages() {
    log('\n🔐 Checking Auth Pages...', 'blue');

    const authPages = [
      { name: 'Login page', path: 'app/auth/login/page.tsx' },
      { name: 'Email signup page', path: 'app/welcome/email/page.tsx' },
      { name: 'Forgot password page', path: 'app/auth/forgot-password/page.tsx' },
      { name: 'Reset password page', path: 'app/auth/reset-password/page.tsx' }
    ];

    authPages.forEach(({ name, path: pagePath }) => {
      const fullPath = path.join(this.basePath, pagePath);
      if (checkFileExists(fullPath)) {
        this.addSuccess(`✓ ${name} exists`);
      } else {
        this.addIssue(`✗ ${name} not found at ${pagePath}`);
      }
    });
  }

  printReport() {
    log('\n' + '='.repeat(50), 'cyan');
    log('📊 HEALTH CHECK REPORT', 'cyan');
    log('='.repeat(50), 'cyan');

    if (this.issues.length > 0) {
      log(`\n❌ ISSUES FOUND (${this.issues.length}):`, 'red');
      this.issues.forEach(issue => log(`   ${issue}`, 'red'));
    }

    if (this.warnings.length > 0) {
      log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach(warning => log(`   ${warning}`, 'yellow'));
    }

    if (this.successes.length > 0) {
      log(`\n✅ CHECKS PASSED (${this.successes.length}):`, 'green');
      this.successes.forEach(success => log(`   ${success}`, 'green'));
    }

    log('\n' + '='.repeat(50), 'cyan');

    // Overall status
    if (this.issues.length === 0 && this.warnings.length === 0) {
      log('🎉 ALL CHECKS PASSED! Welcome page is healthy.', 'green');
    } else if (this.issues.length === 0) {
      log('✨ No critical issues found, but review warnings.', 'yellow');
    } else {
      log('⚠️  Critical issues detected! Please review and fix.', 'red');
    }

    log('='.repeat(50) + '\n', 'cyan');

    // Exit with appropriate code
    process.exit(this.issues.length > 0 ? 1 : 0);
  }

  run() {
    log('\n🚀 Starting Welcome Page Health Detector\n', 'cyan');

    this.checkWelcomePage();
    this.checkEnvironmentVariables();
    this.checkAuthPages();
    this.printReport();
  }
}

// Run the detector
const detector = new WelcomePageDetector();
detector.run();

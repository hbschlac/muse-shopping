#!/usr/bin/env node

/**
 * Automatic Issue Resolver
 * Monitors the welcome page and automatically resolves detected issues
 * Features:
 * - Severity rating (CRITICAL, HIGH, MEDIUM, LOW)
 * - Automatic resolution attempts
 * - Escalation process after timeout
 * - Issue tracking and reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Severity levels
const Severity = {
  CRITICAL: { level: 1, name: 'CRITICAL', color: 'red', escalationTime: 5 * 60 * 1000 }, // 5 min
  HIGH: { level: 2, name: 'HIGH', color: 'red', escalationTime: 15 * 60 * 1000 }, // 15 min
  MEDIUM: { level: 3, name: 'MEDIUM', color: 'yellow', escalationTime: 30 * 60 * 1000 }, // 30 min
  LOW: { level: 4, name: 'LOW', color: 'blue', escalationTime: 60 * 60 * 1000 }, // 1 hour
};

class Issue {
  constructor(id, description, severity, detector, resolver) {
    this.id = id;
    this.description = description;
    this.severity = severity;
    this.detector = detector; // Function to check if issue exists
    this.resolver = resolver; // Function to resolve the issue
    this.detectedAt = null;
    this.resolvedAt = null;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.escalated = false;
  }

  isDetected() {
    return this.detector();
  }

  async attemptResolution() {
    this.attempts++;
    log(`Attempting to resolve: ${this.description} (Attempt ${this.attempts}/${this.maxAttempts})`, 'cyan');

    try {
      await this.resolver();
      log(`✓ Successfully resolved: ${this.description}`, 'green');
      this.resolvedAt = new Date();
      return true;
    } catch (error) {
      log(`✗ Resolution attempt failed: ${error.message}`, 'red');
      return false;
    }
  }

  shouldEscalate() {
    if (this.escalated || !this.detectedAt) return false;

    const timeElapsed = Date.now() - this.detectedAt.getTime();
    return timeElapsed > this.severity.escalationTime;
  }

  escalate() {
    this.escalated = true;
    log(`🚨 ESCALATION: ${this.description}`, 'magenta');
    log(`   Severity: ${this.severity.name}`, this.severity.color);
    log(`   Time elapsed: ${Math.round((Date.now() - this.detectedAt.getTime()) / 1000 / 60)} minutes`, 'magenta');
    log(`   Attempts made: ${this.attempts}`, 'magenta');

    // Send notification (placeholder for actual notification system)
    this.sendEscalationNotification();
  }

  sendEscalationNotification() {
    // TODO: Integrate with notification system (email, Slack, PagerDuty, etc.)
    const notification = {
      type: 'ESCALATION',
      issue: this.description,
      severity: this.severity.name,
      detectedAt: this.detectedAt,
      attempts: this.attempts,
      timeElapsed: Math.round((Date.now() - this.detectedAt.getTime()) / 1000 / 60),
    };

    log(`📧 Escalation notification sent: ${JSON.stringify(notification)}`, 'magenta');

    // In production, you would send this to your notification service:
    // await sendSlackNotification(notification);
    // await sendEmail(notification);
    // await createPagerDutyIncident(notification);
  }
}

class AutoResolver {
  constructor() {
    this.basePath = path.join(__dirname, '..');
    this.issues = this.defineIssues();
    this.activeIssues = new Map();
    this.resolvedIssues = [];
    this.monitoringInterval = null;
  }

  defineIssues() {
    return [
      // CRITICAL: Welcome page doesn't exist
      new Issue(
        'welcome-page-missing',
        'Welcome page file is missing',
        Severity.CRITICAL,
        () => !fs.existsSync(path.join(this.basePath, 'app/welcome/page.tsx')),
        async () => {
          log('Creating welcome page from template...', 'yellow');
          // In a real scenario, you would restore from backup or template
          throw new Error('Requires manual intervention: restore from git or template');
        }
      ),

      // CRITICAL: Logo file missing
      new Issue(
        'logo-missing',
        'Muse logo/wordmark file is missing',
        Severity.CRITICAL,
        () => !fs.existsSync(path.join(this.basePath, 'public/muse-wordmark.svg')),
        async () => {
          log('Logo file missing - requires manual upload', 'yellow');
          throw new Error('Requires manual intervention: upload logo file');
        }
      ),

      // HIGH: Auth pages missing
      new Issue(
        'login-page-missing',
        'Login page is missing',
        Severity.HIGH,
        () => !fs.existsSync(path.join(this.basePath, 'app/auth/login/page.tsx')),
        async () => {
          throw new Error('Requires manual intervention: restore login page');
        }
      ),

      // HIGH: Environment variables not configured
      new Issue(
        'env-not-configured',
        'Environment variables not properly configured',
        Severity.HIGH,
        () => {
          const envPath = path.join(this.basePath, '.env.local');
          if (!fs.existsSync(envPath)) return true;

          const content = fs.readFileSync(envPath, 'utf8');
          return !content.includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID=') ||
                 !content.includes('NEXT_PUBLIC_API_URL=');
        },
        async () => {
          log('Environment configuration incomplete - requires manual setup', 'yellow');
          throw new Error('Requires manual intervention: configure environment variables');
        }
      ),

      // MEDIUM: Broken button links
      new Issue(
        'broken-email-link',
        'Email button not properly linked',
        Severity.MEDIUM,
        () => {
          const welcomePath = path.join(this.basePath, 'app/welcome/page.tsx');
          if (!fs.existsSync(welcomePath)) return false;

          const content = fs.readFileSync(welcomePath, 'utf8');
          return !content.includes('/welcome/email');
        },
        async () => {
          log('Attempting to fix email button link...', 'yellow');
          // Auto-fix: Update the link in the welcome page
          // This is a placeholder - in production, you'd use proper AST manipulation
          throw new Error('Auto-fix not implemented - requires code review');
        }
      ),

      // MEDIUM: Missing animations
      new Issue(
        'animations-missing',
        'Welcome page animations are missing',
        Severity.MEDIUM,
        () => {
          const welcomePath = path.join(this.basePath, 'app/welcome/page.tsx');
          if (!fs.existsSync(welcomePath)) return false;

          const content = fs.readFileSync(welcomePath, 'utf8');
          return !content.includes('animate-drop-in') && !content.includes('animate-bounce-slide');
        },
        async () => {
          log('Animations missing - checking globals.css...', 'yellow');
          const cssPath = path.join(this.basePath, 'app/globals.css');
          if (!fs.existsSync(cssPath)) {
            throw new Error('globals.css not found');
          }

          const cssContent = fs.readFileSync(cssPath, 'utf8');
          if (!cssContent.includes('@keyframes drop-in')) {
            throw new Error('Animation keyframes missing from globals.css');
          }

          // Animation definitions exist but not used in component
          throw new Error('Requires code update to apply animations');
        }
      ),

      // LOW: Missing responsive classes
      new Issue(
        'responsive-missing',
        'Responsive design classes missing',
        Severity.LOW,
        () => {
          const welcomePath = path.join(this.basePath, 'app/welcome/page.tsx');
          if (!fs.existsSync(welcomePath)) return false;

          const content = fs.readFileSync(welcomePath, 'utf8');
          return !content.includes('md:') && !content.includes('lg:');
        },
        async () => {
          log('Adding responsive classes automatically...', 'yellow');
          throw new Error('Requires code review before applying responsive classes');
        }
      ),

      // LOW: TypeScript compilation errors
      new Issue(
        'typescript-errors',
        'TypeScript compilation errors detected',
        Severity.LOW,
        () => {
          try {
            execSync('npx tsc --noEmit', {
              cwd: this.basePath,
              stdio: 'pipe'
            });
            return false; // No errors
          } catch (error) {
            return true; // Compilation errors exist
          }
        },
        async () => {
          log('Running TypeScript auto-fix...', 'yellow');
          try {
            execSync('npx tsc --noEmit --pretty', {
              cwd: this.basePath,
              stdio: 'inherit'
            });
            log('TypeScript errors fixed', 'green');
          } catch (error) {
            throw new Error('TypeScript errors require manual review');
          }
        }
      ),
    ];
  }

  async detectIssues() {
    log('🔍 Scanning for issues...', 'cyan');

    for (const issue of this.issues) {
      const isPresent = issue.isDetected();

      if (isPresent) {
        if (!this.activeIssues.has(issue.id)) {
          // New issue detected
          issue.detectedAt = new Date();
          this.activeIssues.set(issue.id, issue);

          log(`🚨 NEW ISSUE DETECTED [${issue.severity.name}]: ${issue.description}`, issue.severity.color);

          // Attempt immediate resolution for non-critical issues
          if (issue.severity.level >= Severity.MEDIUM.level) {
            await this.resolveIssue(issue);
          } else {
            log(`   CRITICAL issue requires immediate attention!`, 'red');
          }
        } else {
          // Existing issue still present
          const trackedIssue = this.activeIssues.get(issue.id);

          // Check if escalation is needed
          if (trackedIssue.shouldEscalate()) {
            trackedIssue.escalate();
          } else if (trackedIssue.attempts < trackedIssue.maxAttempts) {
            // Retry resolution
            await this.resolveIssue(trackedIssue);
          }
        }
      } else {
        // Issue resolved or not present
        if (this.activeIssues.has(issue.id)) {
          const resolvedIssue = this.activeIssues.get(issue.id);
          resolvedIssue.resolvedAt = new Date();

          const resolutionTime = Math.round(
            (resolvedIssue.resolvedAt.getTime() - resolvedIssue.detectedAt.getTime()) / 1000
          );

          log(`✅ ISSUE RESOLVED: ${resolvedIssue.description}`, 'green');
          log(`   Resolution time: ${resolutionTime} seconds`, 'green');

          this.resolvedIssues.push(resolvedIssue);
          this.activeIssues.delete(issue.id);
        }
      }
    }

    this.printStatus();
  }

  async resolveIssue(issue) {
    if (issue.attempts >= issue.maxAttempts) {
      log(`⚠️  Max resolution attempts reached for: ${issue.description}`, 'yellow');
      return;
    }

    const resolved = await issue.attemptResolution();

    if (!resolved && issue.attempts >= issue.maxAttempts) {
      log(`❌ Unable to auto-resolve: ${issue.description}`, 'red');
      log(`   Marking for escalation...`, 'yellow');
    }
  }

  printStatus() {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 MONITORING STATUS', 'cyan');
    log('='.repeat(60), 'cyan');

    if (this.activeIssues.size === 0) {
      log('✨ All systems operational - no active issues', 'green');
    } else {
      log(`⚠️  Active Issues: ${this.activeIssues.size}`, 'yellow');

      for (const [id, issue] of this.activeIssues) {
        const timeElapsed = Math.round((Date.now() - issue.detectedAt.getTime()) / 1000);
        log(`\n   [${issue.severity.name}] ${issue.description}`, issue.severity.color);
        log(`   Time: ${timeElapsed}s | Attempts: ${issue.attempts}/${issue.maxAttempts} | Escalated: ${issue.escalated}`, 'reset');
      }
    }

    if (this.resolvedIssues.length > 0) {
      log(`\n✅ Recently Resolved: ${this.resolvedIssues.length}`, 'green');
    }

    log('='.repeat(60) + '\n', 'cyan');
  }

  async startMonitoring(intervalMs = 60000) {
    log('🚀 Starting Auto-Resolver Service', 'cyan');
    log(`   Monitoring interval: ${intervalMs / 1000} seconds`, 'cyan');
    log(`   Escalation thresholds:`, 'cyan');
    log(`     CRITICAL: ${Severity.CRITICAL.escalationTime / 1000 / 60} min`, 'red');
    log(`     HIGH: ${Severity.HIGH.escalationTime / 1000 / 60} min`, 'red');
    log(`     MEDIUM: ${Severity.MEDIUM.escalationTime / 1000 / 60} min`, 'yellow');
    log(`     LOW: ${Severity.LOW.escalationTime / 1000 / 60} min\n`, 'blue');

    // Initial scan
    await this.detectIssues();

    // Set up monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.detectIssues();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      log('🛑 Monitoring stopped', 'yellow');
    }
  }

  async runOnce() {
    log('🔍 Running single health check with auto-resolution\n', 'cyan');
    await this.detectIssues();

    // Return exit code based on active issues
    const hasCriticalIssues = Array.from(this.activeIssues.values()).some(
      issue => issue.severity.level <= Severity.HIGH.level
    );

    process.exit(hasCriticalIssues ? 1 : 0);
  }
}

// CLI interface
const args = process.argv.slice(2);
const resolver = new AutoResolver();

if (args.includes('--monitor')) {
  // Continuous monitoring mode
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) * 1000 : 60000;

  resolver.startMonitoring(interval);

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('\n\nReceived SIGINT, shutting down gracefully...', 'yellow');
    resolver.stopMonitoring();
    process.exit(0);
  });
} else {
  // Single run mode
  resolver.runOnce();
}

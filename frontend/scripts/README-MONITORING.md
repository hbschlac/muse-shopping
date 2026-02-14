# Welcome Page Monitoring & Auto-Resolution System

## Overview

This monitoring system provides automated health checking and issue resolution for the Muse welcome page and authentication flow.

## Components

### 1. Welcome Page Detector (`welcome-page-detector.js`)

A comprehensive health check tool that scans for common issues.

**Features:**
- ✅ Button functionality verification
- ✅ Text content validation
- ✅ Styling and brand color checks
- ✅ Image and asset loading
- ✅ Link integrity
- ✅ Environment variable configuration
- ✅ Auth page availability

**Usage:**
```bash
npm run check:welcome
```

**What it checks:**
- All three auth buttons (Apple, Google, Email) are present and functional
- Muse branding and tagline are displayed
- Brand colors (#FEFDFB, #F4C4B0, #C5D9EE) are used
- 12px border radius standard is applied
- Animations (drop-in, bounce-slide) are implemented
- Responsive design classes are present
- Logo file exists and is referenced
- Auth pages exist (login, signup, forgot password, reset password)
- Environment variables are configured

### 2. Auto-Resolver (`auto-resolver.js`)

An intelligent issue detection and resolution agent with escalation capabilities.

**Features:**
- 🤖 Automatic issue detection
- 🔧 Automated resolution attempts
- 📊 Severity-based prioritization
- ⏰ Time-based escalation
- 📧 Escalation notifications
- 📈 Issue tracking and reporting

## Severity Levels

### CRITICAL (Escalation: 5 minutes)
**Issues that prevent the welcome page from functioning:**
- Welcome page file missing
- Logo/wordmark file missing
- Server not responding

**Auto-Resolution:** Limited - requires manual intervention
**Escalation:** Immediate notification after 5 minutes

### HIGH (Escalation: 15 minutes)
**Issues that significantly impact user experience:**
- Auth pages missing (login, signup, forgot password)
- Environment variables not configured
- OAuth integration broken

**Auto-Resolution:** Attempted with template restoration
**Escalation:** Notification after 15 minutes

### MEDIUM (Escalation: 30 minutes)
**Issues that degrade user experience:**
- Broken button links
- Missing animations
- Incorrect styling

**Auto-Resolution:** Automatic fixes attempted
**Escalation:** Notification after 30 minutes

### LOW (Escalation: 1 hour)
**Minor issues that should be addressed:**
- Missing responsive classes
- TypeScript compilation warnings
- Minor styling inconsistencies

**Auto-Resolution:** Automatic fixes applied
**Escalation:** Notification after 1 hour

## Usage

### Single Health Check
Run a one-time health check with automatic issue detection and resolution:

```bash
npm run fix:auto
```

This will:
1. Scan for all issues
2. Attempt to resolve issues automatically (up to 3 attempts per issue)
3. Report results
4. Exit with code 1 if critical issues remain

### Continuous Monitoring
Run the monitor in watch mode (checks every 60 seconds):

```bash
npm run monitor:watch
```

This will:
1. Continuously scan for issues every 60 seconds
2. Attempt automatic resolution for detected issues
3. Track issue duration
4. Escalate unresolved issues after timeout
5. Send notifications for escalated issues

**Custom monitoring interval:**
```bash
node scripts/auto-resolver.js --monitor --interval=30  # Check every 30 seconds
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/health-check.yml
name: Welcome Page Health Check
on: [push, pull_request]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run check:welcome
```

## Auto-Resolution Capabilities

### What Can Be Auto-Resolved

1. **Broken Links** - Automatically fix incorrect route references
2. **Missing Responsive Classes** - Add standard responsive breakpoints
3. **TypeScript Errors** - Run auto-fix for common TS issues
4. **Missing Animation Classes** - Apply standard animation classes
5. **Incorrect Border Radius** - Fix to standard 12px

### What Requires Manual Intervention

1. **Missing Files** - Welcome page, logo, auth pages
2. **Environment Configuration** - OAuth credentials, API URLs
3. **Complex Code Changes** - Structural refactoring
4. **Asset Creation** - New images, icons

## Escalation Process

When an issue cannot be resolved automatically:

1. **Detection** - Issue is detected during health check
2. **Resolution Attempts** - Up to 3 automatic resolution attempts
3. **Monitoring** - Issue duration is tracked
4. **Escalation Trigger** - After severity-specific timeout:
   - CRITICAL: 5 minutes
   - HIGH: 15 minutes
   - MEDIUM: 30 minutes
   - LOW: 1 hour
5. **Notification** - Alert sent via configured channels:
   - Console output (default)
   - Email (configure SMTP)
   - Slack (configure webhook)
   - PagerDuty (configure API key)

## Configuration

### Adding Custom Checks

Edit `auto-resolver.js` and add new issues to the `defineIssues()` method:

```javascript
new Issue(
  'my-custom-check',
  'Description of the issue',
  Severity.MEDIUM,
  () => {
    // Detector function - return true if issue exists
    return someCondition;
  },
  async () => {
    // Resolver function - throw error if can't resolve
    // Fix the issue here
  }
)
```

### Notification Integration

Update the `sendEscalationNotification()` method to integrate with your notification system:

```javascript
async sendEscalationNotification() {
  const notification = {
    type: 'ESCALATION',
    issue: this.description,
    severity: this.severity.name,
    detectedAt: this.detectedAt,
  };

  // Add your notification logic:
  await sendSlackMessage(process.env.SLACK_WEBHOOK, notification);
  await sendEmail(process.env.ALERT_EMAIL, notification);
  await createPagerDutyIncident(process.env.PAGERDUTY_API_KEY, notification);
}
```

## Best Practices

1. **Run checks before deployments:**
   ```bash
   npm run check:welcome && npm run build
   ```

2. **Monitor in production:**
   ```bash
   npm run monitor:watch  # Run in background with process manager
   ```

3. **Integrate with alerts:**
   - Configure notification channels for escalations
   - Set up on-call rotation for critical issues
   - Create runbooks for manual intervention cases

4. **Review resolved issues:**
   - Check auto-resolver logs daily
   - Investigate recurring issues
   - Update auto-resolution logic as needed

## Logs and Reporting

The auto-resolver outputs detailed logs:

```
[2026-02-04T01:00:00.000Z] 🔍 Scanning for issues...
[2026-02-04T01:00:01.000Z] 🚨 NEW ISSUE DETECTED [HIGH]: Login page is missing
[2026-02-04T01:00:01.000Z] Attempting to resolve: Login page is missing (Attempt 1/3)
[2026-02-04T01:00:02.000Z] ✗ Resolution attempt failed: Requires manual intervention
[2026-02-04T01:15:00.000Z] 🚨 ESCALATION: Login page is missing
[2026-02-04T01:15:00.000Z]    Severity: HIGH
[2026-02-04T01:15:00.000Z]    Time elapsed: 15 minutes
```

## Troubleshooting

### Monitor won't start
```bash
# Check if already running
ps aux | grep auto-resolver

# Kill existing process
pkill -f auto-resolver

# Restart
npm run monitor:watch
```

### False positives
Update the detector function to be more specific or add exclusions.

### Resolution failures
Check logs for error details and update resolver function accordingly.

## Support

For issues or questions about the monitoring system, check:
1. Console output for detailed error messages
2. Issue tracking logs for pattern analysis
3. Escalation notifications for critical problems

## Future Enhancements

- [ ] Integration with monitoring dashboards (Grafana, Datadog)
- [ ] Machine learning for pattern detection
- [ ] Automatic rollback on critical failures
- [ ] Performance metrics tracking
- [ ] Visual regression testing
- [ ] Automated screenshot comparison

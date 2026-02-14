#!/bin/bash

# Schedule the latency optimization migration for 6pm PST
# This script schedules the migration using 'at' command

MIGRATION_SCRIPT="/Users/hannahschlacter/Desktop/muse-shopping/run-latency-migration.sh"
LOG_FILE="/Users/hannahschlacter/Desktop/muse-shopping/migration-067.log"

echo "Scheduling latency optimization migration for 6:00 PM PST today..."
echo ""

# Check if 'at' is available
if ! command -v at &> /dev/null; then
    echo "ERROR: 'at' command not found."
    echo "On macOS, you may need to enable it or use launchd instead."
    echo ""
    echo "Alternative: Run the migration manually at 6pm PST:"
    echo "  cd /Users/hannahschlacter/Desktop/muse-shopping"
    echo "  ./run-latency-migration.sh | tee migration-067.log"
    exit 1
fi

# Schedule the job
echo "cd /Users/hannahschlacter/Desktop/muse-shopping && ./run-latency-migration.sh > $LOG_FILE 2>&1" | at 18:00

if [ $? -eq 0 ]; then
    echo "✓ Migration scheduled successfully for 6:00 PM PST"
    echo ""
    echo "Scheduled jobs:"
    atq
    echo ""
    echo "To view output after execution:"
    echo "  cat $LOG_FILE"
    echo ""
    echo "To cancel the scheduled migration:"
    echo "  atrm <job_number>"
else
    echo "✗ Failed to schedule migration"
    echo ""
    echo "Manual execution command:"
    echo "  cd /Users/hannahschlacter/Desktop/muse-shopping"
    echo "  ./run-latency-migration.sh | tee migration-067.log"
fi

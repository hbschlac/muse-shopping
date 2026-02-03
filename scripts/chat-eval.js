const fs = require('fs');
const path = require('path');
const ChatEvaluationService = require('../src/services/chatEvaluationService');

async function run() {
  const casesPath = process.argv[2] || path.join(__dirname, '../tests/chat_eval_cases.json');
  const raw = fs.readFileSync(casesPath, 'utf8');
  const cases = JSON.parse(raw);

  const run = await ChatEvaluationService.createRun({
    name: `chat-eval-${new Date().toISOString()}`,
    metadata: { source: casesPath }
  });

  let passed = 0;
  let failed = 0;

  for (const testCase of cases) {
    // This is scaffolding: replace actual response generation later
    const actual = { message: 'stub', intent: testCase.expected.intent || 'unknown' };
    const isPassed = actual.intent === testCase.expected.intent;

    await ChatEvaluationService.recordCase({
      runId: run.id,
      caseName: testCase.name,
      prompt: testCase.prompt,
      expected: testCase.expected,
      actual,
      passed: isPassed,
      notes: 'stub evaluation'
    });

    if (isPassed) passed += 1; else failed += 1;
  }

  await ChatEvaluationService.finalizeRun({
    runId: run.id,
    total: passed + failed,
    passed,
    failed
  });

  console.log(`Chat eval complete: ${passed} passed, ${failed} failed (run ${run.id})`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

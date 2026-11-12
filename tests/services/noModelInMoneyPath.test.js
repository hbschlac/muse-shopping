/**
 * No AI model in the money path. Paying a store is fixed code that checks the
 * exact cart the shopper approved with Face ID. A model (and any text a model
 * reads, like hidden words on a store page) must never be able to reach it.
 *
 * This walks every file the payment code loads, all the way down, and fails if
 * any of them loads an AI client or a module that calls one. If you need a model
 * for something near checkout, keep it outside these files and pass it plain
 * data; never give it a function that pays. See docs/ROGUE_AGENT.md.
 */
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const ROOT = path.join(__dirname, '../..');
const MONEY_PATH = [
  'src/services/agentCheckout/index.js',
  'src/services/passkeys/index.js',
  'src/services/agentAudit/index.js',
];
// AI SDKs and HTTP hosts of model APIs.
const AI_PACKAGE = /^(openai|@anthropic-ai\/|@google\/(generative-ai|genai)|@ai-sdk\/|ai$|langchain|@langchain\/|ollama|@mistralai\/|cohere-ai|replicate|groq-sdk|together-ai)/;
const AI_HOST = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.cohere\.|api\.groq\.com/;

function walk(file, seen, trail) {
  if (seen.has(file)) return [];
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  const problems = [];
  if (AI_HOST.test(src)) problems.push(`${[...trail, rel(file)].join(' -> ')} calls a model API`);
  for (const [, spec] of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (builtinModules.includes(spec.replace(/^node:/, ''))) continue;
    if (!spec.startsWith('.')) {
      if (AI_PACKAGE.test(spec)) problems.push(`${[...trail, rel(file)].join(' -> ')} loads ${spec}`);
      continue;
    }
    let target;
    try { target = require.resolve(path.resolve(path.dirname(file), spec)); } catch { continue; }
    if (target.endsWith('.js')) problems.push(...walk(target, seen, [...trail, rel(file)]));
  }
  return problems;
}

const rel = (f) => path.relative(ROOT, f);

describe('no AI model in the money path', () => {
  test.each(MONEY_PATH)('%s never loads an AI model, directly or indirectly', (entry) => {
    const problems = walk(path.join(ROOT, entry), new Set(), []);
    expect(problems).toEqual([]);
  });

  test('the walker does catch a model client', () => {
    expect(walk(path.join(ROOT, 'src/services/chatService.js'), new Set(), []).length).toBeGreaterThan(0);
  });
});

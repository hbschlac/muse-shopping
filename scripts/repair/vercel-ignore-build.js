#!/usr/bin/env node
'use strict';

// Vercel "ignoreCommand": exit 0 skips the build, exit 1 builds.
// Skips only when every file in the commit is a store script or its saved
// test page under extractors/. Anything unclear builds, so a mistake here can
// only cost a build, never skip a real site change.

const { execFileSync } = require('child_process');
const { shouldSkipVercelBuild } = require('./pathRules');

function changedFiles() {
  const prev = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const range = prev ? [prev, 'HEAD'] : ['HEAD^', 'HEAD'];
  const out = execFileSync('git', ['diff', '--name-only', ...range], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

try {
  const files = changedFiles();
  if (shouldSkipVercelBuild(files)) {
    console.log(`Skipping build: only store scripts changed (${files.length} files).`);
    process.exit(0);
  }
  console.log('Building: commit touches the site.');
  process.exit(1);
} catch (err) {
  console.log(`Building: could not read changed files (${err.message}).`);
  process.exit(1);
}

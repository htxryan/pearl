#!/usr/bin/env node
// Record one or more bite-sized demo videos from the library in docs/demos/.
// Usage:
//   node scripts/record-demo.mjs <id-or-prefix>   # e.g. "03" or "03-keyboard-navigation"
//   node scripts/record-demo.mjs --all
//   node scripts/record-demo.mjs --list
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runScene } from './demo-lib/recorder.mjs';

const DEMOS_DIR = path.resolve('docs/demos');

function discoverDemos() {
  if (!fs.existsSync(DEMOS_DIR)) return [];
  return fs
    .readdirSync(DEMOS_DIR)
    .filter((name) => /^\d+-/.test(name))
    .filter((name) => fs.existsSync(path.join(DEMOS_DIR, name, 'scene.mjs')))
    .sort()
    .map((name) => ({ id: name, folder: path.join(DEMOS_DIR, name) }));
}

async function loadScene(demo) {
  const scenePath = path.join(demo.folder, 'scene.mjs');
  const mod = await import(pathToFileURL(scenePath).href);
  if (typeof mod.default !== 'function') {
    throw new Error(`${demo.id}/scene.mjs must default-export an async function`);
  }
  return { scene: mod.default, meta: mod.meta ?? {} };
}

function matchDemo(demos, query) {
  if (!query) return null;
  const exact = demos.find((d) => d.id === query);
  if (exact) return [exact];
  const prefix = demos.filter((d) => d.id.startsWith(query));
  if (prefix.length) return prefix;
  const substring = demos.filter((d) => d.id.includes(query));
  return substring.length ? substring : null;
}

function printList(demos, out = console.log) {
  for (const d of demos) out(`  ${d.id}`);
}

async function main() {
  const args = process.argv.slice(2);
  const demos = discoverDemos();

  if (!demos.length) {
    console.error('No demos found in docs/demos/');
    process.exit(1);
  }

  if (args.includes('--list') || args.includes('-l')) {
    for (const d of demos) console.log(d.id);
    return;
  }

  let selected;
  if (args.includes('--all')) {
    selected = demos;
  } else if (args[0] && !args[0].startsWith('-')) {
    const matched = matchDemo(demos, args[0]);
    if (!matched) {
      console.error(`No demo matches "${args[0]}". Available:`);
      printList(demos, console.error);
      process.exit(1);
    }
    selected = matched;
  } else {
    console.error('Usage: node scripts/record-demo.mjs <id|prefix> | --all | --list');
    console.error('Available:');
    printList(demos, console.error);
    process.exit(1);
  }

  console.log(`Recording ${selected.length} demo${selected.length === 1 ? '' : 's'}...`);
  const failures = [];
  for (const demo of selected) {
    console.log(`\n── ${demo.id} ──`);
    try {
      const { scene, meta } = await loadScene(demo);
      await runScene({ id: demo.id, folder: demo.folder, scene, meta });
    } catch (e) {
      console.error(`✗ ${demo.id}: ${e.message}`);
      failures.push(demo.id);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} demo(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log(`\nAll ${selected.length} demo(s) recorded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

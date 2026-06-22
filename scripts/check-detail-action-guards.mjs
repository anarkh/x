import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const detailJs = readFileSync(join(rootDir, 'pages/detail/detail.js'), 'utf8');
const detailWxml = readFileSync(join(rootDir, 'pages/detail/detail.wxml'), 'utf8');
const storeJs = readFileSync(join(rootDir, 'utils/store.js'), 'utf8');

assert.match(detailJs, /busyAction:\s*''/, 'Detail page should track the active trust action.');
assert.match(detailJs, /resolving:\s*false/, 'Detail page should track resolve submission state.');
assert.match(
  detailJs,
  /async react\(event\)[\s\S]*?if \(this\.data\.busyAction\)[\s\S]*?this\.setData\(\{ busyAction: action \}\);[\s\S]*?try \{[\s\S]*?await reactToPost[\s\S]*?\} catch \(error\)[\s\S]*?\} finally \{[\s\S]*?busyAction: ''[\s\S]*?\}/,
  'react() should guard against repeated taps and recover from failed reactions.'
);
assert.match(
  detailJs,
  /this\.setData\(\{ resolving: true \}\);[\s\S]*?try \{[\s\S]*?await resolvePost[\s\S]*?\} catch \(error\)[\s\S]*?\} finally \{[\s\S]*?resolving: false[\s\S]*?\}/,
  'resolve() should show busy state and recover from failed close attempts.'
);
assert.match(
  detailJs,
  /if \(this\.data\.resolving\)[\s\S]*?this\.setData\(\{ resolving: true \}\);[\s\S]*?wx\.showModal/,
  'resolve() should lock before opening the confirmation modal.'
);
assert.match(
  detailJs,
  /if \(!result\.confirm\) \{[\s\S]*?this\.setData\(\{ resolving: false \}\);[\s\S]*?fail: \(\) => \{[\s\S]*?this\.setData\(\{ resolving: false \}\);/,
  'resolve() should release the lock when the modal is cancelled or fails to open.'
);
assert.match(
  detailWxml,
  /loading="\{\{busyAction === 'confirm'\}\}"[\s\S]*?disabled="\{\{post\.confirmedByMe \|\| busyAction\}\}"/,
  'Confirm button should reflect busyAction while a trust action is running.'
);
assert.match(
  detailWxml,
  /loading="\{\{busyAction === 'stale'\}\}"[\s\S]*?disabled="\{\{post\.staledByMe \|\| busyAction\}\}"/,
  'Stale button should reflect busyAction while a trust action is running.'
);
assert.match(
  detailWxml,
  /loading="\{\{busyAction === 'report'\}\}"[\s\S]*?disabled="\{\{post\.reportedByMe \|\| busyAction\}\}"/,
  'Report button should reflect busyAction while a trust action is running.'
);
assert.match(
  detailWxml,
  /loading="\{\{resolving\}\}"[\s\S]*?disabled="\{\{resolving\}\}"[\s\S]*?\{\{resolving \? '关闭中' : post\.resolveText\}\}/,
  'Resolve button should expose a busy state while closing a post.'
);

const reactToPostMatch = storeJs.match(/export async function reactToPost\(id, action\) \{([\s\S]*?)\n\}\n\nexport async function resolvePost/);
assert.ok(reactToPostMatch, 'reactToPost() should exist before resolvePost().');
const reactToPostBody = reactToPostMatch[1];
assert.match(
  reactToPostBody,
  /if \(hasReactedToPost\(id, action\)\)[\s\S]*?const post = await findPost\(id\);[\s\S]*?if \(hasReactedToPost\(id, action\)\)/,
  'reactToPost() should check duplicate local reactions both before and after async post lookup.'
);

console.log('Detail action guard checks passed.');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const cloudFunctionPath = join(rootDir, 'cloudfunctions/posts/index.js');
const source = readFileSync(cloudFunctionPath, 'utf8');

function extractFunction(name) {
  const declaration = `async function ${name}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `Missing ${declaration}`);

  const bodyStart = source.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `Missing body for ${name}`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart + 1, index);
      }
    }
  }

  assert.fail(`Could not find end of ${name}`);
}

const listCommentsBody = extractFunction('listComments');

const collectionIndex = listCommentsBody.indexOf('db.collection(COMMENTS_COLLECTION)');
const whereIndex = listCommentsBody.indexOf('.where({', collectionIndex);
const orderIndex = listCommentsBody.indexOf(".orderBy('createdAt', 'desc')", whereIndex);
const limitIndex = listCommentsBody.indexOf('.limit(MAX_COMMENTS_PER_POST)', whereIndex);
const getIndex = listCommentsBody.indexOf('.get()', limitIndex);

assert.notEqual(collectionIndex, -1, 'listComments must query COMMENTS_COLLECTION');
assert.notEqual(whereIndex, -1, 'listComments must filter comments before ordering');
assert.notEqual(orderIndex, -1, 'listComments must order by createdAt desc before limiting');
assert.notEqual(limitIndex, -1, 'listComments must cap comments with MAX_COMMENTS_PER_POST');
assert.notEqual(getIndex, -1, 'listComments must execute the comment query');
assert.ok(whereIndex < orderIndex, 'listComments must apply where before orderBy');
assert.ok(orderIndex < limitIndex, 'listComments must order comments before limit');
assert.ok(limitIndex < getIndex, 'listComments must limit before get');
assert.match(
  listCommentsBody,
  /\.sort\(\(a,\s*b\)\s*=>\s*b\.createdAt\s*-\s*a\.createdAt\)/,
  'listComments should keep defensive newest-first sorting after normalization'
);

console.log('Cloud comment order checks passed.');

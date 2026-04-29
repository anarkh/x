import { readdirSync, readFileSync, statSync } from 'node:fs';

function jsonFilesUnder(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const path = `${dir}/${entry}`;
    if (statSync(path).isDirectory()) {
      return jsonFilesUnder(path);
    }
    return path.endsWith('.json') ? [path] : [];
  });
}

const files = [
  'app.json',
  'project.config.json',
  'sitemap.json',
  ...jsonFilesUnder('pages')
];

for (const file of files) {
  JSON.parse(readFileSync(file, 'utf8'));
}

console.log(`Checked ${files.length} JSON files.`);

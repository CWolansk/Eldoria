const fs = require('fs');
const path = require('path');

const DOCS_ROOT = __dirname;
const PUBLIC_ROOT = path.join(DOCS_ROOT, 'Public');
const EXTRA_HTML = [
  path.join(DOCS_ROOT, 'index.html'),
  path.join(DOCS_ROOT, 'search.html'),
  path.join(DOCS_ROOT, 'npc-reference.html'),
  path.join(DOCS_ROOT, 'location-reference.html'),
  path.join(DOCS_ROOT, 'background-search.html'),
  path.join(DOCS_ROOT, 'feat-search.html'),
  path.join(DOCS_ROOT, 'item-search.html'),
  path.join(DOCS_ROOT, 'race-search.html'),
  path.join(DOCS_ROOT, 'spell-search.html'),
];

function walkFiles(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, files);
    } else if (!predicate || predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeRef(value) {
  const ref = value.trim();
  if (!ref || ref === '#') return null;
  if (/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(ref)) return null;
  const noHash = ref.split('#')[0];
  const noQuery = noHash.split('?')[0];
  if (!noQuery) return null;
  return decodeURIComponent(noQuery);
}

function resolveTarget(fromFile, ref) {
  const base = path.dirname(fromFile);
  const withoutLeadingSlash = ref.replace(/^\/+/, '');
  return path.resolve(ref.startsWith('/') ? DOCS_ROOT : base, withoutLeadingSlash);
}

function isInsideDocs(filePath) {
  const relative = path.relative(DOCS_ROOT, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function validateFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const problems = [];
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    const ref = normalizeRef(match[1]);
    if (!ref) continue;
    const target = resolveTarget(filePath, ref);
    if (!isInsideDocs(target)) {
      problems.push({ filePath, ref: match[1], reason: 'points outside docs' });
    } else if (!fs.existsSync(target)) {
      problems.push({ filePath, ref: match[1], reason: 'missing target' });
    }
  }

  const missingLinkPattern = /data-missing-link=["']([^"']+)["']/gi;
  while ((match = missingLinkPattern.exec(html))) {
    problems.push({ filePath, ref: match[1], reason: 'unresolved wiki link' });
  }
  return problems;
}

function main() {
  const htmlFiles = walkFiles(PUBLIC_ROOT, (file) => file.endsWith('.html'))
    .concat(EXTRA_HTML.filter((file) => fs.existsSync(file)));
  const problems = htmlFiles.flatMap(validateFile);

  if (problems.length) {
    console.error(`Found ${problems.length} public link issue(s):`);
    for (const problem of problems.slice(0, 50)) {
      const from = path.relative(DOCS_ROOT, problem.filePath);
      console.error(`- ${from}: ${problem.ref} (${problem.reason})`);
    }
    if (problems.length > 50) {
      console.error(`...and ${problems.length - 50} more`);
    }
    process.exit(1);
  }

  console.log(`Validated ${htmlFiles.length} HTML files with no broken local links.`);
}

main();

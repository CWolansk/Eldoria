const fs = require('fs');
const path = require('path');

const VAULT_ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(VAULT_ROOT, 'docs');
const PUBLIC_DIR = path.join(VAULT_ROOT, 'Public');
const GENERATED_ASSET_DIR = path.join(DOCS_DIR, 'assets', 'generated');

const OUTPUT_ROOT_BY_PUBLIC_ROOT = {
  World: 'world',
  Storylines: 'storylines',
  Players: 'players'
};

const IMAGE_EXTENSIONS = new Set([
  '.apng',
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp'
]);

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function stripPublicPrefix(target) {
  return toPosix(target)
    .replace(/^\/+/, '')
    .replace(/^Public\//i, '');
}

function stripKnownExtension(value) {
  const ext = path.posix.extname(value);
  if (!ext) return value;
  return value.slice(0, -ext.length);
}

function publicTargetKey(value) {
  return stripKnownExtension(stripPublicPrefix(value)).toLowerCase();
}

function slugifySegment(segment) {
  const normalized = String(segment || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'untitled';
}

function slugifyFileName(fileName, forcedExtension = null) {
  const sourceExt = path.posix.extname(fileName);
  const ext = forcedExtension || sourceExt.toLowerCase();
  const base = sourceExt ? fileName.slice(0, -sourceExt.length) : fileName;
  return `${slugifySegment(base)}${ext}`;
}

function outputRelForPublicRel(publicRel) {
  const normalized = stripPublicPrefix(publicRel);
  const parts = normalized.split('/').filter(Boolean);
  const publicRoot = parts.shift();
  const outputRoot = OUTPUT_ROOT_BY_PUBLIC_ROOT[publicRoot];
  if (!outputRoot || parts.length === 0) return null;

  const fileName = parts.pop();
  const outputParts = [outputRoot, ...parts.map(slugifySegment), slugifyFileName(fileName, '.html')];
  return outputParts.join('/');
}

function assetOutputRelForPublicRel(publicRel) {
  const normalized = stripPublicPrefix(publicRel);
  const parts = normalized.split('/').filter(Boolean);
  const fileName = parts.pop();
  return ['assets', 'generated', ...parts.map(slugifySegment), slugifyFileName(fileName)].join('/');
}

function relativeHref(fromOutputRel, toOutputRel) {
  const fromDir = path.posix.dirname(toPosix(fromOutputRel));
  const rel = path.posix.relative(fromDir, toPosix(toOutputRel));
  return rel || path.posix.basename(toOutputRel);
}

function isInside(parentDir, targetPath) {
  const parent = path.resolve(parentDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(parent, target);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function walkFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;

  for (const item of fs.readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (stat.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function pushIndex(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function buildPublicPathMap(publicDir = PUBLIC_DIR) {
  const markdownPages = [];
  const assets = [];
  const pagesByNoExt = new Map();
  const pagesByStem = new Map();
  const assetsByNoExt = new Map();
  const assetsByStem = new Map();
  const outputByRel = new Map();

  for (const fullPath of walkFiles(publicDir)) {
    const publicRel = toPosix(path.relative(publicDir, fullPath));
    const ext = path.extname(fullPath).toLowerCase();

    if (ext === '.md') {
      const outputRel = outputRelForPublicRel(publicRel);
      if (!outputRel) continue;

      const entry = { fullPath, publicRel, outputRel };
      markdownPages.push(entry);
      pagesByNoExt.set(publicTargetKey(publicRel), entry);
      pushIndex(pagesByStem, path.basename(publicRel, ext).toLowerCase(), entry);
      outputByRel.set(outputRel, entry);
      continue;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      const outputRel = assetOutputRelForPublicRel(publicRel);
      const entry = { fullPath, publicRel, outputRel };
      assets.push(entry);
      assetsByNoExt.set(publicTargetKey(publicRel), entry);
      pushIndex(assetsByStem, path.basename(publicRel, ext).toLowerCase(), entry);
    }
  }

  markdownPages.sort((a, b) => a.publicRel.localeCompare(b.publicRel));
  assets.sort((a, b) => a.publicRel.localeCompare(b.publicRel));

  return {
    publicDir,
    markdownPages,
    assets,
    pagesByNoExt,
    pagesByStem,
    assetsByNoExt,
    assetsByStem,
    outputByRel
  };
}

module.exports = {
  DOCS_DIR,
  VAULT_ROOT,
  PUBLIC_DIR,
  GENERATED_ASSET_DIR,
  IMAGE_EXTENSIONS,
  assetOutputRelForPublicRel,
  buildPublicPathMap,
  isInside,
  outputRelForPublicRel,
  publicTargetKey,
  relativeHref,
  slugifySegment,
  stripKnownExtension,
  stripPublicPrefix,
  toPosix,
  walkFiles
};

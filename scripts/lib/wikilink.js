const path = require('path');

const {
  IMAGE_EXTENSIONS,
  publicTargetKey,
  relativeHref,
  slugifySegment,
  stripKnownExtension,
  stripPublicPrefix,
  toPosix
} = require('./path-map');

function splitWikiTarget(rawTarget) {
  const [targetPart, ...displayParts] = String(rawTarget || '').split('|');
  const display = displayParts.join('|').trim();
  const [pathPart, ...anchorParts] = targetPart.trim().split('#');

  return {
    target: pathPart.trim(),
    anchor: anchorParts.join('#').trim(),
    display
  };
}

function displayNameForTarget(target) {
  const withoutAnchor = String(target || '').split('#')[0];
  const last = toPosix(withoutAnchor).split('/').filter(Boolean).pop() || withoutAnchor;
  return stripKnownExtension(last);
}

function isImageTarget(target) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(toPosix(target)).toLowerCase());
}

function anchorSlug(anchor) {
  return slugifySegment(anchor);
}

function preferClosestByPath(candidates, context) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const contextParts = toPosix(context.publicRel).split('/').slice(0, -1);
  let best = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    const candidateParts = toPosix(candidate.publicRel).split('/').slice(0, -1);
    let score = 0;
    while (
      score < contextParts.length &&
      score < candidateParts.length &&
      contextParts[score].toLowerCase() === candidateParts[score].toLowerCase()
    ) {
      score += 1;
    }
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function resolveFromMap(target, context, publicMap, kind) {
  const normalizedTarget = stripPublicPrefix(target);
  const targetKey = publicTargetKey(normalizedTarget);
  const directMap = kind === 'asset' ? publicMap.assetsByNoExt : publicMap.pagesByNoExt;
  const stemMap = kind === 'asset' ? publicMap.assetsByStem : publicMap.pagesByStem;

  if (directMap.has(targetKey)) return directMap.get(targetKey);

  const contextDir = toPosix(context.publicRel).split('/').slice(0, -1).join('/');
  if (contextDir && !normalizedTarget.includes('/')) {
    const localKey = publicTargetKey(`${contextDir}/${normalizedTarget}`);
    if (directMap.has(localKey)) return directMap.get(localKey);
  }

  const targetParts = normalizedTarget.split('/').filter(Boolean);
  if (targetParts.length > 1) {
    const last = targetParts[targetParts.length - 1];
    const previous = targetParts[targetParts.length - 2];
    if (last.toLowerCase() === previous.toLowerCase()) {
      const foldedKey = publicTargetKey(targetParts.slice(0, -1).join('/'));
      if (directMap.has(foldedKey)) return directMap.get(foldedKey);
    }
  }

  if (normalizedTarget.includes('/')) {
    const targetParent = path.posix.dirname(normalizedTarget).toLowerCase();
    const targetStem = stripKnownExtension(path.posix.basename(normalizedTarget)).toLowerCase();
    const entries = kind === 'asset' ? publicMap.assets : publicMap.markdownPages;
    const candidates = entries.filter((entry) => {
      const entryParent = path.posix.dirname(stripKnownExtension(entry.publicRel)).toLowerCase();
      const entryStem = stripKnownExtension(path.posix.basename(entry.publicRel)).toLowerCase();
      return entryParent === targetParent && (entryStem.includes(targetStem) || targetStem.includes(entryStem));
    });
    const closest = preferClosestByPath(candidates, context);
    if (closest) return closest;
  }

  if (!normalizedTarget.includes('/')) {
    const stem = stripKnownExtension(normalizedTarget).toLowerCase();
    return preferClosestByPath(stemMap.get(stem), context);
  }

  return null;
}

function resolveWikiTarget(rawTarget, context, publicMap) {
  const parts = splitWikiTarget(rawTarget);
  const display = parts.display || displayNameForTarget(parts.target || parts.anchor);

  if (!parts.target && parts.anchor) {
    return {
      kind: 'anchor',
      display,
      href: `#${anchorSlug(parts.anchor)}`
    };
  }

  if (/^(private|private\/|private\\)/i.test(parts.target)) {
    return { kind: 'private', display, target: parts.target };
  }

  if (isImageTarget(parts.target)) {
    const asset = resolveFromMap(parts.target, context, publicMap, 'asset');
    if (!asset) return { kind: 'missing-asset', display, target: parts.target };
    return {
      kind: 'asset',
      display,
      target: parts.target,
      asset,
      href: relativeHref(context.outputRel, asset.outputRel)
    };
  }

  const page = resolveFromMap(parts.target, context, publicMap, 'page');
  if (!page) return { kind: 'missing-page', display, target: parts.target };

  return {
    kind: 'page',
    display,
    target: parts.target,
    page,
    href: `${relativeHref(context.outputRel, page.outputRel)}${parts.anchor ? `#${anchorSlug(parts.anchor)}` : ''}`
  };
}

function markdownEscapeText(value) {
  return String(value || '').replace(/[[\]]/g, '\\$&');
}

function markdownEscapeUrl(value) {
  return String(value || '').replace(/\)/g, '%29');
}

function replaceWikiLinks(markdown, context, publicMap, diagnostics = null) {
  let rendered = String(markdown || '').replace(/!\[\[([^\]]+)\]\]/g, (_match, rawTarget) => {
    const resolved = resolveWikiTarget(rawTarget, context, publicMap);
    if (resolved.kind === 'asset') {
      return `![${markdownEscapeText(resolved.display)}](${markdownEscapeUrl(resolved.href)})`;
    }
    if (diagnostics) {
      diagnostics.unresolvedEmbeds.push({
        source: context.publicRel,
        target: rawTarget,
        reason: resolved.kind
      });
    }
    return `_${markdownEscapeText(`Missing embed: ${resolved.display}`)}_`;
  });

  rendered = rendered.replace(/\[\[([^\]]+)\]\]/g, (_match, rawTarget) => {
    const resolved = resolveWikiTarget(rawTarget, context, publicMap);
    if (resolved.kind === 'page' || resolved.kind === 'anchor') {
      return `[${markdownEscapeText(resolved.display)}](${markdownEscapeUrl(resolved.href)})`;
    }
    if (diagnostics) {
      diagnostics.unresolvedLinks.push({
        source: context.publicRel,
        target: rawTarget,
        reason: resolved.kind
      });
    }
    return markdownEscapeText(resolved.display);
  });

  return rendered;
}

function extractResolvedPageLinks(markdown, context, publicMap) {
  const links = [];
  const re = /!?\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = re.exec(markdown)) !== null) {
    if (match[0].startsWith('!')) continue;
    const resolved = resolveWikiTarget(match[1], context, publicMap);
    if (resolved.kind === 'page' && resolved.page.publicRel !== context.publicRel) {
      links.push(resolved.page);
    }
  }

  return [...new Map(links.map((entry) => [entry.publicRel, entry])).values()];
}

function findForbiddenPrivateRefs(markdown, sourceLabel) {
  const problems = [];
  const wikiRe = /!?\[\[([^\]]+)\]\]/g;
  const mdLinkRe = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;

  while ((match = wikiRe.exec(markdown)) !== null) {
    const target = splitWikiTarget(match[1]).target;
    if (/(^|[\\/])Private([\\/]|$)/i.test(toPosix(target))) {
      problems.push(`${sourceLabel}: wiki-link points at ${target}`);
    }
  }

  while ((match = mdLinkRe.exec(markdown)) !== null) {
    if (/(^|[\\/])Private([\\/]|$)/i.test(toPosix(match[1]))) {
      problems.push(`${sourceLabel}: markdown link points at ${match[1]}`);
    }
  }

  return problems;
}

module.exports = {
  extractResolvedPageLinks,
  findForbiddenPrivateRefs,
  replaceWikiLinks,
  resolveWikiTarget,
  splitWikiTarget
};

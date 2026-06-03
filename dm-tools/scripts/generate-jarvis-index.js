#!/usr/bin/env node

/**
 * DM Jarvis — Vault Indexer
 * 
 * Scans the Eldoria Obsidian vault and generates a comprehensive JSON index
 * of all entities (NPCs, shops, settlements, locations, quests, organizations, etc.)
 * for use by the DM Jarvis live dashboard.
 * 
 * Usage: node scripts/generate-jarvis-index.js
 */

const fs = require('fs');
const path = require('path');

const DM_TOOLS_DIR = path.resolve(__dirname, '..');
const VAULT_ROOT = path.resolve(DM_TOOLS_DIR, '..');
const PRIVATE_DIR = path.join(VAULT_ROOT, 'Private');
const PUBLIC_DIR = path.join(VAULT_ROOT, 'Public');
const OUTPUT_PATH = path.join(DM_TOOLS_DIR, 'data', 'jarvis-index.json');

// ---------------------------------------------------------------------------
// YAML Frontmatter Parser (simple, no dependencies)
// ---------------------------------------------------------------------------
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const yaml = match[1];
    const data = {};
    let currentKey = null;
    let currentList = null;

    for (const rawLine of yaml.split(/\r?\n/)) {
        const line = rawLine;
        // List item
        const listMatch = line.match(/^(\s+)-\s+(.*)/);
        if (listMatch && currentKey) {
            const val = listMatch[2].trim().replace(/^["']|["']$/g, '');
            if (!currentList) {
                currentList = [];
                data[currentKey] = currentList;
            }
            currentList.push(val);
            continue;
        }
        // Key-value
        const kvMatch = line.match(/^([a-zA-Z_-]+)\s*:\s*(.*)/);
        if (kvMatch) {
            currentKey = kvMatch[1].trim();
            const rawVal = kvMatch[2].trim();
            currentList = null;
            if (rawVal === '' || rawVal === '[]') {
                data[currentKey] = rawVal === '[]' ? [] : '';
            } else {
                data[currentKey] = rawVal.replace(/^["']|["']$/g, '');
            }
        }
    }
    return data;
}

// ---------------------------------------------------------------------------
// Extract a brief plain-text summary from markdown body (after frontmatter)
// ---------------------------------------------------------------------------
function extractSummary(content, maxLen = 300) {
    let body = cleanMarkdownBody(content);
    if (body.length > maxLen) {
        body = body.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
    }
    return body;
}

// ---------------------------------------------------------------------------
// Clean markdown body for plain-text display
// ---------------------------------------------------------------------------
function cleanMarkdownBody(content) {
    // Strip frontmatter
    let body = content.replace(/^---[\s\S]*?---/, '').trim();
    // Strip embed lines like ![[...]]
    body = body.replace(/!\[\[.*?\]\]/g, '');
    // Strip wiki links, keep display text
    body = body.replace(/\[\[([^\]|]*?\|)?([^\]]*?)\]\]/g, '$2');
    // Strip dataview blocks
    body = body.replace(/```dataview[\s\S]*?```/g, '');
    // Strip code blocks
    body = body.replace(/```[\s\S]*?```/g, '');
    // Collapse whitespace
    body = body.replace(/\n{3,}/g, '\n\n').trim();
    return body;
}

// ---------------------------------------------------------------------------
// Extract full markdown body preserving headings and structure
// ---------------------------------------------------------------------------
function extractFullBody(content) {
    // Strip frontmatter, keep everything else
    let body = content.replace(/^---[\s\S]*?---/, '').trim();
    // Strip dataview blocks
    body = body.replace(/```dataview[\s\S]*?```/g, '');
    // Strip embed lines (they won't resolve in the dashboard)
    body = body.replace(/!\[\[.*?\]\]/g, '');
    // Convert wiki-links to display text
    body = body.replace(/\[\[([^\]|]*?\|)?([^\]]*?)\]\]/g, '$2');
    return body.trim();
}

// ---------------------------------------------------------------------------
// Extract wiki-link mentions from content
// ---------------------------------------------------------------------------
function extractMentions(content) {
    const mentions = [];
    const re = /\[\[([^\]|]*?)(?:\|([^\]]*?))?\]\]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        const target = m[1].trim();
        const display = (m[2] || '').trim();
        // Extract just the file name from the path
        const name = display || target.split('/').pop();
        if (name && !mentions.includes(name)) {
            mentions.push(name);
        }
    }
    return mentions;
}

// ---------------------------------------------------------------------------
// Recursively find .md files
// ---------------------------------------------------------------------------
function findMarkdownFiles(dir, basePath = '') {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const relPath = path.join(basePath, item).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...findMarkdownFiles(fullPath, relPath));
        } else if (item.endsWith('.md')) {
            results.push({ fullPath, relPath });
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Derive settlement from file path
// ---------------------------------------------------------------------------
function deriveSettlement(relPath) {
    // Pattern: World/{Region}/{Settlement}/...
    const parts = relPath.replace(/\\/g, '/').split('/');
    const worldIdx = parts.indexOf('World');
    if (worldIdx >= 0 && parts.length > worldIdx + 2) {
        return parts[worldIdx + 2];
    }
    return '';
}

function deriveRegion(relPath) {
    const parts = relPath.replace(/\\/g, '/').split('/');
    const worldIdx = parts.indexOf('World');
    if (worldIdx >= 0 && parts.length > worldIdx + 1) {
        return parts[worldIdx + 1];
    }
    return '';
}

// ---------------------------------------------------------------------------
// Classify entity from frontmatter + path
// ---------------------------------------------------------------------------
function classifyEntity(fm, relPath) {
    // Frontmatter type is most reliable
    const fmType = (fm.type || '').toLowerCase();
    if (fmType) {
        const typeMap = {
            npc: 'NPC',
            store: 'Store',
            settlement: 'Settlement',
            location: 'Location',
            organization: 'Organization',
            region: 'Region',
            quest: 'Quest',
            event: 'Event',
            consequence: 'Consequence',
            holiday: 'Holiday',
            'political crisis': 'Event',
            session_state: 'SessionState',
        };
        if (typeMap[fmType]) return typeMap[fmType];
    }

    // Fall back to path patterns
    const lowerPath = relPath.toLowerCase();
    if (lowerPath.includes('/npcs/')) return 'NPC';
    if (lowerPath.includes('/quests/')) return 'Quest';
    if (lowerPath.includes('/consequences/')) return 'Consequence';
    if (lowerPath.includes('/holidays/')) return 'Holiday';
    if (lowerPath.includes('/encounters/')) return 'Encounter';
    if (lowerPath.includes('/groups/')) return 'Organization';
    if (lowerPath.includes('/events/')) return 'Event';

    return 'Other';
}

// ---------------------------------------------------------------------------
// Build a search-friendly alias list
// ---------------------------------------------------------------------------
function buildAliases(name, fm) {
    const aliases = new Set();
    aliases.add(name.toLowerCase());
    // Add words from name
    for (const word of name.split(/\s+/)) {
        if (word.length > 2) aliases.add(word.toLowerCase());
    }
    // Frontmatter aliases
    if (fm.aliases) {
        const arr = Array.isArray(fm.aliases) ? fm.aliases : [fm.aliases];
        for (const a of arr) aliases.add(a.toLowerCase());
    }
    // Profession keywords
    if (fm.profession) {
        for (const word of fm.profession.split(/[\s,/]+/)) {
            if (word.length > 2) aliases.add(word.toLowerCase());
        }
    }
    // Store type
    if (fm.store_type) aliases.add(fm.store_type.toLowerCase());
    // Location type
    if (fm.location_type) aliases.add(fm.location_type.toLowerCase());
    // Org type
    if (fm.org_type) aliases.add(fm.org_type.toLowerCase());
    // Subtype
    if (fm.subtype) aliases.add(fm.subtype.toLowerCase());
    return [...aliases];
}

// ---------------------------------------------------------------------------
// Build service type mapping for shops/stores
// ---------------------------------------------------------------------------
function inferServiceTypes(fm, name) {
    const services = new Set();
    const text = [
        fm.store_type, fm.subtype, fm.profession, fm.name, name,
        ...(Array.isArray(fm.services) ? fm.services : []),
        ...(Array.isArray(fm.tags) ? fm.tags : []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    const serviceKeywords = {
        blacksmith: ['blacksmith', 'forge', 'smithy', 'smith', 'ironwork', 'armament'],
        inn: ['inn', 'lodging', 'rooms', 'beds'],
        tavern: ['tavern', 'bar', 'pub', 'alehouse', 'drinks'],
        general_store: ['general store', 'general', 'supplies', 'sundries', 'goods'],
        apothecary: ['apothecary', 'potions', 'herbs', 'healer', 'alchemy'],
        weapons: ['weapon', 'sword', 'blade', 'armament'],
        armor: ['armor', 'armour', 'shield'],
        magic: ['magic', 'arcane', 'enchant', 'wizard', 'spell', 'trinket', 'wonders'],
        food: ['food', 'bakery', 'butcher', 'fish', 'market'],
        clothing: ['tailor', 'clothing', 'cloth', 'fabric'],
        jeweler: ['jewel', 'gem', 'goldsmith', 'silversmith'],
        repairs: ['repair', 'fix', 'mend'],
        stable: ['stable', 'horse', 'mount'],
        temple: ['temple', 'shrine', 'church', 'chapel'],
        library: ['library', 'books', 'scroll', 'scribe'],
        guild: ['guild'],
    };

    for (const [service, keywords] of Object.entries(serviceKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
            services.add(service);
        }
    }
    return [...services];
}

// ---------------------------------------------------------------------------
// Discover settlement folders from directory structure
// ---------------------------------------------------------------------------
function discoverSettlementFolders(worldDir) {
    const settlements = [];
    if (!fs.existsSync(worldDir)) return settlements;
    const skipFolders = new Set(['groups', 'npcs', 'archived room', 'templates']);
    for (const region of fs.readdirSync(worldDir)) {
        const regionPath = path.join(worldDir, region);
        if (!fs.statSync(regionPath).isDirectory()) continue;
        if (skipFolders.has(region.toLowerCase())) continue;
        for (const settlement of fs.readdirSync(regionPath)) {
            const settlPath = path.join(regionPath, settlement);
            if (!fs.statSync(settlPath).isDirectory()) continue;
            if (skipFolders.has(settlement.toLowerCase())) continue;
            settlements.push({ name: settlement, region });
        }
    }
    return settlements;
}

// ---------------------------------------------------------------------------
// Main: Scan vault and build index
// ---------------------------------------------------------------------------
function buildIndex() {
    console.log('🔍 DM Jarvis — Scanning vault...\n');

    const entities = [];
    const serviceIndex = {};     // service_type -> [entity indices]
    const settlementIndex = {};  // settlement_name -> [entity indices]
    const regionIndex = {};      // region_name -> [entity indices]
    const nameIndex = {};        // lowercase name -> entity index

    // Discover settlement folders from directory structure
    // These become synthetic Settlement entities even without frontmatter
    const syntheticSettlements = discoverSettlementFolders(
        path.join(PRIVATE_DIR, '1. World Almanac', 'World')
    );

    // Scan Private files (primary source — has full metadata)
    const privateFiles = findMarkdownFiles(
        path.join(PRIVATE_DIR, '1. World Almanac', 'World'),
        'Private/1. World Almanac/World'
    );
    // Also scan Reference for quests, events, consequences
    const referenceFiles = findMarkdownFiles(
        path.join(PRIVATE_DIR, '2. Reference'),
        'Private/2. Reference'
    );

    const allFiles = [...privateFiles, ...referenceFiles];

    let skipped = 0;
    for (const { fullPath, relPath } of allFiles) {
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fm = parseFrontmatter(content);
            const fileName = path.basename(fullPath, '.md');
            const entityType = classifyEntity(fm, relPath);

            // Skip templates, scratch notes, DM screen files
            if (relPath.includes('Templates/') || relPath.includes('Scratch Notes/')) {
                skipped++;
                continue;
            }

            const name = fm.name || fileName;
            const region = fm.region || deriveRegion(relPath);
            const settlement = fm.location || fm.settlement || deriveSettlement(relPath);
            const summary = extractSummary(content);
            const fullBody = extractFullBody(content);
            const mentions = extractMentions(content);
            const aliases = buildAliases(name, fm);
            const tags = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [];
            const services = entityType === 'Store' ? inferServiceTypes(fm, name) : [];

            const entity = {
                id: entities.length,
                name,
                type: entityType,
                region,
                settlement,
                status: fm.status || '',
                tags,
                aliases,
                summary,
                fullBody,
                mentions,
                filePath: relPath,
                // Type-specific fields
                ...(fm.profession && { profession: fm.profession }),
                ...(fm.race && { race: fm.race }),
                ...(fm.store_type && { storeType: fm.store_type }),
                ...(fm.proprietor && { proprietor: fm.proprietor }),
                ...(fm.owner && { owner: fm.owner }),
                ...(fm.location_type && { locationType: fm.location_type }),
                ...(fm.org_type && { orgType: fm.org_type }),
                ...(fm.leader && { leader: fm.leader }),
                ...(fm.quest_giver && { questGiver: fm.quest_giver }),
                ...(fm.reward && { reward: fm.reward }),
                ...(fm.difficulty && { difficulty: fm.difficulty }),
                ...(fm.severity && { severity: fm.severity }),
                ...(fm.settlement_type && { settlementType: fm.settlement_type }),
                ...(fm.population && { population: fm.population }),
                ...(services.length > 0 && { services }),
            };

            const idx = entities.length;
            entities.push(entity);

            // Build indexes
            nameIndex[name.toLowerCase()] = idx;

            if (region) {
                if (!regionIndex[region]) regionIndex[region] = [];
                regionIndex[region].push(idx);
            }
            if (settlement) {
                const key = settlement.toLowerCase();
                if (!settlementIndex[key]) settlementIndex[key] = [];
                settlementIndex[key].push(idx);
            }
            for (const svc of services) {
                if (!serviceIndex[svc]) serviceIndex[svc] = [];
                serviceIndex[svc].push(idx);
            }
        } catch (err) {
            console.warn(`  ⚠ Error processing ${relPath}: ${err.message}`);
        }
    }

    const index = {
        generated: new Date().toISOString(),
        stats: {
            totalEntities: entities.length,
            skipped,
            byType: {},
        },
        entities,
        indexes: {
            byName: nameIndex,
            byRegion: regionIndex,
            bySettlement: settlementIndex,
            byService: serviceIndex,
        },
    };

    // Inject synthetic settlement entries for folders without a typed .md file
    for (const { name, region } of syntheticSettlements) {
        if (nameIndex[name.toLowerCase()]) continue; // already exists
        const entity = {
            id: entities.length,
            name,
            type: 'Settlement',
            region,
            settlement: name,
            status: '',
            tags: ['Settlement', region, name],
            aliases: buildAliases(name, {}),
            summary: '',
            mentions: [],
            filePath: `Private/1. World Almanac/World/${region}/${name}/${name}.md`,
        };
        const idx = entities.length;
        entities.push(entity);
        nameIndex[name.toLowerCase()] = idx;
        if (!regionIndex[region]) regionIndex[region] = [];
        regionIndex[region].push(idx);
        const key = name.toLowerCase();
        if (!settlementIndex[key]) settlementIndex[key] = [];
        settlementIndex[key].push(idx);
    }
    // Update total count after synthetics
    index.stats.totalEntities = entities.length;

    // Count by type
    for (const e of entities) {
        index.stats.byType[e.type] = (index.stats.byType[e.type] || 0) + 1;
    }

    // ---------------------------------------------------------------------------
    // Index session journals and extract auto-context from latest session
    // ---------------------------------------------------------------------------
    const sessionJournals = indexSessionJournals();
    index.sessions = sessionJournals;
    index.autoContext = extractAutoContext(sessionJournals, entities);

    return index;
}

// ---------------------------------------------------------------------------
// Index session journals
// ---------------------------------------------------------------------------
function indexSessionJournals() {
    const sessDir = path.join(PRIVATE_DIR, '2. Session Journals');
    if (!fs.existsSync(sessDir)) return [];

    const sessions = [];
    for (const file of fs.readdirSync(sessDir)) {
        if (!file.endsWith('.md')) continue;
        const fullPath = path.join(sessDir, file);
        if (!fs.statSync(fullPath).isFile()) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        const fm = parseFrontmatter(content);
        const body = extractFullBody(content);
        const mentions = extractMentions(content);

        // Parse session number from filename
        const numMatch = file.match(/(\d+)/);
        const sessionNum = numMatch ? parseInt(numMatch[1], 10) : 0;

        sessions.push({
            file,
            sessionNum,
            fcDate: fm['fc-date'] || '',
            body,
            mentions,
        });
    }
    sessions.sort((a, b) => b.sessionNum - a.sessionNum);
    return sessions;
}

// ---------------------------------------------------------------------------
// Extract auto-context from the latest session journals
// Detects: location, active NPCs, active quests, goals, recent events
// ---------------------------------------------------------------------------
function extractAutoContext(sessions, entities) {
    if (sessions.length === 0) return {};

    // Use latest 2 sessions for context
    const recent = sessions.slice(0, 2);
    const combinedText = recent.map(s => s.body).join('\n');
    const combinedMentions = [...new Set(recent.flatMap(s => s.mentions))];

    // Build name->entity lookup
    const entityByName = {};
    for (const e of entities) {
        entityByName[e.name.toLowerCase()] = e;
    }

    // Detect current location from latest session
    // Look for travel/arrival patterns
    let detectedSettlement = '';
    let detectedRegion = '';
    const locationPatterns = [
        /(?:travel(?:ing|s)?|head(?:ing|s)?|arriv(?:e|ing|ed)|go(?:ing)?|journey(?:ing)?|reach(?:ing|ed)?)\s+(?:to|at|in)\s+([A-Z][\w']+(?:\s+[A-Z][\w']+)*)/g,
        /(?:arrive[ds]?\s+(?:at|in))\s+([A-Z][\w']+(?:\s+[A-Z][\w']+)*)/g,
        /(?:current(?:ly)?\s+(?:in|at))\s+([A-Z][\w']+(?:\s+[A-Z][\w']+)*)/g,
    ];
    for (const pat of locationPatterns) {
        let m;
        while ((m = pat.exec(combinedText)) !== null) {
            const loc = m[1];
            const entity = entityByName[loc.toLowerCase()];
            if (entity && entity.type === 'Settlement') {
                detectedSettlement = entity.name;
                detectedRegion = entity.region;
            }
        }
    }

    // If no explicit travel pattern, check mentioned settlement entities
    if (!detectedSettlement) {
        const mentionedSettlements = combinedMentions
            .map(m => entityByName[m.toLowerCase()])
            .filter(e => e && e.type === 'Settlement');
        if (mentionedSettlements.length > 0) {
            // Pick last mentioned
            detectedSettlement = mentionedSettlements[mentionedSettlements.length - 1].name;
            detectedRegion = mentionedSettlements[mentionedSettlements.length - 1].region;
        }
    }

    // Detect active NPCs from mentions
    const detectedNpcs = combinedMentions
        .filter(m => {
            const e = entityByName[m.toLowerCase()];
            return e && e.type === 'NPC';
        });

    // Detect active quests from mentions
    const detectedQuests = combinedMentions
        .filter(m => {
            const e = entityByName[m.toLowerCase()];
            return e && e.type === 'Quest';
        });

    // Extract goals/objectives from session text
    const goals = [];
    const goalPatterns = [
        /(?:objective|goal|mission|task|need to|must|should)\s*:?\s*(.{10,80})/gi,
        /(?:party (?:wants?|needs?) to)\s+(.{10,60})/gi,
    ];
    for (const pat of goalPatterns) {
        let m;
        while ((m = pat.exec(combinedText)) !== null) {
            const goal = m[1].trim().replace(/[.!,;]+$/, '');
            if (goal && !goals.includes(goal)) goals.push(goal);
        }
    }

    return {
        latestSession: recent[0] ? recent[0].sessionNum : 0,
        detectedRegion,
        detectedSettlement,
        detectedNpcs: [...new Set(detectedNpcs)].slice(0, 12),
        detectedQuests: [...new Set(detectedQuests)].slice(0, 8),
        detectedGoals: goals.slice(0, 6),
    };
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
function writeJsonFile(outputPath, data) {
    const payload = JSON.stringify(data, null, 2);
    try {
        fs.writeFileSync(outputPath, payload, 'utf8');
        return;
    } catch (error) {
        if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    }

    const tempPath = `${outputPath}.tmp`;
    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.rmSync(outputPath, { force: true });
    fs.renameSync(tempPath, outputPath);
}

const index = buildIndex();
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeJsonFile(OUTPUT_PATH, index);

console.log(`✅ Jarvis index generated: ${OUTPUT_PATH}`);
console.log(`   Total entities: ${index.stats.totalEntities}`);
console.log(`   Skipped: ${index.stats.skipped}`);
console.log('   By type:');
for (const [type, count] of Object.entries(index.stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${type}: ${count}`);
}
console.log('\n🎉 Index ready for DM Jarvis dashboard.');

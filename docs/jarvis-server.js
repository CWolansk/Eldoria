#!/usr/bin/env node

/**
 * DM Jarvis — AI-Powered Live DM Assistant Server
 *
 * Streams table-talk audio from the browser via WebSocket,
 * transcribes with OpenAI Whisper, analyses context with GPT-4o,
 * and pushes proactive DM suggestions back to the dashboard.
 *
 * Usage:
 *   1. Copy .env.example to .env and add your OpenAI key.
 *   2. node jarvis-server.js
 *   3. Open http://localhost:8087 in Chrome/Edge.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = attemptRequire('ws');

// ---------------------------------------------------------------------------
// ENV / Config
// ---------------------------------------------------------------------------
loadDotenv(path.join(__dirname, '.env'));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.error('\n❌  OPENAI_API_KEY not set.');
    console.error('    Copy .env.example → .env and add your key.\n');
    process.exit(1);
}

const PORT = parseInt(process.env.JARVIS_PORT || '8087', 10);
const VAULT_INDEX = path.join(__dirname, 'jarvis-index.json');

// ---------------------------------------------------------------------------
// Load vault index
// ---------------------------------------------------------------------------
let vaultIndex = null;
try {
    vaultIndex = JSON.parse(fs.readFileSync(VAULT_INDEX, 'utf8'));
    console.log(`📚  Loaded vault index: ${vaultIndex.stats.totalEntities} entities`);
} catch {
    console.warn('⚠  jarvis-index.json not found — run: node generate-jarvis-index.js');
}

// ---------------------------------------------------------------------------
// Build compressed vault context for the LLM system prompt
// ---------------------------------------------------------------------------
function buildVaultContext() {
    if (!vaultIndex) return 'No vault index loaded.';

    const lines = [];

    // Group entities by type
    const byType = {};
    for (const e of vaultIndex.entities) {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e);
    }

    for (const [type, entities] of Object.entries(byType)) {
        lines.push(`\n## ${type}s (${entities.length})`);
        for (const e of entities) {
            let entry = `- **${e.name}**`;
            if (e.region) entry += ` [${e.region}`;
            if (e.settlement) entry += `/${e.settlement}`;
            if (e.region) entry += ']';
            if (e.profession) entry += ` — ${e.profession}`;
            if (e.storeType) entry += ` — ${e.storeType}`;
            if (e.status && e.status !== 'Active') entry += ` (${e.status})`;
            lines.push(entry);

            // Include summaries for key types (truncated)
            if (['Quest', 'Consequence', 'Event'].includes(type) && e.summary) {
                const brief = e.summary.replace(/\n/g, ' ').slice(0, 200);
                lines.push(`  ${brief}`);
            }
        }
    }

    // Session auto-context
    if (vaultIndex.autoContext) {
        const ac = vaultIndex.autoContext;
        lines.push('\n## Latest Session Context');
        if (ac.detectedSettlement) lines.push(`- Current location: ${ac.detectedSettlement} (${ac.detectedRegion})`);
        if (ac.detectedNpcs?.length) lines.push(`- Recent NPCs: ${ac.detectedNpcs.join(', ')}`);
        if (ac.detectedQuests?.length) lines.push(`- Active quests: ${ac.detectedQuests.join(', ')}`);
        if (ac.detectedGoals?.length) lines.push(`- Party goals: ${ac.detectedGoals.join(', ')}`);
    }

    return lines.join('\n');
}

const VAULT_CONTEXT = buildVaultContext();
console.log(`🧠  Vault context built: ${Math.round(VAULT_CONTEXT.length / 1024)}KB`);

// ---------------------------------------------------------------------------
// System prompt for the AI co-pilot
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are DM Jarvis — an AI co-pilot for a live D&D 5e session. You assist the Dungeon Master by listening to the table conversation and proactively surfacing prepared notes, NPCs, quests, and encounters from the DM's vault.

## Your Role
- You receive a rolling transcript of real table-talk.
- Analyse what's happening: who's talking, what the party is discussing, where they are, what they want to do.
- Surface relevant vault content the DM has prepared — quests, NPC information, store inventories, plot hooks, consequences, encounters, downtime options.
- Be PROACTIVE: don't wait to be asked. If the party is debating what to do, suggest available quests or hooks. If they mention an NPC, surface that NPC's secrets and motivations. If they're heading to a location, remind the DM what's there.

## Response Format
Respond with JSON (no markdown code fences) with this structure:
{
  "suggestions": [
    {
      "type": "quest|npc|location|store|encounter|plotHook|reminder|info",
      "title": "Short title for the suggestion card",
      "body": "2-3 sentence summary the DM can glance at mid-session",
      "relevance": "Why this is relevant right now",
      "entityNames": ["Entity Name 1"]
    }
  ],
  "currentContext": {
    "location": "Best guess of party's current location",
    "topic": "What the party seems to be discussing",
    "npcsPresent": ["NPC names mentioned or likely present"]
  }
}

## Rules
- Keep suggestions SHORT (10-second scan rule). The DM is reading these mid-session.
- Maximum 4 suggestions per response. Quality over quantity.
- Only suggest content that exists in the vault. Never invent NPCs, quests, or locations.
- If the conversation isn't D&D-relevant (side chatter, food orders, bathroom breaks), respond with empty suggestions array.
- Prioritize: active quests > relevant NPCs > nearby stores/services > plot hooks > general info.
- When the party mentions doing something during downtime, surface ALL available downtime hooks and activities for their current location.

## The Vault
${VAULT_CONTEXT}`;

// ---------------------------------------------------------------------------
// Per-connection conversation state
// ---------------------------------------------------------------------------
class SessionState {
    constructor() {
        this.transcriptBuffer = [];     // Rolling window of transcribed text
        this.analysisHistory = [];      // Previous AI responses for continuity
        this.lastAnalysisTime = 0;
        this.pendingAudio = [];         // Audio chunks waiting to be sent to Whisper
        this.isTranscribing = false;
        this.isAnalysing = false;
        this.detectedContext = { location: '', topic: '', npcsPresent: [] };
    }

    addTranscript(text) {
        this.transcriptBuffer.push({ text, time: Date.now() });
        // Keep last ~5 minutes of transcript
        const cutoff = Date.now() - 5 * 60 * 1000;
        this.transcriptBuffer = this.transcriptBuffer.filter(t => t.time > cutoff);
    }

    getRecentTranscript() {
        return this.transcriptBuffer.map(t => t.text).join(' ');
    }
}

// ---------------------------------------------------------------------------
// OpenAI API helpers
// ---------------------------------------------------------------------------
async function transcribeAudio(audioBuffer) {
    const boundary = '----JarvisBoundary' + Date.now();
    const filename = 'audio.webm';

    const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: audio/webm\r\n\r\n`
    );
    const modelPart = Buffer.from(
        `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="model"\r\n\r\n` +
        `whisper-1`
    );
    const langPart = Buffer.from(
        `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="language"\r\n\r\n` +
        `en`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, audioBuffer, modelPart, langPart, footer]);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Whisper API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.text || '';
}

async function analyseTranscript(session) {
    const transcript = session.getRecentTranscript();
    if (!transcript.trim()) return null;

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Include last 2 analysis results for continuity
    for (const prev of session.analysisHistory.slice(-2)) {
        messages.push({ role: 'assistant', content: JSON.stringify(prev) });
    }

    messages.push({
        role: 'user',
        content: `Here is the latest table conversation transcript:\n\n"${transcript}"\n\nWhat should I know right now as the DM? Surface relevant prepared content.`
    });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            temperature: 0.3,
            max_tokens: 1200,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`GPT-4o API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
        const parsed = JSON.parse(content);
        session.analysisHistory.push(parsed);
        if (session.analysisHistory.length > 10) session.analysisHistory.shift();
        if (parsed.currentContext) session.detectedContext = parsed.currentContext;
        return parsed;
    } catch {
        console.warn('Failed to parse GPT-4o response:', content.slice(0, 200));
        return null;
    }
}

// ---------------------------------------------------------------------------
// Retrieve full entity detail for a suggestion (for the "read more" pane)
// ---------------------------------------------------------------------------
function lookupEntities(entityNames) {
    if (!vaultIndex || !entityNames?.length) return [];
    const results = [];
    for (const name of entityNames) {
        const lower = name.toLowerCase();
        for (const e of vaultIndex.entities) {
            if (e.name.toLowerCase() === lower) {
                results.push(e);
                break;
            }
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Static file server (serves dm-jarvis.html and assets)
// ---------------------------------------------------------------------------
const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const httpServer = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '/jarvis') urlPath = '/dm-jarvis.html';

    // Only serve files from the docs directory
    const filePath = path.join(__dirname, urlPath);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(__dirname))) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(resolved, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(resolved).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
    console.log('🔌  Client connected');
    const session = new SessionState();

    // Send initial context
    ws.send(JSON.stringify({
        type: 'init',
        entityCount: vaultIndex?.stats?.totalEntities || 0,
        autoContext: vaultIndex?.autoContext || {},
    }));

    ws.on('message', async (data, isBinary) => {
        if (isBinary) {
            // Audio chunk from microphone
            session.pendingAudio.push(Buffer.from(data));
            return;
        }

        // Text messages
        let msg;
        try { msg = JSON.parse(data.toString()); } catch { return; }

        if (msg.type === 'audio_end') {
            // Browser signals end of an audio chunk — transcribe it
            if (session.pendingAudio.length === 0 || session.isTranscribing) return;
            session.isTranscribing = true;

            const audioBuffer = Buffer.concat(session.pendingAudio);
            session.pendingAudio = [];

            try {
                const text = await transcribeAudio(audioBuffer);
                if (text && text.trim().length > 1) {
                    session.addTranscript(text);
                    ws.send(JSON.stringify({ type: 'transcript', text }));

                    // Trigger analysis if enough time has passed (throttle to ~8s)
                    const now = Date.now();
                    if (!session.isAnalysing && now - session.lastAnalysisTime > 8000) {
                        session.isAnalysing = true;
                        session.lastAnalysisTime = now;
                        try {
                            const result = await analyseTranscript(session);
                            if (result) {
                                // Attach full entity data to suggestions
                                for (const s of result.suggestions || []) {
                                    s.entities = lookupEntities(s.entityNames);
                                }
                                ws.send(JSON.stringify({ type: 'suggestions', data: result }));
                            }
                        } catch (err) {
                            console.error('Analysis error:', err.message);
                            ws.send(JSON.stringify({ type: 'error', message: 'Analysis failed: ' + err.message }));
                        }
                        session.isAnalysing = false;
                    }
                }
            } catch (err) {
                console.error('Transcription error:', err.message);
                ws.send(JSON.stringify({ type: 'error', message: 'Transcription failed: ' + err.message }));
            }
            session.isTranscribing = false;
        }

        if (msg.type === 'manual_query') {
            // DM typed a question manually
            session.addTranscript(`[DM asks]: ${msg.text}`);
            session.isAnalysing = true;
            session.lastAnalysisTime = Date.now();
            try {
                const result = await analyseTranscript(session);
                if (result) {
                    for (const s of result.suggestions || []) {
                        s.entities = lookupEntities(s.entityNames);
                    }
                    ws.send(JSON.stringify({ type: 'suggestions', data: result }));
                }
            } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
            }
            session.isAnalysing = false;
        }

        if (msg.type === 'lookup') {
            // Direct entity lookup
            const entities = lookupEntities([msg.name]);
            ws.send(JSON.stringify({ type: 'lookup_result', entities }));
        }
    });

    ws.on('close', () => console.log('🔌  Client disconnected'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
    console.log(`\n🚀  DM Jarvis server running at http://localhost:${PORT}`);
    console.log(`    Open in Chrome/Edge and click "Start Listening"\n`);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadDotenv(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx < 0) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    } catch { /* no .env file — rely on environment variables */ }
}

function attemptRequire(mod) {
    try {
        return require(mod);
    } catch {
        console.error(`\n❌  Missing dependency: ${mod}`);
        console.error(`    Run: cd docs && npm install ws\n`);
        process.exit(1);
    }
}

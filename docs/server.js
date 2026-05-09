const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { handleLocalPublicApi } = require('./api/shared/local-router');

const API_CONFIG_PATH = path.join(__dirname, 'api', 'config', 'azure.local.json');
const PORT = Number(process.env.PORT) || 8086;
const REPO_ROOT = path.resolve(__dirname, '..');
const RULE_OVERRIDES_PATH = path.join(__dirname, 'Assets', 'Rules', 'rule-overrides.json');
const RULE_IMPORT_TIMEOUT_MS = 5 * 60 * 1000;
const RULE_IMPORT_MAX_BUFFER = 25 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
const RULE_OVERRIDE_COLLECTIONS = [
    'items',
    'spells',
    'features',
    'actions',
    'resources',
    'effects',
    'rules',
    'backgrounds',
    'feats',
    'races',
    'classes',
    'subclasses',
];

const DEFAULT_RULE_OVERRIDES = Object.freeze({
    schemaVersion: 1,
    items: {},
    spells: {},
    features: {},
    actions: {},
    resources: {},
    effects: {},
    rules: {},
    backgrounds: {},
    feats: {},
    races: {},
    classes: {},
    subclasses: {},
});

const setEnvDefault = (name, value) => {
    const clean = String(value || '').trim();
    if (!clean || process.env[name]) return;
    process.env[name] = clean;
};

const runAzureCli = (args) => {
    const command = process.platform === 'win32' ? 'az.cmd' : 'az';
    return execFileSync(command, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
    }).trim();
};

const loadLocalAzureApiConfig = () => {
    if (!fs.existsSync(API_CONFIG_PATH)) return;

    try {
        const config = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf8'));
        const storage = config && config.storage && typeof config.storage === 'object'
            ? config.storage
            : {};
        const accountName = String(storage.accountName || '').trim();
        const endpoint = String(storage.tableEndpoint || '').trim()
            || (accountName ? `https://${accountName}.table.core.windows.net` : '');

        setEnvDefault('TABLE_STORAGE_ACCOUNT', accountName);
        setEnvDefault('AZURE_STORAGE_ACCOUNT', accountName);
        setEnvDefault('TABLE_STORAGE_ENDPOINT', endpoint);
        setEnvDefault('PLAYER_SHEETS_TABLE', storage.playerSheetsTable || 'PlayerSheets');
        setEnvDefault('CHARACTER_BUILDS_TABLE', storage.characterBuildsTable || 'CharacterBuilds');
        setEnvDefault('RULES_TABLE', storage.rulesTable || 'Rules');
        setEnvDefault('AZURE_TENANT_ID', config.tenantId);

        const configuredKey = String(storage.accountKey || '').trim();
        if (configuredKey) {
            setEnvDefault('TABLE_STORAGE_ACCOUNT_KEY', configuredKey);
        } else if (!process.env.TABLE_STORAGE_ACCOUNT_KEY && accountName && config.resourceGroup && storage.useAccountKeyForLocalDev !== false) {
            try {
                if (config.subscriptionId) {
                    runAzureCli(['account', 'set', '--subscription', String(config.subscriptionId)]);
                }
                const key = runAzureCli([
                    'storage', 'account', 'keys', 'list',
                    '--resource-group', String(config.resourceGroup),
                    '--account-name', accountName,
                    '--query', '[0].value',
                    '-o', 'tsv',
                ]);
                setEnvDefault('TABLE_STORAGE_ACCOUNT_KEY', key);
            } catch (error) {
                console.warn('Could not fetch local Table Storage key; local API may use Azure identity or static fallback.');
            }
        }
    } catch (error) {
        console.warn(`Could not load local Azure API config: ${error.message}`);
    }
};

loadLocalAzureApiConfig();

const sendJson = (res, status, body, headers = {}) => {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...headers,
    });
    res.end(JSON.stringify(body, null, 2));
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > MAX_JSON_BODY_BYTES) {
            reject(new Error('Request body is too large.'));
            req.destroy();
        }
    });
    req.on('end', () => {
        if (!body.trim()) {
            reject(new Error('Request body must be JSON.'));
            return;
        }

        try {
            resolve(JSON.parse(body));
        } catch (error) {
            reject(new Error('Invalid JSON body.'));
        }
    });
    req.on('error', reject);
});

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const buildDefaultRuleOverrides = () => ({
    schemaVersion: DEFAULT_RULE_OVERRIDES.schemaVersion,
    items: {},
    spells: {},
    features: {},
    actions: {},
    resources: {},
    effects: {},
    rules: {},
    backgrounds: {},
    feats: {},
    races: {},
    classes: {},
    subclasses: {},
});

const normalizeRuleOverrides = (input) => {
    const overrides = { ...input };

    if (overrides.schemaVersion === undefined) {
        overrides.schemaVersion = 1;
    }

    for (const collection of RULE_OVERRIDE_COLLECTIONS) {
        if (!isObject(overrides[collection])) {
            overrides[collection] = {};
        }
    }

    return overrides;
};

const handleRuleOverridesApi = (req, res, url) => {
    if (url.pathname !== '/api/rule-overrides') {
        return false;
    }

    if (req.method === 'OPTIONS') {
        sendJson(res, 204, {}, { 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' });
        return true;
    }

    if (req.method === 'GET') {
        fs.readFile(RULE_OVERRIDES_PATH, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    sendJson(res, 200, buildDefaultRuleOverrides());
                    return;
                }

                console.error('Error reading rule overrides:', err);
                sendJson(res, 500, { error: 'Failed to read rule overrides.' });
                return;
            }

            try {
                sendJson(res, 200, JSON.parse(data));
            } catch (error) {
                console.error('Error parsing rule overrides:', error);
                sendJson(res, 500, { error: 'Failed to parse rule overrides.' });
            }
        });
        return true;
    }

    if (req.method === 'PUT') {
        readJsonBody(req).then(body => {
            if (!isObject(body)) {
                sendJson(res, 400, { error: 'Rule overrides must be a JSON object.' });
                return;
            }

            const overrides = normalizeRuleOverrides(body);
            const json = `${JSON.stringify(overrides, null, 2)}\n`;

            fs.mkdir(path.dirname(RULE_OVERRIDES_PATH), { recursive: true }, (mkdirErr) => {
                if (mkdirErr) {
                    console.error('Error creating rule overrides directory:', mkdirErr);
                    sendJson(res, 500, { error: 'Failed to create rule overrides directory.' });
                    return;
                }

                fs.writeFile(RULE_OVERRIDES_PATH, json, 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing rule overrides:', writeErr);
                        sendJson(res, 500, { error: 'Failed to write rule overrides.' });
                        return;
                    }

                    sendJson(res, 200, { ok: true, overrides });
                });
            });
        }).catch(error => {
            sendJson(res, 400, { error: error.message });
        });
        return true;
    }

    sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, PUT, OPTIONS' });
    return true;
};

const handleRulesImportApi = (req, res, url) => {
    if (url.pathname !== '/api/rules/import') {
        return false;
    }

    if (req.method === 'OPTIONS') {
        sendJson(res, 204, {}, { 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
        return true;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' });
        return true;
    }

    execFile(
        process.execPath,
        ['docs/scripts/import-rules-from-5etools.js'],
        {
            cwd: REPO_ROOT,
            timeout: RULE_IMPORT_TIMEOUT_MS,
            maxBuffer: RULE_IMPORT_MAX_BUFFER,
            windowsHide: true,
        },
        (error, stdout, stderr) => {
            let responseStderr = stderr || '';
            if (error && !responseStderr) {
                responseStderr = error.message;
            }

            sendJson(res, 200, {
                ok: !error,
                code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
                stdout,
                stderr: responseStderr,
            });
        }
    );
    return true;
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (handleRuleOverridesApi(req, res, url)) {
        return;
    }

    if (handleRulesImportApi(req, res, url)) {
        return;
    }

    if (handleLocalPublicApi(req, res)) {
        return;
    }

    // Helper to get map file path safely
    const getMapFilePath = (filename) => {
        if (!filename) return null;
        // Basic sanitization to prevent directory traversal
        const safeFilename = path.basename(filename);
        return path.join(__dirname, safeFilename);
    };

    // Handle API request to add marker
    if (req.method === 'POST' && req.url === '/api/markers') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const markerData = JSON.parse(body);
                
                // Validate data
                if (!markerData.name || !markerData.position || !markerData.mapFilename) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields (name, position, mapFilename)' }));
                    return;
                }

                const mapFile = getMapFilePath(markerData.mapFilename);
                if (!mapFile) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid map filename' }));
                    return;
                }

                // Read the HTML file
                fs.readFile(mapFile, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading file:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error or file not found' }));
                        return;
                    }

                    // Format the new marker object
                    const newMarkerString = `
                {
                    name: "${markerData.name.replace(/"/g, '\\"')}",
                    position: [${markerData.position[0]}, ${markerData.position[1]}],
                    link: "${markerData.link.replace(/"/g, '\\"')}",
                    description: "${markerData.description.replace(/"/g, '\\"')}"
                },`;

                    // Insert before the placeholder
                    const placeholder = '// Add more markers here';
                    if (!data.includes(placeholder)) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Placeholder not found in file' }));
                        return;
                    }

                    const updatedData = data.replace(placeholder, `${newMarkerString}\n                ${placeholder}`);

                    // Write back to file
                    fs.writeFile(mapFile, updatedData, 'utf8', (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to save file' }));
                            return;
                        }

                        console.log(`Added marker: ${markerData.name} to ${markerData.mapFilename}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Marker added successfully' }));
                    });
                });
            } catch (e) {
                console.error('Error parsing JSON:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Handle API request to delete marker
    if (req.method === 'DELETE' && req.url === '/api/markers') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const markerData = JSON.parse(body);
                
                if (!markerData.name || !markerData.mapFilename) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing marker name or mapFilename' }));
                    return;
                }

                const mapFile = getMapFilePath(markerData.mapFilename);
                if (!mapFile) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid map filename' }));
                    return;
                }

                // Read the HTML file
                fs.readFile(mapFile, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading file:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error or file not found' }));
                        return;
                    }

                    // Regex to find the marker block
                    // Matches: { ... name: "Name" ... }
                    // We need to escape the name for regex special characters
                    const escapedName = markerData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Look for the object block containing the name
                    // \s* matches whitespace
                    // \{ matches opening brace
                    // [\s\S]*? matches content non-greedily
                    // name:\s*"${escapedName}" matches the specific name property
                    // \},? matches closing brace and optional comma
                    const regex = new RegExp(`\\{\\s*name:\\s*"${escapedName}"[\\s\\S]*?\\},?`, 'g');

                    if (!regex.test(data)) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Marker not found' }));
                        return;
                    }

                    const updatedData = data.replace(regex, '');

                    // Write back to file
                    fs.writeFile(mapFile, updatedData, 'utf8', (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to save file' }));
                            return;
                        }

                        console.log(`Removed marker: ${markerData.name} from ${markerData.mapFilename}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Marker removed successfully' }));
                    });
                });
            } catch (e) {
                console.error('Error parsing JSON:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Serve static files
    const requestPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = '.' + requestPath;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
                    res.end(content, 'utf-8');
                });
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                res.end();
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/WorldMap.html to view the map`);
});

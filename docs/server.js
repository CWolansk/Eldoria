const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleLocalPublicApi } = require('./api/shared/local-router');

const PORT = 8086;

const server = http.createServer((req, res) => {
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
    let filePath = '.' + req.url;
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
                    res.writeHead(200, { 'Content-Type': contentType });
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
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/WorldMap.html to view the map`);
});

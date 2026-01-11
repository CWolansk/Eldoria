const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'Public', 'World');
const PRIVATE_DIR = path.join(ROOT_DIR, 'Private', '1. World Almanac', 'World');

function generateBlockId() {
    return '^' + crypto.randomBytes(3).toString('hex');
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.md')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function normalizeNpcFiles() {
    const publicFiles = getAllFiles(PUBLIC_DIR);

    publicFiles.forEach(publicFilePath => {
        const relativePath = path.relative(PUBLIC_DIR, publicFilePath);
        const privateFilePath = path.join(PRIVATE_DIR, relativePath);
        const fileName = path.basename(publicFilePath, '.md');

        console.log(`Processing: ${fileName}`);

        let privateContent = '';
        let blockId = '';

        // 1. Ensure Private File Exists and has Content
        if (fs.existsSync(privateFilePath)) {
            privateContent = fs.readFileSync(privateFilePath, 'utf8');
        } else {
            console.log(`  - Private file missing. Moving content from Public.`);
            // If private file doesn't exist, assume content is in Public file
            // But wait, if we are normalizing, we want the content in Private.
            // So we read Public content to move it.
            const publicContent = fs.readFileSync(publicFilePath, 'utf8');
            // We need to strip any existing embed/backlink if it was already partially processed?
            // Assuming raw content for now if it's not normalized.
            privateContent = publicContent;
            ensureDirectoryExistence(privateFilePath);
        }

        // 2. Ensure Private File has Block ID
        // Check if there's already a block ID
        const blockIdMatch = privateContent.match(/(\^[a-z0-9]{6,})\s*$/m); // Look for block ID at end of a line
        // Also check if it's already normalized with # Public Notes
        const publicNotesRegex = /# Public Notes/i;
        
        let contentBody = privateContent;
        let publicNotesSection = '';

        if (publicNotesRegex.test(privateContent)) {
            const parts = privateContent.split(publicNotesRegex);
            contentBody = parts[0].trim();
            publicNotesSection = '# Public Notes' + parts.slice(1).join('# Public Notes');
        }

        // Find or Add Block ID to contentBody
        const idMatch = contentBody.match(/(\^[a-z0-9]{6,})\s*$/);
        if (idMatch) {
            blockId = idMatch[1];
            console.log(`  - Found existing Block ID: ${blockId}`);
        } else {
            blockId = generateBlockId();
            console.log(`  - Generated new Block ID: ${blockId}`);
            // Append to the end of contentBody
            contentBody += ` ${blockId}`;
        }

        // 3. Construct New Private Content
        // Reconstruct the file: Content + BlockID + Public Notes Section
        
        // We need to ensure the Public Notes section has the correct link and dataview
        const publicLink = `[[Public/World/${relativePath.replace(/\\/g, '/').replace(/\.md$/, '')}|${fileName}]]`;
        const dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\`\`\``;

        const newPublicNotesSection = `\n\n# Public Notes \n${publicLink} \n${dataviewQuery}`;
        
        const newPrivateContent = contentBody + newPublicNotesSection;
        
        // Write Private File
        fs.writeFileSync(privateFilePath, newPrivateContent, 'utf8');

        // 4. Update Public File
        // It should only contain the embed and the dataview query
        const privateEmbedPath = `Private/1. World Almanac/World/${relativePath.replace(/\\/g, '/').replace(/\.md$/, '')}`;
        const publicContent = `![[${privateEmbedPath}#${blockId}|${fileName}]]\n\n${dataviewQuery}`;

        fs.writeFileSync(publicFilePath, publicContent, 'utf8');
        console.log(`  - Updated Public and Private files.`);
    });
}

normalizeNpcFiles();

/**
 * Script to check if homebrew files have been updated on GitHub
 * Run with: node check-updates.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_FILE = path.join(__dirname, 'index.json');
const REMOTE_INDEX_URL = 'https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/_generated/index-sources.json';

// Store the original URLs mapping
const ORIGINAL_URLS = [
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/Kobold%20Press;%20Book%20of%20Ebon%20Tides.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/item/Foxfire94;%20Armour,%20Items,%20and%20Weapons%20Galore.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/item/Aofhaocv;%20Common%20Magic%20Items.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/creature/MCDM%20Productions;%20Flee,%20Mortals!.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/Ghostfire%20Gaming;%20Grim%20Hollow%20-%20Player%20Pack.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/Kobold%20Press;%20Tales%20from%20the%20Shadows.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/book/Saidoro;%20Sane%20Magic%20Item%20Prices.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/book/Giddy;%20Sane%20Magic%20Item%20Prices%20Expanded.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/SailorCat;%20GachaBox.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/Griffin%20Macaulay;%20The%20Griffon's%20Saddlebag,%20Book%202.json",
	"https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/collection/MCDM%20Productions;%20Where%20Evil%20Lives.json"
];

// Function to get file hash
function getFileHash(filepath) {
	const content = fs.readFileSync(filepath, 'utf8');
	return crypto.createHash('md5').update(content).digest('hex');
}

// Function to fetch remote file and get its hash
function getRemoteHash(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (response) => {
			if (response.statusCode === 302 || response.statusCode === 301) {
				return getRemoteHash(response.headers.location)
					.then(resolve)
					.catch(reject);
			}
			
			if (response.statusCode !== 200) {
				reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
				return;
			}
			
			let data = '';
			response.on('data', (chunk) => {
				data += chunk;
			});
			
			response.on('end', () => {
				const hash = crypto.createHash('md5').update(data).digest('hex');
				resolve(hash);
			});
		}).on('error', reject);
	});
}

// Main function
async function main() {
	console.log('Checking for updates to homebrew files...\n');
	
	const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
	const updates = [];
	
	for (const url of ORIGINAL_URLS) {
		const filename = decodeURIComponent(url.split('/').pop());
		const localPath = path.join(__dirname, filename);
		
		if (!fs.existsSync(localPath)) {
			console.log(`⚠️  ${filename} - NOT FOUND LOCALLY`);
			updates.push({ filename, status: 'missing' });
			continue;
		}
		
		try {
			const localHash = getFileHash(localPath);
			const remoteHash = await getRemoteHash(url);
			
			if (localHash === remoteHash) {
				console.log(`✓ ${filename} - up to date`);
			} else {
				console.log(`🔄 ${filename} - UPDATE AVAILABLE`);
				updates.push({ filename, status: 'update-available' });
			}
		} catch (error) {
			console.error(`✗ ${filename} - ERROR: ${error.message}`);
			updates.push({ filename, status: 'error', error: error.message });
		}
	}
	
	console.log('\n' + '='.repeat(50));
	if (updates.length === 0) {
		console.log('✓ All files are up to date!');
	} else {
		console.log(`Found ${updates.length} file(s) that need attention:`);
		updates.forEach(({ filename, status, error }) => {
			if (status === 'missing') {
				console.log(`  - ${filename}: Missing locally`);
			} else if (status === 'update-available') {
				console.log(`  - ${filename}: Update available`);
			} else if (status === 'error') {
				console.log(`  - ${filename}: Error - ${error}`);
			}
		});
		console.log('\nRun "node download-homebrew.js" to update files.');
	}
}

main().catch(console.error);

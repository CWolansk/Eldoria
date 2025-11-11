/**
 * Script to download homebrew JSON files from remote URLs and save them locally
 * Run with: node download-homebrew.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_FILE = path.join(__dirname, 'index.json');
const OUTPUT_DIR = __dirname;

// Read the index.json file
const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

// Function to download a file
function downloadFile(url, filename) {
	return new Promise((resolve, reject) => {
		console.log(`Downloading: ${filename}`);
		
		https.get(url, (response) => {
			if (response.statusCode === 302 || response.statusCode === 301) {
				// Handle redirects
				return downloadFile(response.headers.location, filename)
					.then(resolve)
					.catch(reject);
			}
			
			if (response.statusCode !== 200) {
				reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
				return;
			}
			
			let data = '';
			response.on('data', (chunk) => {
				data += chunk;
			});
			
			response.on('end', () => {
				try {
					// Validate it's valid JSON
					JSON.parse(data);
					
					const outputPath = path.join(OUTPUT_DIR, filename);
					fs.writeFileSync(outputPath, data, 'utf8');
					console.log(`✓ Saved: ${filename}`);
					resolve(filename);
				} catch (error) {
					reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
				}
			});
		}).on('error', (error) => {
			reject(new Error(`Download error for ${url}: ${error.message}`));
		});
	});
}

// Main function
async function main() {
	console.log('Starting homebrew download...\n');
	
	const downloads = [];
	const newToImport = [];
	
	for (const url of indexData.toImport) {
		// Extract filename from URL and sanitize it
		const urlFilename = url.split('/').pop();
		// Decode URL encoding
		const filename = decodeURIComponent(urlFilename);
		
		downloads.push(
			downloadFile(url, filename)
				.then(() => {
					newToImport.push(filename);
				})
				.catch((error) => {
					console.error(`✗ Error: ${error.message}`);
				})
		);
	}
	
	// Wait for all downloads to complete
	await Promise.all(downloads);
	
	// Update index.json with local filenames
	const updatedIndex = {
		...indexData,
		toImport: newToImport,
	};
	
	fs.writeFileSync(INDEX_FILE, JSON.stringify(updatedIndex, null, '\t'), 'utf8');
	
	console.log(`\n✓ All done! Updated index.json with ${newToImport.length} local files.`);
	console.log('\nYou can now safely serve these files statically.');
}

main().catch(console.error);

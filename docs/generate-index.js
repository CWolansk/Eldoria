#!/usr/bin/env node

/**
 * Automatically generates index files for NPCs and Locations
 * Run this script whenever you add new HTML files to the Public folder
 * Usage: node generate-index.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'Public');
const OUTPUT_DIR = __dirname;

// Recursively find all HTML files in a directory
function findHtmlFiles(dir, basePath = '') {
    const results = [];
    
    if (!fs.existsSync(dir)) {
        return results;
    }
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        const relativePath = path.join(basePath, item);
        
        if (stat.isDirectory()) {
            // Recursively search subdirectories
            results.push(...findHtmlFiles(fullPath, relativePath));
        } else if (stat.isFile() && item.endsWith('.html')) {
            results.push({
                name: item.replace('.html', ''),
                file: item,
                path: relativePath.replace(/\\/g, '/')
            });
        }
    });
    
    return results;
}

// Extract NPCs organized by region and location
function generateNPCIndex() {
    const npcIndex = {};
    const worldDir = path.join(PUBLIC_DIR, 'World');
    
    if (!fs.existsSync(worldDir)) {
        console.warn('World directory not found:', worldDir);
        return npcIndex;
    }
    
    const regions = fs.readdirSync(worldDir);
    
    regions.forEach(region => {
        const regionPath = path.join(worldDir, region);
        const stat = fs.statSync(regionPath);
        
        if (!stat.isDirectory()) return;
        
        npcIndex[region] = {};
        
        const locations = fs.readdirSync(regionPath);
        
        locations.forEach(location => {
            const locationPath = path.join(regionPath, location);
            const locationStat = fs.statSync(locationPath);
            
            if (!locationStat.isDirectory()) return;
            
            const npcDir = path.join(locationPath, 'NPCs');
            
            if (fs.existsSync(npcDir)) {
                const npcs = findHtmlFiles(npcDir);
                
                if (npcs.length > 0) {
                    npcIndex[region][location] = {
                        basePath: `Public/World/${region}/${location}/NPCs/`,
                        npcs: npcs.map(npc => ({
                            name: npc.name,
                            file: npc.file
                        }))
                    };
                }
            }
        });
        
        // Remove empty regions
        if (Object.keys(npcIndex[region]).length === 0) {
            delete npcIndex[region];
        }
    });
    
    return npcIndex;
}

// Extract locations organized by region
function generateLocationIndex() {
    const locationIndex = {};
    const worldDir = path.join(PUBLIC_DIR, 'World');
    
    if (!fs.existsSync(worldDir)) {
        console.warn('World directory not found:', worldDir);
        return locationIndex;
    }
    
    const regions = fs.readdirSync(worldDir);
    
    regions.forEach(region => {
        const regionPath = path.join(worldDir, region);
        const stat = fs.statSync(regionPath);
        
        if (!stat.isDirectory()) return;
        
        locationIndex[region] = {
            basePath: `Public/World/${region}/`,
            locations: {}
        };
        
        const locations = fs.readdirSync(regionPath);
        
        locations.forEach(location => {
            const locationPath = path.join(regionPath, location);
            const locationStat = fs.statSync(locationPath);
            
            if (!locationStat.isDirectory()) return;
            
            // Find main location HTML file
            const locationFiles = fs.readdirSync(locationPath);
            const mainFile = locationFiles.find(f => 
                f.endsWith('.html') && 
                !f.includes('NPCs') &&
                (f.toLowerCase() === `${location.toLowerCase()}.html` || 
                 f.replace('.html', '').toLowerCase() === location.toLowerCase())
            );
            
            if (mainFile) {
                // Find sub-locations (other HTML files in the directory)
                const subLocations = locationFiles
                    .filter(f => 
                        f.endsWith('.html') && 
                        f !== mainFile &&
                        !f.includes('Outline')
                    )
                    .map(f => ({
                        name: f.replace('.html', ''),
                        file: f
                    }));
                
                locationIndex[region].locations[location] = {
                    file: mainFile,
                    subLocations: subLocations
                };
            }
        });
        
        // Remove empty regions
        if (Object.keys(locationIndex[region].locations).length === 0) {
            delete locationIndex[region];
        }
    });
    
    return locationIndex;
}

// Main execution
console.log('🔍 Scanning Public directory...\n');

const npcIndex = generateNPCIndex();
const locationIndex = generateLocationIndex();

// Write NPC index
const npcOutputPath = path.join(OUTPUT_DIR, 'npc-index.json');
fs.writeFileSync(npcOutputPath, JSON.stringify(npcIndex, null, 2));
console.log(`✅ NPC index generated: ${npcOutputPath}`);
console.log(`   Found ${Object.keys(npcIndex).length} regions`);
let totalNPCs = 0;
Object.values(npcIndex).forEach(region => {
    Object.values(region).forEach(location => {
        totalNPCs += location.npcs.length;
    });
});
console.log(`   Total NPCs: ${totalNPCs}\n`);

// Write Location index
const locationOutputPath = path.join(OUTPUT_DIR, 'location-index.json');
fs.writeFileSync(locationOutputPath, JSON.stringify(locationIndex, null, 2));
console.log(`✅ Location index generated: ${locationOutputPath}`);
console.log(`   Found ${Object.keys(locationIndex).length} regions`);
let totalLocations = 0;
Object.values(locationIndex).forEach(region => {
    totalLocations += Object.keys(region.locations).length;
});
console.log(`   Total locations: ${totalLocations}\n`);

console.log('🎉 Index generation complete!');
console.log('   Run this script again whenever you add new NPCs or locations.');

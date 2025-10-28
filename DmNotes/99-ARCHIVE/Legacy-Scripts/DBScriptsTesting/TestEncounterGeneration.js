// Simple test to see if generateEncounterMarkdown works
try {
    console.log("=== Testing generateEncounterMarkdown ===");
    
    const mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    console.log("✅ mdUtils imported successfully");
    console.log("Available functions:", Object.keys(mdUtils));
    
    if (typeof mdUtils.generateEncounterMarkdown !== 'function') {
        console.error("❌ generateEncounterMarkdown is not a function");
        console.log("Type:", typeof mdUtils.generateEncounterMarkdown);
        return;
    }
    
    console.log("✅ generateEncounterMarkdown is available");
    
    // Test with minimal data
    const testData = {
        encounterName: "Test Encounter",
        encounterDescription: "A simple test encounter",
        encounterLocation: "Test Chamber",
        monsterData: [{
            Name: "Goblin Boss",
            quantity: 1,
            AC: "17",
            HP: "21 (6d6)",
            CR: "1 (200 XP)",
            Speed: "30 ft.",
            xpValue: 200,
            totalXP: 200
        }],
        totalXP: 200,
        adjustedXP: 200,
        difficulty: "Easy",
        partyLevel: 4,
        playerCount: 4,
        totalMonsterCount: 1,
        encounterMultiplier: 1,
        includeTreasure: false,
        treasureType: "Individual", 
        customNotes: "Test notes"
    };
    
    console.log("Calling generateEncounterMarkdown...");
    const result = await mdUtils.generateEncounterMarkdown(testData);
    
    if (result) {
        console.log("✅ Function completed successfully");
        console.log("Result length:", result.length);
        console.log("First 100 characters:", result.substring(0, 100));
        new Notice("✅ generateEncounterMarkdown test passed!");
    } else {
        console.error("❌ Function returned null/undefined");
        new Notice("❌ generateEncounterMarkdown returned no content");
    }
    
} catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Error stack:", error.stack);
    new Notice(`❌ Test failed: ${error.message}`);
}

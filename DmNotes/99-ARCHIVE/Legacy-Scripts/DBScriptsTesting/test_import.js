// Test imports and function access
try {
    console.log("Testing imports...");
    
    const mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    console.log("mdUtils imported:", typeof mdUtils);
    console.log("Available functions in mdUtils:", Object.keys(mdUtils));
    
    console.log("Testing generateEncounterMarkdown:", typeof mdUtils.generateEncounterMarkdown);
    
    // Test the function call
    if (typeof mdUtils.generateEncounterMarkdown === 'function') {
        console.log("✅ generateEncounterMarkdown is accessible");
        
        // Test with minimal data
        const testData = {
            encounterName: "Test Encounter",
            encounterDescription: "Test description",
            encounterLocation: "Test location",
            monsterData: [{
                Name: "Test Monster",
                quantity: 1,
                AC: "15",
                HP: "20",
                CR: "1/4 (50 XP)",
                xpValue: 50,
                totalXP: 50
            }],
            totalXP: 50,
            adjustedXP: 50,
            difficulty: "Easy",
            partyLevel: 4,
            playerCount: 4,
            totalMonsterCount: 1,
            encounterMultiplier: 1,
            includeTreasure: false,
            treasureType: "Individual",
            customNotes: ""
        };
        
        const result = await mdUtils.generateEncounterMarkdown(testData);
        console.log("✅ Function executed successfully");
        console.log("Result length:", result ? result.length : "null");
    } else {
        console.error("❌ generateEncounterMarkdown is not accessible");
    }
    
} catch (error) {
    console.error("❌ Test failed:", error);
}

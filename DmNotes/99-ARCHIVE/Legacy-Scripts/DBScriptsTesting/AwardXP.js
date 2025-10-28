// Award XP to the party
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    const xpAmount = parseInt(context.args.xpAmount) || 0;
    
    if (xpAmount <= 0) {
        new Notice("❌ Please enter a valid XP amount");
        return;
    }

    // Get the Player Controls file to update XP
    const playerControlsPath = "Players/Player Controls.md";
    const file = app.vault.getAbstractFileByPath(playerControlsPath);
    
    if (!file) {
        console.error("❌ Player Controls file not found");
        new Notice("❌ Player Controls file not found");
        return;
    }

    // Read current file content
    const content = await app.vault.read(file);
    
    // Extract current XP from frontmatter
    const frontmatterMatch = content.match(/---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        console.error("❌ No frontmatter found in Player Controls");
        new Notice("❌ No frontmatter found in Player Controls");
        return;
    }

    const frontmatter = frontmatterMatch[1];
    const xpMatch = frontmatter.match(/ExperiencePoints:\s*(\d+)/);
    
    if (!xpMatch) {
        console.error("❌ ExperiencePoints not found in frontmatter");
        new Notice("❌ ExperiencePoints not found in frontmatter");
        return;
    }

    const currentXP = parseInt(xpMatch[1]);
    const newXP = currentXP + xpAmount;

    // Update the content
    const updatedContent = content.replace(
        /ExperiencePoints:\s*\d+/,
        `ExperiencePoints: ${newXP}`
    );

    // Write back to file
    await app.vault.modify(file, updatedContent);

    console.log(`✅ Awarded ${xpAmount} XP. Total XP is now ${newXP}`);
    new Notice(`✅ Awarded ${xpAmount} XP to party! Total: ${newXP} XP`);

    // Log the XP award
    const logEntry = `\n**${new Date().toLocaleDateString()}:** Awarded ${xpAmount} XP (Total: ${newXP})`;
    
    // Try to append to a session log if one exists
    const today = new Date().toISOString().split('T')[0];
    const sessionFiles = app.vault.getMarkdownFiles().filter(f => 
        f.path.startsWith('Sessions/') && f.basename.includes(today)
    );
    
    if (sessionFiles.length > 0) {
        const sessionFile = sessionFiles[0];
        const sessionContent = await app.vault.read(sessionFile);
        await app.vault.modify(sessionFile, sessionContent + logEntry);
    }

} catch (error) {
    console.error("❌ Error awarding XP:", error);
    new Notice(`❌ Error awarding XP: ${error.message}`);
}

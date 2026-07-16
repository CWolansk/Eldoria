async (page) => {
  const currentUrl = page.url();
  const baseUrl = currentUrl.includes("/PlayerSheetTemplate/PlayerSheet.html")
    ? `${currentUrl.split("?")[0]}?id=`
    : "http://127.0.0.1:8086/Players/PlayerSheetTemplate/PlayerSheet.html?id=";
  const specs = [
    {
      id: "char-vanessa-001",
      body: ["Class : Druid", "Subclass : Circle of the Land", "HP : 36 / 36", "AC : 15", "WIS : 17 (+3)", "poison"],
      offense: ["Green - Poison Breath Weapon", "CON DC 14", "2d6 poison", "Scimitar"],
      feats: ["Draconic Ancestry", "Lucky"],
      spells: ["Cure Wounds", "Ice Knife", "Barkskin", "Flame Blade", "Pass without Trace", "Call Lightning", "Plant Growth", "Water Breathing"],
      reference: ["Wild Shape", "Luck Points"]
    },
    {
      id: "char-claire-001",
      body: ["Class : Cleric", "Subclass : Tempest Domain", "AC : 18", "STR : 16 (+3)", "WIS : 18 (+4)"],
      feats: ["Wrath of the Storm", "Channel Divinity"],
      spells: ["Guiding Bolt", "Shape Water", "Create or Destroy Water", "Fog Cloud", "Thunderwave", "Gust of Wind", "Shatter", "Call Lightning", "Sleet Storm"],
      reference: ["Channel Divinity"]
    },
    {
      id: "char-grum-ironjaw-001",
      body: ["Class : Monk", "Subclass : Way of the Drunken Master", "DEX : 14 (+2)", "CHA : 12 (+1)"],
      offense: ["Quarterstaff", "Unarmed Strike", "1d6 +2"],
      feats: ["Actor", "Drunken Technique", "Relentless Endurance", "Savage Attacks"],
      reference: ["Ki Points"]
    },
    {
      id: "char-julie-001",
      body: ["Class : Fighter", "Subclass : Champion", "STR : 18 (+4)", "DEX : 14 (+2)", "CON : 16 (+3)", "AC : 16"],
      feats: ["Great Weapon Master", "Tough"],
      gear: ["Sigil of Thunderous Might"],
      reference: ["Second Wind", "Action Surge"]
    },
    {
      id: "char-austin-001",
      body: ["Class : Ranger", "Subclass : Hunter", "HP : 38 / 38", "AC : 15", "STR : 17 (+3)", "DEX : 18 (+4)", "CON : 16 (+3)"],
      offense: ["+1 Longbow", "Hit:+10", "Damage:1d8 +5"],
      feats: ["Colossus Slayer"],
      spells: ["Cure Wounds", "Ensnaring Strike", "Zephyr Strike"],
      gear: ["Bracer of Piercing Arrows", "Prospecting Compass"]
    },
    {
      id: "char-liz-001",
      body: ["Class : Bard", "Subclass : College of Lore", "DEX : 16 (+3)", "CHA : 17 (+3)"],
      feats: ["Bonus Proficiencies", "Cutting Words"],
      reference: ["Bardic Inspiration"]
    },
    {
      id: "char-zazpoh-the-matyr-001",
      body: ["Class : Wizard", "Subclass : School of Divination", "AC : 15", "INT : 19 (+4)", "WIS : 16 (+3)", "Speed : 25 ft / fly 50 ft"],
      offense: ["Talons", "Hit:+3", "Damage:1d4 slashing"],
      feats: ["Divination Savant", "Portent"],
      gear: ["The Aegis Codex", "Quarterstaff"],
      reference: ["Portent Dice", "Arcane Recovery"]
    }
  ];
  const results = [];

  for (const spec of specs) {
    await page.goto(`${baseUrl}${spec.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".level-editor__save-status")?.dataset.saveStatus === "saved", null, { timeout: 60000 });
    const texts = { body: await page.locator("body").innerText() };
    const portrait = await page.locator("img.player-sheet-portrait__image").evaluate((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      src: image.currentSrc || image.src
    })).catch(() => null);

    for (const tab of ["offense", "feats", "spells", "gear", "reference"]) {
      if (!spec[tab]) continue;
      await page.getByRole("button", { name: `${tab[0].toUpperCase()}${tab.slice(1)}`, exact: true }).click();
      await page.waitForTimeout(2000);
      texts[tab] = await page.locator("#TabContent").innerText();
    }

    const missing = [];
    if (!portrait?.complete || portrait.naturalWidth < 1) {
      missing.push("portrait:not-loaded");
    }
    for (const [section, expectedValues] of Object.entries(spec)) {
      if (section === "id") continue;
      for (const expected of expectedValues) {
        if (!texts[section].includes(expected)) missing.push(`${section}:${expected}`);
      }
    }
    const observed = {};
    for (const section of new Set(missing.map((entry) => entry.split(":")[0]))) {
      observed[section] = texts[section].split("\n").filter(Boolean).slice(0, 40);
    }
    results.push({ id: spec.id, portrait, missing, observed });
  }

  return results;
}

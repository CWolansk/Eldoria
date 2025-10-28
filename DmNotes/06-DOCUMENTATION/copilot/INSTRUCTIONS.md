# 📦 GitHub Copilot Instruction Pack - Eldoria Campaign

> Campaign-specific instruction files, schemas, and reusable prompts so GitHub Copilot can reliably help you build content for the **Eldoria D&D 5e Campaign**.

---

## 📁 Campaign Structure

```
GitDnDCampaign/
├─ docs/
│  └─ copilot/
│     ├─ INSTRUCTIONS.md (this file)
│     ├─ CONTEXT.md
│     └─ STYLE_GUIDE.md
├─ Bestiary/
│  ├─ Bestiary.csv
│  └─ Monster Compendium/
├─ Items/
│  ├─ Items.csv
│  ├─ Item Compendium/
│  └─ Magic Potions/
├─ Players/
├─ Sessions/
├─ World/
│  └─ Kingdoms/
│     ├─ Crestfall/
│     ├─ Silverleaf Lands/
│     └─ Ironpeak Mountain/
├─ Encounters/
├─ NPCs/
├─ Guilds/
└─ Scripts/
```

---

## Campaign Context: The World of Eldoria

You are assisting the Dungeon Master of **The Eldoria Campaign**, a high-magic fantasy world with specific lore, rules, and character dynamics.

### Core Campaign Elements

**Setting Overview:**
- **High Magic Fantasy World** where magic is common and powerful
- **Three Allied Kingdoms**: Crestfall (Human), Silverleaf Lands (Elven), Ironpeak Mountain (Dwarven)  
- **Orcish Wastes**: Hostile orcish territories
- **Main Threat**: An ancient evil wizard manipulating events to summon a demon army

**Current Party Composition:**
- **JP (Grumm)**: Half-Orc Drunken Monk, Sailor background - faces racial prejudice, ship impounded in Ardenville
- **Justin**: Human Ranger, Guild Merchant background - trade connections, owns cart and mule (Dr. Brule)
- **Julie**: Human Fighter, Archaeologist background - scholarly interests, ancient site knowledge, direct combat
- **Claire**: Water Genasi Tempest Cleric, Sailor background - thunder/lightning powers, divine connection
- **Liz**: Elf Bard (College of Lore), Widow background - perfectionist, elven longevity perspective
- **Randi**: Aarakocra Wizard - aerial reconnaissance, magical knowledge, unique perspective
- **Vanessa**: Human Fighter - direct combat specialist, tactical approach

### Custom Table Rules

**ALWAYS incorporate these when creating content:**

1. **Spell Scrolls**: Anyone can use spell scrolls (not just spellcasters)
2. **"I Know a Guy"**: Once per character, players can invoke knowing someone helpful
3. **Hero Points**: Each player gets one per session to reroll any dice or force DM reroll
4. **Guild Dues**: Merchant guild members pay 5 gp monthly
5. **Consequence-Driven**: Actions should have meaningful, sometimes unexpected consequences
6. **Magic Item Hijinks**: Favor quirky/cursed items with unintended side effects
7. **Divine Consequences**: Killing a god removes all clerics' powers of that deity

---

## Copilot Operating Instructions

### Output & Structure Priority

1. **Campaign Consistency**: Always reference Eldoria kingdoms, NPCs, and established lore
2. **Character Integration**: Include hooks for specific party members' backgrounds and motivations
3. **Homebrew Integration**: Blend seamlessly with existing custom magic items and rules
4. **Consequence Chains**: Every significant action should have potential ripple effects

### Content Creation Guidelines

**Encounters:**
- Include social/stealth alternatives to combat
- Reference monsters from the campaign's Bestiary.csv when possible
- Add scaling options for party level adjustments
- Consider how JP faces racism as a half-orc
- Include opportunities for Justin's merchant connections

**Magic Items:**
- Favor items with quirky side effects or minor curses
- Include items that create social situations or complications
- Reference the campaign's existing magic item progression system
- Consider items that interact with the party's diverse skill sets

**NPCs:**
- Reference existing guild structures (Adventurers Guild, Merchants Guild)
- Include connections to the three kingdoms' political structures
- Consider how NPCs react to the party's mixed races and backgrounds
- Include potential "I Know a Guy" connections

**Plot Hooks:**
- Tie to the overarching wizard storyline and artifact collection
- Reference the Highreach Mines and other established locations
- Include consequences from previous sessions
- Consider guild politics and merchant trade routes

### Specific Campaign Elements to Include

**Locations:**
- **Highreach**: Capital of Crestfall Kingdom, center of Adventurers Guild activity
- **Ardenville**: Where JP's ship is impounded
- **Highreach Mines**: Multi-level dungeon complex (Levels 1-3 documented)
- **Frostglade**: Elven capital in Silverleaf Lands
- **Forgepeak**: Dwarven capital in Ironpeak Mountain

**Key NPCs:**
- **King Alaric Stormhelm**: Ruler of Crestfall Kingdom  
- **Guild Master Thaldrin Stormblade**: Adventurers Guild leader
- **Lady Elara Moonshadow**: High Mage, owns The Arcane Enclave magic shop
- **Jon Brightman**: Wizard ally with information about artifacts

**Artifacts to Reference:**
- **Seeker's Eye**: Ogre eye artifact that finds other artifacts
- **Shadowstride Boots**: Allow terrain traversal (Everwood)
- **Aetherstone Compass**: Guides to wizard's stronghold (Silverleaf Lands)
- **Tempest Lantern**: Weather control (Ironpeak Mountains)
- **Obsidian Blade**: Magic-cutting weapon (Dwarven forges)
- **Crystal of True Sight**: See through illusions (Orcish Wastes)
- **Celestial Shield**: Protection from wizard's spells (Orcish temple)

---

## Content Style Requirements

### Read-Aloud Text
- **Second-person, present tense**
- **2-6 sentences** with sensory details
- **No mechanics revealed** in player-facing text
- Include atmospheric details relevant to high-magic setting

### Mechanics & Balance
- **Rounded DCs**: Use 10/12/14/15/16/18/20
- **Multiple approaches**: Combat, social, stealth, or creative solutions
- **Scaling notes**: Simple adjustments for different party levels
- **Hero Point opportunities**: Moments where dramatic rerolls matter

### Consequence Integration
- **Short-term**: Immediate results of actions
- **Long-term**: How actions affect kingdom politics, guild standing, or main plot
- **Social**: How half-orc racism, merchant connections, or guild politics play out
- **Magical**: Unexpected effects from high-magic environment

---

## Campaign-Specific Prompts

When creating content, consider these prompt starters:

**For Encounters:**
"Create a [location] encounter that ties to [artifact/kingdom] and includes opportunities for [specific party member] to use their [background/ability]."

**For NPCs:**
"Design an NPC who [connection to guild/kingdom] and has information about [plot element] but requires [social challenge] to gain trust."

**For Magic Items:**
"Create a [rarity] magic item that [helpful effect] but has [quirky drawback] that could lead to [social complication]."

**For Plot Development:**
"Develop consequences for [previous action] that affect [kingdom/guild] and create new opportunities to advance [artifact quest/main plot]."

---

## Remember: Eldoria's Unique Flavor

- **High Magic Normalcy**: Magic is common; magical solutions and problems are expected
- **Political Complexity**: Three-kingdom alliance creates diplomatic opportunities and tensions  
- **Diverse Party Dynamics**: Mix of races, classes, and backgrounds creates rich roleplay potential
- **Artifact Hunt Structure**: Each kingdom holds pieces of the puzzle to stop the evil wizard
- **Consequence Culture**: Players expect their actions to matter and create new story threads
- **Humor and Heart**: Balance serious threats with lighthearted magical mishaps and character moments

Always ask yourself: "How does this content make Eldoria feel alive, consequential, and uniquely magical?"

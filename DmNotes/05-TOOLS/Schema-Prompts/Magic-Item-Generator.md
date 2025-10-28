# Magic Item Generator Prompt

You are an expert D&D 5e content creator specializing in the Eldoria campaign setting. Generate a magic item that follows the campaign's "Beneficial + Quirky" philosophy and integrates with established lore.

## REQUIRED OUTPUT FORMAT
Generate your response as a valid JSON object that matches the magic-item.schema.json schema. Include ALL required fields and as many optional fields as relevant.

## CAMPAIGN CONTEXT
- **Setting**: High-magic fantasy world of Eldoria
- **Kingdoms**: Crestfall (Human), Silverleaf Lands (Elven), Ironpeak Mountain (Dwarven), Orcish Wastes (Orcish)
- **Active Guilds**: Adventurers Guild, Merchants Guild (5gp monthly dues)
- **Custom Rules**: Anyone can use spell scrolls, "I Know a Guy" connections, Hero Points for rerolls
- **Party Members**: Julie (Human Fighter/Archaeologist), Liz (Elf Bard/Widow), Claire (Water Genasi Tempest Cleric/Sailor), JP (Half-Orc Drunken Monk/Sailor - faces racism), Justin (Human Ranger/Merchant), Vanessa (Human Fighter), Randi (Aarakocra Wizard)

## CREATION GUIDELINES

### Magic Item Philosophy
- **Beneficial Effect**: Clear mechanical advantage appropriate to rarity
- **Quirky Side Effect**: Amusing or socially complicating (never punitive damage)
- **Roleplay Focus**: Creates interesting social situations and character moments
- **High Magic World**: Magic is commonplace, not feared or rare

### Required JSON Structure
```json
{
  "name": "Item Name",
  "source": "Homebrew - Eldoria Campaign",
  "rarity": "common|uncommon|rare|very rare|legendary|artifact",
  "type": "weapon|armor|shield|wondrous item|ring|rod|staff|wand|potion|scroll|other",
  "attunement": "none|yes|by a spellcaster|by a specific class|by a specific race|other requirement",
  "effect": "Primary beneficial mechanical effect",
  "quirk": "Minor drawback or amusing side effect that creates roleplay opportunities",
  "socialComplications": ["Potential social situations this item might create"],
  "campaignIntegration": {
    "kingdom": "Which kingdom this item originates from or relates to",
    "guildRelevance": "How this relates to Adventurers or Merchants Guild",
    "plotHooks": ["Potential story connections"],
    "npcConnections": ["Relevant NPCs or organizations"]
  },
  "mechanics": {
    "damage": "If weapon",
    "properties": ["Weapon or armor properties"],
    "spells": ["Spell effects"],
    "charges": "Number if applicable",
    "recharge": "How charges restore",
    "saveDC": "10|12|14|15|16|18|20",
    "attackBonus": "If weapon",
    "acBonus": "If armor/shield"
  },
  "history": {
    "creator": "Who made this item",
    "purpose": "Original intended use",
    "previousOwners": ["Notable past owners"],
    "currentLocation": "Where it might be found"
  },
  "playerSuitability": {
    "Julie": "How this fits Human Fighter Archaeologist",
    "Liz": "How this fits Elf Bard Widow", 
    "Claire": "How this fits Water Genasi Tempest Cleric",
    "JP": "How this fits Half-Orc Drunken Monk (consider racial dynamics)",
    "Justin": "How this fits Human Ranger Merchant",
    "Vanessa": "How this fits Human Fighter",
    "Randi": "How this fits Aarakocra Wizard"
  }
}
```

## PROMPT VARIABLES
When using this prompt, specify:
- **Item Type**: What kind of item to create
- **Rarity**: Desired power level
- **Inspiration**: Any thematic elements or mechanical needs
- **Kingdom Focus**: Which kingdom it should relate to (optional)
- **Player Focus**: Which party member(s) it might suit best (optional)

## EXAMPLE USAGE
"Create an uncommon wondrous item that would suit a merchant character, with ties to the Crestfall Kingdom and the Merchants Guild."

## VALIDATION CHECKLIST
Before finalizing, ensure:
- [ ] JSON is valid and complete
- [ ] Effect is beneficial and mechanically clear
- [ ] Quirk creates roleplay opportunities without mechanical penalties
- [ ] Campaign integration references established lore
- [ ] Player suitability considers each character's background and personality
- [ ] Social complications are interesting but not game-breaking
- [ ] History and creation fit the high-magic world setting
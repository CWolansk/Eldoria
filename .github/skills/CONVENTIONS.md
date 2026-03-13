# Eldoria Vault Conventions

Shared rules referenced by all Eldoria world-building skills. When in doubt, follow these.

## Vault Discovery

**Always search before creating.** Before generating any entity, search the vault to:
- Check if it already exists (avoid duplicates)
- Find existing content to link to instead of reinventing
- Match tone and detail level of neighboring files

Search paths:
- **Regions:** `Private/1. World Almanac/World/` — each top-level folder is a region
- **Settlements:** `Private/1. World Almanac/World/{Region}/` — each subfolder with a same-named `.md` is a settlement
- **NPCs:** `*/NPCs/` directories within any settlement
- **Stores:** `.md` files directly in settlement folders (non-NPC, non-Group)
- **Groups:** `Private/1. World Almanac/World/Groups/` and `Public/World/Groups/`
- **Events:** `Private/2. Session Journals/` and `*/Events/` directories

## File Structure

Every entity gets **two files**: a private DM note and a public player note.

| Scope | Root Path |
|---|---|
| Private | `Private/1. World Almanac/World/` |
| Public | `Public/World/` |
| Session Journals | `Private/2. Session Journals/` |

## Linking Rules

- Use `[[wiki links]]` with display text: `[[Path/To/File|Display Name]]`
- **Public notes link ONLY to other public notes** under `Public/World/...`
- **Private notes can link to anything** — private files, public files, cross-entity types
- One link per line in Links sections

## Tag Conventions

Tags live in YAML frontmatter (no `#` prefix in YAML).

| Convention | Example |
|---|---|
| Style | PascalCase |
| Entity type | `NPC`, `Store`, `Settlement`, `Organization`, `Location`, `Region`, `Event` |
| Region names | `Crestfall`, `IronpeakMountains`, `OrcishWastes`, `SilverleafLands`, `TheLowlands` |
| City names | `Highreach`, `Ardenville`, `Stonehaven`, `Greymoor` |
| Subtypes | `Guild`, `Faction`, `Cult`, `Smithy`, `Tavern`, etc. |

When creating new tags, check existing tags in nearby files and match their style. If a region or city name has spaces, use PascalCase without spaces for the tag (e.g., "The Lowlands" → `TheLowlands`).

## Brevity Rules

These apply to **all** entity types, not just NPCs:

- **10-second scan rule.** A DM mid-session should be able to glance at any file and get what they need in 10 seconds.
- **Fragments over prose.** Sentence fragments and short bullets are preferred over full paragraphs.
- **Section limits.** Most sections should have 2-4 bullets or 1-3 sentences. If a section is longer, it's too detailed.
- **Don't catalog — curate.** List what's interesting or unique, not everything that exists. "Standard adventuring gear plus..." is fine.
- **Opt-in detail.** Sections like Secrets, Plot Hooks, and Relationships are optional — only include when the user specifies. Don't pad files with invented drama.

## Read-Aloud Text

Description sections for stores, locations, and settlements double as **read-aloud text** at the table. Format these as blockquotes so the DM can instantly spot them:

```markdown
## Description
> Cramped stone shop, shelves floor to ceiling, the smell of dried lavender
> and something sharper underneath. A woman with ink-stained fingers looks
> up from a mortar and pestle.
```

Use `>` blockquote formatting for any text intended to be read aloud. Keep it to 2-3 lines max.

## Batch Creation Order

When creating multiple related entities at once (e.g., a settlement with NPCs, shops, and factions), follow this order:

1. **Region** — the container for everything
2. **Settlement** — the place that holds NPCs, shops, and groups
3. **Groups** — factions and guilds that NPCs belong to
4. **NPCs** — people who run shops and belong to groups
5. **Stores** — establishments that NPCs own
6. **Events** — things that happened involving the above

This ensures parent entities exist before children reference them, and all wiki-links resolve on the first pass.

## Obsidian Plugin Syntax

The vault uses several plugins. Skills that generate content should use these formats where appropriate.

### Initiative Tracker
The initiative-tracker plugin reads encounter blocks in notes. The encounter format uses meta-bind INPUT fields for live tracking:
```
| Initiative | Character/Monster | AC | HP | Notes |
|---|---|---|---|---|
| `INPUT[number():memory^initGoblin1]` | Goblin 1 | 13 | `INPUT[number(defaultValue(7)):memory^hpGoblin1]` | `INPUT[text():memory^notesGoblin1]` |
```
Party players are tracked via the plugin's `data.json`. Current party: Claire, JP, Julie, Justin, Liz, Randi.

### 5e Statblocks
Use collapsible `<details>` blocks for monster stat blocks in encounter files:
```html
<details>
<summary>📖 Full Stats</summary>
STR/DEX/CON/INT/WIS/CHA, traits, actions, etc.
</details>
```

### Dice Roller
Inline dice syntax: `` `dice: 2d6+3` `` renders a rollable dice element.

### Calendarium
Date frontmatter for events and sessions:
```yaml
fc-date: 0496-03-07
fc-end: 0496-03-07
fc-category: Sessions  # or Historical, Quest
```

### Meta-Bind
Interactive inputs use `INPUT[type():memory^key]` syntax. Used for initiative tracking, HP counters, encounter forms, and toggle fields.

## Converting Old-Format Files

Many existing files use an older `::` metadata format or prose-heavy templates. When converting:

1. **Read existing files first** — never overwrite hand-crafted content
2. **Map old fields to YAML frontmatter** — `Location ::` → `location`/`region`, `Profession ::` → `profession`, etc.
3. **Preserve all wiki-links** — especially workplace, event, and relationship links
4. **Drop `^blockid` references** — new public files are standalone, not embeds
5. **Invent only what's missing** — fill gaps (e.g., missing Ideal/Bond/Flaw) without contradicting existing content
6. **Rewrite public files** as standalone notes, pulling only public-safe content
7. **For batch conversions** — list files first, confirm with the user, convert one at a time

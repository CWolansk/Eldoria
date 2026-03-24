# Eval Output — The Great Blight of Hillcrest (Historical Event)

## Task
Create an event for the Great Blight of Hillcrest — a historical event where a mysterious fungal plague nearly destroyed Hillcrest's crops generations ago. No specific date known.

## Skills & Conventions Read
1. **dnd-event-generator SKILL.md** — Read in full. Key points: paired private/public files, private embeds public, YAML frontmatter with `type: Event`, `fc-category`, `fc-date` (omitted for undated historical events), file naming without date prefix for undated events, brevity rules, conversion guidance for old-format files.
2. **CONVENTIONS.md** — Read in full. Key points: search before creating, PascalCase tags in YAML (no `#` prefix), public links only to public files, 10-second scan rule, fragments over prose, dataview blocks at end of every file.

## Vault Searches Performed

### 1. Search for "Hillcrest"
- **Found 20+ matches** across the vault
- Hillcrest is an existing settlement in Crestfall region
- Private settlement file: `Private/1. World Almanac/World/Crestfall/Hillcrest/Hillcrest.md`
- Public settlement file: `Public/World/Crestfall/Hillcrest/Hillcrest.md`
- Multiple NPCs exist: Mayor Linden Hearthwood, Seraphina Winecraft, Thom Willow, Rowan Grapeheart, Lysander Thornfield, Liliana Moonleaf, Jasper Ironforge
- The private Hillcrest settlement file already references "The Great Blight (43 years ago)" in its History section

### 2. Search for "Great Blight"
- Search timed out on exact phrase, but caught by regex search below

### 3. Search for "blight|fungal plague" (regex)
- **Found existing private file**: `Private/2. Reference/Events/World Events/Timeline/The Great Blight of Hillcrest.md`
- Also found related: `0496-03-06 Vineyard Blight Investigation` (a current-era event about a new blight in Eastvale)
- Multiple NPC files reference the blight crisis (Seraphina Winecraft's magical blight detection)

### 4. Search for public counterpart
- **file_search for `**/Public/**/Great Blight*`** — No files found
- **file_search for `**/Public/**/Events/**`** — Found 35 public event files in `Public/World/Events/Timeline/`, but none for The Great Blight of Hillcrest

### 5. Examined existing event format
- Read `Public/World/Events/Timeline/Wizarding Wars.md` (another undated historical event) — proper YAML frontmatter format
- Read `Private/2. Reference/Events/World Events/Timeline/Wizarding Wars.md` — just a session link, minimal
- Read `Public/World/Events/Timeline/0496-03-06 Highreach Mine Collapses.md` — proper format with dated prefix
- Read `Private/2. Reference/Events/World Events/Timeline/0496-03-06 Highreach Mine Collapses.md` — proper format with embed, DM Notes, Links, dataview block

## Findings

### Existing Private File (Old Format)
**Path**: `Private/2. Reference/Events/World Events/Timeline/The Great Blight of Hillcrest.md`

**Problems identified**:
- No proper YAML frontmatter — the `---` delimiters were placed after the H1 heading instead of at the top of the file
- Tags used `#` prefix in YAML array: `[#HistoricalEvent, #Hillcrest, #MagicalBlight, #Precedent]` — should be PascalCase without `#`
- `type: Historical Event` instead of `type: Event`
- Missing `fc-category` field
- No embed of a public file
- Extremely prose-heavy (136 lines) — violates the 10-second scan rule badly
- No dataview block at end
- No wiki-links to existing NPC files
- Content included detailed timeline phases, key participants with ancestor connections, magical/technical details, party-specific research opportunities, political implications, and campaign integration notes

### Missing Public File
No public counterpart existed at `Public/World/Events/Timeline/The Great Blight of Hillcrest.md`.

## Actions Taken

### 1. Created Public File
**Path**: `Public/World/Events/Timeline/The Great Blight of Hillcrest.md`

**Content**:
```markdown
---
type: Event
name: The Great Blight of Hillcrest
fc-category: Historical
location: Hillcrest
region: Crestfall
tags:
  - Event
  - Crestfall
  - Hillcrest
  - Historical
---

## What Happened
- A mysterious fungal plague struck [[Public/World/Crestfall/Hillcrest/Hillcrest|Hillcrest]]'s vineyards generations ago
- Strange fungal growth appeared overnight across multiple vineyard sections
- Traditional remedies failed — the blight spread to over half the village's crops within weeks
- Local druids and visiting scholars collaborated to purify the infected land
- A multi-day ritual combining nature magic and protective wards saved the harvest

## Key Takeaways
- Hillcrest's tradition of welcoming outside magical expertise began with this crisis
- Magical monitoring crystals installed during the resolution are still in use today
- The village survived through cooperation between traditionalists and outside practitioners

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```​
```

### 2. Converted Private File (Full Rewrite)
**Path**: `Private/2. Reference/Events/World Events/Timeline/The Great Blight of Hillcrest.md`

Replaced the entire 136-line old-format file with a properly formatted version that:
- Has correct YAML frontmatter at the top of the file
- Uses `type: Event` and `fc-category: Historical`
- Tags are PascalCase without `#` prefix
- No `fc-date` (user specified no specific date known)
- Embeds the public file via `![[Public/World/Events/Timeline/The Great Blight of Hillcrest]]`
- Condenses 136 lines of prose into scannable bullet points
- Preserves key DM-only information (true cause, resolution method, ancestor connections, parallels to current crisis)
- Adds wiki-links to existing NPC and location files
- Includes dataview block at end

**Content**:
```markdown
---
type: Event
name: The Great Blight of Hillcrest
fc-category: Historical
location: Hillcrest
region: Crestfall
tags:
  - Event
  - Crestfall
  - Hillcrest
  - Historical
---

![[Public/World/Events/Timeline/The Great Blight of Hillcrest]]

## Consequences
- Established permanent magical monitoring crystals in Hillcrest vineyards (still active)
- Created village expectation that magical problems require magical solutions
- Sparked tradition of welcoming outside expertise — now complicated by faction politics
- [[Mayor Linden Hearthwood]]'s grandfather Aldric led the village through it; family legacy tied to the crisis
- [[Seraphina Winecraft]]'s grandmother Elara pioneered integrating magical monitoring into traditional winemaking

## DM Notes
- **True cause**: Fungal infection magically enhanced by a corrupted ley line intersection beneath the oldest vineyard
- **Resolution**: Three-day ritual — druidic purification + scholarly ward anchors sealed the corruption
- **Key ancestors**: Aldric Hearthwood (mayor), Garrett Vineward (vintner, initially opposed magic), Elara Winecraft (integrated monitoring into winemaking)
- **Parallels to current crisis**: Both blights resist traditional remedies and show magical enhancement, but current blight has different magical signatures and the village now has three competing factions instead of unified leadership

## Links
- [[Mayor Linden Hearthwood]]
- [[Seraphina Winecraft]]
- [[Hillcrest]]
- [[0496-03-06 Vineyard Blight Investigation]]

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```​
```

## Decisions & Reasoning

1. **Kept existing file path** (`Private/2. Reference/Events/World Events/Timeline/`) rather than moving to `Private/1. World Almanac/World/Crestfall/Events/` — the skill suggests the latter for historical events, but the vault's established pattern places all timeline events (including the Wizarding Wars historical event) in the `Timeline/` directory. Consistency with the vault wins.

2. **No fc-date** — User explicitly stated "no specific date known." The old file had "43 years ago (282 AC)" but this was DM-invented detail from the old format. Following the user's instruction and the skill's guidance: "Historical events without a specific date — omit the prefix."

3. **No Secrets or Follow-Up Hooks sections** — Per CONVENTIONS.md: "Sections like Secrets, Plot Hooks, and Relationships are opt-in only." The user didn't request these. Key DM-only information was folded into the Consequences and DM Notes sections instead.

4. **Preserved key lore from the old file** while drastically condensing — The 136-line old file had detailed timeline phases, participant lists, magical details, party-specific research hooks, political analysis, and campaign integration notes. The new private file preserves the essential DM facts (true cause, resolution method, ancestor connections, crisis parallels) in ~40 lines. Research opportunities and political analysis were cut as they're DM improvisation material, not vault records.

5. **Public file contains only player-knowable information** — The fungal plague, its visible effects, the collaborative resolution, and the lasting monitoring crystals are all things villagers would talk about openly. The corrupted ley line, specific magical mechanisms, and ancestor connections to current NPCs are DM-only.

6. **Wiki-links** — Public file links to `[[Public/World/Crestfall/Hillcrest/Hillcrest|Hillcrest]]` (public path). Private file uses short-form links `[[Mayor Linden Hearthwood]]`, `[[Seraphina Winecraft]]`, `[[Hillcrest]]`, and `[[0496-03-06 Vineyard Blight Investigation]]` matching the vault's private file convention.

## Notes for Future
- The private Hillcrest settlement file (`Private/1. World Almanac/World/Crestfall/Hillcrest/Hillcrest.md`) references "The Great Blight (43 years ago)" in its History section but doesn't use a wiki-link to the event file. A future update could add `[[The Great Blight of Hillcrest]]` there.
- The Vineyard Blight Investigation event (`0496-03-06 Vineyard Blight Investigation`) describes a current-era blight — a wiki-link back to this historical event could strengthen the connection.

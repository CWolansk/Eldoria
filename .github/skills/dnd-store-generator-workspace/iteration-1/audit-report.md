# Store Generator — Audit Report (Iteration 1)

## Summary
- **Eval 1 (New Store — The Rusty Nail):** 5/9 pass (56%)
- **Eval 2 (Duplicate Detection):** 3/3 pass (100%)
- **Overall:** 8/12 pass (67%)

## Issues Found

### 1. Private template has Description instead of embed (High)
**Where:** Private template — `## Description` section
**Problem:** Same as NPC generator. Vault convention (AGENTS.md) says private files embed the public file. Real store files (Target by Tradewind) use `![[Public/World/...]]` at the top. Template has `## Description` with blockquote instead.
**Impact:** Agent tried to correct by using embed pattern from vault, but this caused it to drop the template's `## Proprietor` link and `## Inventory` section — both important for DM cross-referencing.
**Fix:** Replace `## Description` with `![[Public/World/{Region}/{City}/{Shop Name}]]`. Keep `## Proprietor` (as an NPC link) and `## Inventory` (for DM-only items) as separate sections below the embed.

### 2. Dataview query syntax (Medium)
**Where:** Both template blocks
**Fix:** Private: `FROM [[]]`. Public: `FROM [[]] AND "Public"`.

### 3. Read-aloud blockquote guidance (Medium)
**Where:** Writing Guidelines and public template
**Problem:** The Writing Guidelines say "use > blockquote formatting" for Description as read-aloud, but the public template shows Description without blockquote syntax. The DM reads the private file which embeds the public — so if the public Description has blockquotes, the DM sees them via embed.
**Fix:** Add `>` blockquote format to the public template's Description section. Remove the idea of a separate private Read-Aloud section.

### 4. Store type tag missing from template (Low)
**Where:** Template tag arrays
**Problem:** Real vault files include the store_type as a tag (e.g., `GeneralStore`, `Tavern`). Template only lists `Store, {Region}, {City}`. Agent added it on its own.
**Fix:** Add `{StoreType}` to tag arrays.

### 5. No preview guidance (Low)
**Fix:** Same pattern.

### 6. Cascading creation missing reminder (Low)
**Fix:** Same pattern.

## What Worked Well
- Agent proactively used embed pattern from vault despite template not specifying it
- Public file well-structured — Description, Proprietor, Services & Wares, Reputation all present
- Cascading creation proposed the proprietor NPC creation
- Duplicate detection perfect
- Atmosphere/vibe nailed the "rough dockside pub" request

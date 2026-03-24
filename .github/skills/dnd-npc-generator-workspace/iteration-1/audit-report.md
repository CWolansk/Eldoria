# NPC Generator — Audit Report (Iteration 1)

## Summary
- **Eval 1 (New NPC — Gunnar Stonejaw):** 8/12 pass (67%)
- **Eval 2 (NPC with Secret — Lyra Goldthread):** 4/4 pass (100%)
- **Eval 3 (Duplicate Detection):** 3/3 pass (100%)
- **Overall:** 15/19 pass (79%)

## Issues Found

### 1. Private template missing public embed — uses Description instead (High)
**Where:** Private template — `## Description` section
**Problem:** The AGENTS.md rule says "Private files embed public content — no duplication." Real vault NPC files (Elder Rowan, Isolde) embed the public file at the top with `![[Public/World/.../NPC Name]]` and do NOT have a `## Description` section. The skill template has `## Description` with a blockquote but no embed. This causes:
  - Content duplication (private Description ≈ public Appearance)
  - Inconsistency with vault conventions  
  - Updates to public Appearance not reflected in private file
**Fix:** Replace `## Description` with `![[Public/World/{Region}/{City}/NPCs/{NPC Name}]]` at the top of the private template. Move read-aloud guidance to a separate optional `## Read-Aloud` section note.

### 2. Dataview query syntax (Medium)
**Where:** Both private and public template blocks
**Problem:** Same `FROM [[#this.file.name]]` issue as all previous skills.
**Fix:** Private: `FROM [[]]`. Public: `FROM [[]] AND "Public"`.

### 3. Public dataview missing `AND "Public"` filter (Medium)
**Where:** Public template dataview block
**Problem:** Same as settlement and group generators.
**Fix:** Add filter.

### 4. No preview guidance (Low)
**Where:** "Before You Create" section
**Fix:** Same pattern.

### 5. Cascading creation missing reminder (Low)
**Where:** End of Cascading Creation section
**Fix:** Same pattern.

## What Worked Well
- Secret handling excellent — Lyra's Nightstalkers connection perfectly hidden in public file
- Personality traits well-calibrated — gruff blacksmith felt distinct from friendly merchant
- Cascading creation proposals practical (forge store, Nightstalkers cross-ref)
- Duplicate detection perfect
- Quirks memorable and playable
- Links properly formatted with full paths

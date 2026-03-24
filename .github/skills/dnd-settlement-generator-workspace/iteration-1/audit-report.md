# Settlement Generator — Audit Report (Iteration 1)

## Summary
- **Eval 1 (New Settlement):** 12/13 pass (92%)
- **Eval 2 (Settlement with Entities):** 6/6 pass (100%)
- **Eval 3 (Duplicate Detection):** 3/3 pass (100%)
- **Overall:** 21/22 pass (95%)

## Issues Found

### 1. Dataview query syntax — `FROM [[#this.file.name]]` (Medium)
**Where:** Private and public template blocks in SKILL.md
**Problem:** Template uses `FROM [[#this.file.name]]` which is the old convention. Should use `FROM [[]]` per updated vault standards (already fixed in region generator).
**Impact:** Agent faithfully reproduces the old syntax. All new files would use the inconsistent format.
**Fix:** Change both dataview blocks to `FROM [[]]`. Public block should additionally include `AND "Public"` filter.

### 2. Public dataview missing `AND "Public"` filter (Medium)
**Where:** Public template dataview block in SKILL.md
**Problem:** The public template's dataview query doesn't include an `AND "Public"` filter, but ALL existing public settlement files in the vault use `FROM [[#this.file.name]] AND "Public"` to show only public-file back-references. The agent compensated by learning from vault examples, but the template itself should enforce this.
**Impact:** Without the filter, public files would show mentions from private files — leaking DM structure to players.
**Fix:** Add `AND "Public"` to the public template's dataview.

### 3. Settlement name tag missing from template (Low)
**Where:** Tags arrays in both private and public templates
**Problem:** Template tags only include `Settlement` and `{Region}`, but every existing vault settlement also includes the settlement name as a tag (e.g., `Highreach`, `Stonehaven`, `Ardenville`). Eval 1 agent added it correctly; Eval 2 agent omitted it — inconsistent behavior.
**Impact:** Missing settlement-name tag breaks dataview queries that filter by settlement tag (e.g., `FROM #Stonehaven`).
**Fix:** Add `{SettlementName}` to both templates' tag arrays.

### 4. No preview guidance for existing entities (Low)
**Where:** "Before You Create" section
**Problem:** Same gap as region generator — no instruction for when a user wants to see what would be generated for an entity that already exists.
**Fix:** Add sentence: "If the entity already exists, offer to review or update, or show a preview in chat without creating files."

## What Worked Well
- Cascading creation behavior was excellent — agent proposed blacksmith, tavern, region update, and orc group as follow-ups with confirmation prompts
- Duplicate detection perfect — caught Highreach, listed related files, offered alternatives
- Brevity consistently met — 10-second scan rule followed, fragments over prose
- Public/private separation clean — no DM secrets leaked to public files
- YAML frontmatter structure consistently correct
- Agent proactively added `AND "Public"` filter to public dataview (compensating for template gap)

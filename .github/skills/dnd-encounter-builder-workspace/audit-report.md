# Audit Report: dnd-encounter-builder

**Date:** 2025-01-22
**Iteration:** 1
**Overall Score:** 25/25 (100%)

## Eval Results

| Eval | Name | Score | Notes |
|------|------|-------|-------|
| 1 | Bandit Ambush — Medium combat | 12/12 (100%) | Correct XP math, full initiative tracker, all 6 PCs |
| 2 | Corrupted Dryad — Custom boss | 9/9 (100%) | Outstanding custom creature, legendary actions, balanced CR |
| 3 | Goblin Ambush — Duplicate detection | 4/4 (100%) | Found duplicate, offered modifications |

## Issues Found

### 1. Template uses inline tags but existing vault files use YAML frontmatter (MODERATE)
- **Evals:** 1 vs 2
- **Problem:** The skill template uses `#Encounter #Combat #Crestfall #Level5` inline tags. But existing vault encounters (Goblin Ambush, etc.) use YAML frontmatter with `type: Encounter`, `encounter_type`, `difficulty`, `party_level`, and `tags` array. This caused eval 1 to use inline tags and eval 2 to use YAML — inconsistent output.
- **Fix:** Add YAML frontmatter to the template to match existing vault pattern, keeping inline tags as optional.

### 2. Template has TWO dataview blocks (LOW)
- **Problem:** Same pattern seen in quest-generator and holiday-generator. Template shows dataview after title AND at the bottom.
- **Fix:** Consolidate to match existing vault pattern (top after title for "Related", bottom for "Mentioned In")

### 3. Existing Goblin Ambush missing Randi from distribution (INFORMATIONAL)
- Not a skill issue — the encounter predates Randi joining the party.

## Fixes Applied

1. **YAML frontmatter added to template** — Added frontmatter block with `type: Encounter`, `encounter_type`, `location`, `difficulty`, `party_level`, and `tags` to match existing vault files
2. **Dataview note added** — Clarified: top dataview shows "Related" (with WHERE filter), bottom dataview shows "Mentioned In". Both are standard for encounters.

## Vault Side Effects

### Test artifacts (removed):
- `Private/2. Reference/Encounters/Bandit Ambush - Ardenville Road.md`
- `Private/2. Reference/Encounters/Cursed Grove of the Corrupted Dryad.md`

### Existing files (unchanged):
- No existing vault files were modified during these evals

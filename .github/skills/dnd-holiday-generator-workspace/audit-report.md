# Audit Report: dnd-holiday-generator

**Date:** 2025-01-22
**Iteration:** 1
**Overall Score:** 25/26 (96%)

## Eval Results

| Eval | Name | Score | Notes |
|------|------|-------|-------|
| 1 | The Anvil's Rest — New Dwarven holiday | 12/12 (100%) | Clean file, strong dwarven tone, correct template usage |
| 2 | Harvest Festival — Duplicate detection | 3/4 (75%) | Found duplicate, didn't create new, but didn't offer to update/expand |
| 3 | Starfall Vigil — Multi-day Elven with hooks | 10/10 (100%) | Excellent 3-night structure, adventure hooks, multi-day calendarium |

## Issues Found

### 1. Duplicate handling lacks "next steps" guidance (MODERATE)
- **Eval:** 2
- **Problem:** Same systemic gap found in quest-generator — the skill says "search and present what the vault already has" but doesn't instruct agents to offer alternatives (update, expand, add hooks, etc.)
- **Fix:** Add guidance for what to do AFTER presenting the existing file

### 2. Template has TWO dataview blocks — ambiguous placement (MODERATE)
- **Problem:** Template shows dataview after YAML AND at the bottom. Both eval agents used bottom-only, matching existing vault files but not the template's top placement.
- **Fix:** Consolidate to ONE dataview block with clear placement. Bottom-after-separator matches existing vault holiday files.

### 3. Existing holidays use old dataview syntax (INFORMATIONAL)
- **Problem:** All 13 existing holidays use `FROM [[#this.file.name]]` instead of `FROM [[]]`. New holidays correctly use `FROM [[]]` but the inconsistency exists in the vault.
- **Impact:** Low — the old files still work. Can be batch-converted separately.

## Fixes Applied

1. **Duplicate handling guidance** — Added "After presenting the existing file, offer to update, expand, or add sections the user might want" after the duplicate detection instruction
2. **Dataview consolidation** — Removed top-after-YAML dataview block from template; kept bottom-only with note "One dataview block at the end — do not add a second after YAML"

## Vault Side Effects

### Test artifacts (removed):
- `Private/2. Reference/Events/World Events/Holidays/Dwarven Holidays/The Anvil's Rest.md`
- `Private/2. Reference/Events/World Events/Holidays/Elven Holidays/Starfall Vigil.md`

### Existing files (unchanged):
- No existing vault files were modified during these evals

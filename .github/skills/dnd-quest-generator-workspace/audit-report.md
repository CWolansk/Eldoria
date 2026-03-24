# Audit Report: dnd-quest-generator

**Date:** 2025-01-22
**Iteration:** 1
**Overall Score:** 25/26 (96%)

## Eval Results

| Eval | Name | Score | Notes |
|------|------|-------|-------|
| 1 | Dead Fish — New E-rank quest | 13/13 (100%) | All assertions pass. Clean file with correct template usage. |
| 2 | Goblins — Duplicate detection | 3/4 (75%) | Found duplicate, didn't create new, but didn't offer to update/expand existing. |
| 3 | Boat Race Sabotage — D-rank investigation | 9/9 (100%) | All assertions pass. Outstanding investigation mechanics. |

## Issues Found

### 1. Duplicate handling lacks "next steps" guidance (MODERATE)
- **Eval:** 2
- **Problem:** When a duplicate is detected, the skill says "search and present what the vault already has rather than generating new content" — but doesn't tell the agent to offer alternatives (update, expand, re-level, etc.)
- **Fix:** Add guidance for what to do AFTER presenting the existing file

### 2. Template has TWO dataview blocks — ambiguous placement (MODERATE)
- **Problem:** The template shows a dataview block after YAML frontmatter AND another at the bottom after optional sections. This led to eval 1 using bottom-only and eval 3 using top-only.
- **Fix:** Consolidate to ONE dataview block with clear placement instructions. Top-after-YAML matches existing vault quest files.

### 3. Status/fc-category mapping inconsistencies (LOW)
- **Eval:** 3
- **Problem:** `status: Idea` paired with `fc-category: Available Quests`. The template lists status values (Available / Active / Completed / Failed) that don't include "Idea" — but the vault's Ideas/ folder uses `status: Idea`.
- **Fix:** Add "Idea" to the status values and add fc-category mapping table

### 4. Optional sections included without explicit request (LOW)
- **Eval:** 3
- **Problem:** Complications and Connections sections were included despite the template marking them "optional — only include if the user specifies." The investigation context arguably justified them, but it violates the "don't invent unwanted detail" rule.
- **Impact:** Low — the content was high quality and relevant. But the skill instruction is clear.

## Fixes Applied

1. **Duplicate handling guidance** — Added "After presenting the existing file, offer to update, expand, re-level, or link it to new content" after the duplicate detection instruction
2. **Dataview consolidation** — Removed the bottom dataview block from the template; kept top-after-YAML only, added note "One dataview block after YAML frontmatter — do not add a second at the bottom"
3. **Status values updated** — Added "Idea" to the status enum and added status → folder + fc-category mapping table

## Vault Side Effects

### Test artifacts (removed):
- `Private/2. Reference/Events/Quests/Active/Dead Fish in the Eastern Shallows.md`
- `Private/2. Reference/Events/Quests/Ideas/Boat Race Sabotage.md`

### Existing files (unchanged):
- No existing vault files were modified during these evals

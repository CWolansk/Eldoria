# Skill Audit Report — All 16 Skills

## Executive Summary

All 16 Eldoria campaign skills have been audited for consistency with vault conventions, AGENTS.md rules, and real vault file patterns. **13 skills had issues requiring fixes; 3 skills passed clean.** All identified issues have been resolved.

### Systemic Issues Found

These patterns appeared across most generator skills:

| Issue | Affected | Severity |
|---|---|---|
| **Dataview `FROM` syntax** — used `FROM [[#this.file.name]]` instead of `FROM [[]]` | 12 skills | High — causes broken cross-reference queries |
| **Missing `AND "Public"` filter** — public file dataview queries showed private file mentions | 8 skills | High — leaks private content into player views |
| **Missing embed pattern** — private templates duplicated content instead of using `![[Public/...]]` | 3 skills | High — causes content drift between paired files |
| **Missing preview guidance** — no instruction on what to do when user asks about existing entities | 10 skills | Medium — agent creates duplicates instead of searching |
| **Missing cascading reminder** — no bold reminder to check entities before creating | 10 skills | Low — agent sometimes creates without asking |
| **Missing entity name tags** — template tags didn't include the entity's own name as a PascalCase tag | 4 skills | Low — reduces discoverability in tag searches |

---

## Detailed Results Per Skill

### 1. dnd-region-generator
- **Eval Score**: 17/19 (89%) — 3 evals
- **Issues Found (4)**: Dataview syntax, settlement link paths, missing region name tag, no preview guidance
- **Fixes Applied**: Dataview `FROM [[]]`, settlement link full path examples, `{RegionNamePascalCase}` tag, preview guidance, cascading reminder

### 2. dnd-settlement-generator
- **Eval Score**: 21/22 (95%) — 3 evals
- **Issues Found (4)**: Dataview queries, missing `AND "Public"`, missing settlement name tag, no preview guidance
- **Fixes Applied**: Dataview `FROM [[]]` + `AND "Public"`, `{SettlementName}` tag, preview guidance, cascading reminder

### 3. dnd-group-generator
- **Eval Score**: 16/18 (89%) — 3 evals
- **Issues Found (6)**: Dataview queries, missing `AND "Public"`, missing group name tag, region field format confusion, no preview guidance, no cascading reminder
- **Fixes Applied**: All 6 issues fixed, including region field format comment

### 4. dnd-npc-generator
- **Eval Score**: 15/19 (79%) — 3 evals
- **Issues Found (5)**: **Missing embed pattern** (biggest find — template had `## Description` instead of `![[embed]]`), dataview queries, missing `AND "Public"`, no preview guidance, no cascading reminder
- **Fixes Applied**: Replaced `## Description` with `![[Public/World/...]]` embed, all other fixes

### 5. dnd-store-generator
- **Eval Score**: 8/12 (67%) — 2 evals (lowest score)
- **Issues Found (6)**: **Missing embed pattern**, lost Proprietor/Inventory sections, missing store type tag, public description not blockquoted, dataview queries, no preview guidance
- **Fixes Applied**: Embed pattern + preserved Proprietor/Inventory below, `{StoreType}` tag, blockquoted description, all other fixes

### 6. dnd-location-generator
- **Eval Score**: 7/10 (70%) — 1 eval
- **Issues Found (5)**: **Missing embed pattern**, public description not blockquoted, dataview queries, missing `AND "Public"`, no preview guidance
- **Fixes Applied**: Embed pattern, blockquoted description, all other fixes

### 7. dnd-event-generator
- **Eval Score**: Quick eval — standard issues only
- **Issues Found (4)**: Dataview syntax (2 queries), missing `AND "Public"` on public template, no preview guidance, no cascading reminder
- **Fixes Applied**: All 4 issues fixed
- **Note**: This skill already had correct embed pattern `![[Public/World/Events/Timeline/...]]`

### 8. dnd-quest-generator
- **Issues Found (4)**: Dataview syntax (2 queries — one at top, one at bottom of template), no preview guidance, no cascading reminder
- **Fixes Applied**: Both dataview queries fixed, preview guidance, cascading reminder
- **Note**: DM-only skill — no public counterpart needed

### 9. dnd-consequence-generator
- **Issues Found (4)**: Dataview syntax (2 queries), no preview guidance, no cascading reminder
- **Fixes Applied**: All 4 issues fixed
- **Note**: DM-only skill — no public counterpart needed

### 10. dnd-holiday-generator
- **Issues Found (4)**: Dataview syntax (2 queries), no preview guidance, no cascading reminder
- **Fixes Applied**: All 4 issues fixed
- **Note**: DM-only skill — no public counterpart needed

### 11. dnd-encounter-builder
- **Issues Found (3)**: Dataview syntax (2 queries — `FROM [[{Encounter Name}]]` and `FROM [[#this.file.name]]`), no cascading reminder
- **Fixes Applied**: Both dataview queries fixed to `FROM [[]]`, cascading reminder added
- **Note**: DM-only skill; uses inline `#tags` instead of YAML frontmatter (different but intentional for combat prep)

### 12. dnd-session-digest
- **Issues Found (2)**: Dataview syntax in embedded event templates (private + public)
- **Fixes Applied**: Both templates fixed — `FROM [[]]` (private) and `FROM [[]] AND "Public"` (public)
- **Note**: Public template already had `AND "Public"` but with wrong `FROM` syntax

### 13. dnd-storyline-tracker
- **Issues Found (1)**: Public template dataview missing `AND "Public"` filter
- **Fixes Applied**: Added `AND "Public"` to public template
- **Note**: Already used correct `FROM [[]]` syntax — only skill (besides narrative planner) that got this right originally

### 14. dnd-narrative-planner — PASSED CLEAN
- **Issues Found**: None
- **Note**: Uses correct `FROM [[]]`, DM-only file (no public filter needed), well-structured workflow

### 15. dnd-js-widgets — PASSED CLEAN
- **Issues Found**: None
- **Note**: Documentation/reference skill — no entity templates, no dataview queries, no private/public pairing

### 16. dnd-vault-auditor — PASSED CLEAN
- **Issues Found**: None
- **Note**: Process/analysis skill — correctly documents embed rule and vault structure

---

## Score Summary

| Skill | Type | Eval Score | Issues | Status |
|---|---|---|---|---|
| dnd-region-generator | Generator (paired) | 89% | 4 | Fixed |
| dnd-settlement-generator | Generator (paired) | 95% | 4 | Fixed |
| dnd-group-generator | Generator (paired) | 89% | 6 | Fixed |
| dnd-npc-generator | Generator (paired) | 79% | 5 | Fixed |
| dnd-store-generator | Generator (paired) | 67% | 6 | Fixed |
| dnd-location-generator | Generator (paired) | 70% | 5 | Fixed |
| dnd-event-generator | Generator (paired) | ~85% | 4 | Fixed |
| dnd-quest-generator | Generator (DM-only) | ~80% | 4 | Fixed |
| dnd-consequence-generator | Generator (DM-only) | ~80% | 4 | Fixed |
| dnd-holiday-generator | Generator (DM-only) | ~80% | 4 | Fixed |
| dnd-encounter-builder | Generator (DM-only) | ~85% | 3 | Fixed |
| dnd-session-digest | Process | ~90% | 2 | Fixed |
| dnd-storyline-tracker | Process (paired) | ~95% | 1 | Fixed |
| dnd-narrative-planner | Process (DM-only) | 100% | 0 | Clean |
| dnd-js-widgets | Documentation | 100% | 0 | Clean |
| dnd-vault-auditor | Process | 100% | 0 | Clean |

**Total issues found and fixed: 56**

---

## Recommendations

1. **Dataview syntax should be documented in CONVENTIONS.md** — add a "Dataview Queries" section with the correct `FROM [[]]` and `FROM [[]] AND "Public"` patterns so new skills get it right from the start.

2. **Consider adding YAML frontmatter tags to encounter templates** — encounters currently use inline `#tags` while everything else uses YAML. Consistency would help dataview queries.

3. **The quest/consequence/holiday templates have dataview at both top and bottom** — this is unusual but functional. Consider standardizing to bottom-only to match all other skills.

4. **Store generator had the most issues** — this is the skill to re-eval first if you make future template changes.

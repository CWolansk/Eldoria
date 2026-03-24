# dnd-region-generator — Skill Audit Report (Iteration 1)

## Overall Assessment: GOOD with minor issues

The skill is well-structured, clear, and produces output that matches the Eldoria vault conventions. The template is clean, brevity rules are enforced, and the private/public separation works correctly. However, there are several gaps between the skill's template and actual vault conventions.

## Pass/Fail Summary

| Eval | Test Case | Pass Rate |
|------|-----------|-----------|
| 1 | New region (Shattered Coast) | 8/10 |
| 2 | Region with secrets (Bleaklands) | 6/6 |
| 3 | Duplicate detection (Silverleaf) | 3/3 |
| **Total** | | **17/19 (89%)** |

## Issues Found

### 1. TEMPLATE BUG: Dataview query format mismatch
**Severity: Medium**
- Skill template shows: `FROM [[#this.file.name]]`
- Existing vault files use: `FROM [[]]`
- These are not equivalent. `FROM [[]]` matches links to the current file; `FROM [[#this.file.name]]` is a different Dataview syntax that may not work the same way.
- **Fix:** Change template to match existing vault convention `FROM [[]]`

### 2. TEMPLATE GAP: Settlement links lack full paths
**Severity: Medium**
- Skill's private template shows: `[[Settlement Name]]` with plain text descriptions
- Existing Crestfall private file uses full paths: `[[Private/1. World Almanac/World/Crestfall/Highreach/Highreach|Highreach]]`
- Skill's public template says "Bullet list linking to public settlement pages" but shows no example link format
- Existing Crestfall public file uses: `[[Public/World/Crestfall/Highreach/Highreach|Highreach]]`
- **Fix:** Add explicit link format examples in both templates, showing full paths matching existing conventions

### 3. TEMPLATE GAP: Cascading creation reminder not baked into template
**Severity: Low**
- The skill's "Cascading Creation" section at the bottom describes what to do, but it's easy to forget when generating
- In evals 1 and 2, cascading creation prompts were missed
- **Fix:** Add an HTML comment or note in the template itself as a reminder: `<!-- Check: offer to create settlements, groups, locations mentioned above -->`

### 4. EDGE CASE: No guidance for "show me what you'd generate" requests
**Severity: Low**
- Eval 3 shows the duplicate scenario works, but the user's specific phrasing ("I want to see what you'd generate") isn't addressed
- **Fix:** Add a sentence to the "Before You Create" section: "If the user wants to see output for an existing entity, offer a preview in chat without creating files."

### 5. MINOR: Public template description section name inconsistency
**Severity: Low**
- Skill template uses `## Overview` for the public file
- This is actually correct and matches existing files — no fix needed

### 6. OBSERVATION: Private template doesn't show Crestfall-style tag
**Severity: Informational**
- Existing Crestfall file has `tags: [Region, Crestfall]` — the region appears both as the region type and the region name tag
- Skill template shows `tags: [Region]` only
- The generated output correctly includes both (e.g., `Region, TheShatteredCoast`) so the template is close but could be more explicit

## Recommended Skill Changes

1. Fix dataview query: `FROM [[#this.file.name]]` → `FROM [[]]`
2. Add explicit link format examples for settlements in both private and public templates
3. Add a cascading creation reminder inside the template markers
4. Add edge case guidance for "preview" requests on existing entities

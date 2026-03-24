# dnd-consequence-generator — Skill Audit Report (Iteration 1)

## Overall Assessment: EXCELLENT — skill is working well after prior fixes

The consequence generator skill produces output that closely matches the template, follows vault conventions, and handles all three test scenarios correctly: new creation, existing-file update, and duplicate detection. The fixes applied earlier (dataview FROM [[]], preview guidance, cascading reminder) are all working.

## Pass/Fail Summary

| Eval | Test Case | Pass Rate |
|------|-----------|-----------|
| 1 | New consequence (Ember River Bridge Destroyed) | 15/15 |
| 2 | Failed quest consequence (Flushed Heirloom) | 10/10 |
| 3 | Duplicate detection (Randi Kills Looters) | 4/4 |
| **Total** | | **29/29 (100%)** |

## What Worked Well

1. **Template compliance** — All generated content matches the YAML frontmatter schema, section structure, and formatting rules exactly
2. **Vault searching** — Thorough searches before creating: found existing consequences, related quests, NPCs, factions, session journals
3. **Duplicate detection** — Eval 3 correctly found the existing file and refused to create a duplicate, offering useful update options instead
4. **Existing file updates** — Eval 2 found and updated the existing Flushed Heirloom consequence, restructuring it to match the template
5. **Dataview syntax** — All outputs use `FROM [[]]` correctly (the prior fix is working)
6. **DM-only enforcement** — No public files created for any consequence
7. **Brevity** — All sections use fragments and bullets, fully scannable
8. **Cascading creation** — Eval 1 offered to create event files, quests, encounters, and location updates as follow-ups
9. **Severity assessment** — Correctly judged Major for regional trade disruption, Moderate for local reputation damage

## Issues Found

### 1. GAP: No guidance on file relocation when changing status
**Severity: Low**
- Eval 2 changed `status: Idea` → `Active` but left the file in `Ideas/` subfolder
- The skill defines the folder structure (Active/, Resolved/, Ideas/) but doesn't explicitly instruct: "When changing status, also move the file to the matching subfolder"
- **Fix:** Add a sentence to the Converting section or a general note about keeping status and folder in sync

### 2. OBSERVATION: Template line omission when no triggering event file exists
**Severity: Informational — No fix needed**
- Eval 1 omitted the "Consequences of the results of [[{Triggering Event}]]" template line because no event file exists
- This is reasonable behavior — linking to a nonexistent file would create an orphan link
- Eval 2 correctly included the line because the quest file exists

### 3. OBSERVATION: Eval side effects on real vault
**Severity: Process concern — not a skill issue**
- Eval 1 created `Private/2. Reference/Events/Consequences/Active/Ember River Bridge Destroyed.md` (test artifact)
- Eval 2 modified the real `Flushed Heirloom Failed Quest Consequence.md` (changed status, restructured content, fixed dataview)
- The Flushed Heirloom changes are actually improvements to a real file, so they may be worth keeping
- The Bridge Destroyed file is a test artifact and should be removed

## Recommended Skill Changes

### Fix 1: Add status/folder sync guidance (Low priority)
Add to the "File Paths" section or "Converting Existing Consequences" section:
> When changing a consequence's status (e.g., Idea → Active), move the file to the matching subfolder so the folder structure stays in sync with YAML status.

**Assessment: This is the only actionable fix. The skill is otherwise in good shape.**

## Prior Fixes Verified Working

The following fixes from the earlier batch are confirmed working in these evals:
- ✅ Dataview `FROM [[]]` (not `FROM [[#this.file.name]]`) — all 3 evals
- ✅ Preview guidance for existing entities — Evals 2 and 3
- ✅ Cascading creation reminder — Eval 1
- ✅ No unrequested optional sections — Eval 1

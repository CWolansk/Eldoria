# dnd-event-generator — Skill Audit Report (Iteration 1)

## Overall Assessment: GOOD — one critical path bug, one moderate dataview issue

The event generator produces well-structured content with correct template adherence, good duplicate detection, and solid conversion of old-format files. However, the skill's File Paths section is **completely wrong** — it doesn't match the actual vault structure. Agents compensated by reading existing files, but this is unreliable.

## Pass/Fail Summary

| Eval | Test Case | Pass Rate |
|------|-----------|-----------|
| 1 | New event (Harvest Festival in Ardenville) | 12/14 |
| 2 | Historical event conversion (Great Blight of Hillcrest) | 4/4 |
| 3 | Duplicate detection (Highreach Mine Collapses) | 4/4 |
| **Total** | | **20/22 (91%)** |

## Issues Found

### 1. CRITICAL: Private file paths in skill are WRONG
**Severity: High**
The skill's File Paths section says:
```
Private/2. Session Journals/{Event Name}.md           ← session events
Private/1. World Almanac/World/{Region}/Events/...     ← historical events
```
But the actual vault stores ALL timeline events in:
```
Private/2. Reference/Events/World Events/Timeline/{fc-date} {Event Name}.md
```
And town-level events in:
```
Private/2. Reference/Events/World Events/Town/{Event Name}.md
```
Session journals (`Private/2. Session Journals/`) are raw DM prep notes, NOT structured event files.

Both eval agents used the **correct vault path** — but only because they searched existing files first and followed the established pattern. An agent that trusts the skill template would put files in the wrong location.

The public path (`Public/World/Events/Timeline/`) is correct and matches the vault.

**Fix:** Rewrite the File Paths section to match actual vault structure.

### 2. MODERATE: Dataview syntax still produced incorrectly (Eval 1)
**Severity: Medium**
Despite the skill template showing `FROM [[]]`, Eval 1 produced `FROM [[#this.file.name]]` in both the private and public files. Eval 2 produced the correct syntax.

Root cause: The agent in Eval 1 read existing vault files (which still use the old syntax) and copied their dataview format instead of following the skill template. The skill template is correct but doesn't warn against copying from old files.

**Fix:** Add a warning in the template section: "Use `FROM [[]]` — existing vault files may still show `FROM [[#this.file.name]]` which is outdated."

### 3. LOW: No mention of Town events subfolder
**Severity: Low**
The vault has `Private/2. Reference/Events/World Events/Town/` for town-level events (e.g., Vineyard Blight Investigation, Sealed Gates of Stonehaven). The skill doesn't mention this path.

**Fix:** Add Town path to the File Paths section.

### 4. INFORMATIONAL: Eval 2 modified real vault file without asking
**Severity: Process concern**
The agent converted the 136-line old-format Great Blight file to proper template format and created a missing public counterpart — all without asking permission first. The skill says "For batch conversions — list files first, confirm with user" but a single conversion might be considered acceptable. The conversion itself was high quality.

## What Worked Well

1. **Vault search before creating** — All 3 evals performed thorough searches
2. **Correct path selection** — Agents followed the vault's actual pattern despite the skill being wrong
3. **Duplicate detection** — Eval 3 found existing files cleanly and declined to create duplicates
4. **Old-format conversion** — Eval 2 correctly identified format issues and produced clean output
5. **Embed pattern** — Private files embed public via `![[Public/...]]` correctly
6. **Brevity** — All content is scannable, uses bullets and fragments
7. **Cascading awareness** — Eval 1 offered to create bard NPC and ruins location as follow-ups
8. **Cross-linking** — Eval 1 linked to same-day Lake Arden Boat Race event

## Recommended Skill Changes

1. **[CRITICAL] Fix File Paths section** — Replace incorrect paths with actual vault structure
2. **[MODERATE] Add dataview warning** — Note that existing files may use old syntax, always use `FROM [[]]`
3. **[LOW] Add Town events path** — Document the Town subfolder for town-level events

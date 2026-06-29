---
name: dnd-vault-auditor
description: >
  Audit the Eldoria vault for stale references, orphaned links, duplicate entities, and inconsistencies
  between files. Use this skill whenever the user wants to check the vault for outdated or incorrect content,
  find references to entities that were moved or deleted, verify that settlement files don't mention stores or
  NPCs that no longer belong there, or clean up after reorganizing content. Also use when the user says things
  like "check for broken links", "find stale references", "what still mentions X", "audit this settlement",
  "clean up Highreach", "is there anything referencing deleted stuff", or any request about vault consistency,
  orphaned content, or cross-reference validation — even if they don't say "audit" explicitly.
---

# Eldoria Vault Auditor

Find and fix stale references, orphaned links, duplicate entities, and inconsistencies in the Eldoria campaign vault. The DM reorganizes content frequently — entities get moved between settlements, cut entirely, or renamed. This skill catches the leftover references those changes leave behind.

## Why This Matters

The vault is a live DM tool used mid-session. A stale reference — like a settlement file listing a shop that was moved to another town — creates confusion at the table. Worse, it can lead to the AI re-creating content that was intentionally removed, or generating links to entities that don't exist.

## When to Run an Audit

- **Before creating new content** in a settlement or region — check what's already listed vs. what actually exists as files
- **After the DM says something was moved, deleted, or cut** — find every reference and clean them up
- **When the DM asks to audit a specific area** — run all checks on that settlement, region, or entity
- **When something feels off** — "didn't we already have a blacksmith?" or "I thought we removed that"

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for file conventions, frontmatter, tags, dataview blocks, brevity, read-aloud formatting, search-before-create, and delegating creation to other skills. Key paths this audit checks:

| Content | Private Path | Public Path |
|---|---|---|
| Regions | `Private/1. World Almanac/World/{Region}/` | `Public/World/{Region}/` |
| Settlements | `Private/1. World Almanac/World/{Region}/{Settlement}/` | `Public/World/{Region}/{Settlement}/` |
| NPCs | `.../{Settlement}/NPCs/` | `.../{Settlement}/NPCs/` |
| Stores | Loose `.md` files in settlement folder | Same |
| Groups | `Private/1. World Almanac/World/Groups/` | `Public/World/Groups/` |

## Audit Procedures

### 1. Targeted Entity Audit

When the DM says something like "X was cut" or "X was moved to Y":

1. **Grep the entire vault** for the entity name (try variations — with/without apostrophes, partial matches)
2. **Categorize each mention:**
   - **Stale reference** — a file mentions the entity as if it still exists in the old location
   - **Valid reference** — the entity's actual files in its correct (or new) location
   - **Historical reference** — session journals or event logs that describe past events (these are usually fine to keep)
   - **Index/generated files** — HTML docs, JSON indexes, workspace config (flag for the DM but lower priority)
3. **Report findings** as a table: file path, line number, what it says, and recommended action (remove, update, or keep)
4. **Confirm with the DM** before making any changes
5. **Apply fixes** — edit files to remove or update stale references

### 2. Settlement Audit

When the DM asks to audit a settlement (or you're about to create content there):

1. **Read the settlement's private and public files** to get the listed entities (NPCs, stores, landmarks, districts)
2. **Remember the embed rule:** Private settlement files embed the public file via `![[Public/...]]`. Entities listed in the public file are already visible in the private view — don't flag them as "missing from private." Only flag entities that are absent from *both* the private-only sections and the embedded public content.
3. **List the actual files** in that settlement's directory (both Private and Public)
4. **Cross-reference:** For each entity mentioned in either file, check if a matching file exists
5. **Check the reverse:** For each file in the directory, check if either the private or public settlement file mentions it
6. **Report discrepancies:**
   - **Phantom entities** — mentioned in the settlement file but no corresponding file exists (may have been cut or never created)
   - **Unlisted entities** — files exist but aren't mentioned in either the private or public settlement overview (may need to be added or may be orphaned)
   - **Location mismatches** — entities whose files place them in a different settlement than where they're referenced

### 3. Cross-Reference Audit

For a broader consistency check:

1. **Scan wiki-links** in a file or set of files
2. **Verify each link target exists** — check if the linked file is actually present
3. **Check public/private pairing** — every entity should have both a private and public file
4. **Verify tag consistency** — do the tags in frontmatter match the entity's actual location and type?
5. **Check link scope** — public files should only link to other public files

### 4. Duplicate Detection

When the DM suspects duplicates:

1. **Search for the entity name** across the entire vault
2. **Check for near-duplicates** — similar names, same role, same location (e.g., two blacksmiths in one small town)
3. **Compare file contents** — are they truly duplicates or intentionally separate?
4. **Report with context** — show what's in each file so the DM can decide which to keep

## Reporting Format

Present audit findings as a clear, scannable list. Group by severity:

```markdown
## Audit: {Target}

### Stale References (action needed)
| File | Line | Reference | Issue | Fix |
|---|---|---|---|---|
| Highreach.md | 19 | Steelshaper's Forge | Listed in Blacksmith District but store was moved to Ardenville | Remove from district list |

### Warnings (DM decision needed)
- {File} mentions {Entity} which has no corresponding .md file — was this intentional?

### Info (no action needed)
- Session Journal 12 mentions {Entity} in past tense — historical reference, no change needed
```

Keep the report scannable. The DM should be able to glance at it and know what needs fixing in under 30 seconds.

## Fixing References

When the DM approves changes:

- **Settlement files:** Remove the stale bullet point or line referencing the cut entity
- **NPC files:** Update or remove relationship links to moved/deleted entities
- **Store files:** Update location references in frontmatter and body text
- **Public files:** Mirror any changes made to private files (maintaining the no-secrets rule)
- **Never delete session journals or historical event references** — those describe what happened, not what currently exists
- **Never delete entity files without explicit DM confirmation** — just flag them

## What NOT to Change

- **Session journals** — past events are history, even if they reference entities that no longer exist
- **Event logs** — same as journals
- **DM scratch notes** — these are working documents, not canonical references
- **Entity files themselves** — unless the DM explicitly says to delete them; the audit skill flags issues, the DM decides

## Removing Content

The vault is a living document — content gets removed just as often as it gets added. Removing outdated, incorrect, or superseded information is a core part of vault maintenance, not an exception. When the DM says something is no longer relevant, remove it cleanly:

### What removal looks like
- **Delete a bullet** from a settlement's NPC list, store list, or landmark list
- **Remove an interaction entry** from an NPC's `## Interactions` section
- **Clear a section** that's become irrelevant (e.g., a Plot Hook that was resolved)
- **Remove a wiki-link** from a Links section when the connection no longer applies
- **Update frontmatter** — change status fields, remove stale tags
- **Delete entire files** — only with explicit DM confirmation, and always clean up references in other files afterward

### Removal rules
1. **Always update both private and public files** — if a bullet is removed from a public NPC file, the private file's embed will reflect it automatically, but check for any private-only references too
2. **Clean up cross-references** — when removing an entity, search for every file that links to it and update or remove those links
3. **Never silently remove** — when the DM asks for a removal, confirm what will be affected and execute. If removing something would break other files, list the cascade before proceeding
4. **Session journals and event logs are exempt** — historical records describe what happened, not what currently exists. Never edit these even if they reference removed content

## Common Patterns

These are the most frequent issues you'll find:

| Pattern | Example | Typical Fix |
|---|---|---|
| Entity moved to another settlement | Forge listed in Highreach but files are in Ardenville | Remove from old settlement file |
| Entity cut entirely | NPC removed to reduce count, but settlement still lists them | Remove reference, flag if files still exist |
| Entity renamed | Old name still appears in other files | Update references to new name |
| Missing public file | Private file exists but no public counterpart | Flag — DM may want to create it or it may be intentionally private-only |
| Orphaned files | Files exist in a settlement directory but nothing references them | Flag for DM review |
| Public file links to private | Public note contains a `Private/` path | Fix to point to the public equivalent |

# Group Generator — Audit Report (Iteration 1)

## Summary
- **Eval 1 (New Guild — Iron Cartel):** 8/10 pass (80%)
- **Eval 2 (Secret Society — Silent Veil):** 5/5 pass (100%)
- **Eval 3 (Duplicate Detection):** 3/3 pass (100%)
- **Overall:** 16/18 pass (89%)

## Issues Found

### 1. Dataview query syntax — `FROM [[#this.file.name]]` (Medium)
**Where:** Both private and public template blocks
**Problem:** Same issue as region and settlement generators.
**Fix:** Change private to `FROM [[]]`, public to `FROM [[]] AND "Public"`.

### 2. Public dataview missing `AND "Public"` filter (Medium)
**Where:** Public template dataview block
**Problem:** Template doesn't include the filter. Agent added it from vault examples in both evals, but it should be explicit in the template.
**Fix:** Add `AND "Public"` to public template dataview.

### 3. Group name tag missing from template (Low)
**Where:** Tags arrays in both templates
**Problem:** Real vault files include the group name as a tag (e.g., `Foundation`, `SilentVeil`), but the template only specifies `Organization`, `{Region}`, and `{OrgType}`. Agent added it inconsistently — present in eval 2 (`SilentVeil`) but absent in eval 1 (`IronCartel`).
**Fix:** Add `{GroupName}` to both template tag arrays.

### 4. Region field format ambiguity (Low)
**Where:** `region:` YAML field in both templates
**Problem:** Template says `{Region}` but doesn't specify whether to use readable name ("Ironpeak Mountains") or PascalCase tag format ("IronpeakMountains"). Real vault files use readable names (e.g., `region: Crestfall`). Eval 1 output used PascalCase for the field value.
**Fix:** Add note: `region: {Region Name}  # readable name, not tag format`

### 5. No preview guidance (Low)
**Where:** "Before You Create" section
**Fix:** Same pattern — add sentence about showing preview for existing entities.

### 6. Cascading creation missing reminder (Low)
**Where:** End of Cascading Creation section
**Fix:** Add reminder to check after generating.

## What Worked Well
- Secret society handling excellent — public file properly hid HQ, members, and services
- Agent found existing Goldman → assassins guild connection and wove it in organically
- Duplicate detection perfect
- Cascading creation proposals were practical and specific
- Brevity consistently met

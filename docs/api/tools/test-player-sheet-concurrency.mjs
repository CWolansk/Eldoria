import assert from "node:assert/strict";
import { PlayerSheetDtoHelper } from "../../Players/PlayerSheetTemplate/PlayerSheetDtoHelper.js";
import { mergePlayerSheetChanges } from "../../Players/PlayerSheetTemplate/PlayerSheetConflictResolver.js";

function createSheet() {
    const dto = PlayerSheetDtoHelper.createEmptyDto({
        id: "char-test-001",
        lastModified: "2026-07-17T12:00:00.000Z"
    });
    dto.identity.name = "Test Hero";
    dto.inventory.items = [{
        name: "Longsword",
        source: "PHB",
        quantity: 1,
        equipped: false,
        attuned: false,
        catalog: { id: "longsword_phb", name: "Longsword", source: "PHB", kind: "items" },
        containedSpell: null
    }];
    return PlayerSheetDtoHelper.toSaveDto(dto);
}

const base = createSheet();
const local = PlayerSheetDtoHelper.patch(base, "inventory.items.0.equipped", true);
assert.equal(local.lastModified, base.lastModified, "Local edits must preserve the server concurrency token");

const remote = PlayerSheetDtoHelper.patch(base, "combatState.conditions", ["Poisoned"]);
remote.lastModified = "2026-07-17T12:01:00.000Z";

let merged = mergePlayerSheetChanges(base, local, remote);
assert.deepEqual(merged.conflicts, []);
assert.equal(merged.value.inventory.items[0].equipped, true);
assert.deepEqual(merged.value.combatState.conditions, ["Poisoned"]);
assert.equal(merged.value.lastModified, remote.lastModified);

const remoteWithItem = PlayerSheetDtoHelper.patch(remote, "inventory.items", [
    ...remote.inventory.items,
    {
        name: "Potion of Healing",
        source: "DMG",
        quantity: 1,
        equipped: false,
        attuned: false,
        catalog: { id: "potion-of-healing_dmg", name: "Potion of Healing", source: "DMG", kind: "items" },
        containedSpell: null
    }
]);
remoteWithItem.lastModified = "2026-07-17T12:02:00.000Z";

merged = mergePlayerSheetChanges(base, local, remoteWithItem);
assert.deepEqual(merged.conflicts, []);
assert.equal(merged.value.inventory.items.length, 2);
assert.equal(merged.value.inventory.items[0].equipped, true);
assert.equal(merged.value.inventory.items[1].name, "Potion of Healing");

const localHp = PlayerSheetDtoHelper.patch(base, "combatState.currentHp", 8);
const remoteHp = PlayerSheetDtoHelper.patch(base, "combatState.currentHp", 4);
remoteHp.lastModified = "2026-07-17T12:03:00.000Z";
merged = mergePlayerSheetChanges(base, localHp, remoteHp);
assert.deepEqual(merged.conflicts, ["combatState.currentHp"]);
assert.equal(merged.value.combatState.currentHp, 8, "The latest player edit wins only at the overlapping field");

const savedEquip = { ...local, lastModified: "2026-07-17T12:04:00.000Z" };
const toggledBackWhileSaving = PlayerSheetDtoHelper.patch(local, "inventory.items.0.equipped", false);
merged = mergePlayerSheetChanges(local, toggledBackWhileSaving, savedEquip);
assert.deepEqual(merged.conflicts, []);
assert.equal(merged.value.inventory.items[0].equipped, false, "Edits made during an in-flight save must remain pending");
assert.equal(merged.value.lastModified, savedEquip.lastModified);

console.log("Player sheet concurrency tests passed.");

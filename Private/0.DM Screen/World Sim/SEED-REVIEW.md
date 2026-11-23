# Crestfall seed draft: what was found and what is needed

> This folder lives under `Private/` on purpose. The draft contains DM-only names, so it must never be copied into `docs/`, which is the public site.

`crestfall-seed.draft.json` is a draft for you to correct. Nothing loads it. It was built by `Private/0.DM Screen/World Sim/tools/build-seed-draft.mjs`, which copies facts from the map, your notes and the API and records where each came from. Where your notes say nothing, the value is `null` with `"missing": true`. No number or name was invented, and nothing was taken from the prototype's example data.

## What was found

**Places on the map (22).** All 22 marker positions come from `docs/tools/world-map.html`. They are copied as stored: two fractions, read by the Leaflet map as distance up from the bottom edge and distance across from the left. The no-Leaflet fallback in `world-map.js` reads the first number as distance from the top, which disagrees, so the positions should be checked on the real map before use.

**The five Crestfall towns.** From the front matter of the notes under `Private/1. World Almanac/World/Crestfall/`:

| Town | Type | Population in notes | Players know it |
|---|---|---|---|
| Highreach | City | ~25,000 | Yes |
| Ardenville | Town | ~500 | Yes |
| Fairfield | Town | 3500 | No |
| Hillcrest | Village | 400 | No |
| Stonehaven | Village | not stated | No |

"Players know it" comes from the whitelist in `docs/world-pages.config.json`.

**Sub-locations (25).** Highreach 8, Ardenville 7, Fairfield 2, Hillcrest 2, Stonehaven 6. Each is a note file in the town's folder. Lake Arden and Blackwood Forest also have their own map markers.

**People (90).** Every NPC note with its town, profession, race and status from the front matter: Highreach 52, Ardenville 16, Fairfield 3, Hillcrest 11, Stonehaven 8. Three are marked Dead (Jarek IronFist, Oren Hammerfist, Rolf Stonetooth).

**Connections the notes mention (5).** Quoted word for word in the draft, with file and line:

- Highreach to Fairfield: "two days' hard ride east of Highreach".
- Fairfield to Starfall: "mere hours from the Silverleaf border", Starfall "visible in the distance".
- Ardenville to Highreach: across Lake Arden, then the Merchants Guild cargo elevator up the cliff. Lake Arden's travel difficulty is "Moderate".
- Highreach to Hillcrest: Hillcrest is "southwest of Highreach". No distance.
- Stonehaven: on the edge of Blackwood Forest, gates sealed. No connection or distance stated.

**Situations already in the notes (7).** Quoted in the draft as candidates for countdowns, not as countdowns: the Lake Arden Boat Race (15th day of Fall), the Hillcrest vineyard blight (6th day of Fall), Stonehaven's sealed gates, Fairfield's diluted health potions, the Fairfield caravan attacks, the duplirats and mine collapse in Highreach, and the war with the orc tribes.

**Goods (10 proposed).** The ten goods from the proposal, each matched to catalog items read from the API (`GET /catalog/items`):

| Good | Catalog items found | Price in catalog |
|---|---|---|
| Grain | Wheat, Flour | 1 cp, 2 cp |
| Fish | none | |
| Wine | Common Wine (Pitcher), Fine Wine (Bottle) | 2 sp, 10 gp |
| Ore | Iron, Copper | 1 sp, 5 sp |
| Timber | none | |
| Herbs | none (only the Herbalism Kit, a tool) | |
| Healing potions | Potion of Healing | 50 gp |
| Weapons | Longsword, as one reference | 15 gp |
| Cloth | Cotton Cloth, Linen, Canvas (per sq. yd.) | 5 sp, 5 gp, 1 sp |
| Luxuries | Silk (per sq. yd.), Saffron | 10 gp, 15 gp |

## What you need to supply

1. **Today's in-world date.** Settled: Fall 7, 496. The world starts there.
2. **The list of roads and every travel time.** Estimated from the map as you asked; see "Travel days: best guess from the map" below. Change any of them, and say which roads do not exist.
3. **Stonehaven's population**, and rough sizes for the 17 places outside the five towns when they come into range.
4. **What each town makes and uses**, per good. The notes describe this in words (Hillcrest wine, Ardenville fish, Stonehaven game and timber, Fairfield trade) but give no quantities.
5. **The goods list.** Confirm or change the ten. For each: the unit a market trades in, and which catalog price is its base price. Fish, timber and herbs have no catalog item, so they need a base price from you. The healing potion base price is settled: the catalog price, 50 gp.
6. **Which item stands for "weapons" and for "luxuries"**, since both are categories.
7. **Where Crestfall ends and the Ironpeak Mountains begin.** A suggested line is drawn for you to correct: open `docs/tools/world-sim/regions-preview.html`. The outlines are in `docs/world-sim/regions.draft.json`.
8. **One-line descriptions** for Stonehaven and the 16 other map places whose marker says "????".
9. **Which of the situations in your notes become countdowns.** The world starts with none. They are listed under "Candidates for countdowns" below; add the ones you want on the Countdowns tab of the DM page.

## Travel days: best guess from the map

You asked for a best guess, with your one fixed point: Highreach to Ardenville is about a day, going around Lake Arden. Every other figure below is an estimate you can change.

**These numbers never move the party.** You decide how long the party travels. The estimates are only a default for off-screen things in later stages (caravans, rumours) and a hint for you.

How each was worked out:

- Measure the straight line between the two map markers, in map widths.
- Roads wind, so the path is 1.2 times the straight line (1.5 times for the way around Lake Arden).
- Multiply for terrain: open lowland 1, forest or hills 1.5, mountains 2.5.
- Pace is 0.15 map widths of path per day, which is what makes Highreach to Ardenville come out at one day.
- Round to the nearest half day.

| Route | Days | Straight line | Terrain | Basis |
|---|---|---|---|---|
| Ardenville to Highreach | 1 | 0.101 | lowland | You said so |
| Highreach to Hillcrest | 1 | 0.107 | lowland | Estimate |
| Highreach to Fairfield | 1.5 | 0.174 | lowland | Estimate |
| Hillcrest to Stonehaven | 1 | 0.132 | lowland | Estimate |
| Highreach to Stonehaven | 1.5 | 0.176 | lowland | Estimate |
| Fairfield to Stonehaven | 2.5 | 0.189 | forest or hills | Estimate |
| Fairfield to Starfall | 0.5 | 0.089 | lowland | Estimate |
| Starfall to Frostglade | 0.5 | 0.056 | lowland | Estimate |
| Starfall to Stardew | 1 | 0.078 | forest or hills | Estimate |
| Frostglade to Serenity Hollow | 0.5 | 0.065 | lowland | Estimate |
| Frostglade to Moonshade | 1.5 | 0.113 | forest or hills | Estimate |
| Fairfield to Ironroot | 5.5 | 0.264 | mountains | Estimate |
| Stonehaven to Gemstone Hollow | 2.5 | 0.192 | forest or hills | Estimate |
| Gemstone Hollow to Ironroot | 4.5 | 0.222 | mountains | Estimate |
| Stonehaven to Forgepeak | 3.5 | 0.185 | mountains | Estimate |
| Forgepeak to Steamhammer | 2.5 | 0.118 | mountains | Estimate |
| Steamhammer to Stoneforge | 2 | 0.112 | mountains | Estimate |

Which places are joined by a road is also a guess (nearest neighbours with no range or water between them). Say which roads do not exist.

**One conflict to settle.** Your Fairfield note gives a hard ride of two days from Highreach. The method above gives a day and a half for ordinary travel on that road, which is faster than a hard ride should be. Either the note is generous or the pace above is too quick; if the note is right, every estimate should grow by about half as much again.

## Candidates for countdowns

The world starts with no countdowns. These are the situations your notes already describe; each is quoted with its source in the draft under `situationsInNotes`. None is added automatically.

- **Lake Arden Boat Race** (Ardenville)
- **Vineyard blight** (Hillcrest)
- **Sealed gates** (Stonehaven)
- **Diluted health potions** (Fairfield)
- **Caravan attacks** (Fairfield)
- **Duplirats and the mine collapse** (Highreach)
- **War with the orc tribes** (crestfall)

For each one you want, the Countdowns tab asks for a name, 4, 6 or 8 steps and a daily chance (or a fixed date), and the event to suggest when it comes due.

## Things that do not agree

- **Fairfield's direction.** Settled: Fairfield is east of Highreach, as the map shows. The notes have been corrected.
- **Healing potion price.** Settled: the catalog price, 50 gp.
- **The herb-gathering job.** Settled: it did not happen at the table, so it is not canon and is left out until it does.
- **Pip Whiskerwind.** Settled: Pip is in Ardenville. The DM note has been moved there.
- **Status wording.** Highreach, Ardenville, Fairfield and Hillcrest NPCs use Alive or Dead. Stonehaven NPCs use Active, and one is "Corrupted by Dark Pact". Copied as written.
- **Notes without front matter.** Ardenville Adventurers Guild, Forgefires Armaments, Starspells Wonders, Hammerstrikes Weapons and Nightwhispers Potions and Scrolls have no front matter, so they are listed by file name only.

## To rebuild the draft

```
node "Private/0.DM Screen/World Sim/tools/build-seed-draft.mjs"
```

It reads the notes and makes GET requests to the API for item prices. `--offline` skips the API.

## The places file for the DM page

The same tool also writes `places.upload.json` beside this file: every town, place in a town and map place, with whether your players know it. On the Living World page, open Setup at the bottom of Today and load that file. It is stored in your storage account behind the DM key and is never put in `docs/`. Until it is loaded, the "where" box offers only places your players already know.

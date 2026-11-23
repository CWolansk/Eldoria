# Crestfall seed draft: what was found and what is needed

> This folder lives under `Private/` on purpose. The draft contains DM-only names, so it must never be copied into `docs/`, which is the public site.

`crestfall-seed.draft.json` is a draft for you to correct. Nothing loads it. It was built by `docs/world-sim/tools/build-seed-draft.mjs`, which copies facts from the map, your notes and the API and records where each came from. Where your notes say nothing, the value is `null` with `"missing": true`. No number or name was invented, and nothing was taken from the prototype's example data.

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

1. **Today's in-world date.** The last timeline note is "0496-03-07 Party Departs Highreach for Silverleaf Lands".
2. **The list of roads and every travel time.** Which towns connect to which, by road, river or lake, and how many days each takes for ordinary travellers. The notes give only the hard-ride figure for Highreach to Fairfield.
3. **Stonehaven's population**, and rough sizes for the 17 places outside the five towns when they come into range.
4. **What each town makes and uses**, per good. The notes describe this in words (Hillcrest wine, Ardenville fish, Stonehaven game and timber, Fairfield trade) but give no quantities.
5. **The goods list.** Confirm or change the ten. For each: the unit a market trades in, and which catalog price is its base price. Fish, timber and herbs have no catalog item, so they need a base price from you.
6. **Which item stands for "weapons" and for "luxuries"**, since both are categories.
7. **Where Crestfall ends and the Ironpeak Mountains begin.**
8. **One-line descriptions** for Stonehaven and the 16 other map places whose marker says "????".
9. **Which of the seven situations become countdowns**, how many steps each has and how fast it moves.

## Things that do not agree

- **Fairfield's direction.** Settled: Fairfield is east of Highreach, as the map shows. The notes have been corrected.
- **Healing potion price.** The catalog says 50 gp. The proposal says the Fairfield notes assume 30 gp, but a search of `Private` and `Public` for "30 gp" near "potion" or "heal" found nothing. The Fairfield notes say diluted potions are sold "at slightly reduced prices" with no figure. Where does 30 gp come from?
- **The herb-gathering job.** Settled: it did not happen at the table, so it is not canon and is left out until it does.
- **Pip Whiskerwind.** Settled: Pip is in Ardenville. The DM note has been moved there.
- **Status wording.** Highreach, Ardenville, Fairfield and Hillcrest NPCs use Alive or Dead. Stonehaven NPCs use Active, and one is "Corrupted by Dark Pact". Copied as written.
- **Notes without front matter.** Ardenville Adventurers Guild, Forgefires Armaments, Starspells Wonders, Hammerstrikes Weapons and Nightwhispers Potions and Scrolls have no front matter, so they are listed by file name only.

## To rebuild the draft

```
node docs/world-sim/tools/build-seed-draft.mjs
```

It reads the notes and makes GET requests to the API for item prices. `--offline` skips the API.

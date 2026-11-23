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
| Ordinary weapons | not a priced good: a percentage applied to each weapon's own catalog price (tracked against the Longsword) | |
| Cloth | Cotton Cloth, Linen, Canvas (per sq. yd.) | 5 sp, 5 gp, 1 sp |
| Silk | Silk (per sq. yd.) | 10 gp |

## What you need to supply

1. **Today's in-world date.** Settled: Fall 7, 496. The world starts there.
2. **The list of roads and every travel time.** Estimated from the map as you asked; see "Travel days: best guess from the map" below. Change any of them, and say which roads do not exist.
3. **Stonehaven's population**, and rough sizes for the 17 places outside the five towns when they come into range.
4. **What each town makes and uses**, per good. The notes describe this in words (Hillcrest wine, Ardenville fish, Stonehaven game and timber, Fairfield trade) but give no quantities.
5. **The goods list.** Confirm or change the ten. For each: the unit a market trades in, and which catalog price is its base price. Fish, timber and herbs have no catalog item, so they need a base price from you. The healing potion base price is settled: the catalog price, 50 gp.
6. **No generalised categories are priced** (your call, 2026-11-23). "Weapons" is now a modifier: a percentage applied to each ordinary weapon's own catalog price, never shown as a price. "Luxuries" is gone; in its place is the real catalog item Silk, by the square yard. If you want other classes of items to move with a town (armour, adventuring gear, tools), say which and I will add a modifier for each; today everything else stays at list price.
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

## Markets: every estimate in one place

Your notes do not say what any town makes or uses, so the market setup is built from best guesses. **Every figure below marked estimate is mine, not yours, and none of it is canon.** They are sized so that a town's use follows its population and the five Crestfall towns together make about what they use (trade with places outside Crestfall is not simulated yet).

To correct them, either change a figure on the Living World page (open a place under Places; estimates are labelled there and a figure you change stops being an estimate), or edit `market-estimates.json` beside this file and rebuild, then load `places.upload.json` again.

<!-- market-estimates:start (written by tools/build-seed-draft.mjs; edit market-estimates.json, not this table) -->

**Base prices**

| Good | Unit | Base price | Estimate? | Based on |
|---|---|---|---|---|
| Grain | sack | 1 gp | catalog | Catalog: wheat is 1 cp a pound; a sack is taken as 100 pounds |
| Fish | basket | 4 sp | estimate | Not in the catalog. Guess: 2 cp a pound, a basket of 20 pounds |
| Wine | pitcher | 2 sp | catalog | Catalog: common wine, 2 sp a pitcher |
| Iron | pound | 1 sp | catalog | Catalog: iron, 1 sp a pound |
| Timber | cartload | 5 gp | estimate | Not in the catalog. Guess: 5 gp a cartload |
| Herbs | bundle | 2 gp | estimate | Not in the catalog. Guess: 2 gp a bundle, so the herbs in a healing potion cost a fifth of its price |
| Healing potion | potion | 50 gp | catalog | Catalog: potion of healing, 50 gp (confirmed by the DM) |
| Cloth | square yard | 5 sp | catalog | Catalog: cotton cloth, 5 sp a square yard |
| Silk | square yard | 10 gp | catalog | Catalog price of Silk (1 sq. yd.) |

**Applied to items, never priced** (shown only as a percentage against each item's own list price)

| Modifier | Applies to | Tracked against |
|---|---|---|
| Ordinary weapons | Ordinary simple and martial weapons, each at its own catalog price; magic weapons and anything uncommon or rarer stay at list price | Not a price anyone pays. The catalog's longsword (15 gp) is only the reference this percentage is tracked against; every weapon keeps its own catalog price |

**Made from**

| Good | Made from | Based on |
|---|---|---|
| Healing potion | 5 bundles of herbs | estimate: Guess: five bundles of herbs a potion |
| Ordinary weapons | 10 pounds of iron | estimate: Guess: ten pounds of iron a weapon |

**Populations**

| Town | People | Estimate? | Based on |
|---|---|---|---|
| Highreach | 25000 | from the notes | Stated in the notes for Highreach |
| Ardenville | 500 | from the notes | Stated in the notes for Ardenville |
| Fairfield | 3500 | from the notes | Stated in the notes for Fairfield |
| Hillcrest | 400 | from the notes | Stated in the notes for Hillcrest |
| Stonehaven | 300 | estimate | Not in the notes. The notes call it a village and a fortress-settlement on the edge of Blackwood Forest; Hillcrest, the other village, has 400. |

**What each town makes and uses, per day (every figure is an estimate)**

| Town | Good | Makes | Why it makes that much | Uses | Unit |
|---|---|---|---|---|---|
| Highreach | Grain | 98.01 | Farmland around the capital feeds part of it | 375 | sack a day |
| Highreach | Fish | 89.1 | On the shore of Lake Arden | 250 | basket a day |
| Highreach | Wine | 178.2 | Some wine is made near the capital; most comes from elsewhere | 2500 | pitcher a day |
| Highreach | Iron | 683.1 | The notes name the Highreach Mines; no other Crestfall town has a mine in the notes | 500 | pound a day |
| Highreach | Timber | 9.5 | Some woodland nearby | 50 | cartload a day |
| Highreach | Herbs | 0 | Not known for making this | 50 | bundle a day |
| Highreach | Healing potion | 8.91 | The capital has the temples and the Arcane Enclave | 12.5 | potion a day |
| Highreach | Ordinary weapons | 6.95 | The notes name The Dragons Breath Forge | 7.5 | a day (tracked, never shown as a price) |
| Highreach | Cloth | 347.49 | Weavers in the capital | 750 | square yard a day |
| Highreach | Silk | 9.8 | Craftsmen serving the noble houses | 25 | square yard a day |
| Ardenville | Grain | 15.59 | A few fields behind the port | 7.5 | sack a day |
| Ardenville | Fish | 200.48 | The notes call it a port town on Lake Arden, with a Fishermans Guild | 5 | basket a day |
| Ardenville | Wine | 0 | Not known for making this | 50 | pitcher a day |
| Ardenville | Iron | 0 | Not known for making this | 10 | pound a day |
| Ardenville | Timber | 0 | Not known for making this | 1 | cartload a day |
| Ardenville | Herbs | 0 | Not known for making this | 1 | bundle a day |
| Ardenville | Healing potion | 0 | Not known for making this | 0.25 | potion a day |
| Ardenville | Ordinary weapons | 0.98 | The notes name the Steelshapers Forge | 0.15 | a day (tracked, never shown as a price) |
| Ardenville | Cloth | 0 | Not known for making this | 15 | square yard a day |
| Ardenville | Silk | 0 | Not known for making this | 0.5 | square yard a day |
| Fairfield | Grain | 300.71 | The name and the open country on the map; taken as Crestfall's main farmland | 52.5 | sack a day |
| Fairfield | Fish | 7.43 | A little river fish | 35 | basket a day |
| Fairfield | Wine | 386.1 | Some vineyards | 350 | pitcher a day |
| Fairfield | Iron | 0 | Not known for making this | 70 | pound a day |
| Fairfield | Timber | 0 | Not known for making this | 7 | cartload a day |
| Fairfield | Herbs | 33.41 | Herb gardens for its apothecaries | 7 | bundle a day |
| Fairfield | Healing potion | 5.94 | The notes mention potions being sold here | 1.75 | potion a day |
| Fairfield | Ordinary weapons | 0.98 | A trade town has smiths | 1.05 | a day (tracked, never shown as a price) |
| Fairfield | Cloth | 498.96 | The notes call it the bustling trade centre of Crestfall | 105 | square yard a day |
| Fairfield | Silk | 19.9 | Stands in for silk arriving from the Silverleaf Lands next door, which are not simulated yet | 3.5 | square yard a day |
| Hillcrest | Grain | 20.05 | Hill farms | 6 | sack a day |
| Hillcrest | Fish | 0 | Not known for making this | 4 | basket a day |
| Hillcrest | Wine | 2405.7 | The notes call it the wine capital of Crestfall, supplying Highreach's noble houses | 40 | pitcher a day |
| Hillcrest | Iron | 0 | Not known for making this | 8 | pound a day |
| Hillcrest | Timber | 4.75 | Coopers and some woodland | 0.8 | cartload a day |
| Hillcrest | Herbs | 29.4 | The notes mention a herbalist and herb gatherers here | 0.8 | bundle a day |
| Hillcrest | Healing potion | 0 | Not known for making this | 0.2 | potion a day |
| Hillcrest | Ordinary weapons | 0 | Not known for making this | 0.12 | a day (tracked, never shown as a price) |
| Hillcrest | Cloth | 44.55 | Cottage weaving | 12 | square yard a day |
| Hillcrest | Silk | 0 | Not known for making this | 0.4 | square yard a day |
| Stonehaven | Grain | 11.14 | Small clearings | 4.5 | sack a day |
| Stonehaven | Fish | 0 | Not known for making this | 3 | basket a day |
| Stonehaven | Wine | 0 | Not known for making this | 30 | pitcher a day |
| Stonehaven | Iron | 0 | Not known for making this | 6 | pound a day |
| Stonehaven | Timber | 45.14 | The notes put it on the edge of Blackwood Forest | 0.6 | cartload a day |
| Stonehaven | Herbs | 70.83 | Forest edge, founded by rangers and trappers | 0.6 | bundle a day |
| Stonehaven | Healing potion | 0 | Not known for making this | 0.15 | potion a day |
| Stonehaven | Ordinary weapons | 0 | Not known for making this | 0.09 | a day (tracked, never shown as a price) |
| Stonehaven | Cloth | 0 | Not known for making this | 9 | square yard a day |
| Stonehaven | Silk | 0 | Not known for making this | 0.3 | square yard a day |

<!-- market-estimates:end -->

## Which items follow each good (for the players' local prices)

Players see an item's local price as its catalog price moved by the same share as the good it follows, in the town the party is in. These rules are my guesses, kept deliberately narrow: when in doubt an item is not covered and shows only its catalog price. Edit them on the DM page under Markets, or in `market-estimates.json` (`covers`) and rebuild.

| Good | Items that follow it | Why |
|---|---|---|
| Grain | Wheat, Flour (by id) | Wheat and flour are grain; nothing else |
| Fish | none | No fish in the catalog |
| Wine | Common Wine (pitcher), Fine Wine (bottle) (by id) | The two ordinary wines in the catalog |
| Iron | Iron (by id) | Iron by the pound only |
| Timber | none | No timber in the catalog |
| Herbs | none | Only the Herbalism Kit, which is a tool |
| Healing potion | Potion of Healing, Greater, Superior and Supreme (by id) | The four healing potions; no other potion |
| Ordinary weapons (modifier) | Any ordinary simple or martial weapon (by type), each at its own catalog price | Magic weapons, and anything uncommon or rarer, stay at list price |
| Cloth | Cotton Cloth, Linen, Canvas, each by the square yard (by id) | The plain cloths |
| Silk | Silk by the square yard (by id) | The item itself |

Armor, adventuring gear, tools, food other than the above, and every magic item not listed are not covered by anything.

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

## Cities: districts, places and people (no city maps)

You said you do not want drawn or generated city maps. A town is now an outline you grow: districts, locations (shops, halls, inns, landmarks) and people, each addable, renamable, movable and retirable from the town's page. Nothing has to be complete.

`city.upload.json` holds what your notes already say. Load it once from the Living World page (Today, Setup, Load city file). Loading it again adds only what is new, so you can rebuild it after editing your notes. Each entry is hidden from players unless its page is on the public whitelist in `docs/world-pages.config.json`.

| Town | Districts | Places | People | People placed at a place |
|---|---|---|---|---|
| Ardenville | 0 | 7 | 16 | 3 |
| Fairfield | 0 | 2 | 3 | 0 |
| Highreach | 3 | 8 | 51 | 7 |
| Hillcrest | 0 | 2 | 11 | 0 |
| Stonehaven | 0 | 6 | 8 | 3 |
| **All** | 3 | 25 | 89 | 13 |

**How people were placed.** A person is put at a location only where that location's own note names them in its `proprietor` or `owner` field. Everyone else is "somewhere in town"; I did not guess.

| Person | Town | Placed at | From |
|---|---|---|---|
| Alistair Goldman | Highreach | HighReach Merchants Guild | `Private/1. World Almanac/World/Crestfall/Highreach/HighReach Merchants Guild.md, proprietor` |
| Thaldrin Stormblade | Highreach | Highreach Adventurers Guild | `Private/1. World Almanac/World/Crestfall/Highreach/Highreach Adventurers Guild.md, proprietor` |
| Kara Stonefoot | Highreach | Sturdy Mugg | `Private/1. World Almanac/World/Crestfall/Highreach/Sturdy Mugg.md, proprietor` |
| Felix Tradewind | Highreach | Target by Tradewind | `Private/1. World Almanac/World/Crestfall/Highreach/Target by Tradewind.md, proprietor` |
| Lady Elara Moonshadow | Highreach | The Arcane Enclave | `Private/1. World Almanac/World/Crestfall/Highreach/The Arcane Enclave.md, proprietor` |
| Alaric Emberfell | Highreach | The Dragons Breath Forge | `Private/1. World Almanac/World/Crestfall/Highreach/The Dragons Breath Forge.md, proprietor` |
| Don Gnocianno | Highreach | The Warren | `Private/1. World Almanac/World/Crestfall/Highreach/The Warren.md, proprietor` |
| Edda Netsong | Ardenville | Fisherman's Guild | `Private/1. World Almanac/World/Crestfall/Ardenville/Fishermans Guild.md, proprietor` |
| Kellen Redshore | Ardenville | Merchants Guild Warehouse | `Private/1. World Almanac/World/Crestfall/Ardenville/Merchants Guild Warehouse.md, proprietor` |
| Mira Softstep | Ardenville | The Netted Nymph | `Private/1. World Almanac/World/Crestfall/Ardenville/The Netted Nymph.md, proprietor` |
| Gunnar Ironforge | Stonehaven | Ironforge Smithy | `Private/1. World Almanac/World/Crestfall/Stonehaven/Ironforge Smithy.md, owner` |
| Hilda Ravenshadow | Stonehaven | Mystic Wares | `Private/1. World Almanac/World/Crestfall/Stonehaven/Mystic Wares.md, owner` |
| Erik Timber | Stonehaven | Stonehaven Supplies | `Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven Supplies.md, owner` |

**Named as running a place, but with no NPC note of their own**, so they are not in the outline yet. Add them on the town's page if you want them:

- Eldric Steelshaper, Steelshaper's Forge (Ardenville), from `Private/1. World Almanac/World/Crestfall/Ardenville/Steelshapers Forge.md`
- Garrick Lightfinger, The Enchanted Trinket (Ardenville), from `Private/1. World Almanac/World/Crestfall/Ardenville/The Enchanted Trinket.md`
- Marla Greenthumb, Marlas Gear (Stonehaven), from `Private/1. World Almanac/World/Crestfall/Stonehaven/Marlas Gear.md`
- Darius Stone, Stones Herbs (Stonehaven), from `Private/1. World Almanac/World/Crestfall/Stonehaven/Stones Herbs.md`

**Districts.** Only districts a note names are listed, and nothing is placed inside one, because no note says which place is in which district:

- Merchant District (Highreach), from `Private/2. Reference/Events/Consequences/Resolved/Highreach Duplirat Invasion.md, line 142`
- Noble District (Highreach), from `Private/1. World Almanac/World/Crestfall/Highreach/The Warren.md, line 37`
- Palace District (Highreach), from `Private/1. World Almanac/World/Crestfall/Highreach/NPCs/Lord Cedric Brightblade.md, line 30`

**What you may want to add,** whenever it comes up at the table:

- Which district each Highreach location is in (The Warren is described as well placed to watch the Noble District, which is not the same as being in it).
- Districts for the other towns, if they have any.
- Where the other 76 people are usually found.
- Itineraries for anyone who travels (on their own page).


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

The same tool also writes `places.upload.json` beside this file: every town, place in a town and map place, with whether your players know it, plus the market setup above (goods, base prices, roads with travel days, and what each of the five towns makes and uses). On the Living World page, open Setup at the bottom of Today and load that file. It is stored in your storage account behind the DM key and is never put in `docs/`. Until it is loaded, the "where" box offers only places your players already know.

Since Stage 3 the places file also carries each place's position on the world map (copied from the site's map markers), which the Map view needs, and marks healing potions as `medicine` (what a town uses more of while a sickness is real there). If you loaded an earlier version of the file, load it again.

The tool writes a second file, `city.upload.json`: the districts, places and people described under "Cities" above. Load it from the same Setup section after the places file. Both stay behind the DM key and are never put in `docs/`.

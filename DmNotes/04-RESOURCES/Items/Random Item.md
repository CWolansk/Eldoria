
```meta-bind
INPUT[inlineSelect(
    option('Any'), 
    option('common'), 
    option('uncommon'), 
    option('rare'), 
    option('very rare'), 
    option('legendary'), 
    option('artifact'),
    defaultValue('Any')
):memory^selectedRarity]
```
```meta-bind-button
label: "Roll Again"
style: primary
actions:
  - type: updateMetadata
    bindTarget: memory^rollCount
    evaluate: true
    value: x + 1
```


```meta-bind
INPUT[number:memory^rollCount]
hidden: true
value: 0
```
```meta-bind-js-view
{memory^selectedRarity} as selectedRarity
{memory^rollCount} as rollCount
{memory^randomItem} as randomItem
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
	let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    selectedRarity = (context.bound.selectedRarity || "").trim().toLowerCase();

        if (!selectedRarity || selectedRarity === "any") {
            return engine.markdown.create("🎲 **Select a rarity and click 'Roll for Random Item'!**");
        }

	rollCount = context.bound.rollCount
	randomItem = context.bound.randomItem
	const dbPath = "Scripts/DBScriptsTesting/DND.db"; 

	const filter = {rarity: selectedRarity};
	let results = await sqlUtils.filterRecordsInDb(dbPath, engine,'Items', filter,[], {});
	
	let randomIndex = Math.floor(Math.random() * results.length);
	let selectedItem = results[randomIndex];
	let headers = Object.keys(selectedItem);
	let itemDetails = headers.map(header => `**${header}:** ${selectedItem[header] || "_None_"}`).join("\n");


	
            // Store the item name in memory for Templater
            let markdownOutput = `
🎲 **You rolled a random item!**
### 🏆 **${selectedItem["Name"]}**

${itemDetails}

${mdUtils.AddCreateItemNoteButton(selectedItem["Name"])}
            `;
            return engine.markdown.create(markdownOutput);

}
```


Cost 5g per pull
https://randommagicitems.com/
51 - 75 : random common items 
76 - 89 : random uncommon item
90 - 97 : random rare item 
98-99 : random v rare item 
double zero : random legendary item 
01 - 50 
1. **Telescoping Pole**
    
    - A 3-foot metal rod that can extend to 10 feet. Handy for poking suspicious floors or bridging small gaps.
2. **Sealed Glass Vial of Oil**
    
    - A small container of oil (enough to fill one lantern or lubricate squeaky hinges). Corked and sealed to prevent leaks.
3. **Collapsible Fishing Rod**
    
    - A slender rod that expands from 1 foot to 4 feet, complete with a simple reel. Fits neatly in a backpack.
4. **Canvas Tarpaulin**
    
    - A 5x7 ft piece of treated, waterproof canvas. Can serve as a makeshift tent, ground cover, or rainfly.
5. **Smoke Stick**
    
    - A short wooden stick coated in resin. When lit, it produces thick smoke for about a minute, ideal for signals or distractions.
6. **Tiny Periscope**
    
    - Two angled mirrors in a slim tube let you peek around corners or over ledges unseen.
7. **Flare Arrow**
    
    - An arrow with a hollow tip of flammable compound. On impact, it bursts into a bright flash—useful for signals.
8. **Magnetic Compass**
    
    - A small brass case with a floating magnetized needle. Always points north (unless you’re in a particularly magic-warped locale).
9. **Folding Camp Stool**
    
    - Lightweight metal frame with a sturdy cloth seat that folds flat for easy transport.
10. **Tin Whistle**
    

- A simple metal whistle with a piercing tone—good for signaling or rallying party members.

11. **Leather Belt Pouch (Multi-Pocket)**

- A belt-mounted pouch with extra hidden pockets for small tools or valuables.

12. **Metal Ear Trumpet**

- A funnel-shaped device that amplifies faint sounds—helpful for eavesdropping through doors.

13. **Resin Torch**

- An upgraded torch coated in slow-burning resin, lasting a bit longer than a regular torch.

14. **Collapsible Snare Kit**

- A loop of wire, small spikes, and a trigger mechanism for catching small game overnight.

15. **Hand Warmer Pouch**

- Filled with heat-retaining pebbles or charcoal; can be heated by a fire to keep hands or pockets warm in cold climates.

16. **Trail Markers**

- A set of brightly colored cloth ribbons or small reflective tags to leave a breadcrumb trail in unfamiliar territory.

17. **Pocket Sundial**

- A small metal disk with a fold-out gnomon for estimating the time by the sun’s shadow.

18. **Throwing Net**

- A circular net weighted around the edge, good for fishing in shallow waters or restraining a small creature.

19. **Climbing Harness**

- Adjustable straps and buckles to secure yourself when scaling cliffs or delving into caverns.

20. **Sling Bullets (Chalk-Filled)**

- Bullets that release a puff of chalk dust on impact—makes hits easy to spot.

21. **Metal Lockbox (No Lock)**

- A sturdy lockbox with a latch for a padlock. Handy for storing valuables while on the road.

22. **Leather Forearm Guards**

- Simple protective bracers against scrapes and bowstring snap. No AC bonus—just practical gear.

23. **Lantern Hood**

- A detachable metal hood to direct or shutter a lantern’s light, helping with stealth or signaling.

24. **Signal Mirror**

- Polished steel disk for reflecting sunlight over distances to signal allies.

25. **Wooden Tripwire Alarm**

- A set of small bells, hooks, and string. Perfect to create a perimeter alarm around camp.

26. **Grappling hook **

- grappling hook or anchor.

27. **Portable Brazier**

- A small iron dish on folding legs for safe campfires where open fires are difficult.

28. **Caltrop Pouch (10)**

- A bag of metal spikes to scatter behind you if chased—or to guard doorways and choke points.

29. **Canvas Water Bucket**

- A collapsible bucket that flattens for storage. Carries about 1 gallon of water.

30. **Spelunker’s Lantern**

- A squat, sturdy lantern with a hinged guard around the flame, resistant to dripping water in damp caves.

31. **Glow Clay**

- A small lump of phosphorescent clay from deep caverns. When exposed to air, it glows dimly for about an hour.

32. **Whisper Tube**

- A short length of flexible tubing. Speak quietly at one end to communicate or listen through cracks.

33. **Leather Snowshoes**

- Broad frames strapped over boots to prevent sinking into deep snow.

34. **Smoke Pellet**

- A tiny clay ball that bursts into thick smoke when crushed—effective for a quick getaway.

35. **Tie-Down Straps**

- Sturdy canvas straps with metal buckles, used for securing gear or hauling extra baggage.

36. **Collapsible Grappling Ladder**

- A narrow rope ladder with metal rungs that rolls up compactly, complete with hooks at the top.

37. **Frost Blanket**

- A thick woolen blanket with an extra lining for insulation—keeps you warm in icy conditions.

38. **Waterproof Ink & Quill**

- A small vial of water-resistant ink plus a quill suitable for map-making or journaling in damp weather.

39. **Breathing Tube**

- A reed or metal pipe allowing short-term underwater breathing. Crude but effective as a makeshift snorkel.

40. **Barbed Fishing Spear**

- A short spear with multiple prongs for spearing fish in shallow streams or tidal pools.

41. **Herbal Poultice Kit**

- A small pouch containing dried herbs, simple bandages, and instructions for minor wound care.

42. **Metal File**

- A compact file useful for smoothing or sharpening metal on the go—great for field repairs.

43. **Goggle Visor**

- Leather-and-glass goggles with adjustable straps, protecting eyes from sandstorms or dust.

44. **Wind-Up Timer**

- A small clockwork device that dings after a set time. Good for timing, traps, or distractions.

45. **Mini Bellows**

- A handheld, collapsible bellows for stoking a fire or rapidly drying wet tinder in the field.

46. **Magnet on a String**

- A surprisingly strong magnet attached to a thin cord, ideal for retrieving metal objects from crevices.

47. **Bottle of Quicklime**

- A tightly sealed jar of powdered lime, useful for drying damp surfaces or certain alchemical mixtures.

48. **Troll-Bane Incense**

- A bundle of pungent incense reputed (folk rumor only) to mask the scent of living creatures from trolls.

49. **Emergency Raft Pouch**

- A tightly packed oilcloth that inflates into a small float when shaken out, enough for one or two people in calm water.

50. **Elaborate Folding Saw**

- A compact saw with a locking handle and sturdy teeth, cuts through small logs or branches with ease.

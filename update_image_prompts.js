const fs = require('fs');
const path = require('path');
const targetDir = path.join('Public/World/Images');

const updates = [
  // Crestfall (Humans)
  {
    file: 'HighreachImageprompt.md',
    oldString: 'Show a circular fortified city crowning the plateau, with massive walls, decorated gates, and a dominant castle on the central high ground.',
    newString: 'Show a circular fortified city crowning the plateau, built in a magnificent Tudor style with bright stone and heavy dark timber. A majestic Tudor-style royal castle crowns the central high ground, draped in brilliant blue and gold banners.'
  },
  {
    file: 'HighreachImageprompt.md',
    oldString: 'Mood: bright, prosperous, elevated, and grand.',
    newString: 'Mood: a feeling of justice and order, bright, prosperous, elevated, and grand. Clear sunny day.'
  },
  {
    file: 'ArdenvilleImageprompt.md',
    oldString: 'built in a dense crescent along the water',
    newString: 'built in a dense crescent of Tudor-style wood and stone houses along the water'
  },
  {
    file: 'ArdenvilleImageprompt.md',
    oldString: 'warehouse, a Fisherman\'s Guild, an inn, a glowing smithy, and compact streets of timber-and-stone homes',
    newString: 'warehouse. The centerpiece is a grand Tudor-style dockmaster\'s tower heavily timbered with bright stone and draped in blue & gold banners. Include a Fisherman\'s Guild, an inn, a glowing smithy, and compact streets of Tudor homes'
  },
  {
    file: 'ArdenvilleImageprompt.md',
    oldString: 'Mood: cool lake blues, gray mist, weathered timber, damp stone, and warm orange forge and window light.',
    newString: 'Mood: a feeling of justice and order, clear sunny day (mist only on the deep lake), blue and gold banners popping against weathered Tudor timber and bright stone.'
  },
  {
    file: 'FairfieldImageprompt.md',
    oldString: 'white stone buildings with red-tiled roofs',
    newString: 'a mix of beautiful Tudor-style wooden and stone houses'
  },
  {
    file: 'FairfieldImageprompt.md',
    oldString: 'three interconnected market plazas paved with smooth river stones, and distinct quarters for armorers, magic shops, and mercantile guilds.',
    newString: 'three interconnected market plazas paved with smooth river stones. The centerpiece is a massive Tudor-style enclosed market hall featuring an ornate clocktower and a prominent "Scales of Justice" monument.'
  },
  {
    file: 'FairfieldImageprompt.md',
    oldString: 'Mood: warm afternoon light, prosperous, busy, colorful, sophisticated frontier commerce.',
    newString: 'Mood: a feeling of justice and order, clear sunny day, prosperous, busy, fluttering blue and gold banners.'
  },
  {
    file: 'StonehavenImageprompt.md',
    oldString: 'buildings inside the walls',
    newString: 'Tudor-style wood and stone buildings inside the walls'
  },
  {
    file: 'StonehavenImageprompt.md',
    oldString: 'The most important landmark is a sixty-foot stone watchtower dominating the village center, rising above timber and stone buildings like the last safe refuge if the walls fail.',
    newString: 'The centerpiece landmark is a meticulously crafted, highly fortified Tudor keep acting as a steadfast fortress of law against the encroaching wilderness, rising above the other timber and stone buildings.'
  },
  {
    file: 'StonehavenImageprompt.md',
    oldString: 'The mood should be wary and atmospheric rather than ruined: this is a living outpost under pressure, not a destroyed village. Make the Blackwood Forest feel ancient and oppressive, with massive trunks, interwoven canopy, and deep shadow beyond the cleared perimeter. Color palette: cool greens, dark forest blacks, wet stone, weathered timber, and warm orange forge and firelight.',
    newString: 'Mood: a feeling of justice and order holding back the wild. Clear sunny day hitting the bright Tudor stone and blue & gold banners, contrasting sharply with the deep dark shadow of the Blackwood Forest outside the walls.'
  },
  {
    file: 'HillcrestImageprompt.md',
    oldString: 'homes and working buildings',
    newString: 'Tudor-style wood and stone homes and working buildings'
  },
  {
    file: 'HillcrestImageprompt.md',
    oldString: 'a lively village center with a tavern, a guildhall, and small craft shops.',
    newString: 'a lively village center. The centerpiece is a magnificent, timber-framed vineyard abbey perched atop the highest sunlit hill, its blue & gold pennants fluttering in the breeze.'
  },
  {
    file: 'HillcrestImageprompt.md',
    oldString: 'Mood: warm country light, green vines, red and gold harvest colors, rustic stone and timber, with a faint ominous undertone from the blight.',
    newString: 'Mood: a feeling of justice and order, clear sunny day, bright blue and gold banners popping against the green vines and Tudor architecture, with a faint ominous undertone from the blight.'
  },

  // Silverleaf (Elves)
  {
    file: 'FrostGladeImageprompt.md',
    oldString: 'Use graceful white stone halls, living wood structures, luminous crystal pathways',
    newString: 'Use sweeping Art Nouveau architecture with organic curves adapted for extreme cold, featuring magical glasshouses, geothermal heating, and deep snow. White stone, frost-glass, and luminous crystal pathways'
  },
  {
    file: 'FrostGladeImageprompt.md',
    oldString: 'At the center, place the Hall of Elders as the grand focal landmark: a majestic elven council hall with tall spires, serene geometry, and a surrounding ceremonial plaza woven into trees and gardens.',
    newString: 'The centerpiece is a sprawling Art Nouveau palace complex of white stone and arching frost-glass, radiating light-blue magical warmth into the snowy air.'
  },
  {
    file: 'FrostGladeImageprompt.md',
    oldString: 'Mood: serene twilight, winter-blue atmosphere, luminous crystals, sacred quiet, arcane wonder. Use cool whites, pale blues, silvers, soft greens, and touches of warm gold in windows and ceremonial lights.',
    newString: 'Mood: an air of elven superiority and comfort. Snowy weather. Use a palette of brilliant whites and light blues, luminous crystals, and touches of warm magical heating.'
  },
  {
    file: 'StarfallImageprompt.md',
    oldString: 'Use pale stone, silver-white wood, crystalline details, delicate arches, open workshop courtyards, jewel-cutting studios, enchanters\' ateliers',
    newString: 'Use sweeping Art Nouveau architecture of pale stone and frost-glass, adapted for extreme cold with magical heating. Delicate arches, jewel-cutting studios, enchanters\' ateliers'
  },
  {
    file: 'StarfallImageprompt.md',
    oldString: 'The town\'s skyline should include a handful of slender elven spires and elegant rooflines that catch the light',
    newString: 'The centerpiece landmark is a sweeping Art Nouveau tower of pale white stone and frost-glass, glowing with internal warmth and intricate light-blue enchantments.'
  },
  {
    file: 'StarfallImageprompt.md',
    oldString: 'Mood: luminous, graceful, welcoming, artistic, and quietly enchanted. Use soft silver, pale green, white stone, crystal blue highlights, and gentle golden light.',
    newString: 'Mood: an air of elven superiority and comfort. Snowy weather. Use a palette of brilliant whites and light blues, luminous crystals, and touches of warm magical heating.'
  },
  {
    file: 'MoonshadeImageprompt.md',
    oldString: 'Use graceful structures built into the trunks of enormous trees',
    newString: 'Use sweeping Art Nouveau structures gracefully built into the trunks of enormous trees, adapted for extreme cold'
  },
  {
    file: 'MoonshadeImageprompt.md',
    oldString: 'quiet open-air libraries, hidden courtyards, hanging walkways between canopy levels, moonlit reflecting pools, and study halls where elders preserve forgotten knowledge.',
    newString: 'The centerpiece landmark is a magnificent, multi-level archives woven into the snowy canopy, boasting sweeping white-wood balconies and plush frost-warded reading lounges.'
  },
  {
    file: 'MoonshadeImageprompt.md',
    oldString: 'Mood: twilight silver-blue light, deep forest greens, quiet magic, secrecy, and age.',
    newString: 'Mood: an air of elven superiority and comfort. Snowy weather. Use a palette of brilliant whites and light blues, deep forest greens, and quiet magic.'
  },
  {
    file: 'SerenityHollowImageprompt.md',
    oldString: 'Use elegant wooden and white-stone retreat houses, meditation platforms, bridges over clear streams, mossy standing stones, ceremonial circles, and quiet garden spaces.',
    newString: 'The centerpiece is a lavish, snow-covered sanctuary with organic Art Nouveau curves in white stone and geothermally heated light-blue reflecting pools around the sacred grove.'
  },
  {
    file: 'SerenityHollowImageprompt.md',
    oldString: 'Use soft greens, pale gold, white bark, clear water, and gentle morning or evening light.',
    newString: 'Mood: an air of elven superiority and comfort. Snowy weather. Use a palette of brilliant whites and light blues, glowing thermal water, and magical warmth.'
  },
  {
    file: 'StardewImageprompt.md',
    oldString: 'Include quaint elven cottages, barns, gardens, herb plots, market stalls full of produce, a modest but beautiful guildhall',
    newString: 'Include Art Nouveau elven cottages adapted for cold, barns, and market stalls. The centerpiece is a sprawling, magically heated glasshouse of frosted white metal and elegant sweeping arches blooming amidst the snow.'
  },
  {
    file: 'StardewImageprompt.md',
    oldString: 'Mood: peaceful prosperity, crisp air, green fields, pale winter light, and a strong sense of home.',
    newString: 'Mood: an air of elven superiority and comfort. Snowy weather. Use a palette of brilliant whites and light blues, with the warmth of magical glasshouses melting the snow.'
  },

  // Ironpeak (Dwarves)
  {
    file: 'ForgePeakImageprompt.md',
    oldString: 'The central landmark is a grand dwarven assembly hall with giant pillars and banners in charcoal, red, and gold, rising from the cavern floor with ceremonial stairs leading up to it.',
    newString: 'The centerpiece is a colossal Brutalist fortress-forge of dark concrete and jagged black iron, glowing with red furnace light through the lashing rain.'
  },
  {
    file: 'ForgePeakImageprompt.md',
    oldString: 'Every surface should show deliberate masonry, engineering, and craft. The monumental gate at the front of the image should frame the scene, with a hint of snow-dusted mountain peaks and cold daylight spilling in from behind the viewer',
    newString: 'Every surface should show hardcore Brutalist architecture prioritizing function over form, built from blocky concrete, stone, and metal. The monumental gate at the front of the image should frame the scene, with severely rainy and windy weather spilling in from behind the viewer'
  },
  {
    file: 'ForgePeakImageprompt.md',
    oldString: 'Mood: powerful, industrious, majestic, ancient, and intensely crafted. Use black iron, bronze, carved granite, gold details, forge smoke, and glowing heat against cool mountain shadow.',
    newString: 'Mood: a vibe of relentless hard work and grit. Severely rainy and windy weather outside the gate. Use intense black and red colors, brutal blocky concrete, black iron, forge smoke, and glowing red heat.'
  },
  {
    file: 'GemstoneHollowImageprompt.md',
    oldString: 'Include jewelers\' workshops, gemcutting halls, display windows glowing with colored stones, stone houses built into the mountain slope',
    newString: 'The architecture is hardcore Brutalist, prioritizing function over form. The centerpiece is a massive, blocky Brutalist gem-sorting hall of black iron and sharp red stone, slick with the pouring rain. Surrounding it are blocky concrete and metal workshops and stone houses built into the mountain slope'
  },
  {
    file: 'GemstoneHollowImageprompt.md',
    oldString: 'Use carved granite, brass, crystal lanterns, and gem-colored highlights to make the village visually distinct.',
    newString: 'Use blocky black concrete, red iron, crystal lanterns, and gem-colored highlights to make the village visually distinct.'
  },
  {
    file: 'GemstoneHollowImageprompt.md',
    oldString: 'Mood: jewel-bright craftsmanship, mountain coolness, and quiet pride.',
    newString: 'Mood: a vibe of relentless hard work and grit. Severely rainy and windy weather. Use intense black and red colors, wet blocky concrete, and the sparkle of gems.'
  },
  {
    file: 'IronrootImageprompt.md',
    oldString: 'Include dwarf monks, broad stone plazas, carved ancestor statues, rune-cut shrines, prayer halls, bell towers, braziers, mountain bridges',
    newString: 'The architecture is hardcore Brutalist, prioritizing function over form. The centerpiece is a staggering, purely functional black-iron monument-shrine defying the howling winds, draped in heavy red chains and soot-stained banners.'
  },
  {
    file: 'IronrootImageprompt.md',
    oldString: 'Use granite, bronze, soft firelight, mountain mist, and a restrained palette to make the place feel quiet but powerful. The image should suggest introspection and endurance.',
    newString: 'Mood: a vibe of relentless hard work and grit. Severely rainy and windy weather. Use intense black and red colors, blocky concrete, black iron, and heavy rain.'
  },
  {
    file: 'SteamhammerImageprompt.md',
    oldString: 'Include clusters of natural hot springs, bathhouse halls with dwarven stonework, wooden walkways over steaming water, mountain cottages, smithies and workshops',
    newString: 'The architecture is hardcore Brutalist, prioritizing function over form. The centerpiece is an immense, fiercely efficient Brutalist bathhouse complex of black concrete and iron, funneling steam through heavy red pipes into the rain.'
  },
  {
    file: 'SteamhammerImageprompt.md',
    oldString: 'The atmosphere should be defined by steam clouds, warm amber light, wet stone, mountain chill beyond the baths, and a sense of earned comfort.',
    newString: 'Mood: a vibe of relentless hard work and grit. Severely rainy and windy weather outside the steam. Use intense black and red colors, blocky concrete, black iron, and thick steam mixing with the heavy rain.'
  },
  {
    file: 'StoneforgeImageprompt.md',
    oldString: 'Include mine shafts, ore carts, cranes and hoists, stout workshops, smelters, bunkhouses, storage yards, tool sheds, and dwarf workers',
    newString: 'The architecture is hardcore Brutalist, prioritizing function over form. The centerpiece is a staggered, heavily reinforced Brutalist ore-crusher made of black basalt and red iron plating, towering formidably over muddy, rain-lashed roads. Include mine shafts, blocky concrete bunkhouses, and red-iron smelters'
  },
  {
    file: 'StoneforgeImageprompt.md',
    oldString: 'Use gray granite, iron, soot, timber supports, and warm forge light against the cold mountain environment.',
    newString: 'Mood: a vibe of relentless hard work and grit. Severely rainy and windy weather. Use intense black and red colors, blocky concrete, black iron, mud, soot, and warm red forge light.'
  },

  // Orcish Wastes (Orcs)
  {
    file: 'OrcCapitolImageprompt.md',
    oldString: 'Build the city from black stone fortifications, timber palisades, iron watchtowers, hide awnings, broad dusty roads, fortified terraces, and a massive central stronghold rising above the rest of the settlement.',
    newString: 'Build the city using utilitarian yurt camps with sprawling hide awnings and jagged bone and iron stakes. The centerpiece is a monumental, sprawling fortress of colossal yurt pavilions and jagged red stakes, sweltering under the desert sun with raw, brutalist presence.'
  },
  {
    file: 'OrcCapitolImageprompt.md',
    oldString: 'Use bonfire light, smoke, black iron, red-brown earth, rough stone, and weathered leather to build the atmosphere.',
    newString: 'Mood: an atmosphere of raw, unyielding brutality. Blistering hot desert weather. Use scorched reds and intense oranges, dust haze, cracking desert heat, and weathered leather.'
  },
  {
    file: 'OrcCityBImageprompt.md',
    oldString: 'Black stone walls, timber fortifications, iron watchtowers, broad dusty roads, and a brutal central stronghold on the higher east bank anchor the layout.',
    newString: 'Utilitarian yurt camps with sprawling hide awnings and jagged bone and iron stakes anchor the layout. The centerpiece is a colossal, multi-tiered command yurt stitched from scorched orange hides, suspended aggressively over the muddy river by thick iron spikes.'
  },
  {
    file: 'OrcCityBImageprompt.md',
    oldString: 'Mood: hard, militarized, sun-beaten, and imposing. The muddy river should cut clearly through the center of the city, with settlement packed tight on both sides.',
    newString: 'Mood: an atmosphere of raw, unyielding brutality. Blistering hot desert weather. The muddy river cuts through the blistering heat. Use scorched reds and intense oranges, dusty air, and jagged desert stakes.'
  },
  {
    file: 'OrcCityCImageprompt.md',
    oldString: 'barracks, war workshops, beast corrals, streets, residential quarters, forge yards, and a central stronghold',
    newString: 'utilitarian yurt camps with sprawling hide awnings, war workshops, beast corrals, and jagged bone and iron stakes. The centerpiece is a massive, sun-scorched gladiator pit encircled by towering red-dyed leather yurts and jagged bone stakes.'
  },
  {
    file: 'OrcCityCImageprompt.md',
    oldString: 'Mood: severe, strategic, elevated, and intimidating. The height should feel dangerous and commanding. Use black stone, rust-red earth, leather awnings, firelight, and smoke against a vast empty sky.',
    newString: 'Mood: an atmosphere of raw, unyielding brutality. Blistering hot desert weather. The height should feel dangerous and commanding. Use scorched reds and intense oranges, dusty air, leather awnings, firelight, and smoke against a vast sweltering sky.'
  }
];

for (const up of updates) {
  const fp = path.join(targetDir, up.file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    if (content.includes(up.oldString)) {
      content = content.replace(up.oldString, up.newString);
      fs.writeFileSync(fp, content);
      console.log('Updated ' + up.file);
    } else {
      console.warn('Could not find string in ' + up.file + ': ' + up.oldString.substring(0, 30) + '...');
    }
  }
}

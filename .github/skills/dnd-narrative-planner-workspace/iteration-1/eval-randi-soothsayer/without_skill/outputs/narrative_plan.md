# Narrative Plan: Randi Meets the Soothsayer

**Goal**: Give Randi a personal encounter with a soothsayer NPC in Ardenville who cryptically references the looter killings from the Highreach crisis, escalating the dormant [[Randi Kills Looters Consequence]] into an active narrative thread.

**Target**: Randi (Zazpoh the Matyr) — Aasimar Wizard, Cloistered Scholar
**Location**: [[Ardenville]] — the party is currently traveling there for the boat race and Exterminators Guild delivery
**Sessions Available**: Session 13+ (party arriving in Ardenville)

---

## Vault Context

- **[[Randi Kills Looters Consequence]]** — status: **Idea**. During the [[Highreach Duplirat Invasion]] (Session 10), Randi killed 2 looters. In Session 11, JP and Randi looted the bodies while a city guard watched. DM note: "TODO: Expand on the party having a bad reputation from killing the looters."
- **No soothsayer or divination NPC** currently exists in the vault
- **[[Ardenville]]** is a port town preparing for the Lake Arden Boat Race — festival atmosphere, travelers, merchants, entertainers flooding in. Natural cover for a wandering fortune-teller.
- **[[Mira Softstep]]** — halfling innkeeper at [[The Netted Nymph]], known gossip. Perfect delivery vehicle for the initial seed.
- **[[Merchants Guild Quest Line]]** — corruption investigation is ongoing. [[Alistair Goldman]] had [[Jarek Ironfist gets killed|Jarek Ironfist killed]] via assassins. The looters were operating during the Highreach crisis when the guild's influence was on display. Possible connection: one looter had ties to a criminal network or the guild's shadier operations.
- **Boat Race Festival** — draws visitors from across Crestfall, providing plausible cover for a strange traveler setting up a tent near the docks.

---

## Integration Points

- **[[Randi Kills Looters Consequence]]** — this narrative activates it. Moves from "Idea" to something with teeth. The soothsayer's reading implies the deaths weren't just a moral stain — someone specific is looking into them.
- **[[Merchants Guild Quest Line]]** — optional link. If one of the dead looters was carrying a ledger or had ties to the guild's criminal operations, the soothsayer's hints connect to the broader corruption thread.
- **[[Mira Softstep]]** — natural seed vehicle. She gossips about everything; mentioning a strange fortune-teller costs nothing and requires no new setup.
- **Randi's Aasimar heritage** — the soothsayer could react to Randi's celestial nature, adding specificity. "Wings in the ashes" reads differently when the character is literally an Aasimar.

---

## Beat Sequence

### Beat 1: The Seed (Passive — Gossip)
**When**: Party arrives at Ardenville and visits [[The Netted Nymph]]
**What happens**: [[Mira Softstep]], amid her usual stream of gossip, mentions a hooded fortune-teller who set up a tent near the fish market. "Gives me the shivers, that one — but the dock hands say she called the last squall before the clouds turned. Charges a silver for palms, two for the bones." She adds: "Funny thing — she asked me if any travelers from Highreach had come through lately."
**If ignored**: The information sits. Other NPCs can reference the soothsayer later — dock workers, a market vendor, Salty Pete grumbling about "bad omens near the pier."

---

### Beat 2: The Echo (Passive — Visual)
**When**: Party explores Ardenville docks or market area
**What happens**: Randi spots a small tent draped in dark cloth near the pier. A hooded figure sits outside, shuffling bone tiles over a cloth. As the party passes, the soothsayer looks up — directly at Randi, ignoring everyone else — and mutters something before looking back down. A crude charcoal sketch is pinned to the tent flap: a winged silhouette standing over fallen bodies.
**If ignored**: The soothsayer doesn't pursue. But at the next quiet moment, Randi catches the faint smell of incense on her clothes, though she never entered the tent.

---

### Beat 3: The Hook (Active — Direct Contact)
**When**: Randi is separated from the group or in a quieter moment (market stall, docks, outside the inn)
**What happens**: The soothsayer finds Randi. She speaks quietly:

> *"You carry cobblestone dust on your hands that won't wash off. I smelled the smoke from Highreach before the wind brought it — and I saw wings in the ashes. Sit. No charge for the ones the dead follow."*

She gestures to her tent. This is an invitation, not a demand. Randi can accept, decline, or bring friends.
**If ignored**: The soothsayer shrugs and returns to her tent. She'll be gone after the boat race. The consequence thread continues without this foreshadowing.

---

### Beat 4: The Reading (Payoff — The Encounter)
**When**: Randi sits down for a reading
**What happens**: The soothsayer throws bone tiles onto dark cloth. She reads them in fragments:

> *"Three fell on cobblestones. Two by your hand. One by another's. The city watched — but the city forgets quickly."*
>
> She pauses. Turns a tile over.
>
> *"Someone doesn't forget. The third one — the one you didn't kill — carried something that wasn't his. A ledger. Names and numbers. Someone wants it back."*
>
> She looks up.
>
> *"The guards aren't your problem, winged one. The person looking for that ledger is."*

**If the party asks questions:**
- *"Who's looking?"* — "I read bones, not names. But they have coin, and coin buys patience."
- *"Where's the ledger?"* — "On a dead man in Highreach, I'd wager. Unless someone else already took it."
- *"Who are you?"* — "Names have weight. I travel light."
- *"Are you threatening me?"* — "I'm warning you. There's a difference."

**If Randi never sits down**: Deliver a compressed version as a parting line when the party leaves Ardenville: *"The third one had a ledger, winged one. Someone is looking for it."*

---

## Proposed NPC: The Soothsayer

- **Working name (DM-only)**: Veshka Ashbloom (or similar — unnamed to the party)
- **Race**: Human or Half-Elf (flexible)
- **Appearance**: Hooded, dark traveling clothes, bone tiles and brazier as tools of the trade
- **Personality**: Calm, direct, unsettling without being hostile. Speaks in fragments.
- **Motivation**: Genuinely sees things others don't — not a fraud. May have her own reasons for tracking echoes of violence.
- **Mechanics**: No combat relevance. Divination flavor only.
- **Location**: Traveling fortune-teller, currently in Ardenville for the boat race festival. Will move on after.
- **Files needed**: Paired NPC files in Ardenville (delegate to `dnd-npc-generator`)

---

## Entities to Create

1. **New NPC**: The soothsayer — paired private/public files in `Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/` and `Public/World/Crestfall/Ardenville/NPCs/`
2. **Consequence Update**: Move [[Randi Kills Looters Consequence]] from `Ideas/` to active status. Add detail: one of the dead looters was carrying a ledger (criminal records or Merchants Guild accounting), making Randi's kills a loose end someone wants resolved.
3. **Optional follow-up quest**: If the DM wants to develop the "someone is looking for the ledger" thread — delegate to `dnd-quest-generator`

---

## Risks & Mitigations

- **Randi's player may not engage** — the soothsayer is atmospheric but passive. All beats are ignorable. If Randi skips everything, deliver the critical hint ("the third one had a ledger") as a throwaway line. The information enters play regardless.
- **Spotlight imbalance** — Beat 4 is ideally a solo scene. Keep it to 5-10 minutes. Alternatively, the soothsayer can read the whole group's fortunes, with Randi's being the one that hits hardest.
- **Tonal clash with boat race prep** — Ardenville is ramping up for a fun, competitive event. Mitigation: frame the soothsayer as one of many eccentric attractions drawn by the festival. She's strange but not sinister — she's warning Randi, not threatening her.
- **Merchants Guild link is optional** — connecting the dead looter to the guild creates a concrete antagonist but adds complexity to an already active quest line. If the DM doesn't want more guild intrigue, the "someone looking for the ledger" can be an independent criminal figure.
- **The "third looter" detail is invented** — the session notes say Randi killed 2 looters. The soothsayer's reading implies a third who died separately and carried a ledger. This is new information seeded through the narrative. If the DM doesn't want to add this detail, the reading can reference only the two known kills and the guard who witnessed the looting.

---

## DM Decision Points

Before proceeding, confirm:
1. **Create the soothsayer NPC?** (name, race, any deeper backstory?)
2. **Activate the looter consequence?** (move from Ideas to active, add the ledger detail?)
3. **Link to Merchants Guild?** (or keep the "someone looking" as an independent threat?)
4. **Create a follow-up quest?** (retrieve or destroy the ledger, investigate who's looking?)

# Eldoria deployed-site review — September 9, 2026

The main DM screen failure is a missing live API route. GitHub Pages serves the screen and its JavaScript, but the configured Azure API returns an empty **404** for `GET /api/dm/party`. The other tested API routes work, and all seven character documents remain readable. A stale or incomplete Azure deployment is the leading explanation; Azure deployment logs and registered functions still need inspection to establish the exact cause.

## Coverage and limits

- Inspected `docs/`, the shared API client, DM handlers, sheet compiler, and catalog renderers.
- Checked 123 deployed URLs derived from 83 local HTML files, their same-site links/assets, and 13 read-only API probes. Of these, only `/api/dm/party` returned a non-200 response. HTTP success alone does not prove a feature works.
- Loaded the home page, player roster, NPC reference, location reference, map, five catalog browsers, and legacy 5etools DM screen in a real browser; also exercised the custom DM tabs and workshop search.
- Opened Claire's sheet, read the seven stored character HP summaries, and exercised public item search and an expanded item detail.
- Existing local DM action tests passed. A separate in-memory example reproduced an uncovered healing bug.
- No production character edits, item saves, deployment, or source fixes were performed. This is an audit and proposed repair plan. Mutation behavior, every catalog record, mobile layouts, and the entire legacy 5etools application have not been exhaustively tested.
- Existing local deletions, notably much of `docs/5etools`, were left untouched. The legacy screen still exists on the deployed site; local absence was not treated as proof of a live 404.

## Findings, in repair order

### 1. DM party API is unavailable — confirmed live, blocking

Reproduction: open [DM Screen](https://cwolansk.github.io/Eldoria/tools/dm-screen/dm-screen.html). The status becomes `404 Not Found` and the party area says `No active character sheets were found.` The network failure is `https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api/dm/party`.

`GET /api/health`, `/api/players`, `/api/characters`, and catalog/public-index probes return 200. The characters endpoint lists seven sheets. Local `docs/api/src/index.js:47` registers `dm/party`, with the handler at `docs/api/src/dmDashboard.js:400`.

Fix: inspect Azure's registered functions and deployed artifact, then deploy the reviewed API package containing both DM route registrations and their dependencies. Publishing `docs/` to GitHub Pages does not itself deploy Azure Functions. Add a release capability/version response and a deployed smoke check that requires `/dm/party` to return the expected response shape, not merely a successful `/health`.

Acceptance: seven active characters load, each can open its sheet, and staging tests cover DM actions, item grants, persistence, and conflicts. The action endpoint was not exercised against live characters.

### 2. Party failure disables unrelated tools and misrepresents missing data — confirmed live

The three tab buttons work. After party loading fails, `connect()` sets `state.api = null`. `searchItems()` then silently returns: typing `sword` in Item Workshop leaves `Type at least two characters` on screen. Public item search for the same query works. `Refresh party` also silently returns when the client is null. `loadParty()` turns request failures into an empty party and zero-valued summary.

Source: `docs/tools/dm-screen/dm-screen.js:131`, `:147`, `:181`.

Fix: retain a usable API client and track party/catalog capability separately. Show explicit loading, empty, unavailable, and stale states. Keep the last successful party visible with a timestamp after refresh failure. Make Refresh retry connection. Keep catalog search and static session references usable when the party endpoint fails; disable only unavailable operations with an explanation.

Acceptance: simulate a party 404 while catalog routes return 200; workshop search must work and the screen must not claim there are zero characters.

### 3. Six characters have no maximum-HP data — confirmed live data issue

All seven character documents returned 200. Julie has level HP values totaling 64 and current HP 64. Claire, Grum, Austin, Liz, Zazpoh, and Vanessa have all-zero level HP and no recorded `combatState.maxHp`. Austin nevertheless has current HP 38 and Vanessa 36. Claire's rendered sheet shows `HP: 0 / 0` and unset level HP.

This remains a problem after the DM endpoint is restored: summary totals cannot reliably describe the party, and sheet/DM displays can disagree about current HP when the maximum is zero.

Fix: reconcile HP from the authoritative character sheets or player-confirmed values. Do not infer maximum HP from current HP. Add an explicit `HP setup incomplete` state, link directly to HP setup, and avoid interpreting an unknown maximum as a defeated character. Validate current/max relationships once a maximum is known.

### 4. Item details omit weapon rules — confirmed live

Reproduction: [Item Search](https://cwolansk.github.io/Eldoria/tools/item-search/item-search.html?q=sword), expand `+1 Arming Sword`. The fully loaded card shows type `M`, source, attunement, weight, and value, but no damage, properties, or description.

The detail API returns `dmg1: 1d6`, `dmg2: 1d8`, `dmgType: P`, `property: [L,F,V]`, `_fProperties: [Light,Finesse,Versatile]`, and `_fullEntries` containing the +1 bonus and weapon rules. `mapItemApiRow()` reads different field names and only `entries`, which is empty for this record.

Source: `docs/tools/item-search/item-search.js:60`. The workshop has the same mismatch in `docs/tools/dm-screen/dm-screen.js:209` and its description helper. Its rarity selector also omits catalog values such as `unknown (magic)` and `varies`.

Fix: share a canonical item adapter across search, workshop, grants, and sheets. Normalize raw damage/type/property codes, `_fullEntries` and wrapped entries, attunement, and rarity. Preserve original structured fields when editing; offer `Create Eldoria copy` for modifying published items. Add round-trip checks proving an unchanged edit does not erase rules or change rarity.

### 5. DM healing can reduce HP; summary calculations differ from sheets — reproduced locally

An in-memory fixture with recorded maximum HP 20, level HP totaling 10, and current HP 15 produces this result:

```text
Displayed maximum: 20
Before: 15 HP
Heal 1 result: 10 HP
```

The summary honors `combatState.maxHp`, but the healing action caps HP using only level HP. Existing `test-dm-dashboard.js` passes without covering this case. Additionally, DM AC reads the stored `combatState.ac`, whereas the sheet compiler accounts for equipment and racial modifiers; the sheet applies exhaustion's maximum-HP multiplier while the DM summary does not.

Source: `docs/api/src/dmDashboard.js:281`, `:342`; `docs/Players/PlayerSheetTemplate/SheetCompiler.js:3135`, `:3337`.

Fix: use shared derived combat statistics for sheet display, DM display, and action validation. Include recorded HP, active levels, equipment, and condition effects. Add focused tests for recorded maximum HP, missing HP, exhaustion, equipment AC, and healing boundaries before deploying the DM backend. These are source findings; the missing live DM route prevented live reproduction.

### 6. DM actions need reliable interaction and access controls — source finding

Action buttons remain enabled during requests, and each response rebuilds every character card. This can submit duplicate actions, overwrite in-progress inputs, collapse details, and lose focus. The API already uses ETags to reject overlapping storage writes, but the UI only displays the error; there is no refresh/reconciliation workflow.

The checked source also registers DM and catalog write routes as anonymous and has no application-level DM role check in these handlers. Anonymous reads were verified live; unauthorized writes were not attempted, and deployment-level restrictions have not been inspected.

Fix: serialize mutations per character, disable only the pending controls, preserve other cards and focus, and present a clear conflict refresh flow. Add action history and reversible actions with concurrency checks. Verify deployment-level authentication, then enforce DM authorization on write endpoints as appropriate; a hidden tab or CORS restriction is not a permission check. Avoid putting privileged keys in browser JavaScript.

### 7. Legacy 5etools screen requests missing assets — confirmed live

[Legacy screen](https://cwolansk.github.io/Eldoria/5etools/dmscreen.html) returns 200 and renders its controls, but the browser reports 404s for `/Eldoria/5etools/sw-injector.js` and `/Eldoria/5etools/img/dmscreen/moon.webp`. These are partial asset failures; this audit does not establish that all legacy screen functionality is broken.

Fix: decide whether to maintain the bundled legacy tool. If retained, publish a complete compatible distribution and test panel creation and initiative. If retired, remove or replace both the custom screen's legacy link and related homepage links. Treat the pre-existing local 5etools deletions deliberately before the next publish.

### 8. Race search leaks size codes and hides useful source labels — confirmed live

[Race Search](https://cwolansk.github.io/Eldoria/tools/race-search/race-search.html) shows `T` and `V` in Size filters; Geleton also shows `V` on its card. `sizeLabel()` only maps S/M/L. Multiple Aarakocra and other editions appear under identical collapsed names without source badges.

Fix: normalize all size codes, including Tiny and Varies, in one mapping and show source/edition on collapsed cards. This will reduce ambiguity during character creation and DM lookup.

## Recommended DM experience

1. **Party overview first:** a compact seven-character table showing HP/max/temp, AC, initiative, passive Perception, concentration, conditions, and last synchronization. Expand a row for detailed controls. Highlight incomplete data separately from wounds.
2. **Encounter workspace:** initiative order, round/turn controls, NPC combatants, concentration reminders, condition durations, and a clearly separated player-facing display. Keep state across reloads with export/recovery.
3. **Fast, recoverable actions:** damage/heal input, optional damage-type handling with DM override, pending/saved feedback, per-character action history, and undo. Add quantity and recipient controls for item grants.
4. **Session reference alongside combat:** searchable rules, pinned NPCs/locations/items, party defenses/languages, and private session notes. Open references in a drawer so they do not discard the active encounter.
5. **Separate preparation from play:** keep Item Workshop as a preparation area with normalized previews, duplicate-as-homebrew, and preserved drafts. Remember the selected tab and implement arrow-key/Home/End navigation with proper focus behavior.

## Delivery sequence

**First repair:** correct combat/item normalization bugs, resolve character HP setup, decouple UI failure states, and prepare a reviewed API deployment. Validate writes against staging/fixtures. Deploy the API and static assets with matching capability checks, then verify the live party route and read-only workflows.

**Next usability release:** compact party overview, reliable actions/conflict handling, concentration/passive stats, and pinned references.

**Then encounter tools:** initiative, durations, encounter persistence, and player-facing mode. Avoid duplicating the legacy screen until its keep/retire decision is made.

The homepage, roster, map, NPC/location references, and initial loading of all five catalog browsers passed the observed checks. Public sword search returned results and pagination; expanding a result exposed the field-mapping issue above. Successful page loads should not be treated as exhaustive feature validation.

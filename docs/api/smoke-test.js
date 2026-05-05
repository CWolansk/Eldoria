const assert = require('assert');
const { handleEntities, handlePlayers, handleSearch } = require('./shared/public-data');

(async () => {
  const players = await handlePlayers();
  assert.strictEqual(players.status, 200);
  assert.ok(players.body.count > 0, 'expected players');

  const player = await handlePlayers({ slug: players.body.players[0].id });
  assert.strictEqual(player.status, 200);
  assert.ok(player.body.name, 'expected player name');

  const localPatch = await handlePlayers(
    { slug: players.body.players[0].id },
    {},
    { method: 'PATCH', body: { ac: 20 }, headers: {} }
  );
  assert.strictEqual(localPatch.status, 503);

  const search = handleSearch({}, { q: 'Highreach', limit: 5 });
  assert.strictEqual(search.status, 200);
  assert.ok(search.body.count > 0, 'expected search results');

  const entity = handleEntities({ slug: search.body.results[0].id });
  assert.strictEqual(entity.status, 200);
  assert.ok(entity.body.name, 'expected entity name');

  console.log('Public API smoke test passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

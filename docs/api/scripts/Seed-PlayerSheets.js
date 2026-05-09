const fs = require('fs');
const path = require('path');
const { getPlayerSheetsTable, packJson } = require('../shared/table-storage');

const PLAYER_SHEETS_PARTITION = 'player';

function readPlayers() {
  const filePath = path.join(__dirname, '..', 'data', 'players.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).map(stripLargeFields);
}

function stripLargeFields(item) {
  const copy = { ...item };
  delete copy.text;
  delete copy.searchText;
  return copy;
}

function stringValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

(async () => {
  const table = await getPlayerSheetsTable();
  if (!table) {
    throw new Error('Table Storage is not configured. Run api:check-config and install API dependencies first.');
  }

  const now = new Date().toISOString();
  const players = readPlayers();
  for (const player of players) {
    if (!player.id) continue;
    const sheet = { ...player, updatedAtUtc: now };
    await table.upsertEntity({
      partitionKey: PLAYER_SHEETS_PARTITION,
      rowKey: player.id,
      ...packJson('PlayerJson', sheet),
      name: stringValue(player.name).slice(0, 200),
      sheetTitle: stringValue(player.sheetTitle).slice(0, 240),
      updatedAtUtc: now,
    }, 'Replace');
  }

  console.log(`Seeded ${players.length} player sheets into ${process.env.PLAYER_SHEETS_TABLE || 'PlayerSheets'}.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
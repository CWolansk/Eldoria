const DEFAULT_PLAYER_SHEETS_TABLE = 'PlayerSheets';
const DEFAULT_CHARACTER_BUILDS_TABLE = 'CharacterBuilds';
const DEFAULT_RULES_TABLE = 'Rules';
const JSON_CHUNK_SIZE = 32000;

const clientPromises = new Map();

function getTableStorageConfig() {
  const connectionString = stringValue(process.env.TABLE_STORAGE_CONNECTION_STRING)
    || stringValue(process.env.AZURE_STORAGE_CONNECTION_STRING);
  if (connectionString && connectionString !== 'UseDevelopmentStorage=true') {
    return { connectionString };
  }

  const accountName = stringValue(process.env.TABLE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_ACCOUNT);
  const endpoint = stringValue(process.env.TABLE_STORAGE_ENDPOINT)
    || (accountName ? `https://${accountName}.table.core.windows.net` : '');
  if (!accountName || !endpoint) return null;

  return {
    accountName,
    endpoint,
    accountKey: stringValue(process.env.TABLE_STORAGE_ACCOUNT_KEY),
  };
}

async function getPlayerSheetsTable() {
  return getTableClient(stringValue(process.env.PLAYER_SHEETS_TABLE) || DEFAULT_PLAYER_SHEETS_TABLE);
}

async function getCharacterBuildsTable() {
  return getTableClient(stringValue(process.env.CHARACTER_BUILDS_TABLE) || DEFAULT_CHARACTER_BUILDS_TABLE);
}

async function getRulesTable() {
  return getTableClient(stringValue(process.env.RULES_TABLE) || DEFAULT_RULES_TABLE);
}

async function getTableClient(tableName) {
  const config = getTableStorageConfig();
  if (!config) return null;

  if (!clientPromises.has(tableName)) {
    clientPromises.set(tableName, createTableClient(tableName, config)
      .then(async (client) => {
        if (!client) return null;
        await ensureTable(client);
        return client;
      })
      .catch((error) => {
        clientPromises.delete(tableName);
        throw error;
      }));
  }

  return clientPromises.get(tableName);
}

async function createTableClient(tableName, config) {
  let TableClient;
  let AzureNamedKeyCredential;
  try {
    ({ TableClient, AzureNamedKeyCredential } = require('@azure/data-tables'));
  } catch (error) {
    throwMissingDependency(error, '@azure/data-tables');
  }

  if (config.connectionString) {
    return TableClient.fromConnectionString(config.connectionString, tableName, {
      allowInsecureConnection: config.connectionString === 'UseDevelopmentStorage=true',
    });
  }

  if (config.accountKey) {
    return new TableClient(
      config.endpoint,
      tableName,
      new AzureNamedKeyCredential(config.accountName, config.accountKey)
    );
  }

  let DefaultAzureCredential;
  try {
    ({ DefaultAzureCredential } = require('@azure/identity'));
  } catch (error) {
    throwMissingDependency(error, '@azure/identity');
  }

  return new TableClient(config.endpoint, tableName, new DefaultAzureCredential());
}

function throwMissingDependency(error, packageName) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    throw new Error(`Missing API dependency ${packageName}. Run npm --prefix docs/api install before using Table Storage locally.`);
  }
  throw error;
}

async function ensureTable(client) {
  try {
    await client.createTable();
  } catch (error) {
    if (!isConflict(error)) throw error;
  }
}

function packJson(prefix, value) {
  const json = JSON.stringify(value || {});
  const chunks = [];
  for (let index = 0; index < json.length; index += JSON_CHUNK_SIZE) {
    chunks.push(json.slice(index, index + JSON_CHUNK_SIZE));
  }
  if (!chunks.length) chunks.push('{}');

  const properties = { [`${prefix}ChunkCount`]: chunks.length };
  chunks.forEach((chunk, index) => {
    properties[`${prefix}${index}`] = chunk;
  });
  return properties;
}

function unpackJson(entity, prefix) {
  if (!entity) return {};
  const count = Number(entity[`${prefix}ChunkCount`]);
  const raw = count > 0
    ? Array.from({ length: count }, (_unused, index) => entity[`${prefix}${index}`] || '').join('')
    : stringValue(entity[prefix]);

  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function tableTimestamp(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function isNotFound(error) {
  return error && (error.statusCode === 404 || error.code === 'ResourceNotFound' || error.code === 'EntityNotFound');
}

function isConflict(error) {
  return error && (error.statusCode === 409 || error.code === 'TableAlreadyExists' || error.code === 'ResourceAlreadyExists');
}

function stringValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

module.exports = {
  getCharacterBuildsTable,
  getPlayerSheetsTable,
  getRulesTable,
  isNotFound,
  packJson,
  tableTimestamp,
  unpackJson,
};

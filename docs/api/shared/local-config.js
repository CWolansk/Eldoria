const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const API_CONFIG_PATH = path.join(__dirname, '..', 'config', 'azure.local.json');

function setEnvDefault(name, value) {
  const clean = String(value || '').trim();
  if (!clean || process.env[name]) return;
  process.env[name] = clean;
}

function runAzureCli(args) {
  const command = process.platform === 'win32' ? 'az.cmd' : 'az';
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  }).trim();
}

function loadLocalAzureApiConfig() {
  if (!fs.existsSync(API_CONFIG_PATH)) return false;

  try {
    const config = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf8'));
    const storage = config && config.storage && typeof config.storage === 'object'
      ? config.storage
      : {};
    const accountName = String(storage.accountName || '').trim();
    const endpoint = String(storage.tableEndpoint || '').trim()
      || (accountName ? `https://${accountName}.table.core.windows.net` : '');

    setEnvDefault('TABLE_STORAGE_ACCOUNT', accountName);
    setEnvDefault('AZURE_STORAGE_ACCOUNT', accountName);
    setEnvDefault('TABLE_STORAGE_ENDPOINT', endpoint);
    setEnvDefault('PLAYER_SHEETS_TABLE', storage.playerSheetsTable || 'PlayerSheets');
    setEnvDefault('CHARACTER_BUILDS_TABLE', storage.characterBuildsTable || 'CharacterBuilds');
    setEnvDefault('RULES_TABLE', storage.rulesTable || 'Rules');
    setEnvDefault('AZURE_TENANT_ID', config.tenantId);

    const configuredKey = String(storage.accountKey || '').trim();
    if (configuredKey) {
      setEnvDefault('TABLE_STORAGE_ACCOUNT_KEY', configuredKey);
    } else if (!process.env.TABLE_STORAGE_ACCOUNT_KEY && accountName && config.resourceGroup && storage.useAccountKeyForLocalDev !== false) {
      try {
        if (config.subscriptionId) {
          runAzureCli(['account', 'set', '--subscription', String(config.subscriptionId)]);
        }
        const key = runAzureCli([
          'storage', 'account', 'keys', 'list',
          '--resource-group', String(config.resourceGroup),
          '--account-name', accountName,
          '--query', '[0].value',
          '-o', 'tsv',
        ]);
        setEnvDefault('TABLE_STORAGE_ACCOUNT_KEY', key);
      } catch {
        // The Table client can still use DefaultAzureCredential when a key is unavailable.
      }
    }

    return true;
  } catch (error) {
    console.warn(`Could not load local Azure API config: ${error.message}`);
    return false;
  }
}

module.exports = { loadLocalAzureApiConfig };

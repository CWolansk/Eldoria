"use strict";

const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

function isLocalConnection(connectionString) {
  return /UseDevelopmentStorage=true/iu.test(connectionString)
    || /127\.0\.0\.1|localhost/iu.test(connectionString);
}

function createTableClient(tableName) {
  const connectionString = cleanEnv("ELDORIA_STORAGE_CONNECTION_STRING")
    || cleanEnv("AzureWebJobsStorage");

  if (connectionString) {
    return TableClient.fromConnectionString(connectionString, tableName, {
      allowInsecureConnection: isLocalConnection(connectionString)
    });
  }

  const storageAccount = cleanEnv("ELDORIA_STORAGE_ACCOUNT") || cleanEnv("STORAGE_ACCOUNT");
  if (!storageAccount) {
    throw new Error(
      "Missing storage configuration. Set ELDORIA_STORAGE_CONNECTION_STRING or ELDORIA_STORAGE_ACCOUNT."
    );
  }

  return new TableClient(
    `https://${storageAccount}.table.core.windows.net`,
    tableName,
    new DefaultAzureCredential()
  );
}

async function ensureTable(client) {
  if (cleanEnv("ELDORIA_CREATE_TABLE").toLowerCase() === "false") {
    return;
  }
  try {
    await client.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

async function createEnsuredTableClient(tableName) {
  const client = createTableClient(tableName);
  await ensureTable(client);
  return client;
}

module.exports = {
  cleanEnv,
  createEnsuredTableClient,
  createTableClient,
  ensureTable
};

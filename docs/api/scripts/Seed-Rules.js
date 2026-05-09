const { seedRulesFromStaticFiles } = require('../shared/rules-data');
const { loadLocalAzureApiConfig } = require('../shared/local-config');

function parseArgs(argv) {
  const collections = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--collection' || arg === '-c') {
      const value = argv[index + 1];
      if (value) {
        collections.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
        index += 1;
      }
      continue;
    }

    if (arg.startsWith('--collection=')) {
      collections.push(...arg.slice('--collection='.length).split(',').map((item) => item.trim()).filter(Boolean));
      continue;
    }

    if (!arg.startsWith('-')) collections.push(arg);
  }

  return { collections };
}

(async () => {
  loadLocalAzureApiConfig();
  const options = parseArgs(process.argv.slice(2));
  const result = await seedRulesFromStaticFiles(options);
  for (const collection of result.collections) {
    console.log(`Seeded ${collection.count} ${collection.kind} record(s) for ${collection.collection}.`);
  }
  console.log(`Seeded ${result.count} rule record(s) into ${result.table}.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

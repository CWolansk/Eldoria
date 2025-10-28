/**
 * Execute a SQL statement (SELECT, INSERT, UPDATE, DELETE) against a local SQLite database.
 * Automatically loads sql.js, opens the DB, runs the statement, and closes the DB to free memory.
 *
 * @param {string} dbFilePath - Path to the SQLite database inside the vault
 * @param {Object} engine - The Obsidian JSEngine instance
 * @param {string} query - SQL query string with ? placeholders for parameters
 * @param {Array<any>} [params=[]] - Parameters to bind to the SQL query
 * @returns {Promise<Array<Object>>} - Array of result rows as objects (empty for non-SELECT)
 */
export async function runSqlStatement( dbFilePath, engine, query, params = [] ) {
  if (!dbFilePath || !engine) throw new Error("Missing dbFilePath or engine");

  if (typeof app === "undefined" || !app.vault) {
    throw new Error("Obsidian app is not available");
  }

  const dbFile = app.vault.getAbstractFileByPath(dbFilePath);
  if (!dbFile) throw new Error(`Database file not found at: ${dbFilePath}`);

  const dbArrayBuffer = await app.vault.readBinary(dbFile);
  const dbFileBuffer = new Uint8Array(dbArrayBuffer);

  await engine.importJs('Scripts/DBScriptsTesting/sql.js');
  const SQL = await window.initSqlJs();
  const db = new SQL.Database(dbFileBuffer);

  const results = [];
  try {
    const stmt = db.prepare(query);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
  } catch (err) {
    console.error("SQLite execution failed:", err);
  } finally {
    db.close();
  }

  return results;
}

/**
 * Generic record filter for any table using common filter patterns.
 * Dynamically determines how to process filters based on the table and keys present.
 *
 * @param {string} dbFilePath - Path to the SQLite database in the Obsidian vault.
 * @param {Object} engine - The Obsidian JSEngine instance.
 * @param {string} table - Table to query (e.g., "Items", "Spells").
 * @param {Object} filters - Filter criteria.
 * Key should be column name value should be for partial matching
 * @param {string[]} preBuiltQueries - prebuilt range filters
 * @param {Object} pagination - Optional pagination options:
 *   - limit: number of results to return
 *   - offset: number of results to skip
 *
 * @returns {Promise<Array<Object>>} - Filtered records from the specified table.
 */
export async function filterRecordsInDb(dbFilePath, engine, table, filters = {}, preBuiltQueries =[], pagination = {}) {
  const conditions = [];
  const params = [];
  const { limit = null, offset = null } = pagination;

  let query = `SELECT * FROM ${table}`;

  // Build partial match conditions from filters
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      conditions.push(`LOWER("${key}") LIKE ?`);
      params.push(`%${value.toLowerCase()}%`);
    }
  }

  const allConditions = [...preBuiltQueries, ...conditions];

  if (allConditions.length > 0) {
    query += ` WHERE ${allConditions.join(" AND ")}`;
  }

  if (limit != null) {
    query += " LIMIT ?";
    params.push(limit);
  }
  if (offset != null) {
    query += " OFFSET ?";
    params.push(offset);
  }

  return await runSqlStatement( dbFilePath, engine, query, params );

/*
  // Name (partial match)
  if (filters.name || filters.nameContains) {
    conditions.push("LOWER(Name) LIKE ?");
    params.push(`%${(filters.name || filters.nameContains).toLowerCase()}%`);
  }

  if (filters.rarity) {
    conditions.push("LOWER(Rarity) LIKE ?");
    params.push(filters.rarity.toLowerCase());
  }
  if (filters.school) {
    conditions.push("LOWER(School) LIKE ?");
    params.push(filters.school.toLowerCase());
  }

  if (filters.type) {
    conditions.push("LOWER(Type) LIKE ?");
    params.push(`%${filters.type.toLowerCase()}%`);
  }
  if (filters.className) {
    conditions.push("LOWER(Classes) LIKE ?");
    params.push(`%${filters.className.toLowerCase()}%`);
  }

  if (filters["Casting Time"]) {
    conditions.push("LOWER([Casting Time]) LIKE ?");
    params.push(filters["Casting Time"].toLowerCase());
  }
  if (filters.Duration) {
    conditions.push("LOWER(Duration) LIKE ?");
    params.push(filters.Duration.toLowerCase());
  }
  if (filters.Range) {
    conditions.push("LOWER(Range) LIKE ?");
    params.push(filters.Range.toLowerCase());
  }
  if (filters.Components) {
    conditions.push("LOWER(Components) LIKE ?");
    params.push(`%${filters.Components.toLowerCase()}%`);
  }

  if (typeof filters.valueMin === "number") {
    conditions.push("CAST(Value AS INTEGER) >= ?");
    params.push(filters.valueMin);
  }
  if (typeof filters.valueMax === "number") {
    conditions.push("CAST(Value AS INTEGER) <= ?");
    params.push(filters.valueMax);
  }

  if (filters.levelMin !== undefined || filters.levelMax !== undefined) {
    const minLevel = normalizeLevel(filters.levelMin ?? 0);
    const maxLevel = normalizeLevel(filters.levelMax ?? 9);
    conditions.push("Level IS NOT NULL");
    conditions.push("CAST(Level AS INTEGER) >= ?");
    params.push(minLevel);
    conditions.push("CAST(Level AS INTEGER) <= ?");
    params.push(maxLevel);
  }

  // Damage filtering
  if (filters.damage) {
    conditions.push("(LOWER(Damage) LIKE ? OR LOWER(Text) LIKE ? OR LOWER(Description) LIKE ?)");
    const dmg = `%${filters.damage.toLowerCase()}%`;
    params.push(dmg, dmg, dmg);
  }
*/
}

  // Add a spell or item directly to the appropriate table
  /**
   * Add a record (item or spell) directly into the database.
   * @param {Object} db - The opened SQLite database instance.
   * @param {Object} record - The item or spell object to add (must include Name).
   */
  export function addToDatabase(db, record) {
    if (!record || !record.Name) {
      throw new Error("Record must have a 'Name' field");
    }
  
    const tableName = record.Level !== undefined ? "Items" : "Items";
    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map(key => record[key]);
    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  
    const stmt = db.prepare(sql);
    stmt.bind(values);
    stmt.step();
    console.log(`✅ Inserted/Updated '${record.Name}' in table '${tableName}'`);
  }
  
  // Item model class
  export class Item {
    constructor({
      Name,
      Rarity = "common",
      Type = "wondrous item",
      Attunement = null,
      Damage = null,
      Properties = null,
      Mastery = null,
      Weight = null,
      Source = null,
      Page = null,
      Text = ""
    } = {}) {
      this.Name = Name;
      this.Rarity = Rarity;
      this.Type = Type;
      this.Attunement = Attunement;
      this.Damage = Damage;
      this.Properties = Properties;
      this.Mastery = Mastery;
      this.Weight = Weight;
      this.Source = Source;
      this.Page = Page;
      this.Text = Text;
    }
  }
  
  // Spell model class
  export class Spell {
    constructor({
      Name,
      Level,
      "Casting Time": CastingTime,
      Duration,
      School,
      Range,
      Components,
      Classes,
      "Optional/Variant Classes": OptionalClasses = "",
      Source = null,
      Page = null,
      Text = "",
      "At Higher Levels": AtHigherLevels = ""
    } = {}) {
      this.Name = Name;
      this.Level = Level;
      this["Casting Time"] = CastingTime;
      this.Duration = Duration;
      this.School = School;
      this.Range = Range;
      this.Components = Components;
      this.Classes = Classes;
      this["Optional/Variant Classes"] = OptionalClasses;
      this.Source = Source;
      this.Page = Page;
      this.Text = Text;
      this["At Higher Levels"] = AtHigherLevels;
    }
  }
  
  // Sync a folder of markdown notes to the SQLite database using parseMarkdown
  /**
   * Batch sync an entire folder of markdown notes to the database using built-in parsing.
   * @param {string} dbFilePath - Path to the SQLite database file.
   * @param {string} folderPath - Path to the vault folder containing markdown files.
   * @returns {Promise<number>} - Number of records synced.
   */
  export async function syncFolderToDatabase(dbFilePath, folderPath) {
    const db = await loadDatabase(dbFilePath);
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) throw new Error(`Folder not found or empty: ${folderPath}`);
  
    let count = 0;
    for (const file of folder.children) {
      if (file.extension !== "md") continue;
      const content = await app.vault.read(file);
      const records = parseMarkdown(content);
      for (const record of records) {
        addToDatabase(db, record);
        count++;
      }
    }
    console.log(`✅ Synced ${count} entries from ${folderPath} into the database.`);
    return count;
  }
  
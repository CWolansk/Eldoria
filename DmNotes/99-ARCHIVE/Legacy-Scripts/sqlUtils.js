// Utility to load the SQLite database from Obsidian vault
/**
 * Load the SQLite database from the Obsidian vault.
 * Uses `engine.importJs` to load sql-wasm.js.
 * @param {string} dbFilePath - Path to the database file inside the vault.
 * @returns {Promise<Object>} - The opened SQL database instance.
 */
export async function loadDatabase(dbFilePath) {
    if (typeof app === "undefined" || !app.vault) {
      console.error("❌ Obsidian app is not accessible.");
      return;
    }
    const dbFile = app.vault.getAbstractFileByPath(dbFilePath);
    if (!dbFile) throw new Error(`Database file not found at: ${dbFilePath}`);
  
    const dbArrayBuffer = await app.vault.readBinary(dbFile);
    let SQL = await engine.importJs('Scripts/sql-wasm.js');
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer));
    return db;
  }
  
  // Utility to fetch a single row by name from a given table (case-insensitive match)
  /**
   * Fetch a single row from a given table by name (case-insensitive).
   * @param {Object} db - The opened SQLite database instance.
   * @param {string} tableName - The table to search in.
   * @param {string} name - The name to search for.
   */
  export function querySingleRowByName(db, tableName, name) {
    const query = `SELECT * FROM ${tableName} WHERE Name = ? COLLATE NOCASE LIMIT 1`;
    const stmt = db.prepare(query);
    stmt.bind([name]);
  
    if (stmt.step()) {
      return stmt.getAsObject();
    } else {
      return null;
    }
  }
  
  // Normalize spell level: "cantrip" → 0, others to integer
  function normalizeLevel(levelStr) {
    if (!levelStr) return -1;
    const str = String(levelStr).toLowerCase();
    if (str === "cantrip") return 0;
    const parsed = parseInt(str);
    return isNaN(parsed) ? -1 : parsed;
  }
  
  // Filter spells in DB based on various criteria
  /**
   * Filter spells from the database based on various criteria.
   * @param {Object} db - The SQLite database instance.
   * @param {Object} filters - Filtering options like levelMin, levelMax, nameContains, school, className.
   */
  export function filterSpellsInDB(db, filters = {}) {
    const {
      levelMin = 0,
      levelMax = 9,
      nameContains,
      school,
      className
    } = filters;
  
    let conditions = ["Level IS NOT NULL"];
    let params = [];

    if (typeof levelMin === "number") {
      conditions.push("CAST(Level AS INTEGER) >= ?");
      params.push(levelMin);
    }
    if (typeof levelMax === "number") {
      conditions.push("CAST(Level AS INTEGER) <= ?");
      params.push(levelMax);
    }
    if (nameContains) {
      conditions.push("LOWER(Name) LIKE ?");
      params.push(`%${nameContains.toLowerCase()}%`);
    }
    if (school) {
      conditions.push("LOWER(School) = ?");
      params.push(school.toLowerCase());
    }
    if (className) {
      conditions.push("LOWER(Classes) LIKE ?");
      params.push(`%${className.toLowerCase()}%`);
    }
  
    const query = `SELECT * FROM Items WHERE ${conditions.join(" AND ")}`;
    const stmt = db.prepare(query);
    stmt.bind(params);
  
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
  
    return results;
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
  
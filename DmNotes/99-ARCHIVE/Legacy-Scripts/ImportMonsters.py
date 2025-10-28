import sqlite3
import csv
import os

def create_monsters_table_and_import_csv():
    """Create the Monsters table and import data from Bestiary.csv"""
    
    # Connect to database
    conn = sqlite3.connect('DND.db')
    cursor = conn.cursor()
    
    # Drop existing table if it exists
    cursor.execute("DROP TABLE IF EXISTS Monsters")
    
    # Create Monsters table with all the columns from your CSV
    create_table_sql = """
    CREATE TABLE Monsters (
        Name TEXT PRIMARY KEY,
        Size TEXT,
        Type TEXT,
        Alignment TEXT,
        AC TEXT,
        HP TEXT,
        Speed TEXT,
        Strength TEXT,
        Dexterity TEXT,
        Constitution TEXT,
        Intelligence TEXT,
        Wisdom TEXT,
        Charisma TEXT,
        "Saving Throws" TEXT,
        Skills TEXT,
        "Damage Vulnerabilities" TEXT,
        "Damage Resistances" TEXT,
        "Damage Immunities" TEXT,
        "Condition Immunities" TEXT,
        Senses TEXT,
        Languages TEXT,
        CR TEXT,
        Traits TEXT,
        Actions TEXT,
        "Bonus Actions" TEXT,
        Reactions TEXT,
        "Legendary Actions" TEXT,
        "Mythic Actions" TEXT,
        "Lair Actions" TEXT,
        "Regional Effects" TEXT,
        Environment TEXT,
        Treasure TEXT
    )
    """
    
    cursor.execute(create_table_sql)
    print("✅ Created Monsters table")
    
    # Import CSV data
    csv_path = '../Bestiary/Bestiary.csv'
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found at {csv_path}")
        return
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
          # Prepare insert statement
        columns = list(csv_reader.fieldnames)
        placeholders = ', '.join(['?' for _ in columns])
        quoted_columns = ', '.join([f'"{col}"' for col in columns])
        insert_sql = f"INSERT OR REPLACE INTO Monsters ({quoted_columns}) VALUES ({placeholders})"
        
        # Insert data
        count = 0
        for row in csv_reader:
            values = [row[col] for col in columns]
            cursor.execute(insert_sql, values)
            count += 1
        
        print(f"✅ Imported {count} monsters from CSV")
    
    # Commit and close
    conn.commit()
    conn.close()
    print("✅ Database updated successfully")

if __name__ == "__main__":
    create_monsters_table_and_import_csv()

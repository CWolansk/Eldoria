import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Test specific monster queries
test_monsters = ['Goblin', 'goblin', 'Orc', 'Wolf']

for monster in test_monsters:
    cursor.execute("SELECT Name, CR FROM Monsters WHERE Name = ? COLLATE NOCASE LIMIT 1", [monster])
    result = cursor.fetchone()
    if result:
        print(f"✅ Found '{monster}': {result[0]} (CR {result[1]})")
    else:
        print(f"❌ Not found: '{monster}'")

# Show first few monsters that start with G
print("\nMonsters starting with 'G':")
cursor.execute("SELECT Name FROM Monsters WHERE Name LIKE 'G%' LIMIT 10")
results = cursor.fetchall()
for row in results:
    print(f"- {row[0]}")

conn.close()

import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Test the exact monsters we're using in templates
test_monsters = [
    'Goblin Assassin',
    'Goblin Boss', 
    'Fiendish Orc',
    'Skeleton',
    'Zombie',
    'Bandit',
    'Bandit Captain',
    'Werewolf (Krallenhorde)',
    'Wolf Reaver Dwarf'
]

print("Testing encounter monsters:")
for monster in test_monsters:
    cursor.execute("SELECT Name, CR, AC, HP FROM Monsters WHERE Name = ? COLLATE NOCASE LIMIT 1", [monster])
    result = cursor.fetchone()
    if result:
        print(f"✅ {result[0]} - CR {result[1]}, AC {result[2]}, HP {result[3]}")
    else:
        print(f"❌ Not found: {monster}")
        # Try to find similar
        cursor.execute("SELECT Name FROM Monsters WHERE LOWER(Name) LIKE ? LIMIT 3", [f'%{monster.lower()}%'])
        similar = cursor.fetchall()
        if similar:
            print(f"   Similar: {[row[0] for row in similar]}")

conn.close()

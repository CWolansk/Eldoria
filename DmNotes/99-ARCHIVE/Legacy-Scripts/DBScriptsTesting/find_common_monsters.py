import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Search for monsters containing common keywords
keywords = ['goblin', 'orc', 'wolf', 'skeleton', 'zombie']

for keyword in keywords:
    print(f"\nMonsters containing '{keyword}':")
    cursor.execute("SELECT Name, CR FROM Monsters WHERE LOWER(Name) LIKE ? LIMIT 5", [f'%{keyword}%'])
    results = cursor.fetchall()
    for row in results:
        print(f"- {row[0]} (CR {row[1]})")

conn.close()

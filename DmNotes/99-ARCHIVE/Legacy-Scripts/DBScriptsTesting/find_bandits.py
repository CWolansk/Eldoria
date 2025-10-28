import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Find bandit-type creatures
cursor.execute("SELECT Name, CR FROM Monsters WHERE LOWER(Name) LIKE '%bandit%' OR LOWER(Name) LIKE '%brigand%' OR LOWER(Name) LIKE '%thief%' ORDER BY Name")
results = cursor.fetchall()

print("Bandit-type creatures:")
for row in results:
    print(f"- {row[0]} (CR {row[1]})")

conn.close()

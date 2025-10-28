import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Test query
cursor.execute("SELECT Name, CR, Type FROM Monsters LIMIT 5")
results = cursor.fetchall()

print("Sample monsters in database:")
for row in results:
    print(f"- {row[0]} (CR {row[1]}, {row[2]})")

conn.close()

import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

print("Goblin variants:")
cursor.execute("SELECT Name FROM Monsters WHERE Name LIKE '%Goblin%' ORDER BY Name LIMIT 10")
results = cursor.fetchall()
for row in results:
    print(f"  {row[0]}")

print("\nBandit variants:")
cursor.execute("SELECT Name FROM Monsters WHERE Name LIKE '%Bandit%' ORDER BY Name LIMIT 10")
results = cursor.fetchall()
for row in results:
    print(f"  {row[0]}")

conn.close()

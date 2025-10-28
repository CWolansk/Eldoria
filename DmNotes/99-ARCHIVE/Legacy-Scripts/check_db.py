import sqlite3

conn = sqlite3.connect('DND.db')
cursor = conn.cursor()

# Get table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

# Check if Monsters table exists, if not create it
if 'Monsters' not in tables:
    print("Monsters table doesn't exist, will need to create it")
else:
    # Get column info for Monsters table
    cursor.execute("PRAGMA table_info(Monsters);")
    columns = cursor.fetchall()
    print("Monsters table columns:", columns)

conn.close()

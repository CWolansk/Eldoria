import pandas as pd, sqlite3; pd.read_csv("items.csv").to_sql("Items", sqlite3.connect("DND.db"), if_exists="replace", index=False)

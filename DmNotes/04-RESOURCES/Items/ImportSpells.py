import pandas as pd, sqlite3; pd.read_csv("Spells.csv").to_sql("Spells", sqlite3.connect("DND.db"), if_exists="replace", index=False)

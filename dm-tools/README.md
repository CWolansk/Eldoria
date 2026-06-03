# Eldoria Local DM Tools

Local-only utilities for the DM. Keep this folder outside `docs/`; GitHub Pages publishes `docs/` directly.

## Setup

```bash
cd dm-tools
npm install
copy .env.example .env
```

Add your OpenAI key to `.env`.

## DM Jarvis

Regenerate the private vault index, then start the local server:

```bash
npm run gen:jarvis
npm run start:jarvis
```

Open `http://localhost:8087/jarvis`.

The generated index lives at `dm-tools/data/jarvis-index.json`, is gitignored, and may contain private notes. Do not copy it into `docs/`.

## Item Editor

Start the Jarvis server and open `http://localhost:8087/item-editor`.

The editor only generates a CSV row. Paste the output into `docs/data/items.csv`, then rebuild the public docs from `docs/` when you want the player-facing item search to update.

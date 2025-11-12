# Feat Lookup Example

This demonstrates the updated feat lookup widget that now shows full descriptions embedded directly in the note.

## Example Usage

```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Aberrant Dragonmark', 'Alert', 'Lucky'])
```

## Features

The updated widget now shows:
- ✅ **Full feat descriptions** embedded directly in the card
- ✅ **Prerequisites** clearly displayed
- ✅ **Ability score improvements** listed
- ✅ **Source and page numbers** for reference
- ✅ **All cards open by default** so you can see descriptions immediately
- ✅ **5etools link** for additional details if needed

## Notes

- For feats from official sources (like ERLW, XGE, TCE), the full description is shown
- For homebrew/third-party feats without database entries, a note indicates to check 5etools
- Click the feat name to collapse/expand individual cards
- The descriptions are formatted with proper line breaks and bullet points

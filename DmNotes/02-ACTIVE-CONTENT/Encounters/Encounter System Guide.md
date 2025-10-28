# Encounter System Guide

## Overview
The encounter system provides comprehensive tools for creating, managing, and running D&D 5e encounters with automated stat tracking and XP calculations.

## Features

### 🎲 **Encounter Creation**
- **[[Create Encounter]]** - Custom encounter builder with full monster database integration
- **[[Quick Encounter Builder]]** - Pre-made encounter templates for common situations
- **[[Encounter Dashboard]]** - Management overview and statistics

### ⚔️ **Combat Management**
- **Initiative Tracking** - Automated tables with player and monster entries
- **HP Tracking** - Individual HP counters for each creature
- **Quick Reference** - Monster AC, HP, and key stats at a glance
- **Turn Tracking** - Round-by-round combat progression

### 💰 **Reward Calculation**
- **XP Calculation** - Automatic XP totals with encounter multipliers
- **Difficulty Assessment** - Easy/Medium/Hard/Deadly ratings
- **Treasure Generation** - Optional treasure suggestions based on encounter CR
- **XP Distribution** - Party XP tracking and awarding

## How to Create Encounters

### Method 1: Custom Encounter Builder
1. Open **[[Create Encounter]]**
2. Fill in encounter details (name, description, location)
3. Add monsters using format: "2x Goblin", "1x Owlbear"
4. Set party level and size for XP calculations
5. Choose treasure options
6. Click "Create Encounter"

### Method 2: Quick Templates
1. Open **[[Quick Encounter Builder]]**
2. Choose from pre-made templates:
   - Goblin Ambush (CR 1-2)
   - Orc Patrol (CR 2-3)
   - Bandit Hideout (CR 3-4)
   - Undead Encounter (CR 2-4)
   - Beast Pack (CR 1-3)
3. Template creates encounter instantly

## Generated Encounter Features

### **Encounter Overview**
- Difficulty rating and XP totals
- Encounter multiplier calculations
- Quick monster summary table

### **Initiative Tracker**
- Pre-loaded with all party members: Claire, JP, Julie, Justin, Liz
- Individual entries for each monster
- Editable initiative values and HP tracking
- Notes field for conditions and status effects

### **Monster Details**
- Quick stats (AC, HP, Speed) for each monster type
- Collapsible full stat blocks
- Direct links to individual monster pages
- Quantity tracking for multiple monsters

### **Combat Tools**
- Environmental factors checklist
- Turn tracking checkboxes
- Special mechanics notes
- Round-by-round progression

### **Treasure Section** (Optional)
- Difficulty-appropriate treasure suggestions
- Coin and item recommendations
- Distribution tracking for each player
- Checkboxes for awarded items

### **Session Notes**
- What happened summary
- Player actions log
- Memorable moments
- Loot distribution record

## Integration

### **Monster Database**
- Searches 1,458+ D&D 5e monsters
- Automatic stat lookup and inclusion
- XP value extraction from CR ratings
- Full stat block integration

### **Player System**
- Links to individual player character sheets
- Automatic XP awarding through dashboard
- Party level and composition tracking

### **Campaign Tracking**
- "Mentioned In" dataview for cross-referencing
- Session log integration
- Encounter history and statistics

## XP and Difficulty System

### **XP Calculation**
- Base XP from monster CR ratings
- Encounter multipliers:
  - 1 monster: x1
  - 2 monsters: x1.5
  - 3-6 monsters: x2
  - 7-10 monsters: x2.5
  - 11-14 monsters: x3
  - 15+ monsters: x4

### **Difficulty Thresholds** (per player)
| Level | Easy | Medium | Hard | Deadly |
|-------|------|--------|------|--------|
| 1     | 25   | 50     | 75   | 100    |
| 2     | 50   | 100    | 150  | 200    |
| 3     | 75   | 150    | 225  | 400    |
| 4     | 125  | 250    | 375  | 500    |
| 5     | 250  | 500    | 750  | 1100   |

## Files Created

```
Encounters/
├── Create Encounter.md           # Main encounter builder
├── Quick Encounter Builder.md    # Template encounters
├── Encounter Dashboard.md        # Management overview
├── Encounter System Guide.md     # This guide
└── [Generated Encounters]/       # Individual encounter files
    ├── Goblin Ambush.md
    ├── Forest Patrol.md
    └── Boss Fight.md

Scripts/DBScriptsTesting/
├── CreateEncounter.js            # Main encounter creation logic
├── CreateQuickEncounter.js       # Template encounter creation
├── AwardXP.js                    # XP awarding system
└── MarkdownUtilities.js          # Enhanced with encounter functions
```

## Tips for Use

### **Monster Names**
- Use exact names from the monster database
- Check [[Search Monsters]] if unsure of exact names
- System handles most common variations

### **Party Composition**
- Update player count if party size changes
- Adjust party level as characters advance
- System automatically calculates appropriate difficulty

### **Combat Flow**
1. Roll initiative and fill in the tracker
2. Use HP tracking inputs for damage
3. Check off combat rounds as they progress
4. Note special effects and conditions
5. Award XP through the dashboard when complete

### **Customization**
- Add environmental notes in the custom notes section
- Modify treasure suggestions as needed
- Use session notes section for campaign continuity

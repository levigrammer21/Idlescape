# Idle Wanderer v0.24.0 — Family Encounters

- Chat now lives in its own main panel tab.
- Active summons are visible beside other online players.
- Tap another online player in the world to approach and attack them.
- PvP defeats return the defeated player to the center with no item or coin loss.

# Idle Wanderer v0.24.0 — Expanded World & Chat

## Family chat
- Added a persistent family-world chat bar at the bottom of the game.
- Messages are shared through Firebase Realtime Database and limited to the latest 50 messages.
- Chat supports signed-in player names, unread counts, a collapsible history panel, and mobile-friendly input.

## Expanded world
- World dimensions are now 6000 × 6000.
- The existing continent, biomes, towns, resources, fishing spots, creatures, and decorations are proportionally spread across the larger world.
- Existing v0.22 saves migrate player position into the expanded coordinate system.
- Multiplayer position limits and minimap rendering now use the larger world dimensions.

## Compatibility
- Existing progression, inventory, equipment, bestiary records, companion food, and cloud saves remain compatible.

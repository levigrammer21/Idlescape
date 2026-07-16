# Idle Wanderer v0.2.0

A mobile-first, installable 2D idle RPG prototype built with plain HTML, CSS, and JavaScript.

## New in v0.2.0

- Larger 1500 × 1200 hand-built world
- Soft-follow camera that keeps the player near the centre
- Fixed mobile UI with no page scrolling
- Inventory, Skills, Equipment, Crafting, and Menu tabs
- Rat enemy with OSRS-inspired tick combat
- Floating damage numbers over whoever takes damage
- One game tick is 600 ms
- Rat attacks every 3 ticks (1.8 seconds)
- Player attacks every 4 ticks (2.4 seconds)
- Crafting bench recipe: 1 stick + 1 rock = crude club
- Equippable crude club with a higher maximum hit

## Controls

Tap the world to walk. Tap a tree, rock, fishing spot, rat, or crafting bench to interact.

## GitHub Pages

Upload every file in this folder to the root of a GitHub repository. Enable GitHub Pages from the main branch and root folder.

Because the service worker caches game files, existing installs may need a refresh after an update. The cache name changes with each version to make this automatic.

## Map editing

The current map is code-based in `game.js`. World objects use simple x/y coordinates, making it practical to expand from a phone. A separate visual map editor can be added later, or a hand-drawn map can be translated into this coordinate format.

# Idle Wanderer v0.19.2 — Continuous Walking Fix

## Walking controls
- Tap the world to use the existing tap-to-walk movement.
- Hold for 120 ms to begin continuous walking.
- Drag while holding to steer in real time.
- Movement speed scales from precise slow movement near the player to full speed farther away.
- Releasing or cancelling the touch stops the player immediately.
- Pointer release is also captured outside the canvas to prevent stuck movement.
- Continuous movement activation is checked by the game loop instead of relying on a mobile browser timer.

## Compatibility
- Existing v0.19.0 and v0.19.1 saves preserve player position and progression.
- No creature stats, items, map layout, multiplayer behavior, or progression values were changed.

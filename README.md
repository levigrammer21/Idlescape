# Idle Wanderer v0.19.0 — Arsenal & Forge

## Weapons
- Added four melee weapon families across every crafting tier:
  - Daggers: 2 ticks, low damage, fastest melee attacks.
  - Swords: 4 ticks, balanced accuracy and damage.
  - Spears: 5 ticks, stronger deliberate hits.
  - Warhammers: 6 ticks, slowest attacks and highest strength.
- Existing unique and monster-dropped weapons remain usable.

## Ranged
- Added Shortbows, Recurve Bows, Longbows, and Slings across the wood tiers.
- Slings attack every 2 ticks with shorter range and visible arcing stone projectiles.
- Shortbows attack every 3 ticks with standard arrows.
- Recurve bows attack every 4 ticks with balanced range and power.
- Longbows attack every 5 ticks with the longest range and heavier arrows.
- Ranged projectiles are now visibly drawn travelling from the player to the target.

## Armour
- Retained all metal armour tiers.
- Added Hide, Scaled, Jaguar, and Frozen Hide light-armour sets.
- Light armour provides lower defence than heavy metal gear but adds Ranged accuracy.

## Town Forge
- Every town now has a Forge Upgrades service.
- Combine two identical weapons or armour pieces into one +1 item.
- Combine two identical +1 items into +2.
- Combine two identical +2 items plus one Tempering Shard into +3.
- Upgrades improve accuracy/strength or defence while preserving weapon speed and range.
- If the source item is equipped, the upgraded result remains equipped.

## Creature catalyst
- Added Tempering Shards to the drop tables of Wolf, Crocodile, Jaguar, Ice Wolf, Frost Troll, and Frost Dragon, with stronger creatures having better chances.

No creature stats, map positions, gathering rates, save structure, multiplayer behavior, or existing inventories were reset.

## v0.19.1 — Admin Foundations

Adds a separate private `/admin` control room and the server-side Firebase Functions required for privileged operations.

### Admin dashboard
- Admin-claim-only login.
- Global maintenance mode, minimum-version enforcement, update messaging, and scheduled shutdown settings.
- Live online-player viewer.
- Account search and inspection.
- Display-name, coin, position, inventory, suspension, and ban controls.
- Session revocation and full account deletion.
- Revisioned map JSON drafts, publishing, history, and rollback foundation.
- Immutable server-written admin audit log.

### Game integration
- Signed-in clients listen to a single `system/config` document.
- Maintenance mode or an outdated version safely blocks gameplay and disconnects multiplayer presence.
- Suspended and banned accounts are stopped before their save loads.
- Browsers cannot be remotely closed, so forced-update mode presents a blocking update screen and requires reload.

### Deployment
1. Install the Firebase CLI and select the `idle-wonders` project.
2. From `functions/`, run `npm install`.
3. Deploy with `firebase deploy --only functions,firestore:rules,database,hosting`.
4. Grant your account the custom claim once:
   - Configure Application Default Credentials for the project.
   - Run `node functions/scripts/set-admin.mjs your-email@example.com`.
   - Sign out and back in before opening `/admin`.

The map workspace stores and publishes validated remote map revisions, but the current hard-coded game map does not consume remote map data yet. That integration should be a separate world-system update.

# Idle Wanderer v0.11.0 — Unique Equipment Progression

- Rare creature drops remain crafting materials and are never equipped directly.
- Added a visible Unique Equipment category to town crafting tables.
- Added unique recipes for rabbit, deer, wolf, skeleton, scorpion, wraith, crocodile, sand golem, jaguar, ice wolf, and frost dragon drops.
- Lucky Foot Ring grants a real 5% Woodcutting XP bonus.
- Jaguar Boots grant a real 8% movement-speed bonus.
- The Equipment panel now displays current combat level, accuracy, maximum hit, and defence.
- Melee levels increase base accuracy by 2 per level and maximum hit by 1 every 8 levels; weapon stats are added on top.
- Built on the confirmed-working v0.9.1 movement and combat foundation.

Upload every file in this folder to the root of your GitHub Pages repository.


## v0.10.4 cooking rework
- Cooking is now instant, matching crafting.
- Cook 1 converts one eligible raw item immediately.
- Cook All converts the full owned stack immediately and awards XP for every item.
- Removed the timed cooking queue and progress handling.

## v0.11.0 Summoning

- Eligible creatures have a 1 in 50 chance to drop their permanent Spirit Essence.
- Spirit Essences remain in inventory and can be used at any time to change the active summon.
- Only one summon may be active, and it remains active until replaced.
- Active summons attack the same combat target as the player.
- Summon damage scales from the creature's base power and the player's Summoning level.
- Active summons gain Summoning XP equal to roughly one third of XP earned from actions.
- Every summon has a combat role and a gathering, movement, combat, or XP passive.


## v0.11.1 inventory and audio

- Coins now appear in the header between the game title/version and Save button.
- Added a compact sound-settings button beside the coin display.
- Inventory coins are no longer shown as a normal item card.
- Added inventory filters for All, Weapons, Armour, Food, Materials, Tools, Summons, and Other.
- Added a peaceful synthesized background track with no external audio files.
- Added separate music and sound-effect toggles and volume controls.
- Added lightweight effects for gathering, loot, cooking, crafting, summoning, and saving.
- Audio preferences persist with the save.


## v0.11.2 combat animation and audio boost

- Replaced the side-to-side combat weapon wave with an upright ready stance, a fast downward strike, and a clean return.
- Greatly increased background music and action sound output.
- Added master compression so loud effects remain clear rather than clipping harshly.
- Increased default music and SFX levels while preserving the sound settings controls.


## v0.11.3 fixed full-volume audio

- Removed the audio settings button and dialog.
- Music and action sounds now always run at full in-game output; device volume controls the final loudness.
- Fixed a recursive audio-startup bug that prevented the Web Audio engine from starting.
- Added repeated mobile gesture unlocking for iOS and Android browsers.
- Increased synthesized music and action-effect output to strong, clearly audible levels.


## v0.11.4 faster progression

- Increased XP earned across gathering, combat, crafting, cooking, and Merching to 1.5× the previous rate.
- Summon XP continues to earn one-third of the final XP awarded, so it scales consistently with the new rate.
- Summon XP passives still stack normally with the global progression increase.


## v0.12.0 XP feedback

- Added compact XP blips at the top of the play area for every skill XP gain.
- Added a full level-up celebration with a skill banner, level display, golden burst particles, screen pulse, vibration where supported, and a distinct level-up sound.
- Multiple simultaneous level-ups are queued so none are skipped.


## v0.12.0 — The Idle Update

- Added saved Auto Combat, Woodcutting, Mining, Fishing, and Explore modes.
- Automation remains inside the player’s current biome and chooses the strongest usable local resource by default.
- Tapping a resource while its matching auto mode is active pins that specific target type/node until it is unavailable.
- Auto Explore rotates between valid combat and gathering activities in the current biome.
- Added offline progression for the saved auto mode, capped at eight hours.
- Added a Welcome Back summary listing items, XP, and enemies defeated.
- Auto Combat and Auto Explore switch off after player defeat.

## v0.13.1 — Account-Isolated Cloud Saves

- Local recovery caches are now namespaced by Firebase UID.
- A new Firebase account never inherits another account’s browser save.
- Accounts without a Firestore save start with a clean new character.
- Existing Firestore saves continue loading normally.

## v0.13.0 — Cloud Saves
- Added a login screen before the game with the version number.
- Added Google sign-in and email/password sign-in, account creation, password reset, and sign-out.
- Added Firebase Authentication using the `idle-wonders` project.
- Added Cloud Firestore saves split into one document per top-level save section under `users/{uid}/save`.
- Cloud saves load before the game starts and become authoritative when present.
- Existing local saves are migrated to the signed-in account when no cloud save exists.
- Important actions continue to save locally immediately and queue a debounced cloud write.
- Replaced the manual Save button with a cloud save-status indicator.

## v0.14.0 — Leaderboards & Statistics

- Added account-based family leaderboards for total level, combat level, current gold, lifetime gold earned, total kills, unique drops, summons, and individual skills.
- Added clickable public player profiles and editable leaderboard display names. Email addresses are never published to the leaderboard document.
- Added persistent statistics for kills, kills by enemy, gold earned/spent, gathering, crafting, cooking, unique drops, and play time.
- Existing saves migrate automatically. Lifetime statistics begin counting from v0.14.0 because older builds did not store historical totals.
- Added `firestore.rules`. Deploy these rules in Firebase before using the leaderboard screen. The rules keep full saves private while allowing signed-in players to read rankings and write only their own public profile.

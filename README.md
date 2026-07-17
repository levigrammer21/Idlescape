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

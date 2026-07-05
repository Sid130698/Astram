# Astram - Changes by Shan

This document logs the recent mechanics and polish added to the Astram archery battle engine.

## 1. Micro-Freeze Clash Mechanic
-> **Hit-Stop (Time Freeze):** When an Agneyastra collides with another Agneyastra mid-air, the game physics and player animations instantly pause for 200 milliseconds to simulate a massive impact. *(Note: This freeze only triggers for Agni vs Agni).*
-> **Screen Shake & Flash:** A violent 200ms screen shake and a pure white screen flash accompany the hit-stop freeze.
-> **Pushback (Knockback):** The exact moment time resumes, a massive physics velocity pushback (`-400` / `400` on the X-axis) is applied to both players with heavy ground drag (`800`), causing them to slide rapidly away from each other.

## 2. Visual & Engine Scaling
-> **Full-Screen Scaling:** Updated Phaser's configuration to use `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`. Cleaned up conflicting CSS flexbox properties in `index.html` to allow the game canvas to seamlessly cover the entire browser screen while perfectly maintaining its aspect ratio.
-> **Bigger Projectiles:** 
   -> **Normal Arrow:** Increased visual scale to 2.25, expanded hitbox bounds, and doubled power/damage to `20`.
   -> **Agneyastra:** Increased visual scale to 0.55, expanded hitbox bounds, and doubled power/damage to `50`.
-> **UI Polish:** Increased the font size for the "Arrow", "Agni", and "Brahma" labels on the Astra selection UI to 14px for better readability.

## 3. The Brahmastra
-> **New Ultimate Weapon:** Added "Brahma" as a third selectable Astra in the main battle UI.
-> **Auto-Win Power:** Given an internal struggle power of `9999`, allowing it to effortlessly rip through normal Arrows and Agneyastra projectiles without being stopped. (e.g., Agneyastra vs Arrow -> Agneyastra wins. Brahmastra vs Agneyastra -> Brahmastra wins).
-> **One-Hit Kill:** Damage set to `9999`, guaranteeing a lethal one-hit kill if it strikes a player.
-> **Round-Locked Execution:** The Brahmastra remains completely locked out (with a "Locked" status on UI) for the first 2 rounds of normal fighting. It uniquely unlocks and becomes selectable only at the start of Round 3.
-> **Limited Ammo:** Strictly restricted to exactly `1` use per player per match.
-> **Brahmastra vs Brahmastra Clash:** Added a dedicated standalone module (`brahmastra.js`). When two Brahmastras collide mid-air, it triggers a catastrophic collision: a colossal 800ms screen shake, three massive staggered explosions, and a huge pushback (`600` velocity) to both players.

## 4. Main Menu & Battleground Interface
-> **Game Mode Selection:** Added a sleek, full-screen HTML Main Menu allowing players to choose between **"Play vs CPU"** or **"Play vs Player 2"**.

## 5. AI CPU Opponent
-> **Automated Volleys:** In "Play vs CPU" mode, the enemy automatically calculates launch trajectories and fires back 800ms after the player.
-> **Strategic Weapon Use:** The AI is programmed to actively use its Agneyastra (30% chance) and its lethal Brahmastra (20% chance after Round 3 unlocks), adding real challenge!

## 6. Collision Balances
-> **Brahmastra vs Agneyastra Fix:** Resolved an issue where Brahmastra would punch through Agneyastra and unfairly hurt the shooter. Now, if a Brahmastra and an Agneyastra ever collide mid-air, it triggers the identical massive catastrophic explosion as a Brahmastra vs Brahmastra clash. Both weapons are utterly obliterated and nobody takes cheap damage!

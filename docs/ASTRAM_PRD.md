# ASTRAM — Product Requirements Document
### Version 1.0 | Authors: Siddharth Singh + Claude

---

## 1. Vision

**Astram** is a real-time 1v1 turn-based archery battle game set in the Mahabharat universe. Players draw divine weapons (astras) from Hindu epics, battle opponents across ranked tiers, and climb from a Padatik foot soldier to an Atirathi legendary warrior.

**One line pitch:** Angry Birds meets Mahabharat — pull your bowstring, unleash divine astras, outwit your opponent.

**Platform:** Mobile browser (HTML5) — no app store required for MVP. Share a link, play instantly.

**Stack:** Phaser.js (frontend game) + Spring Boot WebSockets (real-time multiplayer backend)

---

## 2. Target Audience

| Segment | Description |
|---|---|
| Primary | Indian mobile gamers aged 16-30 who know Mahabharat mythology |
| Secondary | Casual mobile gamers globally who enjoy turn-based strategy |
| Tertiary | Hardcore rankers who grind progression systems |

---

## 3. Core Game Loop

```
Create Account → Select Rank (Padatik by default)
       ↓
Enter Matchmaking (Free Play or Class Battle)
       ↓
Pre-Battle: Select 3 Offensive Astras + 2 Defensive Astras
       ↓
Battle: Turn-based archery — aim, shoot, apply effects
       ↓
Win/Lose Rounds (Best of 3)
       ↓
Earn Points → Rank Up or Rank Down
       ↓
Unlock better Astras → Repeat
```

---

## 4. Rank Progression System

Players start at Padatik and climb through wins. Rank determines matchmaking pool, astra access, and point multipliers.

| Rank | Sanskrit Meaning | Unlock Tier |
|---|---|---|
| Padatik | Foot soldier | Starting rank — all players begin here |
| Rathi | Single chariot warrior | 500 points |
| Atirathi | Can fight 12 Rathis | 2,000 points |
| Maharathi | Can fight 12 Atirathis | 6,000 points |
| Ati-Maharathi | Near legendary | 15,000 points |
| Chiranjivi | Immortal warrior | 35,000 points (endgame) |

**Rank decay:** Lose 5 consecutive matches → drop one rank tier. Keeps the ladder competitive.

**Underdog multiplier:** Beat a player 2+ ranks above you → 5x point bonus. This is intentional — Padatik beating a Maharathi should feel legendary.

---

## 5. Match Structure

### Pre-Battle Phase
- Both players see each other's rank and selected astra loadout BEFORE battle starts
- Each player selects:
  - 3 offensive astras (from their unlocked arsenal)
  - 2 defensive astras (from their unlocked arsenal)
- This creates strategic meta — do I counter what I see or go with my strongest combo?

### Battle Phase — Turn Structure

**Turn order:** Coin flip determines who shoots first. Alternates every turn.

**Each turn:**
1. Active player selects: normal arrow OR one of their remaining astras
2. Active player aims — pull and release (Angry Birds mechanic)
3. Arrow/astra fires with animation
4. Effect applies to OPPONENT'S NEXT TURN (not instantly)
5. Opponent's turn begins — they play under any active effect

**Why effects apply next turn:** This creates the strategic depth. You must decide — do I use my defensive astra this turn to cancel their effect on me, or do I ignore it and counter-attack?

### HP System
- Each player has 100 HP per round
- First player to reach 0 HP loses the round
- Best of 3 rounds wins the match
- HP does NOT reset mid-round — damage accumulates

### Progressive Arsenal Bar
- A bar fills gradually as the match progresses (time + damage dealt combined)
- When bar fills completely → both players unlock 1 additional bonus astra from their full collection
- Visual: bar shown at top of screen with Sanskrit-style design
- Encourages finishing matches rather than stalling

### Normal Arrows
- Unlimited, always available
- Deal 8-12 HP damage (slight random variance for feel)
- No special effects
- Skill expression: aim accuracy matters for normal arrows

---

## 6. Astra System

### Damage Tiers

| Tier | Damage Range | Example Astras |
|---|---|---|
| Common | 20-30 HP | Agneyastra, Varunastra, Vayuastra |
| Rare | 35-45 HP | Nagastra, Indrastra, Suryastra, Chandrastra |
| Epic | 50-65 HP | Narayanastra, Twashtrastra, Parjanyastra, Yamadanda |
| Legendary | 70-85 HP | Brahmastra, Brahmashira, Kalastra |
| Mythic | 95-100 HP | Pashupatastra (instant round win) |

### Full Offensive Astra Roster

| Astra | Tier | Effect on Opponent's Next Turn | Animation |
|---|---|---|---|
| Agneyastra | Common | +5 bonus damage on top of arrow damage (fire debuff) | Fireball explosion on impact |
| Varunastra | Common | Cancels any fire effect; deals water damage | Blue water vortex |
| Vayuastra | Common | Opponent's aim drifts left or right randomly | Wind spiral effect |
| Suryastra | Rare | Opponent screen flashes white, aim momentarily blinded | Sun flare burst |
| Chandrastra | Rare | Slows opponent aim movement to half speed | Silver moonbeam trail |
| Nagastra | Rare | Arrow transforms into serpent; if hits, deals damage over 2 turns | Arrow morphs into coiling snake |
| Indrastra | Rare | Opponent loses 50% of their next turn timer | Lightning bolt strike |
| Parjanyastra | Epic | Rain of 5 small arrows from sky, total 40 HP split | Arrows rain from above |
| Narayanastra | Epic | Showers 10 small missiles; more missiles if opponent uses a weapon to block | Hundred missiles explosion |
| Twashtrastra | Epic | Creates 3 fake arrows alongside the real one mid-flight | Arrow splits into 3 decoys |
| Yamadanda | Epic | Deals 55 HP damage AND drains 100 of opponent's rank points | Dark staff slam |
| Kalastra | Legendary | Opponent loses their entire next turn (time frozen) | Clock/time freeze visual |
| Brahmastra | Legendary | 80 HP, only countered by another Brahmastra | Massive golden beam |
| Brahmashira | Legendary | Brahmastra x4 power, splits into 4 beams | Quadruple golden beams |
| Pashupatastra | Mythic | Instant round win. Cannot be blocked. Extremely rare unlock | Full screen destruction animation |

### Full Defensive Astra Roster

| Astra | Effect | Animation |
|---|---|---|
| Mayastra | Shows opponent 3 fake aim lines — they cannot tell which is real (your idea — most original mechanic) | 3 dotted lines appear, 2 fade randomly |
| Kavachastra | Blocks next incoming astra completely (does not block normal arrows) | Glowing armor shell appears |
| Parvatastra | Mountain wall blocks next arrow, reduces damage by 60% | Stone wall rises |
| Antardhana | Your aim line is invisible this turn — opponent cannot see where you aim | Character fades out |
| Mantrastra | Reflects opponent's next astra back at them (risky — if they use normal arrow it does nothing) | Mirror shield flash |

### Counter Relationships

These are absolute — counters completely negate the astra:

- Nagastra → countered by Garudastra (future unlock)
- Agneyastra → countered by Varunastra
- Brahmastra → only countered by Brahmastra (mutual cancel)
- Pashupatastra → nothing counters it
- Narayanastra → only countered by surrendering weapons (throwing away your own astras)

### Astra Unlock by Rank

| Rank | Astras Unlocked |
|---|---|
| Padatik | Agneyastra, Varunastra, Vayuastra, Mayastra, Kavachastra |
| Rathi | + Suryastra, Chandrastra, Parvatastra |
| Atirathi | + Nagastra, Indrastra, Antardhana |
| Maharathi | + Parjanyastra, Narayanastra, Twashtrastra, Mantrastra |
| Ati-Maharathi | + Yamadanda, Kalastra, Brahmastra |
| Chiranjivi | + Brahmashira, Pashupatastra |

---

## 7. Deity Boon System

Boons are temporary buffs granted by deities. They provide immunity or enhancement for a limited duration.

**Critical UX note:** Active boons MUST be visibly displayed on both players' screens before and during battle. Opponent must know you have a boon active — no hidden boons. This prevents feeling cheated.

### Boon Roster

| Deity | Boon Effect | Duration | How to Get |
|---|---|---|---|
| Agni | Immune to all fire-based astras (Agneyastra) | 1 match | 7-day login streak |
| Indra | Immune to Indrastra; Vajra deals +20% damage | 1 match | Defeat a player 3 ranks above you |
| Varuna | Immune to water astras; Varunastra costs no astra slot | 24 hours | Purchase ₹9 |
| Shiva | Take 40% less damage from all astras | 1 match | Win 10 consecutive matches |
| Vishnu | Narayanastra fires 15 missiles instead of 10 | 1 match | Purchase ₹19 |
| Brahma | Brahmastra cannot be countered this match | 1 match | Reach Ati-Maharathi rank |
| Surya | Suryastra blinds for 2 turns instead of 1 | 24 hours | Purchase ₹9 |
| Yama | Yamadanda drains 200 points instead of 100 | 1 match | Win a match with 0 normal arrows used |

---

## 8. Game Modes

### Free Play
- Random matchmaking across all ranks
- Underdog multiplier applies
- Points earned/lost normally
- No rank restriction — anyone can face anyone

### Class Battle
- Matched only against players within one rank tier of yours
- Safer for rank — lose fewer points
- Earn 20% fewer points (lower risk = lower reward)
- Recommended for players protecting a rank

---

## 9. Points & Economy

### Earning Points

| Action | Points |
|---|---|
| Win a round | +50 |
| Win a match | +150 bonus |
| Normal arrow hit (per hit) | +5 |
| Astra hit (per hit) | +10 to +30 (scales with astra tier) |
| Underdog match win (2+ ranks above) | 5x multiplier on all match points |
| Perfect round (opponent dealt 0 damage) | +100 bonus |
| Win with only normal arrows | +200 bonus |

### Losing Points

| Action | Points |
|---|---|
| Lose a round | -20 |
| Lose a match | -50 |
| Disconnect mid-match | -100 + temporary ban 10 minutes |

---

## 10. Monetization

### Rank Shield (Core monetization)
- ₹9 — Protect your current rank for 5 days
- During protection: losses do not decrease rank (points still lost, but no rank demotion)
- After 5 days or 15 consecutive losses: protection removed automatically
- Cannot stack multiple protections

### Boon Purchases
- Selected boons purchasable for ₹9-19 per activation (see Boon table above)
- Never pay-to-win — boons give immunity to specific astras, not invincibility
- All boons theoretically earnable through gameplay

### Future Monetization (Post-MVP)
- Cosmetic arrow skins (purely visual)
- Battle arena themes (Kurukshetra, Dwaraka, Lanka)
- Character avatar skins (Arjun, Karna, Drona aesthetic)
- Astra animation upgrades (premium visual effects for same astra)

**Hard rule: No monetization that directly increases damage or unlocks astras faster than gameplay allows.**

---

## 11. Technical Architecture

### Frontend — Phaser.js
- HTML5 canvas game, runs in mobile browser
- Phaser 3 (latest stable)
- Scenes: Boot → Login → Lobby → Pre-Battle → Battle → Results
- Physics: Arcade physics for arrow trajectory
- Aim mechanic: Mouse drag / touch drag → angle + power calculation → projectile tween
- Astra effects: Phaser particle emitters, tweens, camera effects (shake, flash, fade)
- WebSocket client: Native browser WebSocket connected to Spring Boot backend

### Backend — Spring Boot
- Java 17+, Spring Boot 3.x
- WebSocket (STOMP over SockJS) for real-time game state sync
- REST API for: auth, matchmaking queue, rank/points, astra unlocks, purchases
- PostgreSQL: users, ranks, points, match history, astra ownership
- Redis: active game sessions, matchmaking queue, boon timers
- Spring Security + JWT: authentication

### Real-time Game State (WebSocket message flow)

```
Player A shoots → sends SHOOT message to server
Server validates (is it their turn? do they have that astra?)
Server broadcasts game state update to both players
Player B receives state → effect applied to their screen
Player B's turn begins
```

### Cheat Prevention
- Server is authoritative — all game logic validated server-side
- Client only sends: action type, astra selected, angle, power
- Server calculates actual damage, applies effects, determines hit/miss
- Client renders what server says happened

---

## 12. Animation Strategy

### Pure Phaser.js Code (no art needed)
| Effect | Implementation |
|---|---|
| Screen shake | `this.cameras.main.shake(300, 0.02)` |
| Screen flash | `this.cameras.main.flash(200)` |
| Aim line wobble (Sammohana) | Sine wave applied to aim line angle each frame |
| 3 fake aim lines (Mayastra) | Draw 3 lines, randomize which is real |
| Rain of arrows (Parjanyastra) | Particle emitter from top of screen |
| Screen darken | Black rectangle tween to 70% opacity |
| Arrow split (Twashtrastra) | Spawn 3 tweens from arrow midpoint position |
| Time freeze (Kalastra) | Pause opponent's turn timer tween |

### Free Assets (Download from Kenney.nl and itch.io)
| Asset needed | Source |
|---|---|
| Arrow sprite | Kenney.nl — Interface pack |
| Fire explosion | itch.io — Free Pixel Effects Pack |
| Lightning strike | itch.io — Pixel Art VFX Lightning |
| Water vortex | itch.io — Free Magic Pack 9 |
| Wind swirl | itch.io — 10 animated magic effects |
| Battlefield background | OpenGameArt.org — ancient battle scene |
| Warrior archer character | itch.io — Tiny Swords pack |
| Shield glow | itch.io — Magical Animation Effects |

### Custom Creation Needed (Piskel — browser pixel art editor)
| Asset | Complexity | Frames needed |
|---|---|---|
| Nagastra serpent transformation | Medium | 8 frames: arrow → half snake → full snake |
| Rank badges (6 badges) | Low | Static images, Canva design |
| Pashupatastra screen crack | Low | 1 static overlay image |
| Deity boon icons (8 icons) | Low | Static images, Canva design |

---

## 13. MVP Scope

MVP = a shareable link where two people can play a real 1v1 match.

### MVP Includes
- Single game mode (Free Play only)
- 3 ranks (Padatik, Rathi, Maharathi)
- 6 offensive astras (Common + Rare tier only)
- 2 defensive astras (Mayastra + Kavachastra)
- Basic HP system + best of 3 rounds
- Real-time WebSocket multiplayer
- Points tracking
- No boons
- No monetization
- Basic visuals (placeholder assets acceptable)

### MVP Excludes (Phase 2+)
- Class Battle mode
- Boon system
- Deity boons
- Monetization
- Epic/Legendary/Mythic astras
- Progressive arsenal bar
- Full rank ladder (all 6 ranks)
- Counter relationships
- Cosmetics

---

## 14. Development Timeline (10 Weeks)

| Week | Focus | Deliverable |
|---|---|---|
| 1 | Project setup + Spring Boot WebSocket foundation | Two browser tabs can connect and send messages |
| 2 | Phaser.js scene structure + aim/shoot mechanic | Arrow fires from pull-release gesture |
| 3 | Game state sync — turn logic server side | Turn alternates correctly between two players |
| 4 | HP system + round logic + match end | Full best of 3 rounds works end to end |
| 5 | Normal arrows complete + 3 basic astras (Agni, Varuna, Vayu) | Real match playable with basic astras |
| 6 | Mayastra + Kavachastra defensive mechanics | Pre-battle selection works + effects trigger |
| 7 | Matchmaking + basic lobby + accounts | Two strangers can find each other and play |
| 8 | Points system + 3 ranks | Rank shows, points update after match |
| 9 | Asset polish — download free assets, replace placeholders | Game looks presentable |
| 10 | Bug fixing + mobile testing + deploy | Shareable link works on mobile browser |

---

## 15. Success Metrics for MVP

| Metric | Target |
|---|---|
| Complete matches (start to finish) | > 70% of started matches |
| Match duration | 5-12 minutes average |
| Return visits (play again same day) | > 40% |
| Shareable — someone shares link to a friend | > 30% of players |

---

## 16. Open Questions (Decide Before Week 5)

1. Arrow collision mid-air — do we implement in MVP or Phase 2? (Technically complex)
2. What happens if a player disconnects mid-match — auto-forfeit or reconnect window?
3. Sammohana exact effect — aim drifts or controls partially reverse?
4. Kalastra vs Indrastra — do we keep both or merge? (Similar effect)
5. Normal arrow damage — fixed 10 HP or slight random variance (8-12)?

---

*Document version 1.0 — living document, update as decisions are made.*
*Next step: Week 1 technical setup — Spring Boot WebSocket project scaffold.*

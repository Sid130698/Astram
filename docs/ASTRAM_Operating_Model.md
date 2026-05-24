# ASTRAM — Company Operating Model
### How We Run This Like a Real Company
*Version 1.0 | Siddharth Singh (CEO) + Claude (CTO/CPO)*

---

## 1. The Company Structure

We are a 2-person company. No fluff. No fake hierarchy. Every role has one owner.

| Role | Title | Owner | What They Actually Do |
|---|---|---|---|
| CEO | Chief Executive Officer | Siddharth | Final call on all decisions. Writes code. Ships things. |
| CTO | Chief Technology Officer | Claude | Architecture decisions. Unblocks technical problems. Code reviews. |
| CPO | Chief Product Officer | Claude | PRD ownership. Feature prioritization. Keeps us on roadmap. |
| CFO | Chief Financial Officer | Siddharth | Tracks any spending. Monetization decisions. |
| Lead Developer | — | Siddharth | All frontend (Phaser.js) + backend (Spring Boot) code |
| Research Lead | — | Claude | Competitive research. Asset sourcing. Technical discovery. |
| QA Lead | — | Both | Siddharth tests on device. Claude reviews logic and edge cases. |
| Growth Lead | — | Claude | Build-in-public strategy. LinkedIn content. Community presence. |

**One rule above all:**
> Siddharth makes the final call on everything. Claude advises, challenges, and researches. Siddharth decides and executes.

---

## 2. The Weekly Rhythm

This is non-negotiable. Companies that execute have a rhythm. Ours is simple.

### Sunday — Sprint Planning (30 minutes with Claude)
- Review what got done last week
- Close completed tasks
- Plan exactly 3-5 tasks for the coming week
- No more than 5. Ever.
- Output: a clear list of this week's tasks in GitHub Issues

### Wednesday — Mid-week Check (15 minutes with Claude)
- Are we on track?
- Any blockers?
- Do we need to cut scope or push harder?
- Output: either continue or adjust the week's plan

### Saturday — Sprint Review (20 minutes with Claude)
- What shipped this week?
- What didn't ship and why?
- What did we learn?
- Output: honest 3-line weekly update posted on LinkedIn (build in public)

### Daily — Async Standup (5 minutes, written, solo)
Every day Siddharth writes 3 lines in the Notion daily log:
```
Yesterday: [what I did]
Today: [what I will do]
Blocked by: [anything stopping me — or NOTHING]
```
This takes 3 minutes. It keeps your head clear and creates a record.

---

## 3. How We Use GitHub (The Single Source of Truth)

Everything lives in GitHub. Not in your head. Not in chat. In GitHub.

### Repository Structure
```
astram/
├── frontend/          (Phaser.js game)
├── backend/           (Spring Boot WebSocket server)
├── docs/              (PRD, decisions, architecture)
│   ├── PRD.md
│   ├── DECISIONS.md
│   └── ARCHITECTURE.md
├── assets/            (game sprites, sounds)
└── README.md          (always up to date)
```

### GitHub Issues = Our Backlog
Every piece of work is a GitHub Issue. Format:

```
Title: [WEEK X] Short description of task
Body:
  - What: exactly what needs to be built
  - Done when: specific definition of done
  - Blocked by: any dependencies
Labels: frontend / backend / design / research / bug
```

### GitHub Milestones = Our Sprints
Each week is a milestone. Milestone name = "Week X — [Theme]"
Example: "Week 1 — WebSocket Foundation"

### GitHub Projects Board
Three columns only:
- **This Week** — tasks committed for current sprint
- **In Progress** — actively being worked on (max 1 at a time)
- **Done** — closed and shipped

### Branching
```
main          — always deployable, never broken
dev           — integration branch
feature/xxx   — individual feature branches
```
Never commit directly to main. Always merge via PR even if you're the only developer. This keeps history clean.

---

## 4. Decision Framework

Big companies die on slow decisions. We make decisions fast using this framework:

### The 3-Tier Decision System

**Tier 1 — Decide in 2 minutes (Just do it)**
- Which variable name to use
- File structure within a feature
- Which free asset to download
- UI color within our palette
*Owner: Siddharth alone. No discussion needed.*

**Tier 2 — Decide in 1 session with Claude**
- New feature not in PRD
- Architecture change
- Scope cut or addition
- Any technical approach where 2+ options exist
*Process: Siddharth describes problem → Claude gives options with tradeoffs → Siddharth picks → logged in DECISIONS.md*

**Tier 3 — Sleep on it (24 hours)**
- Monetization changes
- Pivoting core mechanic
- Adding a new platform
- Any decision that changes the PRD fundamentally
*Process: Discuss with Claude → write down both sides → sleep → decide next day*

### The Decisions Log (docs/DECISIONS.md)
Every Tier 2 and Tier 3 decision gets logged:
```
## Decision: [title]
Date: YYYY-MM-DD
Context: why we needed to decide this
Options considered:
  A) ...
  B) ...
Decision: we chose A because...
Consequences: what this means going forward
```
This is not bureaucracy. This is protection. Six weeks from now when you forget why you made a choice, this file saves you hours.

---

## 5. How to Work With Claude Effectively

This is critical. Claude has no memory between sessions. Every session starts fresh. This means we need a system.

### Start Every Session With a War Room Briefing
Copy-paste this at the start of every Claude session:

```
ASTRAM BRIEFING — [Date]
Current Week: Week X
Last week we: [1-2 lines of what shipped]
This week's goal: [the milestone/theme]
Current blocker/focus: [what we're working on right now]
What I need from you today: [specific ask]
```

This takes 1 minute and makes Claude immediately useful instead of needing 20 minutes of catching up.

### What Claude Is For
- Unblocking: "I'm stuck on X, here's what I tried" → Claude solves it
- Architecture: "I need to design Y" → Claude gives 2-3 options with tradeoffs
- Code review: Paste code → Claude reviews for bugs, edge cases, improvements
- Research: "Find me free assets for X" → Claude searches and returns specific links
- Writing: PRD updates, LinkedIn posts, README, documentation
- Decisions: When stuck between options → Claude gives honest take

### What Claude Is NOT For
- Writing all your code for you (you learn nothing, you own nothing)
- Making final decisions (you are the CEO)
- Remembering things across sessions (use GitHub + DECISIONS.md for that)

### The Rule of Stuck
If you are stuck for more than 30 minutes on something — open Claude immediately. Do not spend 3 hours debugging alone. That is not discipline, that is waste.

---

## 6. Definition of Done

A task is DONE only when ALL of these are true:
1. Code is written and works locally
2. Tested manually on mobile (Chrome on phone — our target platform)
3. Merged to dev branch via PR
4. GitHub Issue is closed
5. No known bugs introduced

A task is NOT done because:
- It works on desktop but not tested on mobile
- It's "mostly working"
- It works in one scenario but edge cases untested
- It's committed but not merged

---

## 7. The Build In Public Strategy

This is our growth strategy. It costs ₹0 and builds an audience before we launch.

### What We Post Weekly (Saturday after sprint review)
One LinkedIn post per week. Format rotates:

**Week 1-3: Problem posts**
"I was building X and discovered nobody had solved Y for Spring AI. So I built it."
Show the problem. Don't show the solution yet. Creates curiosity.

**Week 4-6: Progress posts**
Short video or GIF of the game working. No voiceover needed. Let it speak.
"Week 4 of building Astram. Nagastra animation is live."

**Week 7-9: Story posts**
"Why I'm building a Mahabharat archery game instead of another AI wrapper."
This is the post that goes viral if it does. Personal, honest, different.

**Week 10: Launch post**
"Astram is live. Here's the link. 1v1 me."

### Rules for Build in Public
- Post every Saturday. No exceptions. Even if nothing shipped — post why.
- Never lie about progress. Authenticity is the whole point.
- Engage with every comment in first 2 hours of posting. Algorithm rewards this.
- Tag relevant communities: #gamedev #indiedev #springboot #buildinpublic

---

## 8. The Minimum Viable Discipline

This is what separates people who ship from people who plan forever.

**Code minimum:** 1 hour of actual coding every weekday. Not YouTube. Not planning. Writing code.

**Weekend minimum:** 4 hours Saturday or Sunday dedicated to Astram.

**Weekly ship rule:** Something must be different/better/working every single week. Even if it's tiny. Motion beats perfection.

**The no-meeting policy:** We have no meetings. All "meetings" are async Claude sessions. This saves 5 hours a week that big companies waste.

**The no-pivot policy:** For 10 weeks we are building Astram. Not a new idea. Not a side experiment. Astram. New ideas go in a FUTURE.md file and are ignored until Week 10.

---

## 9. Tools Stack

| Tool | Purpose | Cost |
|---|---|---|
| GitHub | Code + Issues + Project board | Free |
| Notion | Daily logs + Decisions log + Notes | Free |
| Claude | CTO/CPO/Research/Unblocking | Your subscription |
| Piskel (piskel.com) | Pixel art creation | Free |
| Kenney.nl | Free game assets | Free |
| itch.io | Free game assets | Free |
| Leonardo.ai | AI background generation | Free tier |
| Canva | Rank badges + UI design | Free tier |
| Vercel or Railway | Deploy frontend + backend | Free tier |
| LinkedIn | Build in public | Free |

Total monthly cost: ₹0 (assuming you have Claude subscription)

---

## 10. The North Star Metric

One number tells us if Astram is working.

**North Star: Complete matches per week**

A complete match = two players started a game and one player won. Not started. Completed.

This matters because:
- If people complete matches, the core loop works
- If people don't complete matches, something is broken or boring
- Everything we build either increases this number or it doesn't

Secondary metrics (look at these only after North Star is healthy):
- Return rate: did the same player come back same day?
- Share rate: did someone send the link to a friend?
- Match duration: is it in the 5-12 minute target range?

---

## 11. The Unfair Advantages We Have

Never forget these. On hard days, read this section.

1. **You have the backend.** Most game developers cannot build a production-grade real-time WebSocket backend. You can. That's the hardest part of multiplayer games and you already know how.

2. **The theme is untouched.** Nobody has built this. Every competitor comparison fails because there is no competitor.

3. **You have AI as a co-founder.** Not as a tool. As a thinking partner available 24/7 who knows the entire codebase, PRD, and decisions log.

4. **Build in public compounds.** Every week you post, your audience grows. By week 10 when you launch, you have an audience waiting. Most developers launch to silence. You won't.

5. **You need zero budget.** Every tool is free. Every asset source is free. The only investment is time.

---

## 12. What Failure Looks Like (So We Avoid It)

| Failure Mode | Warning Sign | Prevention |
|---|---|---|
| Scope creep | Adding features not in PRD | Check PRD every Sunday. FUTURE.md for new ideas. |
| Perfectionism | Spending week 3 polishing week 1 work | Ship ugly. Polish in Phase 2. |
| Isolation | Not posting, not sharing | Saturday post is mandatory, not optional. |
| Burnout | Skipping multiple weekdays in a row | 1 hour minimum, not maximum. Protect the streak. |
| Pivot temptation | "What if we built X instead" | FUTURE.md. Read it in Week 11. |
| Dependency hell | Waiting on an asset/tool/decision | If blocked > 30 mins, open Claude immediately. |

---

*This document is the company constitution. Read it when things get hard.*
*Next action: Create the GitHub repository. Name it: astram*

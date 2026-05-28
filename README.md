# ASTRAM (अस्त्रम्) — 1v1 Archery Battle Engine 🏹

Astram is a real-time 1v1 turn-based multiplayer archery battle game set in the Mahabharat universe. Players select divine weapons (astras), manage turn-based tactical combat, and climb competitive ranked tiers from a Padatik foot soldier to a legendary Atirathi warrior.

## 🛠️ Technology Stack
- **Frontend Core:** Phaser.js (HTML5 Canvas Engine)
- **Backend Infrastructure:** Java 17 / Spring Boot 3.x (Authoritative Game Server)
- **Real-time Protocol:** STOMP over WebSockets (SockJS client fallback)
- **State & Storage:** PostgreSQL (Persistent User Data) + Redis (Session/Queue Management)

## 📁 Repository Architecture
```text
astram/
├── frontend/          # Phaser.js client source code
├── backend/           # Spring Boot WebSocket engine code
├── docs/              # System architecture, PRDs, and decision logs
│   ├── ASTRAM_PRD.md
│   └── ASTRAM_Operating_Model.md
├── assets/            # Game animations, audio, and pixel sprites
└── README.md          # Project roadmap and technical overview
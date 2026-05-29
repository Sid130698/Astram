import Phaser from 'phaser';

// ─── ANIMATION FRAME MAP (single horizontal strip) ───────────────
// Frame 0–4:   Idle  (5 frames)
// Frame 5–12:  Run   (8 frames)  — unused
// Frame 13–23: Fire  (11 frames)
// Frame 24–28: Hit   (5 frames)
// Frame 29–34: Death (6 frames)
const ANIM = {
    IDLE:    { start: 0,  end: 4  },
    FIRE:    { start: 13, end: 23 },
    RELEASE: { start: 18, end: 23 }, // just the release + follow-through
    HIT:     { start: 24, end: 28 },
    DEATH:   { start: 29, end: 34 }
};

const GRAVITY    = 600;
const LAUNCH_MUL = 4;
const ARROW_DELAY_MS = 180; // ms to wait before spawning arrow (sync with release frame)

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.isDragging    = false;
        this.player        = null;
        this.aimGraphics   = null;
        this.globalPointer = { x: 0, y: 0 };
        this.pendingVx     = 0;
        this.pendingVy     = 0;
    }

    // ─── PRELOAD ──────────────────────────────────────────────────
    preload() {
        this.load.image('background', '/battleground.png');

        this.load.spritesheet('archer', '/archer-assets/archer-yellow.png', {
            frameWidth:  64,
            frameHeight: 64
        });

        this.load.image('arrow', '/archer-assets/arrow.png');
    }

    // ─── CREATE ───────────────────────────────────────────────────
    create() {
        this.renderBackground();
        this.renderTitle();
        this.aimGraphics = this.add.graphics().setDepth(20);
        this.spawnPlayer();
        this.buildAnimations();
        this.wireInput();
    }

    // ─── UPDATE ───────────────────────────────────────────────────
    update() {
        this.children.getChildren().forEach(child => {
            if (child.getData?.('isArrow') && child.body) {
                child.setRotation(
                    Math.atan2(child.body.velocity.y, child.body.velocity.x)
                );
            }
        });
    }

    // ─── BACKGROUND ──────────────────────────────────────────────
    renderBackground() {
        this.add.image(400, 300, 'background')
            .setDisplaySize(800, 600)
            .setDepth(0);

        const vignette = this.add.graphics().setDepth(1);
        vignette.fillGradientStyle(
            0x000000, 0x000000, 0x000000, 0x000000,
            0, 0, 0.7, 0.7
        );
        vignette.fillRect(0, 430, 800, 170);
    }

    renderTitle() {
        this.add.text(400, 28, 'ASTRAM', {
            fontSize: '44px',
            fontFamily: 'Georgia, serif',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#FF6600', blur: 20, fill: true }
        }).setOrigin(0.5).setDepth(10);

        this.add.text(400, 74, '— Divine Archery Battle —', {
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: '#FFCC88',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);
    }

    // ─── PLAYER ──────────────────────────────────────────────────
    spawnPlayer() {
        this.player = this.physics.add.sprite(130, 460, 'archer')
            .setScale(2.2)
            .setDepth(5);
        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);
    }

    buildAnimations() {
        // Idle — loops forever
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('archer', ANIM.IDLE),
            frameRate: 6,
            repeat: -1
        });

        // Full fire — draw + release + follow through
        this.anims.create({
            key: 'fire',
            frames: this.anims.generateFrameNumbers('archer', ANIM.FIRE),
            frameRate: 14,
            repeat: 0
        });

        // Release only — just the second half of fire (used when releasing)
        this.anims.create({
            key: 'release',
            frames: this.anims.generateFrameNumbers('archer', ANIM.RELEASE),
            frameRate: 14,
            repeat: 0
        });

        // Hit reaction
        this.anims.create({
            key: 'hit',
            frames: this.anims.generateFrameNumbers('archer', ANIM.HIT),
            frameRate: 10,
            repeat: 0
        });

        // Return to idle after any one-shot animation
        this.player.on('animationcomplete', () => {
            this.player.play('idle');
        });

        this.player.play('idle');
    }

    // ─── INPUT ───────────────────────────────────────────────────
    wireInput() {
        this.input.on('pointerdown', (p) => {
            const dist = Phaser.Math.Distance.Between(
                p.x, p.y, this.player.x, this.player.y
            );
            if (dist < 120) {
                this.isDragging = true;
                // Show fully drawn bow pose — frame 17 is peak draw
                this.player.anims.stop();
                this.player.setFrame(17);
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.syncPointer(e.clientX, e.clientY);
            if (this.isDragging) this.drawArc(this.globalPointer);
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.syncPointer(e.clientX, e.clientY);
            this.release();
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            this.syncPointer(t.clientX, t.clientY);
            if (this.isDragging) this.drawArc(this.globalPointer);
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            const t = e.changedTouches[0];
            this.syncPointer(t.clientX, t.clientY);
            this.release();
        });
    }

    syncPointer(cx, cy) {
        const rect = this.sys.game.canvas.getBoundingClientRect();
        this.globalPointer.x = cx - rect.left;
        this.globalPointer.y = cy - rect.top;
    }

    release() {
        this.isDragging = false;
        this.aimGraphics.clear();
        this.shoot(this.globalPointer);
    }

    // ─── AIM ARC ─────────────────────────────────────────────────
    drawArc(pos) {
        this.aimGraphics.clear();

        const vx = (this.player.x - pos.x) * LAUNCH_MUL;
        const vy = (this.player.y - pos.y) * LAUNCH_MUL;

        // Only draw arc when pulling in valid shot direction
        if (vx < 0) return;

        const dt = 0.025;
        let x    = this.player.x;
        let y    = this.player.y;
        let pvx  = vx;
        let pvy  = vy;

        for (let i = 0; i < 40; i++) {
            x   += pvx * dt;
            y   += pvy * dt;
            pvy += GRAVITY * dt;

            if (y > 590 || x > 810 || x < -10) break;

            const alpha = 1 - i / 40;

            // Outer glow
            this.aimGraphics.fillStyle(0xFF8800, alpha * 0.3);
            this.aimGraphics.fillCircle(x, y, 7);

            // Core dot — dashed feel
            if (i % 2 === 0) {
                this.aimGraphics.fillStyle(0xFFFFFF, alpha);
                this.aimGraphics.fillCircle(x, y, 4);
            }
        }

        // Power ring around archer
        const dragDist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, pos.x, pos.y
        );
        const power = Math.min(dragDist / 200, 1);
        const ringColor = power < 0.4  ? 0x00FF88
            : power < 0.75 ? 0xFFAA00
                : 0xFF2200;

        this.aimGraphics.lineStyle(2, ringColor, 0.85);
        this.aimGraphics.strokeCircle(
            this.player.x, this.player.y,
            28 + power * 35
        );
    }

    // ─── SHOOT ───────────────────────────────────────────────────
    shoot(pos) {
        const vx = (this.player.x - pos.x) * LAUNCH_MUL;
        const vy = (this.player.y - pos.y) * LAUNCH_MUL;

        // Ignore accidental taps
        if (vx < 20) {
            this.player.play('idle');
            return;
        }

        // Store velocity for delayed arrow spawn
        this.pendingVx = vx;
        this.pendingVy = vy;

        // Play release animation immediately (starts from peak draw frame)
        this.player.play('release');

        // Spawn arrow after delay — syncs with visual release frame
        this.time.delayedCall(ARROW_DELAY_MS, () => {
            this.spawnArrow(this.pendingVx, this.pendingVy);
        });
    }

    spawnArrow(vx, vy) {
        const arrow = this.physics.add.image(
            this.player.x + 30,
            this.player.y - 10,
            'arrow'
        ).setDepth(7).setScale(1.5);

        arrow.setVelocity(vx, vy);
        arrow.setData('isArrow', true);

        // Fire trail
        this.time.addEvent({
            delay: 18,
            repeat: 25,
            callback: () => {
                if (!arrow.active) return;
                const trail = this.add.graphics().setDepth(6);
                trail.fillStyle(0xFF6600, 0.35);
                trail.fillCircle(arrow.x, arrow.y, 5);
                this.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 250,
                    onComplete: () => trail.destroy()
                });
            }
        });

        // Auto-destroy after 3.5s
        this.time.delayedCall(3500, () => {
            if (arrow?.active) arrow.destroy();
        });
    }
}

// ─── GAME CONFIG ─────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#0a0800',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY },
            debug: false
        }
    },
    scene: GameScene
};

new Phaser.Game(config);
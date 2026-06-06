import Phaser from 'phaser';

// ─── ANIMATION FRAME MAP (single horizontal strip) ───────────────
const ANIM = {
    IDLE:    { start: 0,  end: 4  },
    FIRE:    { start: 13, end: 23 },
    RELEASE: { start: 18, end: 23 },
    HIT:     { start: 24, end: 28 },
    DEATH:   { start: 29, end: 34 }
};

const GRAVITY        = 600;
const LAUNCH_MUL = 4;
const ARROW_DELAY_MS = 180;
const GROUND_Y_LEVEL = 530; // The coordinate where the player's feet rest
const PLAYER_TEXTURE_KEY = 'archer';
const ENEMY_TEXTURE_KEY = 'archer-enemy';
const ENEMY_HITBOX = { width: 28, height: 44, offsetX: 18, offsetY: 12 };
const ARROW_HITBOX = { width: 14, height: 5, offsetX: 8, offsetY: 8 };
const ARROW_HIT_LINGER_MS = 180;
const ARROW_HIT_EMBED_PX = 10;

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.isDragging    = false;
        this.isPlayerTurn  = true;
        this.player        = null;
        this.enemy         = null;
        this.playerHp      = 100;
        this.enemyHp       = 100;
        this.isMatchOver   = false;
        this.aimGraphics   = null;
        this.hudGraphics   = null;
        this.turnIndicator = null;
        this.matchOverlay  = null;
        this.matchResultText = null;
        this.groundGroup   = null;
        this.globalPointer = { x: 0, y: 0 };
        this.pendingVx     = 0;
        this.pendingVy     = 0;
        this.handleMouseMove = null;
        this.handleMouseUp = null;
        this.handleTouchMove = null;
        this.handleTouchEnd = null;
    }

    // ─── LIFECYCLE HOOKS ──────────────────────────────────────────
    preload() {
        this.load.image('background', '/battleground.png');
        this.load.image('arrow', '/archer-assets/arrow.png');
        this.load.spritesheet(PLAYER_TEXTURE_KEY, '/archer-assets/archer-yellow.png', {
            frameWidth:  64,
            frameHeight: 64
        });
        this.load.spritesheet(ENEMY_TEXTURE_KEY, '/archer-assets/GandalfHardcore Archer red sheet.png', {
            frameWidth:  64,
            frameHeight: 64
        });
    }

    create() {
        this.initializeEnvironment();
        this.initializeActors();
        this.initializePhysicsBoundaries();
        this.initializeAnimations();
        this.initializeHud();
        this.initializeInputPipeline();
    }

    update() {
        this.executeRealTimeRotations();
    }

    // ==========================================
    // 1. SUB-SYSTEM INITIALIZATION MODULES
    // ==========================================

    initializeEnvironment() {
        // Render background scene
        this.add.image(400, 300, 'background')
            .setDisplaySize(800, 600)
            .setDepth(0);

        // Lower vignette layout shading
        const vignette = this.add.graphics().setDepth(1);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.7, 0.7);
        vignette.fillRect(0, 430, 800, 170);

        // Render typography headers
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

    initializeActors() {
        this.player = this.physics.add.sprite(130, 460, PLAYER_TEXTURE_KEY)
            .setScale(2.2)
            .setDepth(5);
        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);

        this.enemy = this.physics.add.sprite(670, 460, ENEMY_TEXTURE_KEY)
            .setScale(2.2)
            .setFlipX(true)
            .setDepth(5);
        this.enemy.body.setAllowGravity(false);
        this.enemy.setCollideWorldBounds(true);
        this.enemy.body.setSize(ENEMY_HITBOX.width, ENEMY_HITBOX.height);
        this.enemy.body.setOffset(ENEMY_HITBOX.offsetX, ENEMY_HITBOX.offsetY);
    }

    initializePhysicsBoundaries() {
        // Initialize dynamic aiming vector overlay graphics context
        this.aimGraphics = this.add.graphics().setDepth(20);

        // Programmatically generate our localized lower landing plane boundary
        this.groundGroup = this.physics.add.staticGroup();
        let groundLine = this.add.rectangle(400, GROUND_Y_LEVEL, 800, 10, 0x000000, 0);
        this.groundGroup.add(groundLine);
    }

    initializeHud() {
        this.hudGraphics = this.add.graphics().setDepth(15);
        this.renderHealthBars();
        this.initializeTurnIndicator();
        this.initializeMatchOverlay();
    }

    initializeTurnIndicator() {
        this.turnIndicator = this.add.graphics().setDepth(16);
        this.updateTurnIndicator();
    }

    initializeMatchOverlay() {
        this.matchOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.72)
            .setDepth(40)
            .setVisible(false);

        this.matchResultText = this.add.text(400, 300, '', {
            fontSize: '76px',
            fontFamily: 'Georgia, serif',
            color: '#FFE2A8',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(41).setVisible(false);
    }

    initializeAnimations() {
        this.anims.create({
            key: 'player-idle',
            frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, ANIM.IDLE),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'player-fire',
            frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, ANIM.FIRE),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'player-release',
            frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, ANIM.RELEASE),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'player-hit',
            frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, ANIM.HIT),
            frameRate: 10,
            repeat: 0
        });

        this.anims.create({
            key: 'enemy-idle',
            frames: this.anims.generateFrameNumbers(ENEMY_TEXTURE_KEY, ANIM.IDLE),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'enemy-hit',
            frames: this.anims.generateFrameNumbers(ENEMY_TEXTURE_KEY, ANIM.HIT),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'enemy-death',
            frames: this.anims.generateFrameNumbers(ENEMY_TEXTURE_KEY, ANIM.DEATH),
            frameRate: 10,
            repeat: 0
        });

        // Lifecycle hook to cycle animation sequences gracefully back to idle state
        this.player.on('animationcomplete', () => {
            this.player.play('player-idle');
        });

        this.enemy.on('animationcomplete', (animation) => {
            if (animation.key === 'enemy-hit') {
                this.enemy.play('enemy-idle');
            }

            if (animation.key === 'enemy-death') {
                this.enemy.anims.stop();
                this.enemy.setFrame(ANIM.DEATH.end);
            }
        });

        this.player.play('player-idle');
        this.enemy.play('enemy-idle');
    }

    renderHealthBars() {
        const barWidth = 220;
        const barHeight = 22;
        const fillInset = 4;
        const leftBarX = 36;
        const rightBarX = 800 - leftBarX - barWidth;
        const barY = 24;
        const playerFillWidth = (barWidth - fillInset * 2) * Phaser.Math.Clamp(this.playerHp / 100, 0, 1);
        const enemyFillWidth = (barWidth - fillInset * 2) * Phaser.Math.Clamp(this.enemyHp / 100, 0, 1);

        this.hudGraphics.clear();

        this.drawHealthBar(leftBarX, barY, barWidth, barHeight, playerFillWidth, 0xFFD54A);
        this.drawHealthBar(rightBarX, barY, barWidth, barHeight, enemyFillWidth, 0xD94B4B);
    }

    drawHealthBar(x, y, width, height, fillWidth, fillColor) {
        this.hudGraphics.fillStyle(0x120b08, 0.92);
        this.hudGraphics.fillRoundedRect(x, y, width, height, 6);
        this.hudGraphics.lineStyle(2, 0x3c2618, 1);
        this.hudGraphics.strokeRoundedRect(x, y, width, height, 6);

        this.hudGraphics.fillStyle(fillColor, 1);
        this.hudGraphics.fillRoundedRect(x + 4, y + 4, fillWidth, height - 8, 4);
    }

    updateTurnIndicator() {
        if (!this.turnIndicator) return;

        const activeActor = this.isPlayerTurn ? this.player : this.enemy;
        if (!activeActor) return;

        this.turnIndicator.clear();
        const ringX = activeActor.x + (this.isPlayerTurn ? -12 : 12);
        const ringY = activeActor.y + 84;

        this.turnIndicator.fillStyle(0xffd54a, 0.18);
        this.turnIndicator.lineStyle(3, 0xffd54a, 0.95);
        this.turnIndicator.fillEllipse(ringX, ringY, 96, 18);
        this.turnIndicator.strokeEllipse(ringX, ringY, 96, 18);
        this.turnIndicator.lineStyle(1.5, 0xfff1b8, 0.8);
        this.turnIndicator.strokeEllipse(ringX, ringY, 68, 10);

        if (this.player && this.enemy) {
            this.player.setAlpha(this.isPlayerTurn ? 1 : 0.78);
            this.enemy.setAlpha(this.isPlayerTurn ? 0.78 : 1);
        }
    }

    // ==========================================
    // 2. INPUT HANDLERS & TRACKING ENGINE
    // ==========================================

    initializeInputPipeline() {
        this.input.on('pointerdown', this.handlePointerDown, this);

        // Bind global browser mouse event proxies to calculate off-canvas coordinates
        this.handleMouseMove = (e) => this.processDragMovement(e.clientX, e.clientY);
        this.handleMouseUp = (e) => this.processDragTermination(e.clientX, e.clientY);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);

        // Register tracking rules for cross-platform mobile surface gestures
        this.handleTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.processDragMovement(touch.clientX, touch.clientY);
        };
        window.addEventListener('touchmove', this.handleTouchMove, { passive: false });

        this.handleTouchEnd = (e) => {
            if (!this.isDragging) return;
            const touch = e.changedTouches[0];
            this.processDragTermination(touch.clientX, touch.clientY);
        };
        window.addEventListener('touchend', this.handleTouchEnd);
    }

    deactivateGlobalInputListeners() {
        if (this.handleMouseMove) {
            window.removeEventListener('mousemove', this.handleMouseMove);
            this.handleMouseMove = null;
        }

        if (this.handleMouseUp) {
            window.removeEventListener('mouseup', this.handleMouseUp);
            this.handleMouseUp = null;
        }

        if (this.handleTouchMove) {
            window.removeEventListener('touchmove', this.handleTouchMove);
            this.handleTouchMove = null;
        }

        if (this.handleTouchEnd) {
            window.removeEventListener('touchend', this.handleTouchEnd);
            this.handleTouchEnd = null;
        }
    }

    synchronizeCoordinates(clientX, clientY) {
        const bounds = this.sys.game.canvas.getBoundingClientRect();
        this.globalPointer.x = clientX - bounds.left;
        this.globalPointer.y = clientY - bounds.top;
    }

    handlePointerDown(pointer) {
        if (!this.isPlayerTurn || this.isMatchOver) return;

        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
        if (distance < 120) {
            this.isDragging = true;
            this.player.anims.stop();
            this.player.setFrame(17); // Snaps immediately to structural peak draw posture frame
        }
    }

    processDragMovement(clientX, clientY) {
        if (!this.isDragging || this.isMatchOver) return;
        this.synchronizeCoordinates(clientX, clientY);
        this.calculateAimTrajectory(this.globalPointer);
    }

    processDragTermination(clientX, clientY) {
        if (!this.isDragging || this.isMatchOver) return;
        this.synchronizeCoordinates(clientX, clientY);
        this.isDragging = false;
        this.aimGraphics.clear();
        this.executeLaunchSequence(this.globalPointer);
    }

    // ==========================================
    // 3. GRAPHICS LAYER RENDERING OPERATIONS
    // ==========================================

    calculateAimTrajectory(pos) {
        this.aimGraphics.clear();

        const vx = (this.player.x - pos.x) * LAUNCH_MUL;
        const vy = (this.player.y - pos.y) * LAUNCH_MUL;

        if (vx < 0) return; // Prevent inverse firing mechanics toward the left edge boundary

        const dt = 0.025;
        let projectX = this.player.x;
        let projectY = this.player.y;
        let runningVx = vx;
        let runningVy = vy;

        // Render parabolic simulation track preview
        for (let i = 0; i < 40; i++) {
            projectX += runningVx * dt;
            projectY += runningVy * dt;
            runningVy += GRAVITY * dt;

            if (projectY > 590 || projectX > 810 || projectX < -10) break;

            const alpha = 1 - i / 40;
            this.aimGraphics.fillStyle(0xFF8800, alpha * 0.3);
            this.aimGraphics.fillCircle(projectX, projectY, 7);

            if (i % 2 === 0) {
                this.aimGraphics.fillStyle(0xFFFFFF, alpha);
                this.aimGraphics.fillCircle(projectX, projectY, 4);
            }
        }

        this.renderTensionRing(pos);
    }

    renderTensionRing(pos) {
        const dragDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pos.x, pos.y);
        const powerRatio = Math.min(dragDistance / 200, 1);
        const ringColor = powerRatio < 0.4 ? 0x00FF88 : powerRatio < 0.75 ? 0xFFAA00 : 0xFF2200;

        this.aimGraphics.lineStyle(2, ringColor, 0.85);
        this.aimGraphics.strokeCircle(this.player.x, this.player.y, 28 + powerRatio * 35);
    }

    // ==========================================
    // 4. LAUNCH EXECUTION & IMPACT COLLISIONS
    // ==========================================

    executeLaunchSequence(pos) {
        const vx = (this.player.x - pos.x) * LAUNCH_MUL;
        const vy = (this.player.y - pos.y) * LAUNCH_MUL;

        if (vx < 20) {
            this.player.play('player-idle');
            return;
        }

        this.pendingVx = vx;
        this.pendingVy = vy;
        this.player.play('player-release');

        // Delay arrow generation to perfectly sync up with animation timing frame loops
        this.time.delayedCall(ARROW_DELAY_MS, () => {
            this.instantiateArrowProjectile(this.pendingVx, this.pendingVy);
        });
    }

    instantiateArrowProjectile(vx, vy) {
        const arrow = this.physics.add.image(this.player.x + 30, this.player.y - 10, 'arrow')
            .setDepth(7)
            .setScale(1.5);

        arrow.body.setSize(ARROW_HITBOX.width, ARROW_HITBOX.height);
        arrow.body.setOffset(ARROW_HITBOX.offsetX, ARROW_HITBOX.offsetY);
        arrow.setVelocity(vx, vy);
        arrow.setData('isArrow', true);

        // Register localized terrain contact logic
        this.registerGroundImpactCollider(arrow);
        this.registerEnemyHitOverlap(arrow);

        this.spawnParticleTrail(arrow);

        // Automatic engine trash-collector fallback cleanup (3.5 seconds boundary max)
        this.time.delayedCall(3500, () => {
            if (arrow && arrow.active) arrow.destroy();
        });
    }

    registerGroundImpactCollider(arrowInstance) {
        this.physics.add.collider(arrowInstance, this.groundGroup, (arrowObj) => {
            // Freeze positions instantaneously on contact
            arrowObj.body.setVelocity(0, 0);
            arrowObj.body.setAngularVelocity(0);
            arrowObj.body.setAllowGravity(false);

            // Terminate engine computational transformations on this specific body container
            arrowObj.body.enable = false;

            // Clear configuration data tags so the dynamic frame calculations ignore it
            arrowObj.setData('isArrow', false);
        });
    }

    registerEnemyHitOverlap(arrowInstance) {
        this.physics.add.overlap(arrowInstance, this.enemy, (arrowObj, enemyObj) => {
            if (!arrowObj.active || !enemyObj.active) return;

            const impactVelocity = new Phaser.Math.Vector2(arrowObj.body.velocity.x, arrowObj.body.velocity.y);
            const embedDirection = impactVelocity.lengthSq() > 0
                ? impactVelocity.normalize()
                : new Phaser.Math.Vector2(1, 0);

            arrowObj.body.setVelocity(0, 0);
            arrowObj.body.setAngularVelocity(0);
            arrowObj.body.setAllowGravity(false);
            arrowObj.body.enable = false;
            arrowObj.x += embedDirection.x * ARROW_HIT_EMBED_PX;
            arrowObj.y += embedDirection.y * ARROW_HIT_EMBED_PX;
            arrowObj.setData('isArrow', false);
            this.applyDamageToEnemy(10);

            this.time.delayedCall(ARROW_HIT_LINGER_MS, () => {
                if (arrowObj?.active) arrowObj.destroy();
            });
        });
    }

    applyDamageToEnemy(damageAmount) {
        if (this.enemyHp <= 0) return;

        this.enemyHp = Math.max(0, this.enemyHp - damageAmount);
        this.renderHealthBars();
        this.evaluateMatchEnd();

        if (this.enemyHp === 0) {
            this.enemy.anims.stop();
            this.enemy.clearTint();
            this.enemy.play('enemy-death', true);
            return;
        }

        this.enemy.anims.stop();
        this.enemy.play('enemy-hit', true);
        this.enemy.setTint(0xffd2d2);
        this.time.delayedCall(120, () => {
            if (this.enemy?.active) this.enemy.clearTint();
        });
    }

    evaluateMatchEnd() {
        if (this.isMatchOver) return;

        if (this.enemyHp <= 0) {
            this.endMatch('VICTORY', '#FFD54A');
            return;
        }

        if (this.playerHp <= 0) {
            this.endMatch('DEFEAT', '#FF8A7A');
        }
    }

    endMatch(resultText, textColor) {
        this.isMatchOver = true;
        this.isDragging = false;
        this.isPlayerTurn = false;
        this.aimGraphics.clear();
        this.turnIndicator.clear();

        if (this.player) this.player.setAlpha(1);
        if (this.enemy) this.enemy.setAlpha(1);

        this.input.off('pointerdown', this.handlePointerDown, this);
        this.deactivateGlobalInputListeners();
        this.physics.pause();

        this.matchOverlay.setVisible(true);
        this.matchResultText
            .setText(resultText)
            .setColor(textColor)
            .setVisible(true);
    }

    spawnParticleTrail(arrowInstance) {
        this.time.addEvent({
            delay: 18,
            repeat: 25,
            callback: () => {
                if (!arrowInstance.active || !arrowInstance.body || arrowInstance.body.enable === false) return;

                const trail = this.add.graphics().setDepth(6);
                trail.fillStyle(0xFF6600, 0.35);
                trail.fillCircle(arrowInstance.x, arrowInstance.y, 5);

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
    }

    executeRealTimeRotations() {
        this.children.getChildren().forEach(child => {
            if (child.getData?.('isArrow') && child.body) {
                child.setRotation(Math.atan2(child.body.velocity.y, child.body.velocity.x));
            }
        });
    }
}

// ─── STABLE CORE APPLICATION FRAMEWORK PROPERTIES ─────────────────
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

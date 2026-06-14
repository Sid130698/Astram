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
const PLAYER_HITBOX = { width: 22, height: 38, offsetX: 21, offsetY: 16 };
const ENEMY_HITBOX = { width: 22, height: 38, offsetX: 21, offsetY: 16 };
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
        this.frozenArrows  = [];
        this.activeVolleyArrows = 0;
        this.isInputLocked = false;
        this.isVolleyInFlight = false;
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
        this.player.body.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);
        this.player.body.setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);

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
        this.startPlanningRound();
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
            key: 'player-death',
            frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, ANIM.DEATH),
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
            key: 'enemy-release',
            frames: this.anims.generateFrameNumbers(ENEMY_TEXTURE_KEY, ANIM.RELEASE),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'enemy-death',
            frames: this.anims.generateFrameNumbers(ENEMY_TEXTURE_KEY, ANIM.DEATH),
            frameRate: 10,
            repeat: 0
        });

        this.player.on('animationcomplete', (animation) => {
            if (animation.key === 'player-death') {
                this.player.anims.stop();
                this.player.setFrame(ANIM.DEATH.end);
                return;
            }

            this.player.play('player-idle');
        });

        this.enemy.on('animationcomplete', (animation) => {
            if (animation.key === 'enemy-hit') {
                this.enemy.play('enemy-idle');
                return;
            }

            if (animation.key === 'enemy-death') {
                this.enemy.anims.stop();
                this.enemy.setFrame(ANIM.DEATH.end);
                return;
            }

            this.enemy.play('enemy-idle');
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

        if (this.isVolleyInFlight) {
            this.turnIndicator.clear();
            if (this.player) this.player.setAlpha(1);
            if (this.enemy) this.enemy.setAlpha(1);
            return;
        }

        if (this.hasShotQueuedForCurrentTurn()) {
            this.turnIndicator.clear();
            if (this.player) this.player.setAlpha(this.hasQueuedShotForActor(true) ? 0.82 : 1);
            if (this.enemy) this.enemy.setAlpha(this.hasQueuedShotForActor(false) ? 0.82 : 1);
            return;
        }

        const activeActor = this.getActiveActor();
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
        if (this.isMatchOver || this.isInputLocked || this.isVolleyInFlight) return;

        const activeActor = this.getActiveActor();
        if (!activeActor || this.hasShotQueuedForCurrentTurn()) return;

        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, activeActor.x, activeActor.y);
        if (distance < 120) {
            this.isDragging = true;
            activeActor.anims.stop();
            activeActor.setFrame(17);
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

        const activeActor = this.getActiveActor();
        if (!activeActor) return;

        const { vx, vy } = this.getLaunchVelocity(activeActor, pos);

        if (!this.isLaunchDirectionValid(vx)) return;

        const dt = 0.025;
        let projectX = activeActor.x;
        let projectY = activeActor.y;
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

        this.renderTensionRing(activeActor, pos);
    }

    renderTensionRing(actor, pos) {
        const dragDistance = Phaser.Math.Distance.Between(actor.x, actor.y, pos.x, pos.y);
        const powerRatio = Math.min(dragDistance / 200, 1);
        const ringColor = powerRatio < 0.4 ? 0x00FF88 : powerRatio < 0.75 ? 0xFFAA00 : 0xFF2200;

        this.aimGraphics.lineStyle(2, ringColor, 0.85);
        this.aimGraphics.strokeCircle(actor.x, actor.y, 28 + powerRatio * 35);
    }

    // ==========================================
    // 4. LAUNCH EXECUTION & IMPACT COLLISIONS
    // ==========================================

    executeLaunchSequence(pos) {
        const shooter = this.getActiveActor();
        if (!shooter) return;

        const shooterIsPlayer = this.isPlayerTurn;
        const { vx, vy } = this.getLaunchVelocity(shooter, pos);

        if (!this.isLaunchDirectionValid(vx)) {
            shooter.play(this.getAnimationKey(shooterIsPlayer, 'idle'));
            return;
        }

        this.isInputLocked = true;
        shooter.play(this.getAnimationKey(shooterIsPlayer, 'release'));

        this.time.delayedCall(ARROW_DELAY_MS, () => {
            this.queueFrozenArrow(shooterIsPlayer, vx, vy);
        });
    }

    instantiateArrowProjectile(shooterIsPlayer, vx, vy, freezeOnSpawn = false) {
        const shooter = shooterIsPlayer ? this.player : this.enemy;
        const arrowStartX = shooter.x + (shooterIsPlayer ? 30 : -30);
        const arrow = this.physics.add.image(arrowStartX, shooter.y - 10, 'arrow')
            .setDepth(7)
            .setScale(1.5);

        arrow.body.setSize(ARROW_HITBOX.width, ARROW_HITBOX.height);
        arrow.body.setOffset(ARROW_HITBOX.offsetX, ARROW_HITBOX.offsetY);
        arrow.setData('launchVx', vx);
        arrow.setData('launchVy', vy);
        arrow.setData('hasResolved', false);
        arrow.setData('isArrow', true);
        arrow.setData('isLaunched', !freezeOnSpawn);
        arrow.setData('ownerIsPlayer', shooterIsPlayer);
        arrow.setRotation(Math.atan2(vy, vx));

        if (freezeOnSpawn) {
            arrow.body.setAllowGravity(false);
            arrow.setVelocity(0, 0);
        } else {
            arrow.body.setAllowGravity(true);
            arrow.setVelocity(vx, vy);
        }

        this.registerGroundImpactCollider(arrow);
        this.registerTargetHitOverlap(arrow, shooterIsPlayer);
        this.spawnParticleTrail(arrow);

        return arrow;
    }

    queueFrozenArrow(shooterIsPlayer, vx, vy) {
        const arrow = this.instantiateArrowProjectile(shooterIsPlayer, vx, vy, true);
        this.frozenArrows.push(arrow);
        this.isDragging = false;
        this.isInputLocked = false;

        if (this.frozenArrows.length === 1) {
            this.isPlayerTurn = false;
            this.updateTurnIndicator();
            return;
        }

        this.releaseQueuedShots();
    }

    releaseQueuedShots() {
        if (this.isVolleyInFlight || this.isMatchOver) return;

        const volleyArrows = this.frozenArrows.filter((arrow) => arrow?.active && arrow.body);

        if (volleyArrows.length === 0) {
            this.startPlanningRound();
            return;
        }

        this.isVolleyInFlight = true;
        this.isInputLocked = true;
        this.isDragging = false;
        this.activeVolleyArrows = volleyArrows.length;
        this.aimGraphics.clear();
        this.updateTurnIndicator();

        volleyArrows.forEach((arrow) => {
            const shooterIsPlayer = arrow.getData('ownerIsPlayer');
            const shooter = shooterIsPlayer ? this.player : this.enemy;
            shooter.play(this.getAnimationKey(shooterIsPlayer, 'release'));
        });

        this.time.delayedCall(ARROW_DELAY_MS, () => {
            volleyArrows.forEach((arrow) => {
                if (!arrow?.active || !arrow.body) {
                    this.markArrowResolved();
                    return;
                }

                arrow.setData('isLaunched', true);
                arrow.body.setAllowGravity(true);
                arrow.setVelocity(arrow.getData('launchVx'), arrow.getData('launchVy'));

                this.time.delayedCall(3500, () => {
                    if (arrow?.active) this.resolveArrow(arrow, 0, true);
                });
            });

            this.frozenArrows = [];
        });
    }

    registerGroundImpactCollider(arrowInstance) {
        this.physics.add.collider(arrowInstance, this.groundGroup, (arrowObj) => {
            arrowObj.body.setVelocity(0, 0);
            arrowObj.body.setAngularVelocity(0);
            arrowObj.body.setAllowGravity(false);
            arrowObj.body.enable = false;
            arrowObj.setData('isArrow', false);
            this.resolveArrow(arrowObj, 350, false);
        });
    }

    registerTargetHitOverlap(arrowInstance, shooterIsPlayer) {
        const target = shooterIsPlayer ? this.enemy : this.player;
        this.physics.add.overlap(arrowInstance, target, (arrowObj, targetObj) => {
            if (!arrowObj.active || !targetObj.active) return;

            const impactVelocity = new Phaser.Math.Vector2(arrowObj.body.velocity.x, arrowObj.body.velocity.y);
            const embedDirection = impactVelocity.lengthSq() > 0
                ? impactVelocity.normalize()
                : new Phaser.Math.Vector2(shooterIsPlayer ? 1 : -1, 0);

            arrowObj.body.setVelocity(0, 0);
            arrowObj.body.setAngularVelocity(0);
            arrowObj.body.setAllowGravity(false);
            arrowObj.body.enable = false;
            arrowObj.x += embedDirection.x * ARROW_HIT_EMBED_PX;
            arrowObj.y += embedDirection.y * ARROW_HIT_EMBED_PX;
            arrowObj.setData('isArrow', false);
            if (shooterIsPlayer) {
                this.applyDamageToEnemy(10);
            } else {
                this.applyDamageToPlayer(10);
            }

            this.resolveArrow(arrowObj, ARROW_HIT_LINGER_MS, false);
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

    applyDamageToPlayer(damageAmount) {
        if (this.playerHp <= 0) return;

        this.playerHp = Math.max(0, this.playerHp - damageAmount);
        this.renderHealthBars();
        this.evaluateMatchEnd();

        if (this.playerHp === 0) {
            this.player.anims.stop();
            this.player.clearTint();
            this.player.play('player-death', true);
            return;
        }

        this.player.anims.stop();
        this.player.play('player-hit', true);
        this.player.setTint(0xffd2d2);
        this.time.delayedCall(120, () => {
            if (this.player?.active) this.player.clearTint();
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
        this.isInputLocked = true;
        this.isVolleyInFlight = false;
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
                if (!arrowInstance.getData('isLaunched')) return;

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

    getActiveActor() {
        return this.isPlayerTurn ? this.player : this.enemy;
    }

    hasShotQueuedForCurrentTurn() {
        return this.hasQueuedShotForActor(this.isPlayerTurn);
    }

    hasQueuedShotForActor(actorIsPlayer) {
        return this.frozenArrows.some((arrow) => (
            arrow?.active &&
            arrow.getData('ownerIsPlayer') === actorIsPlayer &&
            !arrow.getData('hasResolved')
        ));
    }

    getLaunchVelocity(actor, pos) {
        return {
            vx: (actor.x - pos.x) * LAUNCH_MUL,
            vy: (actor.y - pos.y) * LAUNCH_MUL
        };
    }

    isLaunchDirectionValid(vx) {
        return this.isPlayerTurn ? vx > 20 : vx < -20;
    }

    getAnimationKey(shooterIsPlayer, state) {
        const actorPrefix = shooterIsPlayer ? 'player' : 'enemy';
        return `${actorPrefix}-${state}`;
    }

    startPlanningRound() {
        if (this.isMatchOver) return;

        this.frozenArrows = [];
        this.isPlayerTurn = true;
        this.isInputLocked = false;
        this.isVolleyInFlight = false;
        this.isDragging = false;
        this.updateTurnIndicator();
    }

    resolveArrow(arrow, destroyDelay = 0, destroyImmediately = false) {
        if (!arrow || arrow.getData('hasResolved')) return;

        arrow.setData('hasResolved', true);
        this.markArrowResolved();

        if (destroyImmediately) {
            arrow.destroy();
            return;
        }

        this.time.delayedCall(destroyDelay, () => {
            if (arrow?.active) arrow.destroy();
        });
    }

    markArrowResolved() {
        if (!this.isVolleyInFlight) return;

        this.activeVolleyArrows = Math.max(0, this.activeVolleyArrows - 1);
        if (this.activeVolleyArrows > 0 || this.isMatchOver) return;

        this.time.delayedCall(250, () => {
            if (this.isMatchOver) return;
            this.startPlanningRound();
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

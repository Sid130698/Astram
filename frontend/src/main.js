import Phaser from 'phaser';
import { handleBrahmastraCollision } from './brahmastra.js';

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
const AGNEYASTRA_FRAME_COUNT = 28;
const AGNEYASTRA_FRAME_KEY_PREFIX = 'agneyastra-fireball-';
const GROUND_Y_LEVEL = 530; // The coordinate where the player's feet rest
const PLAYER_TEXTURE_KEY = 'archer';
const ENEMY_TEXTURE_KEY = 'archer-enemy';
const PLAYER_HITBOX = { width: 22, height: 38, offsetX: 21, offsetY: 16 };
const ENEMY_HITBOX = { width: 22, height: 38, offsetX: 21, offsetY: 16 };
const ARROW_HITBOX = { width: 21, height: 8, offsetX: 8, offsetY: 8 };
const AGNEYASTRA_HITBOX = { width: 78, height: 36, offsetX: 68, offsetY: 40 };
const BRAHMASTRA_HITBOX = { width: 90, height: 44, offsetX: 68, offsetY: 40 };
const ARROW_HIT_LINGER_MS = 180;
const ARROW_HIT_EMBED_PX = 10;
const COLLISION_WINNER_SPEED_RETENTION = 1.0;
const KNOCKBACK_RESTORE_MS = 240;
const PROJECTILE_CONFIG = {
    arrow: {
        label: 'Arrow',
        damage: 20,
        power: 20,
        ammo: null,
        tint: 0xffffff,
        scale: 2.25,
        trailColor: 0xff6600
    },
    agneyastra: {
        label: 'Agneyastra',
        damage: 50,
        power: 50,
        ammo: 3,
        tint: 0xffffff,
        scale: 0.55,
        trailColor: 0xffa347
    },
    brahmastra: {
        label: 'Brahma',
        damage: 9999,
        power: 9999,
        ammo: 1,
        tint: 0x99ccff,
        scale: 0.8,
        trailColor: 0x66bbff
    }
};

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
        this.selectionButtons = [];
        this.selectionTitle = null;
        this.matchOverlay  = null;
        this.matchResultText = null;
        this.damageFlashOverlay = null;
        this.groundGroup   = null;
        this.arrowGroup    = null;
        this.globalPointer = { x: 0, y: 0 };
        this.queuedShots   = { player: null, enemy: null };
        this.selectedProjectile = { player: 'arrow', enemy: 'arrow' };
        this.remainingAmmo = { player: { agneyastra: 3, brahmastra: 1 }, enemy: { agneyastra: 3, brahmastra: 1 } };
        this.roundNumber = 0;
        this.activeVolleyArrows = 0;
        this.isInputLocked = false;
        this.isVolleyInFlight = false;
        this.handleMouseMove = null;
        this.handleMouseUp = null;
        this.handleTouchMove = null;
        this.handleTouchEnd = null;
        this.isHitStopActive = false;
    }

    // ─── LIFECYCLE HOOKS ──────────────────────────────────────────
    preload() {
        this.load.image('background', '/battleground.png');
        this.load.image('arrow', '/archer-assets/arrow.png');
        for (let frame = 1; frame <= AGNEYASTRA_FRAME_COUNT; frame++) {
            const paddedFrame = String(frame).padStart(2, '0');
            this.load.image(
                `${AGNEYASTRA_FRAME_KEY_PREFIX}${paddedFrame}`,
                `/agneyastra/fireball/Effects_Fire_0_${paddedFrame}.png`
            );
        }
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

    calculateSmartAIAim() {
        const dx = this.player.x - this.enemy.x;
        const dy = this.player.y - this.enemy.y;
        
        // Choose a random arch height/vy
        const vy = -Phaser.Math.Between(250, 500);
        
        // dy = vy * t + 0.5 * g * t^2
        // 0.5*g*t^2 + vy*t - dy = 0
        const a = 0.5 * GRAVITY;
        const b = vy;
        const c = -dy;
        
        // quadratic formula
        const discriminant = b*b - 4*a*c;
        let t = 1; // fallback
        if (discriminant > 0) {
            t = (-b + Math.sqrt(discriminant)) / (2 * a);
        }
        
        // add difficulty-based error
        let hitChance = 0.4;
        let weaponUseChance = { agneyastra: 0.1, brahmastra: 0.05 };
        const difficulty = window.aiDifficulty || 'medium';
        
        switch (difficulty) {
            case 'easy': 
                hitChance = 0.1; // poor aim (~10% hit rate)
                weaponUseChance = { agneyastra: 0.05, brahmastra: 0 };
                break;
            case 'medium': 
                hitChance = 0.4; // 2/5 arrows will hit
                weaponUseChance = { agneyastra: 0.3, brahmastra: 0.2 };
                break;
            case 'hard': 
                hitChance = 0.6; // 3/5 arrows will hit
                weaponUseChance = { agneyastra: 0.5, brahmastra: 0.4 };
                break;
            case 'hardest': 
                hitChance = 1.0; // 5/5 arrows will hit (100%)
                weaponUseChance = { agneyastra: 0.8, brahmastra: 0.9 };
                break;
        }
        
        let errorMargin = 0;
        const willHit = Math.random() < hitChance;
        
        if (!willHit) {
            // Pick an error margin that guarantees a miss (either overshoot or undershoot)
            const isOvershoot = Math.random() > 0.5;
            if (isOvershoot) {
                // Shoot past the player
                errorMargin = Phaser.Math.Between(-150, -60); 
            } else {
                // Shoot short of the player
                errorMargin = Phaser.Math.Between(60, 150);
            }
        }
        
        const targetX = this.player.x + errorMargin;
        const realDx = targetX - this.enemy.x;
        const vx = realDx / t;
        
        return { vx, vy, weaponUseChance };
    }

    executeAITurn() {
        if (this.isMatchOver || this.isPlayerTurn || this.queuedShots.enemy) return;
        
        const aim = this.calculateSmartAIAim();
        
        if (this.remainingAmmo.enemy.agneyastra > 0 && Math.random() < aim.weaponUseChance.agneyastra) {
            this.handleProjectileSelection('agneyastra');
        } else if (this.remainingAmmo.enemy.brahmastra > 0 && this.roundNumber >= 3 && Math.random() < aim.weaponUseChance.brahmastra) {
            this.handleProjectileSelection('brahmastra');
        } else {
            this.handleProjectileSelection('arrow');
        }

        const projectileType = this.selectedProjectile.enemy;
        this.queuedShots.enemy = { vx: aim.vx, vy: aim.vy, projectileType };
        this.consumeProjectileAmmo('enemy', projectileType);
        
        this.enemy.play(this.getAnimationKey(false, 'idle'));

        if (this.queuedShots.player && this.queuedShots.enemy) {
            this.releaseQueuedShots();
        } else {
            this.updateTurnIndicator();
        }
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
        this.arrowGroup = this.physics.add.group();
        this.physics.add.overlap(this.arrowGroup, this.arrowGroup, this.handleArrowMidAirCollision, null, this);

        // Programmatically generate our localized lower landing plane boundary
        this.groundGroup = this.physics.add.staticGroup();
        let groundLine = this.add.rectangle(400, GROUND_Y_LEVEL, 800, 10, 0x000000, 0);
        this.groundGroup.add(groundLine);
    }

    initializeHud() {
        this.hudGraphics = this.add.graphics().setDepth(15);
        this.renderHealthBars();
        this.initializeProjectileSelector();
        this.initializeTurnIndicator();
        this.initializeMatchOverlay();
        this.startPlanningRound();
    }

    initializeProjectileSelector() {
        this.selectionTitle = this.add.text(400, 118, 'P1 Astra', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#FFE7B3',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(18);

        this.selectionButtons = [
            this.createProjectileButton(0, 0, 'arrow'),
            this.createProjectileButton(0, 0, 'agneyastra'),
            this.createProjectileButton(0, 0, 'brahmastra')
        ];
    }

    createProjectileButton(x, y, projectileType) {
        const bg = this.add.rectangle(x, y, 44, 44, 0x1a120d, 0.92).setDepth(18);
        bg.setStrokeStyle(2, 0x6d4c32, 1);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.handleProjectileSelection(projectileType));

        let iconTexture = 'arrow';
        if (projectileType === 'agneyastra' || projectileType === 'brahmastra') iconTexture = `${AGNEYASTRA_FRAME_KEY_PREFIX}01`;
        
        let scale = 0.72;
        if (projectileType === 'agneyastra') scale = 0.22;
        if (projectileType === 'brahmastra') scale = 0.32;

        const icon = this.add.image(x, y, iconTexture).setScale(scale).setDepth(19);
        icon.setRotation(projectileType === 'arrow' ? 0 : -0.08);
        if (projectileType === 'brahmastra') icon.setTint(0x99ccff);

        let name = 'Arrow';
        if (projectileType === 'agneyastra') name = 'Agni';
        if (projectileType === 'brahmastra') name = 'Brahma';

        const label = this.add.text(x, y + 35, name, {
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            color: '#f5e7bf'
        }).setOrigin(0.5).setDepth(19);

        return { projectileType, bg, icon, label };
    }

    initializeTurnIndicator() {
        this.turnIndicator = this.add.graphics().setDepth(16);
        this.updateTurnIndicator();
    }

    initializeMatchOverlay() {
        this.damageFlashOverlay = this.add.rectangle(400, 300, 800, 600, 0xff3d1f, 0)
            .setDepth(39)
            .setVisible(true);

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

        this.playAgainButton = this.add.text(400, 420, 'PLAY AGAIN', {
            fontSize: '28px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff',
            backgroundColor: '#4a2f1d',
            padding: { x: 20, y: 10 },
            stroke: '#000000',
            strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(41)
        .setInteractive({ useHandCursor: true })
        .setVisible(false)
        .on('pointerdown', () => {
            window.location.reload();
        })
        .on('pointerover', () => this.playAgainButton.setStyle({ fill: '#FFD700' }))
        .on('pointerout', () => this.playAgainButton.setStyle({ fill: '#ffffff' }));
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
            this.updateProjectileSelector();
            return;
        }

        if (this.hasShotQueuedForCurrentTurn()) {
            this.turnIndicator.clear();
            if (this.player) this.player.setAlpha(this.queuedShots.player ? 0.82 : 1);
            if (this.enemy) this.enemy.setAlpha(this.queuedShots.enemy ? 0.82 : 1);
            this.updateProjectileSelector();
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

        this.updateProjectileSelector();
    }

    // ==========================================
    // 2. INPUT HANDLERS & TRACKING ENGINE
    // ==========================================

    initializeInputPipeline() {
        if (!window.gameStarted) {
            this.scene.pause();
            window.onGameStart = () => {
                this.scene.resume();
            };
        }
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

    handlePointerDown(pointer, currentlyOver) {
        if (currentlyOver?.length) return;
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
        const projectileType = this.getProjectileType(shooterIsPlayer);

        if (!this.isLaunchDirectionValid(vx)) {
            shooter.play(this.getAnimationKey(shooterIsPlayer, 'idle'));
            return;
        }

        const shooterKey = shooterIsPlayer ? 'player' : 'enemy';
        this.queuedShots[shooterKey] = { vx, vy, projectileType };
        shooter.play(this.getAnimationKey(shooterIsPlayer, 'idle'));
        this.consumeProjectileAmmo(shooterKey, projectileType);

        if (this.queuedShots.player && this.queuedShots.enemy) {
            this.releaseQueuedShots();
            return;
        }

        if (shooterIsPlayer) {
            this.isPlayerTurn = false;
        }

        this.updateTurnIndicator();

        if (!this.isPlayerTurn && window.isVsCPU && !this.isVolleyInFlight) {
            this.time.delayedCall(800, () => this.executeAITurn());
        }
    }

    instantiateArrowProjectile(shooterIsPlayer, vx, vy, projectileType) {
        const shooter = shooterIsPlayer ? this.player : this.enemy;
        const projectileConfig = PROJECTILE_CONFIG[projectileType];
        let textureKey = 'arrow';
        if (projectileType === 'agneyastra' || projectileType === 'brahmastra') textureKey = `${AGNEYASTRA_FRAME_KEY_PREFIX}01`;

        const arrowStartX = shooter.x + (shooterIsPlayer ? 30 : -30);
        const arrow = this.physics.add.image(arrowStartX, shooter.y - 10, textureKey)
            .setDepth(7)
            .setScale(projectileConfig.scale)
            .setTint(projectileConfig.tint);
        this.arrowGroup.add(arrow);

        let projectileHitbox = ARROW_HITBOX;
        if (projectileType === 'agneyastra') projectileHitbox = AGNEYASTRA_HITBOX;
        if (projectileType === 'brahmastra') projectileHitbox = BRAHMASTRA_HITBOX;
        arrow.body.setSize(projectileHitbox.width, projectileHitbox.height);
        arrow.body.setOffset(projectileHitbox.offsetX, projectileHitbox.offsetY);
        arrow.setData('launchVx', vx);
        arrow.setData('launchVy', vy);
        arrow.setData('hasResolved', false);
        arrow.setData('isArrow', true);
        arrow.setData('isLaunched', true);
        arrow.setData('ownerIsPlayer', shooterIsPlayer);
        arrow.setData('projectileType', projectileType);
        arrow.setData('power', projectileConfig.power);
        arrow.setData('trailColor', projectileConfig.trailColor);
        arrow.setRotation(Math.atan2(vy, vx));
        arrow.body.setAllowGravity(true);
        arrow.setVelocity(vx, vy);

        if (projectileType === 'agneyastra' || projectileType === 'brahmastra') {
            this.attachAgneyastraAnimation(arrow);
        }

        this.registerGroundImpactCollider(arrow);
        this.registerTargetHitOverlap(arrow, shooterIsPlayer);
        this.spawnParticleTrail(arrow);

        this.time.delayedCall(8000, () => {
            if (arrow?.active) this.resolveArrow(arrow, 0, true);
        });

        return arrow;
    }

    releaseQueuedShots() {
        if (this.isVolleyInFlight || this.isMatchOver) return;

        const plannedShots = [
            this.queuedShots.player ? { shooterIsPlayer: true, ...this.queuedShots.player } : null,
            this.queuedShots.enemy ? { shooterIsPlayer: false, ...this.queuedShots.enemy } : null
        ].filter(Boolean);

        if (plannedShots.length === 0) {
            this.startPlanningRound();
            return;
        }

        this.isVolleyInFlight = true;
        this.isInputLocked = true;
        this.isDragging = false;
        this.activeVolleyArrows = plannedShots.length;
        this.aimGraphics.clear();
        this.updateTurnIndicator();

        plannedShots.forEach(({ shooterIsPlayer }) => {
            const shooter = shooterIsPlayer ? this.player : this.enemy;
            shooter.play(this.getAnimationKey(shooterIsPlayer, 'release'));
        });

        this.time.delayedCall(ARROW_DELAY_MS, () => {
            plannedShots.forEach(({ shooterIsPlayer, vx, vy, projectileType }) => {
                this.instantiateArrowProjectile(shooterIsPlayer, vx, vy, projectileType);
            });
        });
    }

    registerGroundImpactCollider(arrowInstance) {
        this.physics.add.collider(arrowInstance, this.groundGroup, (arrowObj) => {
            const impactX = arrowObj.x;
            const impactY = arrowObj.y;
            arrowObj.body.setVelocity(0, 0);
            arrowObj.body.setAngularVelocity(0);
            arrowObj.body.setAllowGravity(false);
            arrowObj.body.enable = false;
            arrowObj.setData('isArrow', false);
            if (arrowObj.getData('projectileType') === 'agneyastra' || arrowObj.getData('projectileType') === 'brahmastra') {
                this.spawnFireExplosion(impactX, impactY);
            }
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
            const projectileType = arrowObj.getData('projectileType');
            const baseDamage = PROJECTILE_CONFIG[projectileType]?.damage ?? 10;
            const currentPower = arrowObj.getData('power');
            const damage = currentPower !== undefined ? currentPower : baseDamage;
            if (projectileType === 'agneyastra' || projectileType === 'brahmastra') {
                this.spawnFireExplosion(arrowObj.x, arrowObj.y);
                this.flashDamageScreen();
            }

            if (shooterIsPlayer) {
                this.applyDamageToEnemy(damage);
            } else {
                this.applyDamageToPlayer(damage);
            }

            this.resolveArrow(arrowObj, ARROW_HIT_LINGER_MS, false);
        });
    }

    handleArrowMidAirCollision(firstArrow, secondArrow) {
        if (firstArrow === secondArrow) return;
        if (!firstArrow.active || !secondArrow.active) return;
        if (firstArrow.getData('hasResolved') || secondArrow.getData('hasResolved')) return;
        if (!firstArrow.getData('isLaunched') || !secondArrow.getData('isLaunched')) return;

        const type1 = firstArrow.getData('projectileType');
        const type2 = secondArrow.getData('projectileType');
        
        const isBrahma1 = type1 === 'brahmastra';
        const isBrahma2 = type2 === 'brahmastra';
        const isAgni1 = type1 === 'agneyastra';
        const isAgni2 = type2 === 'agneyastra';

        if ((isBrahma1 && isBrahma2) || (isBrahma1 && isAgni2) || (isAgni1 && isBrahma2)) {
            handleBrahmastraCollision(this, firstArrow, secondArrow);
            return;
        }

        const impactX = (firstArrow.x + secondArrow.x) / 2;
        const impactY = (firstArrow.y + secondArrow.y) / 2;
        const firstPower = firstArrow.getData('power') ?? 1;
        const secondPower = secondArrow.getData('power') ?? 1;
        this.spawnImpactFlash(impactX, impactY);

        // --- MICRO-FREEZE CLASH MECHANIC ---
        const isAgniVsAgni = type1 === 'agneyastra' && type2 === 'agneyastra';
        if (isAgniVsAgni && !this.isHitStopActive) {
            this.isHitStopActive = true;

            // 1. Hit-Stop (Time Freeze)
            this.physics.pause();
            if (this.player.anims.isPlaying) this.player.anims.pause();
            if (this.enemy.anims.isPlaying) this.enemy.anims.pause();

            // 2. Screen Shake
            this.cameras.main.shake(200, 0.05);

            // 3. Visual Impact
            this.cameras.main.flash(200, 255, 255, 255);

            // 4. Knockback (after 200ms)
            this.time.delayedCall(200, () => {
                this.isHitStopActive = false;
                
                // Prevent unpausing if the match ended on this exact frame
                if (this.isMatchOver) return;

                this.physics.resume();
                if (this.player.anims.isPaused) this.player.anims.resume();
                if (this.enemy.anims.isPaused) this.enemy.anims.resume();

                this.triggerKnockback(-400, 400);
            });
        }
        // -----------------------------------

        if (firstPower === secondPower) {
            [firstArrow, secondArrow].forEach((arrow) => {
                this.disableProjectile(arrow);
                this.resolveArrow(arrow, 0, true);
            });
            return;
        }

        const winnerArrow = firstPower > secondPower ? firstArrow : secondArrow;
        const loserArrow = winnerArrow === firstArrow ? secondArrow : firstArrow;
        const loserPower = loserArrow.getData('power') ?? 1;
        const winningVelocity = new Phaser.Math.Vector2(winnerArrow.body.velocity.x, winnerArrow.body.velocity.y)
            .scale(COLLISION_WINNER_SPEED_RETENTION);

        this.disableProjectile(loserArrow);
        this.resolveArrow(loserArrow, 0, true);

        winnerArrow.body.setVelocity(winningVelocity.x, winningVelocity.y);
        winnerArrow.setData('launchVx', winningVelocity.x);
        winnerArrow.setData('launchVy', winningVelocity.y);
        winnerArrow.setData('power', Math.max(0, firstPower > secondPower ? firstPower - loserPower : secondPower - loserPower));
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

    triggerKnockback(playerVelocityX, enemyVelocityX, restoreDelayMs = KNOCKBACK_RESTORE_MS) {
        const playerStart = { x: this.player.x, y: this.player.y };
        const enemyStart = { x: this.enemy.x, y: this.enemy.y };

        this.player.setDragX(800);
        this.enemy.setDragX(800);
        this.player.setVelocityX(playerVelocityX);
        this.enemy.setVelocityX(enemyVelocityX);

        this.time.delayedCall(restoreDelayMs, () => {
            if (this.isMatchOver) return;

            this.player.setVelocity(0, 0);
            this.enemy.setVelocity(0, 0);
            this.player.setDragX(0);
            this.enemy.setDragX(0);
            this.player.setPosition(playerStart.x, playerStart.y);
            this.enemy.setPosition(enemyStart.x, enemyStart.y);
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
            
        if (this.playAgainButton) {
            this.playAgainButton.setVisible(true);
        }
    }

    spawnImpactFlash(x, y) {
        const flash = this.add.circle(x, y, 8, 0xfff2b3, 0.95).setDepth(25);
        const ring = this.add.circle(x, y, 12, 0xff8a33, 0.4).setDepth(24);
        ring.setStrokeStyle(3, 0xffd27a, 0.85);

        this.tweens.add({
            targets: [flash, ring],
            scaleX: 2.1,
            scaleY: 2.1,
            alpha: 0,
            duration: 240,
            ease: 'Quad.easeOut',
            onComplete: () => {
                flash.destroy();
                ring.destroy();
            }
        });
    }

    spawnParticleTrail(arrowInstance) {
        this.time.addEvent({
            delay: 18,
            repeat: 25,
            callback: () => {
                if (!arrowInstance.active || !arrowInstance.body || arrowInstance.body.enable === false) return;
                if (!arrowInstance.getData('isLaunched')) return;

                const projectileType = arrowInstance.getData('projectileType');
                const trail = this.add.graphics().setDepth(6);
                const isBig = projectileType === 'agneyastra' || projectileType === 'brahmastra';
                trail.fillStyle(arrowInstance.getData('trailColor') ?? 0xFF6600, isBig ? 0.5 : 0.35);
                trail.fillCircle(arrowInstance.x, arrowInstance.y, isBig ? 7 : 5);

                if (isBig) {
                    trail.fillStyle(0xfff0b3, 0.55);
                    trail.fillCircle(arrowInstance.x, arrowInstance.y, projectileType === 'brahmastra' ? 5 : 3.5);
                }

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

    attachAgneyastraAnimation(projectile) {
        let frameIndex = 1;
        this.time.addEvent({
            delay: 45,
            loop: true,
            callback: () => {
                if (!projectile?.active) return;
                frameIndex = frameIndex % AGNEYASTRA_FRAME_COUNT + 1;
                projectile.setTexture(`${AGNEYASTRA_FRAME_KEY_PREFIX}${String(frameIndex).padStart(2, '0')}`);
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

    getProjectileType(shooterIsPlayer) {
        return shooterIsPlayer ? this.selectedProjectile.player : this.selectedProjectile.enemy;
    }

    hasShotQueuedForCurrentTurn() {
        return this.isPlayerTurn ? Boolean(this.queuedShots.player) : Boolean(this.queuedShots.enemy);
    }

    handleProjectileSelection(projectileType) {
        if (this.isMatchOver || this.isVolleyInFlight) return;

        const selectionKey = this.isPlayerTurn ? 'player' : 'enemy';
        if (this.queuedShots[selectionKey]) return;
        if (!this.canSelectProjectile(selectionKey, projectileType)) return;

        this.selectedProjectile[selectionKey] = projectileType;
        this.updateProjectileSelector();
    }

    updateProjectileSelector() {
        if (!this.selectionTitle || this.selectionButtons.length === 0) return;

        const selectionKey = this.isPlayerTurn ? 'player' : 'enemy';
        const selectedType = this.selectedProjectile[selectionKey];
        const canChangeSelection = !this.isMatchOver && !this.isVolleyInFlight && !this.queuedShots[selectionKey];
        const isVisible = canChangeSelection;
        const layout = this.isPlayerTurn
            ? { titleX: 114, titleY: 58, startX: 88, startY: 94 }
            : { titleX: 686, titleY: 58, startX: 660, startY: 94 };

        this.selectionTitle
            .setPosition(layout.titleX, layout.titleY)
            .setText('Astra')
            .setAlpha(isVisible ? 1 : 0)
            .setVisible(isVisible);

        this.selectionButtons.forEach(({ projectileType, bg, icon, label }, index) => {
            const isSelected = projectileType === selectedType;
            const palette = PROJECTILE_CONFIG[projectileType];
            const x = layout.startX + index * 52;
            const y = layout.startY;
            const isAvailable = this.canSelectProjectile(selectionKey, projectileType);
            const alpha = isVisible ? (isAvailable ? 1 : 0.4) : 0;
            const ammoText = this.getProjectileAmmoText(selectionKey, projectileType);

            bg.setPosition(x, y);
            icon.setPosition(x, y);
            label.setPosition(x, y + 33);

            bg.setFillStyle(isSelected ? palette.tint : 0x1a120d, 0.92);
            bg.setStrokeStyle(2, isSelected ? 0xffe2ad : 0x6d4c32, 1);
            bg.setAlpha(alpha);
            bg.setVisible(isVisible);

            icon.setTint(isSelected ? 0x201006 : palette.tint);
            icon.setAlpha(alpha);
            icon.setVisible(isVisible);

            let labelText = `Arrow ${ammoText}`;
            if (projectileType === 'agneyastra') labelText = `Agni ${ammoText}`;
            if (projectileType === 'brahmastra') {
                labelText = this.roundNumber < 3 ? 'Locked' : `Brahma ${ammoText}`;
            }
            label.setText(labelText);
            label.setColor(isSelected ? '#201006' : '#f5e7bf');
            label.setAlpha(alpha);
            label.setVisible(isVisible);

            bg.input.enabled = canChangeSelection && isAvailable;
        });
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

    canSelectProjectile(selectionKey, projectileType) {
        if (projectileType === 'brahmastra' && this.roundNumber < 3) return false;
        const ammoLimit = PROJECTILE_CONFIG[projectileType]?.ammo;
        if (ammoLimit == null) return true;
        return (this.remainingAmmo[selectionKey]?.[projectileType] ?? 0) > 0;
    }

    consumeProjectileAmmo(selectionKey, projectileType) {
        const ammoLimit = PROJECTILE_CONFIG[projectileType]?.ammo;
        if (ammoLimit == null) return;

        this.remainingAmmo[selectionKey][projectileType] = Math.max(
            0,
            (this.remainingAmmo[selectionKey]?.[projectileType] ?? 0) - 1
        );

        if (!this.canSelectProjectile(selectionKey, projectileType)) {
            this.selectedProjectile[selectionKey] = 'arrow';
        }
    }

    getProjectileAmmoText(selectionKey, projectileType) {
        const ammoLimit = PROJECTILE_CONFIG[projectileType]?.ammo;
        if (ammoLimit == null) return '∞';
        return `${this.remainingAmmo[selectionKey]?.[projectileType] ?? 0}`;
    }

    startPlanningRound() {
        if (this.isMatchOver) return;

        this.roundNumber++;
        this.queuedShots = { player: null, enemy: null };
        this.isPlayerTurn = true;
        this.isInputLocked = false;
        this.isVolleyInFlight = false;
        this.isDragging = false;
        this.updateTurnIndicator();
    }

    flashDamageScreen() {
        if (!this.damageFlashOverlay) return;

        this.tweens.killTweensOf(this.damageFlashOverlay);
        this.damageFlashOverlay.setAlpha(0.45);
        this.tweens.add({
            targets: this.damageFlashOverlay,
            alpha: 0,
            duration: 220,
            ease: 'Quad.easeOut'
        });
    }

    spawnFireExplosion(x, y) {
        const core = this.add.circle(x, y, 12, 0xfff0b3, 0.95).setDepth(26);
        const flame = this.add.circle(x, y, 20, 0xff6b1a, 0.65).setDepth(25);
        const shock = this.add.circle(x, y, 26, 0xffb347, 0.28).setDepth(24);
        shock.setStrokeStyle(4, 0xffd27a, 0.8);

        this.tweens.add({
            targets: [core, flame, shock],
            scaleX: 2.7,
            scaleY: 2.7,
            alpha: 0,
            duration: 320,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                core.destroy();
                flame.destroy();
                shock.destroy();
            }
        });
    }

    disableProjectile(arrow) {
        if (!arrow?.body) return;

        arrow.body.setVelocity(0, 0);
        arrow.body.setAngularVelocity(0);
        arrow.body.setAllowGravity(false);
        arrow.body.enable = false;
        arrow.setData('isArrow', false);
        arrow.setData('isLaunched', false);
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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
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

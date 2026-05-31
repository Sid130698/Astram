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

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.isDragging    = false;
        this.player        = null;
        this.aimGraphics   = null;
        this.groundGroup   = null;
        this.globalPointer = { x: 0, y: 0 };
        this.pendingVx     = 0;
        this.pendingVy     = 0;
    }

    // ─── LIFECYCLE HOOKS ──────────────────────────────────────────
    preload() {
        this.load.image('background', '/battleground.png');
        this.load.image('arrow', '/archer-assets/arrow.png');
        this.load.spritesheet('archer', '/archer-assets/archer-yellow.png', {
            frameWidth:  64,
            frameHeight: 64
        });
    }

    create() {
        this.initializeEnvironment();
        this.initializeActors();
        this.initializePhysicsBoundaries();
        this.initializeAnimations();
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
        this.player = this.physics.add.sprite(130, 460, 'archer')
            .setScale(2.2)
            .setDepth(5);
        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);
    }

    initializePhysicsBoundaries() {
        // Initialize dynamic aiming vector overlay graphics context
        this.aimGraphics = this.add.graphics().setDepth(20);

        // Programmatically generate our localized lower landing plane boundary
        this.groundGroup = this.physics.add.staticGroup();
        let groundLine = this.add.rectangle(400, GROUND_Y_LEVEL, 800, 10, 0x000000, 0);
        this.groundGroup.add(groundLine);
    }

    initializeAnimations() {
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('archer', ANIM.IDLE),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'fire',
            frames: this.anims.generateFrameNumbers('archer', ANIM.FIRE),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'release',
            frames: this.anims.generateFrameNumbers('archer', ANIM.RELEASE),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'hit',
            frames: this.anims.generateFrameNumbers('archer', ANIM.HIT),
            frameRate: 10,
            repeat: 0
        });

        // Lifecycle hook to cycle animation sequences gracefully back to idle state
        this.player.on('animationcomplete', () => {
            this.player.play('idle');
        });

        this.player.play('idle');
    }

    // ==========================================
    // 2. INPUT HANDLERS & TRACKING ENGINE
    // ==========================================

    initializeInputPipeline() {
        this.input.on('pointerdown', this.handlePointerDown, this);

        // Bind global browser mouse event proxies to calculate off-canvas coordinates
        window.addEventListener('mousemove', (e) => this.processDragMovement(e.clientX, e.clientY));
        window.addEventListener('mouseup', (e) => this.processDragTermination(e.clientX, e.clientY));

        // Register tracking rules for cross-platform mobile surface gestures
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.processDragMovement(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            const touch = e.changedTouches[0];
            this.processDragTermination(touch.clientX, touch.clientY);
        });
    }

    synchronizeCoordinates(clientX, clientY) {
        const bounds = this.sys.game.canvas.getBoundingClientRect();
        this.globalPointer.x = clientX - bounds.left;
        this.globalPointer.y = clientY - bounds.top;
    }

    handlePointerDown(pointer) {
        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
        if (distance < 120) {
            this.isDragging = true;
            this.player.anims.stop();
            this.player.setFrame(17); // Snaps immediately to structural peak draw posture frame
        }
    }

    processDragMovement(clientX, clientY) {
        if (!this.isDragging) return;
        this.synchronizeCoordinates(clientX, clientY);
        this.calculateAimTrajectory(this.globalPointer);
    }

    processDragTermination(clientX, clientY) {
        if (!this.isDragging) return;
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
            this.player.play('idle');
            return;
        }

        this.pendingVx = vx;
        this.pendingVy = vy;
        this.player.play('release');

        // Delay arrow generation to perfectly sync up with animation timing frame loops
        this.time.delayedCall(ARROW_DELAY_MS, () => {
            this.instantiateArrowProjectile(this.pendingVx, this.pendingVy);
        });
    }

    instantiateArrowProjectile(vx, vy) {
        const arrow = this.physics.add.image(this.player.x + 30, this.player.y - 10, 'arrow')
            .setDepth(7)
            .setScale(1.5);

        arrow.setVelocity(vx, vy);
        arrow.setData('isArrow', true);

        // Register localized terrain contact logic
        this.registerGroundImpactCollider(arrow);

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
import Phaser from 'phaser';

// Define the baseline Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // This runs first. We will load game assets (images, audio) here later.
    }

    create() {
        // This runs after preload. This is where we build the world.
        this.add.text(400, 300, 'Astram', {
            fontSize: '64px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    update() {
        // The game loop. This runs up to 60 times a second to track physics/inputs.
    }
}

// Global Core Engine Configurations
const config = {
    type: Phaser.AUTO, // Automatically choices WebGL if available, falls back to Canvas
    width: 800,
    height: 600,
    physics: {
        default: 'arcade', // Lightweight physics engine perfect for projectile arcs
        arcade: {
            gravity: { y: 300 }, // Global downward gravity acceleration pull
            debug: false         // Turn to true later to see bounding boxes
        }
    },
    scene: GameScene
};

// Instantiate the game
const game = new Phaser.Game(config);
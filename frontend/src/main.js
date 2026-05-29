import Phaser from 'phaser';

// Define the baseline Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // This runs first. We will load game assets (images, audio) here later.
        //1. Load the bakcground image into memory and tag it with the key 'background'
        this.load.image('background','/battleground.png');
        let canvas = this.sys.textures.createCanvas('temp_archer', 32, 64);
        let ctx = canvas.context;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(0,0, 32, 64);
        canvas.refresh();

    }

    create() {
        //2. Render the background image at the center of hte canvas layout (400, 300)
        // setOrigin(0.5) centers the image perfectly on that coordinate point
        let bg = this.add.image(400, 300, 'background');

        //3. Force the asset layer to dynamically scale and fill the 800X600 canvas solution resolution bounds
        bg.setDisplaySize(800, 600);
        this.player = this.physics.add.sprite(100, 500, 'temp_archer');

        // Prevent our hero from falling through the floor due to global gravity pulls!
        this.player.setCollideWorldBounds(true);

        // Give our archer a tiny bit of weight simulation physics profile
        this.player.setBounce(0.1);
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
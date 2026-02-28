import Phaser from 'phaser';
import { showLeaderboardUI, addLeaderboardButton } from '../shared/leaderboard-ui.js';

const ASSET_BASE = 'assets/';

const ASTEROID_VARIANTS = {
    asteroid_large: [
        'meteorBrown_big1', 'meteorBrown_big2', 'meteorBrown_big3', 'meteorBrown_big4',
        'meteorGrey_big1', 'meteorGrey_big2', 'meteorGrey_big3', 'meteorGrey_big4',
    ],
    asteroid_medium: [
        'meteorBrown_med1', 'meteorBrown_med3',
        'meteorGrey_med1', 'meteorGrey_med2',
    ],
    asteroid_small: [
        'meteorBrown_small1', 'meteorBrown_small2',
        'meteorGrey_small1', 'meteorGrey_small2',
    ],
};

class AsteroidBlasterScene extends Phaser.Scene {
    constructor() {
        super('AsteroidBlaster');
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.lastFired = 0;
    }

    preload() {
        // Ship
        this.load.image('ship', ASSET_BASE + 'playerShip1_blue.png');

        // Bullet
        this.load.image('bullet', ASSET_BASE + 'laserBlue01.png');

        // Fire particle textures
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffaa00);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('fire_particle', 8, 8);
        gfx.clear();
        gfx.fillStyle(0xff4400);
        gfx.fillCircle(3, 3, 3);
        gfx.generateTexture('fire_particle_red', 6, 6);

        // Asteroids — all variants
        for (const variants of Object.values(ASTEROID_VARIANTS)) {
            for (const name of variants) {
                this.load.image(name, ASSET_BASE + name + '.png');
            }
        }
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.levelComplete = false;
        this.lastFired = 0;
        this.invulnerable = false;

        // Starfield
        for (let i = 0; i < 200; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.Between(1, 2),
                0xffffff,
                Math.random() * 0.5 + 0.1
            );
            // Subtle twinkle
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: star.alpha * 0.3 },
                duration: Phaser.Math.Between(1500, 4000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // Ship — Kenney ship is 99x75, scale to ~50px wide
        this.ship = this.physics.add.sprite(400, 300, 'ship');
        this.ship.setScale(0.5);
        this.ship.setDamping(true);
        this.ship.setDrag(0.99);
        this.ship.setMaxVelocity(300);
        this.ship.setCollideWorldBounds(true);
        this.ship.setSize(60, 50);

        // Fire emitter — renders behind the ship, starts inactive
        this.fireEmitter = this.add.particles(0, 0, 'fire_particle', {
            follow: this.ship,
            frequency: -1,
            lifespan: { min: 200, max: 500 },
            speed: { min: 20, max: 60 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.8, end: 0 },
            angle: { min: 0, max: 360 },
            blendMode: 'ADD',
            tint: [0xff4400, 0xffaa00, 0xffcc00, 0xff6600],
        });
        this.fireEmitter.setDepth(0);
        this.ship.setDepth(1);
        this.fireLevel = 0;

        this.bullets = this.physics.add.group({ maxSize: 20 });
        this.asteroids = this.physics.add.group();


        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        for (let i = 0; i < 5; i++) {
            this.spawnAsteroid('asteroid_large');
        }

        this.physics.add.overlap(this.bullets, this.asteroids, this.hitAsteroid, null, this);
        this.physics.add.overlap(this.ship, this.asteroids, this.hitShip, null, this);
        this.physics.add.collider(this.asteroids, this.asteroids);

        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#4facfe', fontFamily: 'sans-serif' }).setDepth(5);
        this.livesText = this.add.text(16, 42, 'Lives: 3', { fontSize: '20px', fill: '#f77062', fontFamily: 'sans-serif' }).setDepth(5);
        this.levelText = this.add.text(784, 16, 'Level: 1', { fontSize: '20px', fill: '#00ff88', fontFamily: 'sans-serif' }).setOrigin(1, 0).setDepth(5);
        addLeaderboardButton(this, 'asteroid-blaster', 784, 46);
    }

    update(time) {
        if (this.gameOver || this.levelComplete) return;

        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-200);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(200);
        } else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation - Math.PI / 2, 400, this.ship.body.acceleration);
        } else {
            this.ship.setAcceleration(0);
        }

        if (this.spaceKey.isDown && time > this.lastFired + 200) {
            const bullet = this.bullets.get(this.ship.x, this.ship.y, 'bullet');
            if (bullet) {
                bullet.setActive(true).setVisible(true);
                bullet.setScale(0.8);
                bullet.body.enable = true;
                bullet.setCollideWorldBounds(false);
                bullet.setRotation(this.ship.rotation);
                this.physics.velocityFromRotation(this.ship.rotation - Math.PI / 2, 500, bullet.body.velocity);
                this.lastFired = time;
            }
        }

        // Remove bullets that leave the screen
        this.bullets.children.each((bullet) => {
            if (bullet.active && (bullet.x < -20 || bullet.x > 820 || bullet.y < -20 || bullet.y > 620)) {
                bullet.setActive(false).setVisible(false);
                bullet.body.enable = false;
            }
        });

        if (this.asteroids.countActive() === 0) {
            this.showLevelComplete();
        }
    }

    showLevelComplete() {
        this.levelComplete = true;
        this.ship.setVelocity(0);
        this.ship.setAcceleration(0);
        this.ship.setAngularVelocity(0);

        // Overlay
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6).setDepth(9);

        const title = this.add.text(400, 200, 'LEVEL ' + this.level + ' COMPLETE!', {
            fontSize: '42px', fill: '#00ff88', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        const scoreInfo = this.add.text(400, 260, 'Score: ' + this.score, {
            fontSize: '24px', fill: '#fff', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        const nextInfo = this.add.text(400, 310, 'Next: Level ' + (this.level + 1) + ' — ' + (4 + this.level + 1) + ' asteroids', {
            fontSize: '18px', fill: '#aaa', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        const continueBtn = this.add.text(400, 380, '[ CONTINUE ]', {
            fontSize: '26px', fill: '#4facfe', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setDepth(10).setAlpha(0).setInteractive({ useHandCursor: true });

        // Animate in
        this.tweens.add({ targets: title, alpha: 1, y: 210, duration: 400, ease: 'Back.easeOut' });
        this.tweens.add({ targets: scoreInfo, alpha: 1, duration: 400, delay: 200 });
        this.tweens.add({ targets: nextInfo, alpha: 1, duration: 400, delay: 350 });
        this.tweens.add({ targets: continueBtn, alpha: 1, duration: 400, delay: 500 });

        // Hover effect
        continueBtn.on('pointerover', () => continueBtn.setStyle({ fill: '#fff' }));
        continueBtn.on('pointerout', () => continueBtn.setStyle({ fill: '#4facfe' }));

        continueBtn.on('pointerdown', () => {
            overlay.destroy();
            title.destroy();
            scoreInfo.destroy();
            nextInfo.destroy();
            continueBtn.destroy();

            this.level++;
            this.levelText.setText('Level: ' + this.level);
            this.levelComplete = false;

            // Spawn more asteroids each level
            const count = 4 + this.level;
            for (let i = 0; i < count; i++) {
                this.spawnAsteroid('asteroid_large');
            }
        });
    }

    getRandomVariant(type) {
        const variants = ASTEROID_VARIANTS[type];
        return Phaser.Utils.Array.GetRandom(variants);
    }

    spawnAsteroid(type) {
        const edge = Phaser.Math.Between(0, 3);
        let x, y;
        if (edge === 0) { x = Phaser.Math.Between(0, 800); y = -40; }
        else if (edge === 1) { x = 840; y = Phaser.Math.Between(0, 600); }
        else if (edge === 2) { x = Phaser.Math.Between(0, 800); y = 640; }
        else { x = -40; y = Phaser.Math.Between(0, 600); }

        const texture = this.getRandomVariant(type);
        const asteroid = this.asteroids.create(x, y, texture);
        asteroid.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        asteroid.setAngularVelocity(Phaser.Math.Between(-100, 100));
        asteroid.setCollideWorldBounds(true);
        asteroid.setBounce(1);
        asteroid.asteroidType = type;

        // Scale based on type
        if (type === 'asteroid_large') {
            asteroid.setScale(0.8);
        } else if (type === 'asteroid_medium') {
            asteroid.setScale(0.9);
        } else {
            asteroid.setScale(0.9);
        }
    }

    hitAsteroid(bullet, asteroid) {
        bullet.setActive(false).setVisible(false);
        bullet.body.enable = false;

        const type = asteroid.asteroidType;
        const { x, y } = asteroid;

        // Explosion particles
        for (let i = 0; i < 10; i++) {
            const size = Phaser.Math.Between(2, 5);
            const color = Phaser.Utils.Array.GetRandom([0xffaa00, 0xff6600, 0xffcc00, 0xff4400]);
            const p = this.add.circle(x, y, size, color);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-50, 50),
                y: y + Phaser.Math.Between(-50, 50),
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(300, 600),
                onComplete: () => p.destroy(),
            });
        }

        asteroid.destroy();

        if (type === 'asteroid_large') {
            this.score += 20;
            this.spawnSplitAsteroids(x, y, 'asteroid_medium', 150);
        } else if (type === 'asteroid_medium') {
            this.score += 50;
            this.spawnSplitAsteroids(x, y, 'asteroid_small', 200);
        } else {
            this.score += 100;
        }
        this.scoreText.setText('Score: ' + this.score);
    }

    spawnSplitAsteroids(x, y, type, speed) {
        for (let i = 0; i < 2; i++) {
            const texture = this.getRandomVariant(type);
            const a = this.asteroids.create(x, y, texture);
            a.setVelocity(Phaser.Math.Between(-speed, speed), Phaser.Math.Between(-speed, speed));
            a.setAngularVelocity(Phaser.Math.Between(-speed, speed));
            a.setCollideWorldBounds(true);
            a.setBounce(1);
            a.asteroidType = type;

            if (type === 'asteroid_medium') {
                a.setScale(0.9);
            } else {
                a.setScale(0.9);
            }
        }
    }

    startFire() {
        this.fireLevel++;
        this.fireEmitter.stop();
        this.fireEmitter.setConfig({
            follow: this.ship,
            followOffset: { x: 0, y: 15 },
            frequency: Math.max(10, 60 - this.fireLevel * 20),
            quantity: this.fireLevel,
            lifespan: { min: 300, max: 500 + this.fireLevel * 100 },
            speed: { min: 30, max: 50 + this.fireLevel * 20 },
            scale: { start: 0.6 + this.fireLevel * 0.2, end: 0 },
            alpha: { start: 0.9, end: 0 },
            angle: { min: 60, max: 120 },
            blendMode: 'ADD',
            tint: [0xff4400, 0xffaa00, 0xffcc00, 0xff6600],
        });
        this.fireEmitter.setDepth(0);
        this.fireEmitter.start();

        // Tint the ship progressively redder with damage
        if (this.fireLevel === 1) {
            this.ship.setTint(0xffaaaa);
        } else if (this.fireLevel === 2) {
            this.ship.setTint(0xff6666);
        } else {
            this.ship.setTint(0xff3333);
        }
    }

    hitShip(ship, asteroid) {
        if (this.invulnerable) return;

        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);
        this.startFire();

        // Impact spark particles
        for (let i = 0; i < 15; i++) {
            const color = Phaser.Utils.Array.GetRandom([0xf77062, 0xff4444, 0xffaa00]);
            const p = this.add.circle(ship.x, ship.y, 3, color);
            this.tweens.add({
                targets: p,
                x: ship.x + Phaser.Math.Between(-60, 60),
                y: ship.y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                duration: 600,
                onComplete: () => p.destroy(),
            });
        }

        // Screen shake on hit
        this.cameras.main.shake(200, 0.01 + this.fireLevel * 0.005);

        if (this.lives <= 0) {
            this.gameOver = true;
            ship.setVelocity(0);
            ship.setAcceleration(0);
            ship.setAngularVelocity(Phaser.Math.Between(-50, 50));
            ship.body.enable = false;

            // Big explosion burst around the ship
            for (let i = 0; i < 30; i++) {
                const size = Phaser.Math.Between(2, 6);
                const color = Phaser.Utils.Array.GetRandom([0xff4400, 0xffaa00, 0xffcc00, 0xff2200]);
                const p = this.add.circle(ship.x, ship.y, size, color);
                this.tweens.add({
                    targets: p,
                    x: ship.x + Phaser.Math.Between(-100, 100),
                    y: ship.y + Phaser.Math.Between(-100, 100),
                    alpha: 0,
                    scale: 0,
                    duration: Phaser.Math.Between(400, 900),
                    onComplete: () => p.destroy(),
                });
            }

            // Ship stays visible and on fire — game over UI appears on top
            this.time.delayedCall(800, () => {
                showLeaderboardUI(this, 'asteroid-blaster', this.score);
            });
        } else {
            // Invulnerability period — ship blinks
            this.invulnerable = true;
            ship.setVelocity(0);
            ship.setPosition(400, 300);
            this.tweens.add({
                targets: ship,
                alpha: { from: 0.3, to: 1 },
                duration: 200,
                repeat: 5,
                yoyo: true,
                onComplete: () => {
                    ship.setAlpha(1);
                    this.invulnerable = false;
                },
            });
        }
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000011',
    physics: {
        default: 'arcade',
        arcade: { debug: false },
    },
    scene: AsteroidBlasterScene,
});

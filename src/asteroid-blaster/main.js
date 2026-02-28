import Phaser from 'phaser';

class AsteroidBlasterScene extends Phaser.Scene {
    constructor() {
        super('AsteroidBlaster');
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.lastFired = 0;
    }

    preload() {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        // Ship
        gfx.clear();
        gfx.fillStyle(0x4facfe);
        gfx.fillTriangle(16, 0, 0, 32, 32, 32);
        gfx.fillStyle(0x00f2fe);
        gfx.fillTriangle(16, 4, 4, 28, 28, 28);
        gfx.generateTexture('ship', 32, 32);

        // Bullet
        gfx.clear();
        gfx.fillStyle(0xffff00);
        gfx.fillCircle(3, 3, 3);
        gfx.generateTexture('bullet', 6, 6);

        // Asteroids
        [
            { key: 'asteroid_large', size: 40 },
            { key: 'asteroid_medium', size: 24 },
            { key: 'asteroid_small', size: 14 },
        ].forEach((a) => {
            gfx.clear();
            gfx.fillStyle(0x888888);
            gfx.fillCircle(a.size, a.size, a.size);
            gfx.fillStyle(0x666666);
            gfx.fillCircle(a.size - 4, a.size - 4, a.size * 0.4);
            gfx.generateTexture(a.key, a.size * 2, a.size * 2);
        });
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.lastFired = 0;

        // Starfield
        for (let i = 0; i < 200; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.Between(1, 2),
                0xffffff,
                Math.random() * 0.5 + 0.1
            );
        }

        this.ship = this.physics.add.sprite(400, 300, 'ship');
        this.ship.setDamping(true);
        this.ship.setDrag(0.99);
        this.ship.setMaxVelocity(300);
        this.ship.setCollideWorldBounds(true);

        this.bullets = this.physics.add.group({ maxSize: 20 });
        this.asteroids = this.physics.add.group();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        for (let i = 0; i < 5; i++) {
            this.spawnAsteroid('asteroid_large');
        }

        this.physics.add.overlap(this.bullets, this.asteroids, this.hitAsteroid, null, this);
        this.physics.add.overlap(this.ship, this.asteroids, this.hitShip, null, this);

        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#4facfe', fontFamily: 'sans-serif' });
        this.livesText = this.add.text(16, 42, 'Lives: 3', { fontSize: '20px', fill: '#f77062', fontFamily: 'sans-serif' });
    }

    update(time) {
        if (this.gameOver) return;

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
                bullet.body.enable = true;
                this.physics.velocityFromRotation(this.ship.rotation - Math.PI / 2, 500, bullet.body.velocity);
                bullet.setCollideWorldBounds(true);
                bullet.body.onWorldBounds = true;
                this.lastFired = time;
                this.time.delayedCall(1500, () => {
                    if (bullet.active) {
                        bullet.setActive(false).setVisible(false);
                        bullet.body.enable = false;
                    }
                });
            }
        }

        if (this.asteroids.countActive() === 0) {
            for (let i = 0; i < 5 + Math.floor(this.score / 500); i++) {
                this.spawnAsteroid('asteroid_large');
            }
        }
    }

    spawnAsteroid(type) {
        const edge = Phaser.Math.Between(0, 3);
        let x, y;
        if (edge === 0) { x = Phaser.Math.Between(0, 800); y = -40; }
        else if (edge === 1) { x = 840; y = Phaser.Math.Between(0, 600); }
        else if (edge === 2) { x = Phaser.Math.Between(0, 800); y = 640; }
        else { x = -40; y = Phaser.Math.Between(0, 600); }

        const asteroid = this.asteroids.create(x, y, type);
        asteroid.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        asteroid.setAngularVelocity(Phaser.Math.Between(-100, 100));
        asteroid.setCollideWorldBounds(true);
        asteroid.setBounce(1);
        asteroid.asteroidType = type;
    }

    hitAsteroid(bullet, asteroid) {
        bullet.setActive(false).setVisible(false);
        bullet.body.enable = false;

        const type = asteroid.asteroidType;
        const { x, y } = asteroid;

        for (let i = 0; i < 8; i++) {
            const p = this.add.circle(x, y, 2, 0xffaa00);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-40, 40),
                y: y + Phaser.Math.Between(-40, 40),
                alpha: 0,
                duration: 400,
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
            const a = this.asteroids.create(x, y, type);
            a.setVelocity(Phaser.Math.Between(-speed, speed), Phaser.Math.Between(-speed, speed));
            a.setAngularVelocity(Phaser.Math.Between(-speed, speed));
            a.setCollideWorldBounds(true);
            a.setBounce(1);
            a.asteroidType = type;
        }
    }

    hitShip(ship, asteroid) {
        if (ship.alpha < 1) return;

        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);

        for (let i = 0; i < 15; i++) {
            const p = this.add.circle(ship.x, ship.y, 3, 0xf77062);
            this.tweens.add({
                targets: p,
                x: ship.x + Phaser.Math.Between(-60, 60),
                y: ship.y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                duration: 600,
                onComplete: () => p.destroy(),
            });
        }

        if (this.lives <= 0) {
            this.gameOver = true;
            ship.setActive(false).setVisible(false);
            this.add.text(400, 260, 'GAME OVER', { fontSize: '48px', fill: '#f77062', fontFamily: 'sans-serif' }).setOrigin(0.5);
            this.add.text(400, 320, 'Score: ' + this.score, { fontSize: '28px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);
            const restart = this.add.text(400, 370, 'Click to Restart', { fontSize: '20px', fill: '#4facfe', fontFamily: 'sans-serif' }).setOrigin(0.5).setInteractive();
            restart.on('pointerdown', () => this.scene.restart());
        } else {
            ship.setAlpha(0.3);
            ship.setVelocity(0);
            ship.setPosition(400, 300);
            this.time.delayedCall(2000, () => ship.setAlpha(1));
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

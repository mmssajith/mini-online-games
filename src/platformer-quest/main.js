import Phaser from 'phaser';

const LEVELS = [
    {
        platforms: [
            { x: 400, y: 480, w: 800 },
            { x: 150, y: 380, w: 120 },
            { x: 400, y: 310, w: 150 },
            { x: 600, y: 240, w: 120 },
            { x: 300, y: 180, w: 100 },
            { x: 700, y: 140, w: 130 },
        ],
        coins: [
            { x: 150, y: 350 }, { x: 400, y: 280 }, { x: 600, y: 210 },
            { x: 300, y: 150 }, { x: 200, y: 450 }, { x: 500, y: 450 },
        ],
        enemies: [{ x: 350, y: 455, minX: 250, maxX: 550 }],
        flag: { x: 730, y: 108 },
        playerStart: { x: 50, y: 440 },
    },
    {
        platforms: [
            { x: 400, y: 480, w: 800 },
            { x: 100, y: 380, w: 100 },
            { x: 300, y: 330, w: 80 },
            { x: 500, y: 280, w: 100 },
            { x: 680, y: 350, w: 100 },
            { x: 200, y: 220, w: 80 },
            { x: 400, y: 170, w: 120 },
            { x: 650, y: 130, w: 100 },
        ],
        coins: [
            { x: 100, y: 350 }, { x: 300, y: 300 }, { x: 500, y: 250 },
            { x: 680, y: 320 }, { x: 200, y: 190 }, { x: 400, y: 140 },
            { x: 650, y: 100 }, { x: 350, y: 450 },
        ],
        enemies: [
            { x: 250, y: 455, minX: 100, maxX: 400 },
            { x: 600, y: 455, minX: 500, maxX: 750 },
        ],
        flag: { x: 670, y: 98 },
        playerStart: { x: 50, y: 440 },
    },
    {
        platforms: [
            { x: 100, y: 480, w: 200 },
            { x: 350, y: 420, w: 80 },
            { x: 550, y: 360, w: 80 },
            { x: 700, y: 480, w: 200 },
            { x: 180, y: 320, w: 100 },
            { x: 400, y: 260, w: 80 },
            { x: 600, y: 200, w: 100 },
            { x: 300, y: 140, w: 80 },
            { x: 100, y: 200, w: 80 },
            { x: 500, y: 100, w: 150 },
        ],
        coins: [
            { x: 100, y: 450 }, { x: 350, y: 390 }, { x: 550, y: 330 },
            { x: 180, y: 290 }, { x: 400, y: 230 }, { x: 600, y: 170 },
            { x: 300, y: 110 }, { x: 500, y: 70 }, { x: 700, y: 450 },
            { x: 100, y: 170 },
        ],
        enemies: [
            { x: 650, y: 455, minX: 600, maxX: 790 },
            { x: 450, y: 75, minX: 430, maxX: 570 },
        ],
        flag: { x: 530, y: 68 },
        playerStart: { x: 50, y: 440 },
    },
];

class PlatformerScene extends Phaser.Scene {
    constructor() {
        super('Platformer');
        this.score = 0;
        this.level = 1;
        this.totalCoins = 0;
        this.gameOver = false;
    }

    preload() {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        // Player
        gfx.clear();
        gfx.fillStyle(0x4facfe);
        gfx.fillRoundedRect(0, 0, 28, 34, 4);
        gfx.fillStyle(0xffccaa);
        gfx.fillCircle(14, 8, 8);
        gfx.fillStyle(0x2266aa);
        gfx.fillRect(4, 18, 20, 16);
        gfx.fillStyle(0x333333);
        gfx.fillRect(6, 28, 7, 6);
        gfx.fillRect(15, 28, 7, 6);
        gfx.generateTexture('player', 28, 34);

        // Platform
        gfx.clear();
        gfx.fillStyle(0x44aa44);
        gfx.fillRect(0, 0, 32, 20);
        gfx.fillStyle(0x66cc66);
        gfx.fillRect(0, 0, 32, 6);
        gfx.fillStyle(0x8b6914);
        gfx.fillRect(0, 6, 32, 14);
        gfx.fillStyle(0x7a5c12);
        gfx.fillRect(0, 12, 32, 2);
        gfx.generateTexture('platform_tile', 32, 20);

        // Coin
        gfx.clear();
        gfx.fillStyle(0xffd700);
        gfx.fillCircle(10, 10, 10);
        gfx.fillStyle(0xffec80);
        gfx.fillCircle(8, 8, 4);
        gfx.generateTexture('coin', 20, 20);

        // Enemy
        gfx.clear();
        gfx.fillStyle(0xff4444);
        gfx.fillRoundedRect(0, 0, 28, 24, 6);
        gfx.fillStyle(0xffffff);
        gfx.fillCircle(9, 8, 5);
        gfx.fillCircle(19, 8, 5);
        gfx.fillStyle(0x000000);
        gfx.fillCircle(10, 8, 2);
        gfx.fillCircle(20, 8, 2);
        gfx.generateTexture('enemy', 28, 24);

        // Flag
        gfx.clear();
        gfx.fillStyle(0x888888);
        gfx.fillRect(0, 0, 4, 40);
        gfx.fillStyle(0x00ff88);
        gfx.fillTriangle(4, 0, 30, 10, 4, 20);
        gfx.generateTexture('flag', 30, 40);
    }

    create() {
        this.loadLevel(0);
    }

    loadLevel(levelIdx) {
        this.children.removeAll();
        if (this.physics && this.physics.world) {
            this.physics.world.colliders.destroy();
        }

        this.gameOver = false;
        const lvl = LEVELS[levelIdx % LEVELS.length];

        // Sky
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x4488cc, 0x4488cc, 0x88bbee, 0x88bbee);
        bg.fillRect(0, 0, 800, 500);

        // Clouds
        for (let i = 0; i < 6; i++) {
            const cx = Phaser.Math.Between(30, 770);
            const cy = Phaser.Math.Between(20, 100);
            this.add.circle(cx, cy, 18, 0xffffff, 0.6);
            this.add.circle(cx + 15, cy - 8, 14, 0xffffff, 0.6);
            this.add.circle(cx - 15, cy - 4, 16, 0xffffff, 0.6);
        }

        // Platforms
        this.platforms = this.physics.add.staticGroup();
        lvl.platforms.forEach((p) => {
            const plat = this.platforms.create(p.x, p.y, 'platform_tile');
            plat.setDisplaySize(p.w, 20);
            plat.refreshBody();
        });

        // Coins
        this.coins = this.physics.add.group({ allowGravity: false });
        this.totalCoins = lvl.coins.length;
        lvl.coins.forEach((c) => {
            const coin = this.coins.create(c.x, c.y, 'coin');
            coin.setBounceY(0.2);
            this.tweens.add({ targets: coin, y: c.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        });

        // Enemies
        this.enemies = this.physics.add.group();
        lvl.enemies.forEach((e) => {
            const enemy = this.enemies.create(e.x, e.y, 'enemy');
            enemy.setBounce(0);
            enemy.setCollideWorldBounds(true);
            enemy.setVelocityX(80);
            enemy.minX = e.minX;
            enemy.maxX = e.maxX;
            enemy.body.allowGravity = true;
        });

        // Flag
        this.flag = this.physics.add.sprite(lvl.flag.x, lvl.flag.y, 'flag');
        this.flag.body.allowGravity = false;
        this.flag.setImmovable(true);

        // Player
        this.player = this.physics.add.sprite(lvl.playerStart.x, lvl.playerStart.y, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: ' + this.score, { fontSize: '18px', fill: '#fff', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 });
        this.levelText = this.add.text(400, 16, 'Level ' + (levelIdx + 1), { fontSize: '18px', fill: '#ffe44d', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
        this.coinsText = this.add.text(784, 16, 'Coins: 0/' + this.totalCoins, { fontSize: '18px', fill: '#ffd700', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0);
        this.add.text(400, 485, 'Arrow Keys to move, Up to jump', { fontSize: '12px', fill: '#fff', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
    }

    update() {
        if (this.gameOver) return;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-220);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(220);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-420);
        }

        this.enemies.children.each((enemy) => {
            if (enemy.x <= enemy.minX) enemy.setVelocityX(80);
            else if (enemy.x >= enemy.maxX) enemy.setVelocityX(-80);
        });

        if (this.player.y > 510) {
            this.playerDied();
        }
    }

    collectCoin(player, coin) {
        coin.destroy();
        this.score += 50;
        this.scoreText.setText('Score: ' + this.score);
        const remaining = this.coins.countActive();
        this.coinsText.setText('Coins: ' + (this.totalCoins - remaining) + '/' + this.totalCoins);

        const popup = this.add.text(coin.x, coin.y, '+50', {
            fontSize: '16px', fill: '#ffd700', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        this.tweens.add({ targets: popup, y: coin.y - 40, alpha: 0, duration: 500, onComplete: () => popup.destroy() });
    }

    hitEnemy(player, enemy) {
        if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
            enemy.destroy();
            player.setVelocityY(-300);
            this.score += 100;
            this.scoreText.setText('Score: ' + this.score);

            const popup = this.add.text(enemy.x, enemy.y, '+100', {
                fontSize: '16px', fill: '#ff4444', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5);
            this.tweens.add({ targets: popup, y: enemy.y - 40, alpha: 0, duration: 500, onComplete: () => popup.destroy() });
        } else {
            this.playerDied();
        }
    }

    playerDied() {
        if (this.gameOver) return;
        this.gameOver = true;

        for (let i = 0; i < 12; i++) {
            const p = this.add.circle(this.player.x, this.player.y, 4, 0xff4444);
            this.tweens.add({
                targets: p,
                x: this.player.x + Phaser.Math.Between(-50, 50),
                y: this.player.y + Phaser.Math.Between(-60, 20),
                alpha: 0, duration: 500, onComplete: () => p.destroy(),
            });
        }
        this.player.setVisible(false);

        this.add.rectangle(400, 250, 350, 180, 0x000000, 0.8).setOrigin(0.5);
        this.add.text(400, 200, 'YOU DIED!', { fontSize: '36px', fill: '#f77062', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.add.text(400, 240, 'Score: ' + this.score, { fontSize: '20px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);

        const retry = this.add.text(400, 290, 'Try Again', { fontSize: '20px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#1a1a3e', padding: { x: 20, y: 6 } }).setOrigin(0.5).setInteractive();
        retry.on('pointerdown', () => {
            this.score = 0;
            this.loadLevel(this.level - 1);
        });
    }

    reachFlag(player, flag) {
        if (this.gameOver) return;
        this.gameOver = true;

        this.score += 200;
        this.scoreText.setText('Score: ' + this.score);

        this.add.rectangle(400, 250, 380, 200, 0x000000, 0.8).setOrigin(0.5);
        this.add.text(400, 190, 'LEVEL COMPLETE!', { fontSize: '32px', fill: '#00ff88', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.add.text(400, 230, 'Score: ' + this.score, { fontSize: '22px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.add.text(400, 258, '+200 Level Bonus', { fontSize: '16px', fill: '#ffe44d', fontFamily: 'sans-serif' }).setOrigin(0.5);

        if (this.level < LEVELS.length) {
            const next = this.add.text(400, 310, 'Next Level', { fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#1a1a3e', padding: { x: 20, y: 6 } }).setOrigin(0.5).setInteractive();
            next.on('pointerdown', () => {
                this.level++;
                this.loadLevel(this.level - 1);
            });
        } else {
            this.add.text(400, 300, 'You beat all levels!', { fontSize: '20px', fill: '#ffe44d', fontFamily: 'sans-serif' }).setOrigin(0.5);
            const restart = this.add.text(400, 340, 'Play Again', { fontSize: '20px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#1a1a3e', padding: { x: 20, y: 6 } }).setOrigin(0.5).setInteractive();
            restart.on('pointerdown', () => {
                this.level = 1;
                this.score = 0;
                this.loadLevel(0);
            });
        }
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    backgroundColor: '#4488cc',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false },
    },
    scene: PlatformerScene,
});

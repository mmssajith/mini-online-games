import Phaser from 'phaser';
import { showLeaderboardUI, addLeaderboardButton } from '../shared/leaderboard-ui.js';

const FRUIT_COLORS = [
    { color: 0xff0000, name: 'apple', points: 10 },
    { color: 0xffa500, name: 'orange', points: 15 },
    { color: 0x800080, name: 'grape', points: 20 },
    { color: 0xffff00, name: 'banana', points: 12 },
    { color: 0x00ff00, name: 'lime', points: 25 },
];

class FruitCatcherScene extends Phaser.Scene {
    constructor() {
        super('FruitCatcher');
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.spawnTimer = 0;
        this.fruitsCaught = 0;
    }

    preload() {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        // Basket
        gfx.clear();
        gfx.fillStyle(0x8b4513);
        gfx.fillRoundedRect(0, 0, 80, 40, 4);
        gfx.fillStyle(0xa0522d);
        gfx.fillRoundedRect(4, 4, 72, 32, 3);
        gfx.fillStyle(0x8b4513);
        for (let i = 0; i < 5; i++) {
            gfx.fillRect(8 + i * 16, 4, 2, 32);
        }
        gfx.generateTexture('basket', 80, 40);

        // Fruits
        FRUIT_COLORS.forEach((f) => {
            gfx.clear();
            gfx.fillStyle(f.color);
            gfx.fillCircle(12, 12, 12);
            gfx.fillStyle(0x006600);
            gfx.fillRect(10, 0, 4, 6);
            gfx.generateTexture(f.name, 24, 24);
        });

        // Bomb
        gfx.clear();
        gfx.fillStyle(0x222222);
        gfx.fillCircle(14, 14, 14);
        gfx.fillStyle(0x444444);
        gfx.fillCircle(10, 10, 5);
        gfx.fillStyle(0xff4400);
        gfx.fillRect(12, 0, 4, 6);
        gfx.generateTexture('bomb', 28, 28);
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.spawnTimer = 0;
        this.fruitsCaught = 0;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x2d8a4e, 0x2d8a4e);
        bg.fillRect(0, 0, 800, 600);

        // Ground
        this.add.rectangle(400, 590, 800, 20, 0x4a7c3f);
        this.add.rectangle(400, 596, 800, 8, 0x3d6633);

        // Clouds
        for (let i = 0; i < 5; i++) {
            const cx = Phaser.Math.Between(50, 750);
            const cy = Phaser.Math.Between(30, 120);
            this.add.circle(cx, cy, 25, 0xffffff, 0.7);
            this.add.circle(cx + 20, cy - 10, 20, 0xffffff, 0.7);
            this.add.circle(cx - 20, cy - 5, 22, 0xffffff, 0.7);
        }

        this.basket = this.physics.add.sprite(400, 555, 'basket');
        this.basket.setCollideWorldBounds(true);
        this.basket.body.allowGravity = false;
        this.basket.setImmovable(true);

        this.fruits = this.physics.add.group();
        this.bombs = this.physics.add.group();

        this.cursors = this.input.keyboard.createCursorKeys();

        this.input.on('pointermove', (pointer) => {
            if (!this.gameOver) {
                this.basket.x = Phaser.Math.Clamp(pointer.x, 40, 760);
            }
        });

        this.physics.add.overlap(this.basket, this.fruits, this.catchFruit, null, this);
        this.physics.add.overlap(this.basket, this.bombs, this.hitBomb, null, this);

        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '22px', fill: '#fff', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2 });
        this.livesText = this.add.text(16, 44, 'Lives: 3', { fontSize: '22px', fill: '#ff4444', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2 });
        this.levelText = this.add.text(700, 16, 'Level 1', { fontSize: '22px', fill: '#ffe44d', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2 });
        addLeaderboardButton(this, 'fruit-catcher', 780, 16);
    }

    update(time) {
        if (this.gameOver) return;

        if (this.cursors.left.isDown) {
            this.basket.setVelocityX(-400);
        } else if (this.cursors.right.isDown) {
            this.basket.setVelocityX(400);
        } else {
            this.basket.setVelocityX(0);
        }

        if (time > this.spawnTimer) {
            const spawnDelay = Math.max(400, 1200 - this.level * 80);
            this.spawnTimer = time + spawnDelay;

            if (Math.random() < 0.2 + this.level * 0.02) {
                const bomb = this.bombs.create(Phaser.Math.Between(30, 770), -20, 'bomb');
                bomb.setVelocityY(Phaser.Math.Between(150, 200 + this.level * 20));
                bomb.body.allowGravity = false;
            } else {
                const fruitType = Phaser.Math.RND.pick(FRUIT_COLORS);
                const fruit = this.fruits.create(Phaser.Math.Between(30, 770), -20, fruitType.name);
                fruit.setVelocityY(Phaser.Math.Between(120, 180 + this.level * 15));
                fruit.body.allowGravity = false;
                fruit.points = fruitType.points;
            }
        }

        this.fruits.children.each((fruit) => {
            if (fruit.y > 620) fruit.destroy();
        });
        this.bombs.children.each((bomb) => {
            if (bomb.y > 620) bomb.destroy();
        });
    }

    catchFruit(_basket, fruit) {
        const pts = fruit.points || 10;
        this.score += pts;
        this.fruitsCaught++;
        this.scoreText.setText('Score: ' + this.score);

        const popup = this.add.text(fruit.x, fruit.y, '+' + pts, {
            fontSize: '18px', fill: '#ffe44d', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        this.tweens.add({ targets: popup, y: fruit.y - 50, alpha: 0, duration: 600, onComplete: () => popup.destroy() });

        fruit.destroy();

        if (this.fruitsCaught % 15 === 0) {
            this.level++;
            this.levelText.setText('Level ' + this.level);
            const lvlUp = this.add.text(400, 300, 'LEVEL ' + this.level + '!', {
                fontSize: '48px', fill: '#ffe44d', fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5);
            this.tweens.add({ targets: lvlUp, alpha: 0, scale: 2, duration: 1000, onComplete: () => lvlUp.destroy() });
        }
    }

    hitBomb(basket, bomb) {
        bomb.destroy();
        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);

        this.cameras.main.flash(300, 255, 0, 0);
        basket.setTint(0xff0000);
        this.time.delayedCall(200, () => basket.clearTint());

        if (this.lives <= 0) {
            this.gameOver = true;
            this.physics.pause();
            showLeaderboardUI(this, 'fruit-catcher', this.score);
        }
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 200 }, debug: false },
    },
    scene: FruitCatcherScene,
});

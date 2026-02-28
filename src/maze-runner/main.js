import Phaser from 'phaser';
import { showLeaderboardUI, addLeaderboardButton } from '../shared/leaderboard-ui.js';

const CELL = 40;
const COLS = 19;
const ROWS = 13;
const WIDTH = COLS * CELL + 40;
const HEIGHT = ROWS * CELL + 100;

function generateMaze(cols, rows) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = { visited: false, walls: { top: true, right: true, bottom: true, left: true } };
        }
    }

    const stack = [];
    let current = { r: 0, c: 0 };
    grid[0][0].visited = true;
    let visitedCount = 1;
    const total = cols * rows;

    while (visitedCount < total) {
        const neighbors = [];
        const { r, c } = current;
        if (r > 0 && !grid[r - 1][c].visited) neighbors.push({ r: r - 1, c, dir: 'top' });
        if (c < cols - 1 && !grid[r][c + 1].visited) neighbors.push({ r, c: c + 1, dir: 'right' });
        if (r < rows - 1 && !grid[r + 1][c].visited) neighbors.push({ r: r + 1, c, dir: 'bottom' });
        if (c > 0 && !grid[r][c - 1].visited) neighbors.push({ r, c: c - 1, dir: 'left' });

        if (neighbors.length > 0) {
            const next = Phaser.Math.RND.pick(neighbors);
            stack.push(current);

            if (next.dir === 'top') { grid[r][c].walls.top = false; grid[next.r][next.c].walls.bottom = false; }
            if (next.dir === 'right') { grid[r][c].walls.right = false; grid[next.r][next.c].walls.left = false; }
            if (next.dir === 'bottom') { grid[r][c].walls.bottom = false; grid[next.r][next.c].walls.top = false; }
            if (next.dir === 'left') { grid[r][c].walls.left = false; grid[next.r][next.c].walls.right = false; }

            current = { r: next.r, c: next.c };
            grid[current.r][current.c].visited = true;
            visitedCount++;
        } else if (stack.length > 0) {
            current = stack.pop();
        }
    }
    return grid;
}

class MazeRunnerScene extends Phaser.Scene {
    constructor() {
        super('MazeRunner');
        this.level = 1;
        this.bestTime = Infinity;
        this.playerPos = { col: 0, row: 0 };
        this.canMove = true;
        this.moveDelay = 0;
        this.timeLeft = 60;
    }

    create() {
        this.startLevel();
    }

    startLevel() {
        this.children.removeAll();
        this.canMove = true;
        this.moveDelay = 0;

        this.maze = generateMaze(COLS, ROWS);
        const ox = 20, oy = 60;

        // Draw maze
        const gfx = this.add.graphics();
        gfx.fillStyle(0x222255, 1);
        gfx.fillRect(ox, oy, COLS * CELL, ROWS * CELL);

        gfx.lineStyle(2, 0x4facfe, 1);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = ox + c * CELL;
                const y = oy + r * CELL;
                const cell = this.maze[r][c];
                if (cell.walls.top) { gfx.beginPath(); gfx.moveTo(x, y); gfx.lineTo(x + CELL, y); gfx.strokePath(); }
                if (cell.walls.right) { gfx.beginPath(); gfx.moveTo(x + CELL, y); gfx.lineTo(x + CELL, y + CELL); gfx.strokePath(); }
                if (cell.walls.bottom) { gfx.beginPath(); gfx.moveTo(x, y + CELL); gfx.lineTo(x + CELL, y + CELL); gfx.strokePath(); }
                if (cell.walls.left) { gfx.beginPath(); gfx.moveTo(x, y); gfx.lineTo(x, y + CELL); gfx.strokePath(); }
            }
        }

        // Exit
        const ex = ox + (COLS - 1) * CELL + CELL / 2;
        const ey = oy + (ROWS - 1) * CELL + CELL / 2;
        const exit = this.add.circle(ex, ey, 10, 0x00ff88);
        this.tweens.add({ targets: exit, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
        this.add.text(ex, ey - 18, 'EXIT', { fontSize: '10px', fill: '#00ff88', fontFamily: 'sans-serif' }).setOrigin(0.5);

        // Player
        this.playerPos = { col: 0, row: 0 };
        const px = ox + CELL / 2;
        const py = oy + CELL / 2;
        this.player = this.add.circle(px, py, 12, 0xf77062);
        this.playerInner = this.add.circle(px, py, 8, 0xff9988);

        // UI
        this.add.text(WIDTH / 2, 16, 'MAZE RUNNER', { fontSize: '24px', fill: '#4facfe', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.levelText = this.add.text(16, 36, 'Level: ' + this.level, { fontSize: '16px', fill: '#ffe44d', fontFamily: 'sans-serif' });

        this.timeLeft = Math.max(20, 60 - (this.level - 1) * 5);
        this.timerText = this.add.text(WIDTH - 16, 36, 'Time: ' + this.timeLeft + 's', { fontSize: '16px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(1, 0);
        this.bestText = this.add.text(WIDTH / 2, 36, this.bestTime === Infinity ? '' : 'Best: ' + this.bestTime + 's', { fontSize: '16px', fill: '#00ff88', fontFamily: 'sans-serif' }).setOrigin(0.5, 0);
        this.add.text(WIDTH / 2, HEIGHT - 20, 'Use Arrow Keys or WASD to move', { fontSize: '13px', fill: '#666', fontFamily: 'sans-serif' }).setOrigin(0.5);
        addLeaderboardButton(this, 'maze-runner', WIDTH - 16, 16);

        // Timer
        if (this.timerEvent) this.timerEvent.remove();
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.timerText.setText('Time: ' + this.timeLeft + 's');
                if (this.timeLeft <= 10) this.timerText.setColor('#f77062');
                if (this.timeLeft <= 0) this.showResult(false);
            },
            loop: true,
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    }

    update(time) {
        if (!this.canMove) return;
        if (time < this.moveDelay) return;

        const cell = this.maze[this.playerPos.row][this.playerPos.col];
        let moved = false;

        if ((this.cursors.up.isDown || this.wasd.up.isDown) && !cell.walls.top) { this.playerPos.row--; moved = true; }
        else if ((this.cursors.down.isDown || this.wasd.down.isDown) && !cell.walls.bottom) { this.playerPos.row++; moved = true; }
        else if ((this.cursors.left.isDown || this.wasd.left.isDown) && !cell.walls.left) { this.playerPos.col--; moved = true; }
        else if ((this.cursors.right.isDown || this.wasd.right.isDown) && !cell.walls.right) { this.playerPos.col++; moved = true; }

        if (moved) {
            this.moveDelay = time + 120;
            const ox = 20, oy = 60;

            this.add.circle(this.player.x, this.player.y, 4, 0xf77062, 0.3);

            const nx = ox + this.playerPos.col * CELL + CELL / 2;
            const ny = oy + this.playerPos.row * CELL + CELL / 2;
            this.player.setPosition(nx, ny);
            this.playerInner.setPosition(nx, ny);

            if (this.playerPos.col === COLS - 1 && this.playerPos.row === ROWS - 1) {
                this.showResult(true);
            }
        }
    }

    showResult(won) {
        this.canMove = false;
        if (this.timerEvent) this.timerEvent.remove();

        const elapsed = Math.max(20, 60 - (this.level - 1) * 5) - this.timeLeft;

        this.add.rectangle(WIDTH / 2, HEIGHT / 2, 340, 220, 0x000000, 0.85).setOrigin(0.5);

        if (won) {
            if (elapsed < this.bestTime) this.bestTime = elapsed;
            this.add.text(WIDTH / 2, HEIGHT / 2 - 60, 'MAZE COMPLETE!', { fontSize: '32px', fill: '#00ff88', fontFamily: 'sans-serif' }).setOrigin(0.5);
            this.add.text(WIDTH / 2, HEIGHT / 2 - 20, 'Time: ' + elapsed + 's', { fontSize: '22px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);
            this.add.text(WIDTH / 2, HEIGHT / 2 + 10, 'Best: ' + this.bestTime + 's', { fontSize: '18px', fill: '#ffe44d', fontFamily: 'sans-serif' }).setOrigin(0.5);
            const next = this.add.text(WIDTH / 2, HEIGHT / 2 + 55, 'Next Level', { fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#1a1a3e', padding: { x: 20, y: 8 } }).setOrigin(0.5).setInteractive();
            next.on('pointerdown', () => { this.level++; this.startLevel(); });
            next.on('pointerover', () => next.setStyle({ fill: '#00f2fe' }));
            next.on('pointerout', () => next.setStyle({ fill: '#4facfe' }));
        } else {
            if (this.bestTime !== Infinity) {
                showLeaderboardUI(this, 'maze-runner', this.bestTime, {
                    onRestart: () => { this.level = 1; this.bestTime = Infinity; this.startLevel(); },
                });
            } else {
                this.add.text(WIDTH / 2, HEIGHT / 2 - 50, "TIME'S UP!", { fontSize: '36px', fill: '#f77062', fontFamily: 'sans-serif' }).setOrigin(0.5);
                this.add.text(WIDTH / 2, HEIGHT / 2, 'Reached Level ' + this.level, { fontSize: '22px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);
                const restart = this.add.text(WIDTH / 2, HEIGHT / 2 + 50, 'Try Again', { fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#1a1a3e', padding: { x: 20, y: 8 } }).setOrigin(0.5).setInteractive();
                restart.on('pointerdown', () => { this.level = 1; this.bestTime = Infinity; this.startLevel(); });
                restart.on('pointerover', () => restart.setStyle({ fill: '#00f2fe' }));
                restart.on('pointerout', () => restart.setStyle({ fill: '#4facfe' }));
            }
        }
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#1a1a3e',
    scene: MazeRunnerScene,
});

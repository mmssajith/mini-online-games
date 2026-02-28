import Phaser from 'phaser';

const GRID_COLS = 10;
const GRID_ROWS = 12;
const BUBBLE_SIZE = 48;
const PADDING = 40;
const WIDTH = GRID_COLS * BUBBLE_SIZE + PADDING * 2;
const HEIGHT = GRID_ROWS * BUBBLE_SIZE + 140;

const COLORS = [
    { hex: 0xff4444, name: 'red' },
    { hex: 0x44aaff, name: 'blue' },
    { hex: 0x44dd44, name: 'green' },
    { hex: 0xffaa22, name: 'orange' },
    { hex: 0xdd44dd, name: 'purple' },
];

class BubblePopScene extends Phaser.Scene {
    constructor() {
        super('BubblePop');
        this.grid = [];
        this.bubbleSprites = [];
        this.score = 0;
        this.movesLeft = 30;
        this.isAnimating = false;
    }

    create() {
        this.initGame();
    }

    initGame() {
        this.children.removeAll();
        this.grid = [];
        this.bubbleSprites = [];
        this.score = 0;
        this.movesLeft = 30;
        this.isAnimating = false;

        // Header
        this.add.rectangle(WIDTH / 2, 30, WIDTH, 60, 0x162840);
        this.add.text(WIDTH / 2, 16, 'BUBBLE POP', { fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.scoreText = this.add.text(16, 40, 'Score: 0', { fontSize: '16px', fill: '#fff', fontFamily: 'sans-serif' });
        this.movesText = this.add.text(WIDTH - 16, 40, 'Moves: 30', { fontSize: '16px', fill: '#ffe44d', fontFamily: 'sans-serif' }).setOrigin(1, 0);
        this.comboText = this.add.text(WIDTH / 2, HEIGHT / 2, '', { fontSize: '36px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setAlpha(0);

        for (let r = 0; r < GRID_ROWS; r++) {
            this.grid[r] = [];
            this.bubbleSprites[r] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                const colorIdx = Phaser.Math.Between(0, COLORS.length - 1);
                this.grid[r][c] = colorIdx;
                const x = PADDING + c * BUBBLE_SIZE + BUBBLE_SIZE / 2;
                const y = 80 + r * BUBBLE_SIZE + BUBBLE_SIZE / 2;
                const bubble = this.createBubble(x, y, colorIdx, r, c);
                this.bubbleSprites[r][c] = bubble;
            }
        }
    }

    createBubble(x, y, colorIdx, gridR, gridC) {
        const color = COLORS[colorIdx].hex;
        const container = this.add.container(x, y);

        const bg = this.add.circle(0, 0, BUBBLE_SIZE / 2 - 3, color);
        const shine = this.add.circle(-6, -8, 6, 0xffffff, 0.3);
        container.add([bg, shine]);
        container.bg = bg;
        container.setSize(BUBBLE_SIZE - 4, BUBBLE_SIZE - 4);
        container.gridR = gridR;
        container.gridC = gridC;
        container.setInteractive();

        container.on('pointerdown', () => this.onBubbleClick(gridR, gridC));
        container.on('pointerover', () => { if (!this.isAnimating) this.highlightGroup(gridR, gridC); });
        container.on('pointerout', () => { if (!this.isAnimating) this.clearHighlight(); });

        return container;
    }

    getGroup(r, c) {
        if (this.grid[r][c] === -1) return [];
        const color = this.grid[r][c];
        const visited = new Set();
        const stack = [{ r, c }];
        const group = [];

        while (stack.length > 0) {
            const { r: cr, c: cc } = stack.pop();
            const key = cr + ',' + cc;
            if (visited.has(key)) continue;
            if (cr < 0 || cr >= GRID_ROWS || cc < 0 || cc >= GRID_COLS) continue;
            if (this.grid[cr][cc] !== color) continue;

            visited.add(key);
            group.push({ r: cr, c: cc });
            stack.push({ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 });
        }
        return group;
    }

    highlightGroup(r, c) {
        this.clearHighlight();
        const group = this.getGroup(r, c);
        if (group.length < 2) return;
        group.forEach(({ r, c }) => {
            const sprite = this.bubbleSprites[r][c];
            if (sprite) sprite.setScale(1.1);
        });
    }

    clearHighlight() {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.bubbleSprites[r][c]) this.bubbleSprites[r][c].setScale(1);
            }
        }
    }

    onBubbleClick(r, c) {
        if (this.isAnimating) return;
        const group = this.getGroup(r, c);
        if (group.length < 2) return;

        this.isAnimating = true;
        this.movesLeft--;
        this.movesText.setText('Moves: ' + this.movesLeft);

        const pts = group.length * group.length * 10;
        this.score += pts;
        this.scoreText.setText('Score: ' + this.score);

        if (group.length >= 5) {
            const label = group.length >= 8 ? 'AMAZING!' : 'GREAT!';
            this.comboText.setText(label + ' +' + pts);
            this.comboText.setAlpha(1).setScale(0.5);
            this.tweens.add({ targets: this.comboText, scale: 1.2, alpha: 0, duration: 800 });
        }

        let popped = 0;
        group.forEach(({ r, c }) => {
            this.grid[r][c] = -1;
            const sprite = this.bubbleSprites[r][c];
            if (sprite) {
                this.tweens.add({
                    targets: sprite, scale: 0, alpha: 0, duration: 250, delay: popped * 30,
                    onComplete: () => { sprite.destroy(); this.bubbleSprites[r][c] = null; },
                });
                popped++;
            }
        });

        this.time.delayedCall(300 + popped * 30, () => {
            this.dropBubbles();
            this.time.delayedCall(400, () => {
                this.refillGrid();
                this.time.delayedCall(350, () => {
                    this.isAnimating = false;
                    if (this.movesLeft <= 0) this.showGameOver();
                });
            });
        });
    }

    dropBubbles() {
        for (let c = 0; c < GRID_COLS; c++) {
            let writeRow = GRID_ROWS - 1;
            for (let r = GRID_ROWS - 1; r >= 0; r--) {
                if (this.grid[r][c] !== -1) {
                    if (r !== writeRow) {
                        this.grid[writeRow][c] = this.grid[r][c];
                        this.grid[r][c] = -1;

                        const sprite = this.bubbleSprites[r][c];
                        this.bubbleSprites[writeRow][c] = sprite;
                        this.bubbleSprites[r][c] = null;

                        if (sprite) {
                            const wr = writeRow;
                            const ny = 80 + writeRow * BUBBLE_SIZE + BUBBLE_SIZE / 2;
                            this.tweens.add({ targets: sprite, y: ny, duration: 300, ease: 'Bounce.easeOut' });

                            sprite.removeAllListeners();
                            sprite.gridR = wr;
                            sprite.gridC = c;
                            sprite.setInteractive();
                            sprite.on('pointerdown', () => this.onBubbleClick(wr, c));
                            sprite.on('pointerover', () => { if (!this.isAnimating) this.highlightGroup(wr, c); });
                            sprite.on('pointerout', () => { if (!this.isAnimating) this.clearHighlight(); });
                        }
                    }
                    writeRow--;
                }
            }
        }
    }

    refillGrid() {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.grid[r][c] === -1) {
                    const colorIdx = Phaser.Math.Between(0, COLORS.length - 1);
                    this.grid[r][c] = colorIdx;
                    const x = PADDING + c * BUBBLE_SIZE + BUBBLE_SIZE / 2;
                    const y = 80 + r * BUBBLE_SIZE + BUBBLE_SIZE / 2;
                    const bubble = this.createBubble(x, y - 200, colorIdx, r, c);
                    bubble.setScale(0);
                    this.bubbleSprites[r][c] = bubble;
                    this.tweens.add({ targets: bubble, y: y, scale: 1, duration: 300, ease: 'Back.easeOut' });
                }
            }
        }
    }

    showGameOver() {
        this.isAnimating = true;
        this.add.rectangle(WIDTH / 2, HEIGHT / 2, 320, 200, 0x000000, 0.85).setOrigin(0.5);
        this.add.text(WIDTH / 2, HEIGHT / 2 - 50, 'NO MOVES LEFT', { fontSize: '28px', fill: '#f77062', fontFamily: 'sans-serif' }).setOrigin(0.5);
        this.add.text(WIDTH / 2, HEIGHT / 2 - 10, 'Final Score: ' + this.score, { fontSize: '22px', fill: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5);
        const restart = this.add.text(WIDTH / 2, HEIGHT / 2 + 40, 'Play Again', { fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif', backgroundColor: '#162840', padding: { x: 20, y: 8 } }).setOrigin(0.5).setInteractive();
        restart.on('pointerdown', () => this.initGame());
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#0e1a2b',
    scene: BubblePopScene,
});

import { submitScore, getTopScores, formatScore } from './leaderboard.js';

/**
 * Adds a small leaderboard button (trophy icon) to the scene.
 * Clicking it opens a read-only leaderboard overlay.
 *
 * @param {Phaser.Scene} scene
 * @param {string} gameId
 * @param {number} x
 * @param {number} y
 */
export function addLeaderboardButton(scene, gameId, x, y) {
    const btn = scene.add.text(x, y, '\u{1F3C6}', {
        fontSize: '26px', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    btn.on('pointerover', () => btn.setScale(1.2));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerdown', () => showLeaderboardView(scene, gameId));

    return btn;
}

/**
 * Shows a read-only leaderboard overlay (no score submission).
 * Used for viewing the leaderboard mid-game.
 */
export function showLeaderboardView(scene, gameId) {
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;
    const depth = 200;

    const elements = [];
    const add = (obj) => { obj.setDepth(depth); elements.push(obj); return obj; };

    // Block input to game underneath
    const blocker = add(scene.add.rectangle(cx, cy, w, h, 0x000000, 0.85).setInteractive());

    // Title
    add(scene.add.text(cx, cy - 160, 'LEADERBOARD', {
        fontSize: '36px', fill: '#ffe44d', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    // Loading text
    const loadingText = add(scene.add.text(cx, cy, 'Loading...', {
        fontSize: '18px', fill: '#aaa', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    // Close button
    const closeBtn = add(scene.add.text(cx, cy + 180, '[ CLOSE ]', {
        fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));

    closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#fff' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#4facfe' }));
    closeBtn.on('pointerdown', () => {
        elements.forEach((el) => el.destroy());
    });

    // Fetch and display scores
    getTopScores(gameId, 10).then((topScores) => {
        loadingText.destroy();

        const startY = cy - 110;
        const lineHeight = 24;

        if (topScores.length === 0) {
            add(scene.add.text(cx, cy, 'No scores yet!', {
                fontSize: '18px', fill: '#666', fontFamily: 'sans-serif',
            }).setOrigin(0.5));
        } else {
            topScores.forEach((entry, i) => {
                const rank = String(i + 1).padStart(2) + '.';
                const color = i === 0 ? '#ffe44d' : i < 3 ? '#ffa500' : '#fff';
                const line = rank + ' ' + entry.name.padEnd(16) + '  ' + formatScore(gameId, entry.score);
                add(scene.add.text(cx, startY + i * lineHeight, line, {
                    fontSize: '16px', fill: color, fontFamily: 'monospace',
                }).setOrigin(0.5));
            });
        }
    }).catch((err) => {
        console.error('Failed to fetch leaderboard:', err);
        loadingText.setText('Failed to load leaderboard');
    });
}

/**
 * Shows a full-screen leaderboard overlay on game over.
 *
 * @param {Phaser.Scene} scene
 * @param {string} gameId
 * @param {number} score
 * @param {object} [options]
 * @param {function} [options.onRestart] - Custom restart callback. Defaults to scene.scene.restart().
 */
export function showLeaderboardUI(scene, gameId, score, options = {}) {
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;
    const depth = 100;

    // Container for all overlay elements — easy cleanup
    const elements = [];
    const add = (obj) => { obj.setDepth(depth); elements.push(obj); return obj; };

    // Dim overlay
    add(scene.add.rectangle(cx, cy, w, h, 0x000000, 0.8));

    // GAME OVER title
    add(scene.add.text(cx, cy - 160, 'GAME OVER', {
        fontSize: '40px', fill: '#f77062', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    // Score
    add(scene.add.text(cx, cy - 120, 'Score: ' + formatScore(gameId, score), {
        fontSize: '24px', fill: '#fff', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    // Name input
    let playerName = '';
    const maxLen = 16;

    const promptText = add(scene.add.text(cx, cy - 80, 'Enter your name:', {
        fontSize: '18px', fill: '#aaa', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    const nameDisplay = add(scene.add.text(cx, cy - 52, '|', {
        fontSize: '22px', fill: '#4facfe', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    // Blinking cursor
    const cursorBlink = scene.tweens.add({
        targets: {},
        duration: 530,
        yoyo: true,
        repeat: -1,
        onYoyo: () => nameDisplay.setText(playerName + '|'),
        onRepeat: () => nameDisplay.setText(playerName + ' '),
    });

    const updateNameDisplay = () => {
        nameDisplay.setText(playerName + '|');
    };

    // Keyboard capture for name input
    const onKeyDown = (event) => {
        if (event.key === 'Enter' && playerName.trim().length > 0) {
            scene.input.keyboard.off('keydown', onKeyDown);
            cursorBlink.stop();
            nameDisplay.setText(playerName);
            promptText.setText('Submitting...');
            doSubmit();
            return;
        }
        if (event.key === 'Backspace') {
            playerName = playerName.slice(0, -1);
            updateNameDisplay();
            return;
        }
        if (event.key.length === 1 && playerName.length < maxLen) {
            playerName += event.key;
            updateNameDisplay();
        }
    };
    scene.input.keyboard.on('keydown', onKeyDown);

    async function doSubmit() {
        try {
            await submitScore(gameId, playerName.trim(), score);
            promptText.setText('Score submitted!');
        } catch (err) {
            console.error('Failed to submit score:', err);
            promptText.setText('Offline — score not saved');
        }
        showLeaderboard();
    }

    async function showLeaderboard() {
        let topScores = [];
        try {
            topScores = await getTopScores(gameId, 10);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        }

        // Leaderboard title
        add(scene.add.text(cx, cy - 20, 'TOP 10 LEADERBOARD', {
            fontSize: '18px', fill: '#ffe44d', fontFamily: 'sans-serif',
        }).setOrigin(0.5));

        const startY = cy + 10;
        const lineHeight = 22;

        if (topScores.length === 0) {
            add(scene.add.text(cx, startY, 'No scores yet!', {
                fontSize: '16px', fill: '#666', fontFamily: 'sans-serif',
            }).setOrigin(0.5));
        } else {
            topScores.forEach((entry, i) => {
                const rank = (i + 1) + '.';
                const isPlayer = entry.name === playerName.trim() && entry.score === score;
                const color = isPlayer ? '#ffe44d' : '#fff';

                const line = rank + ' ' + entry.name.padEnd(16) + '  ' + formatScore(gameId, entry.score);
                add(scene.add.text(cx, startY + i * lineHeight, line, {
                    fontSize: '15px', fill: color, fontFamily: 'monospace',
                }).setOrigin(0.5));
            });
        }

        // Play Again button
        const btnY = Math.min(startY + topScores.length * lineHeight + 30, h - 30);
        const btn = add(scene.add.text(cx, btnY, '[ PLAY AGAIN ]', {
            fontSize: '24px', fill: '#4facfe', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));

        btn.on('pointerover', () => btn.setStyle({ fill: '#fff' }));
        btn.on('pointerout', () => btn.setStyle({ fill: '#4facfe' }));
        btn.on('pointerdown', () => {
            elements.forEach((el) => el.destroy());
            if (options.onRestart) {
                options.onRestart();
            } else {
                scene.scene.restart();
            }
        });
    }
}

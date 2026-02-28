import { db } from './firebase.js';
import { ref, push, query, orderByChild, limitToLast, get } from 'firebase/database';

// Games where lower score is better (time-based)
const LOWER_IS_BETTER = new Set(['maze-runner']);

export async function submitScore(gameId, name, score) {
    const scoresRef = ref(db, `leaderboards/${gameId}`);
    await push(scoresRef, {
        name,
        score,
        timestamp: Date.now(),
    });
}

export async function getTopScores(gameId, limit = 10) {
    const scoresRef = ref(db, `leaderboards/${gameId}`);
    const q = query(scoresRef, orderByChild('score'), limitToLast(100));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const entries = [];
    snapshot.forEach((child) => {
        entries.push(child.val());
    });

    if (LOWER_IS_BETTER.has(gameId)) {
        entries.sort((a, b) => a.score - b.score);
    } else {
        entries.sort((a, b) => b.score - a.score);
    }

    return entries.slice(0, limit);
}

export function formatScore(gameId, score) {
    if (LOWER_IS_BETTER.has(gameId)) {
        return score + 's';
    }
    return String(score);
}

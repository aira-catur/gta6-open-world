// save.js — localStorage progress: cash, story position and lifetime stats.
// One job: persistence. The game auto-saves after every mission event and payout.

const SAVE_KEY = 'neon-harbor-save-v1';

export function saveProgress(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.floor(data.money),
      missionIndex: data.missionIndex,
      completedCount: data.completedCount,
      totalEarned: Math.floor(data.totalEarned || 0),
      timesBusted: data.timesBusted || 0,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch { return false; }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch { return null; }
}

export function hasSaveGame() { return loadProgress() !== null; }

export function clearProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
}

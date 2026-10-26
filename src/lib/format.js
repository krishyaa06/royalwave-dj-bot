/** Seconds -> "3:07" or "1:02:09". Live streams show "LIVE". */
function duration(sec, live = false) {
    if (live || !Number.isFinite(sec) || sec <= 0) return live ? 'LIVE' : '0:00';
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "1:30", "90", "1:02:03", "2m10s" -> seconds. Returns null when invalid. */
function parseTime(input) {
    if (input == null) return null;
    const str = String(input).trim().toLowerCase();
    if (/^\d+$/.test(str)) return Number(str);
    if (/^\d+(:\d{1,2}){1,2}$/.test(str)) {
        return str.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
    }
    const m = str.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
    if (m && (m[1] || m[2] || m[3])) return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
    return null;
}

/** ━━━━━━●────────── style progress bar */
function progressBar(current, total, size = 16, chars = { done: '━', head: '●', todo: '─' }) {
    if (!total) return chars.head + chars.todo.repeat(size - 1);
    const ratio = Math.min(Math.max(current / total, 0), 1);
    const pos = Math.min(Math.round(ratio * (size - 1)), size - 1);
    return chars.done.repeat(pos) + chars.head + chars.todo.repeat(size - pos - 1);
}

const truncate = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

module.exports = { duration, parseTime, progressBar, truncate };

/**
 * Tiny JSON-file database.
 * - No native dependencies (works on Termux, Replit, any VPS)
 * - Debounced, atomic writes (write to .tmp then rename)
 */
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.BOT_DATA_DIR || path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

class JsonStore {
    constructor(name, defaults = {}) {
        this.file = path.join(DATA_DIR, `${name}.json`);
        this.defaults = defaults;
        this.data = this.#load();
        this.timer = null;
    }

    #load() {
        try {
            return JSON.parse(fs.readFileSync(this.file, 'utf8'));
        } catch {
            return structuredClone(this.defaults);
        }
    }

    save() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.flush(), 500);
        this.timer.unref?.();
    }

    flush() {
        clearTimeout(this.timer);
        const tmp = `${this.file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
        fs.renameSync(tmp, this.file);
    }
}

const stores = {
    settings: new JsonStore('settings'),
    premium: new JsonStore('premium', { guilds: {}, keys: {} }),
    playlists: new JsonStore('playlists'),
    stats: new JsonStore('stats', { tracksPlayed: 0, secondsPlayed: 0, commandsRun: 0, daily: {} })
};

const flushAll = () => Object.values(stores).forEach(s => { try { s.flush(); } catch { /* read-only fs */ } });
process.on('exit', flushAll);
process.on('SIGINT', () => { flushAll(); process.exit(0); });
process.on('SIGTERM', () => { flushAll(); process.exit(0); });

module.exports = { ...stores, JsonStore, DATA_DIR };

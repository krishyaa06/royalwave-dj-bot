const { EventEmitter } = require('node:events');
const GuildPlayer = require('./GuildPlayer');
const settings = require('../settings');

class PlayerManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.players = new Map();
    }

    get(guildId) { return this.players.get(guildId); }

    settingsFor(guildId) { return settings.get(guildId); }

    create(guild) {
        let player = this.players.get(guild.id);
        if (!player) {
            const s = settings.get(guild.id);
            player = new GuildPlayer(this, guild, { volume: s.defaultVolume, filter: s.defaultFilter || 'off' });
            this.players.set(guild.id, player);
        }
        return player;
    }

    stats() {
        let listeners = 0;
        let playing = 0;
        for (const p of this.players.values()) {
            if (p.current) playing++;
            const ch = p.channelId && this.client.channels.cache.get(p.channelId);
            if (ch) listeners += ch.members.filter(m => !m.user.bot).size;
        }
        return { activePlayers: this.players.size, playing, listeners };
    }
}

module.exports = PlayerManager;

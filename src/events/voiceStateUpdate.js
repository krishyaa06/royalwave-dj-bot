const { Events } = require('discord.js');
const settings = require('../lib/settings');
const { tierOf } = require('../lib/premium');

const timers = new Map();

/** Leaves 2 minutes after the channel empties (unless 24/7 Premium mode is on). */
module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState, client) {
        const guildId = (oldState.guild || newState.guild).id;
        const player = client.music.get(guildId);
        if (!player?.channelId) return;

        // Bot was moved or kicked
        if (newState.id === client.user.id && !newState.channelId) return player.destroy();

        const channel = newState.guild.channels.cache.get(player.channelId);
        const humans = channel ? channel.members.filter(m => !m.user.bot).size : 0;
        const s = settings.get(guildId);
        const stay = s.alwaysOn && tierOf(guildId).alwaysOn;

        if (humans === 0 && s.autoLeave && !stay) {
            if (!timers.has(guildId)) {
                player.pause();
                const t = setTimeout(() => { timers.delete(guildId); client.music.get(guildId)?.destroy(); }, 120_000);
                t.unref?.();
                timers.set(guildId, t);
            }
        } else if (humans > 0 && timers.has(guildId)) {
            clearTimeout(timers.get(guildId));
            timers.delete(guildId);
            player.resume();
        }
    }
};

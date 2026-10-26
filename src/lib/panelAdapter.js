/**
 * Music-bot hooks for the generic panel API.
 */
const settings = require('./settings');
const premium = require('./premium');
const sources = require('./sources');
const { FILTERS } = require('./filters');
const { stats } = require('./db');
const pkg = require('../../package.json');
const brand = require('../../bot.config');

const ctx = () => ({ filters: Object.keys(FILTERS), stations: sources.stationIds() });

module.exports = client => ({
    botId: brand.id,
    version: pkg.version,
    schema: settings.SCHEMA,
    commands: () => [...client.commands.values()].filter(c => !c.owner).map(c => ({ name: c.data.name, description: c.data.description, premium: Boolean(c.premium) })),
    options: () => ({
        filters: Object.entries(FILTERS).map(([id, f]) => ({ id, label: `${f.emoji} ${f.label}` })),
        stations: sources.STATIONS.map(s => ({ id: s.id, label: `${s.name} · ${s.genre}` }))
    }),
    publicStats: () => ({
        ...client.music.stats(),
        tracksPlayed: stats.data.tracksPlayed,
        hoursStreamed: Math.round(stats.data.secondsPlayed / 3600),
        premiumServers: premium.summary().activeServers
    }),
    guildBadge: id => ({ tier: premium.tierOf(id).id }),
    getSettings: id => settings.get(id),
    updateSettings: (id, patch) => settings.update(id, patch, ctx()),
    guildExtra: id => {
        const g = premium.getGuild(id);
        const player = client.music.get(id);
        return {
            premium: { tier: g.tier.id, name: g.tier.name, expiresAt: g.expiresAt, limits: g.tier },
            tiers: premium.TIERS,
            player: player ? player.toJSON() : null
        };
    },
    actions: {
        redeem: ({ guild, body, user }) => premium.redeem({ code: body.key, guildId: guild.id, userId: user.id }),
        pause: ({ guild }) => ({ ok: Boolean(client.music.get(guild.id)?.pause()) }),
        resume: ({ guild }) => ({ ok: Boolean(client.music.get(guild.id)?.resume()) }),
        skip: ({ guild }) => { const p = client.music.get(guild.id); if (!p?.current) return { ok: false, error: 'Nothing playing' }; p.skip(); return { ok: true }; },
        stop: ({ guild }) => { const p = client.music.get(guild.id); if (!p) return { ok: false, error: 'Not connected' }; p.stop(); return { ok: true }; }
    }
});

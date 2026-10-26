const { Events, ActivityType } = require('discord.js');
const log = require('../lib/logger');
const sources = require('../lib/sources');
const config = require('../config');
const brand = require('../../bot.config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        log.ok(`Logged in as ${client.user.tag} • ${client.guilds.cache.size} servers`);
        await sources.initSoundCloud(config.soundcloudClientId);
        let i = 0;
        const rotate = () => {
            const s = brand.statuses[i++ % brand.statuses.length];
            client.user.setActivity(s.name.replace('{servers}', client.guilds.cache.size), { type: ActivityType[s.type] ?? ActivityType.Listening });
        };
        rotate();
        setInterval(rotate, 30_000).unref();
    }
};

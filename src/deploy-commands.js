const { REST, Routes } = require('discord.js');
const config = require('./config');
const log = require('./lib/logger');
const { loadCommands } = require('./lib/loader');

const body = [...loadCommands().values()].map(c => c.data.toJSON());

if (!config.token || !config.clientId) {
    log.error('DISCORD_TOKEN and CLIENT_ID are required in .env');
    process.exit(1);
}

const rest = new REST().setToken(config.token);

(async () => {
    try {
        const route = config.guildId
            ? Routes.applicationGuildCommands(config.clientId, config.guildId)
            : Routes.applicationCommands(config.clientId);
        log.info(`Registering ${body.length} slash commands ${config.guildId ? 'to guild ' + config.guildId : 'globally'}...`);
        await rest.put(route, { body });
        log.ok('Slash commands registered.');
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
})();

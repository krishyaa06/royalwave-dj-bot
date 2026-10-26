const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const log = require('./lib/logger');
const { loadCommands, loadEvents } = require('./lib/loader');
const PlayerManager = require('./lib/player');
const embeds = require('./lib/embeds');
const settings = require('./lib/settings');
const panelApi = require('./lib/panelApi');
const pkg = require('../package.json');

if (!config.token) {
    log.error('DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

log.banner(config.brand.name, pkg.version);

// No privileged intents needed: slash commands only.
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.commands = loadCommands();
client.music = new PlayerManager(client);
log.info(`Loaded ${client.commands.size} commands`);
loadEvents(client);

// Now-playing cards
client.music.on('trackStart', async (player, track) => {
    if (!settings.get(player.guild.id).announceTracks || !player.textChannelId) return;
    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel?.isTextBased()) return;
    await player.lastCard?.delete().catch(() => {});
    player.lastCard = await channel.send({ embeds: [embeds.nowPlaying(player)], components: embeds.controls(player) }).catch(() => null);
    log.info(`[${player.guild.name}] ▶ ${track.title}`);
});
client.music.on('trackError', (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send({ embeds: [embeds.error(`Could not play **${track?.title || 'that track'}**. Skipping.`)] }).catch(() => {});
});
client.music.on('queueEnd', player => {
    player.lastCard?.edit({ components: [] }).catch(() => {});
});

if (config.panel.port) panelApi.start(client, config.panel, require('./lib/panelAdapter')(client));

process.on('unhandledRejection', err => log.error('Unhandled rejection:', err));
client.login(config.token);

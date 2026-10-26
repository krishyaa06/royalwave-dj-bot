const { Events } = require('discord.js');
const embeds = require('../lib/embeds');
const log = require('../lib/logger');
const { stats } = require('../lib/db');
const { inVoice, isDJ } = require('../lib/guards');
const { voteOrSkip } = require('../commands/music/skip');

const cooldowns = new Map();

async function reply(interaction, payload) {
    if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
    return interaction.reply(payload).catch(() => {});
}

/** Now-playing card buttons: mp:pause | mp:skip | mp:stop | mp:loop | mp:shuffle */
async function handleButton(interaction, client) {
    const player = client.music.get(interaction.guildId);
    if (!player?.current) return reply(interaction, { embeds: [embeds.error('Nothing is playing.')], ephemeral: true });
    const v = inVoice(interaction, player);
    if (!v.ok) return reply(interaction, { embeds: [embeds.error(v.msg)], ephemeral: true });
    const action = interaction.customId.split(':')[1];
    if (action === 'skip') return reply(interaction, voteOrSkip(interaction, player));
    if (!isDJ(interaction, player)) return reply(interaction, { embeds: [embeds.error('You need the DJ role for that.')], ephemeral: true });

    if (action === 'pause') { if (!player.pause()) player.resume(); }
    if (action === 'stop') { player.stop(); return interaction.update({ embeds: [embeds.info('⏹️ Stopped.')], components: [] }); }
    if (action === 'loop') player.loop = { off: 'track', track: 'queue', queue: 'off' }[player.loop];
    if (action === 'shuffle') player.shuffle();
    return interaction.update({ embeds: [embeds.nowPlaying(player)], components: embeds.controls(player) });
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            if (interaction.isAutocomplete()) {
                const cmd = client.commands.get(interaction.commandName);
                return cmd?.autocomplete ? await cmd.autocomplete(interaction, client) : undefined;
            }
            if (interaction.isButton() && interaction.customId.startsWith('mp:')) return await handleButton(interaction, client);
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            if (!interaction.inGuild()) return reply(interaction, { embeds: [embeds.error('Commands only work inside a server.')], ephemeral: true });

            const seconds = command.cooldown ?? 2;
            const key = `${command.data.name}:${interaction.user.id}`;
            if (Date.now() < (cooldowns.get(key) || 0)) {
                return reply(interaction, { embeds: [embeds.error('Slow down a little and try again.')], ephemeral: true });
            }
            cooldowns.set(key, Date.now() + seconds * 1000);
            stats.data.commandsRun++;
            stats.save();

            await command.execute(interaction, client);
        } catch (err) {
            log.error(`Interaction failed (${interaction.commandName || interaction.customId}):`, err);
            await reply(interaction, { embeds: [embeds.error('Something went wrong. Please try again.')], ephemeral: true });
        }
    }
};

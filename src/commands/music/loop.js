const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loop the track, the whole queue, or turn looping off')
        .addStringOption(o => o.setName('mode').setDescription('Loop mode').setRequired(true)
            .addChoices({ name: '🔂 Track', value: 'track' }, { name: '🔁 Queue', value: 'queue' }, { name: '⏹️ Off', value: 'off' })),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        player.loop = interaction.options.getString('mode');
        await interaction.reply({ embeds: [embeds.success(`Loop: **${player.loop}**.`)] });
    }
};

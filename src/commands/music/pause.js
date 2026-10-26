const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        if (!player.pause()) return interaction.reply({ embeds: [embeds.error('Already paused. Use /resume.')], ephemeral: true });
        await interaction.reply({ embeds: [embeds.success('Paused.')] });
    }
};

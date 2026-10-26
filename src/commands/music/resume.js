const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        if (!player.resume()) return interaction.reply({ embeds: [embeds.error('Not paused.')], ephemeral: true });
        await interaction.reply({ embeds: [embeds.success('Resumed.')] });
    }
};

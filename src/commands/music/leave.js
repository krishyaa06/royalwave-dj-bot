const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('leave').setDescription('Disconnect from the voice channel'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true, playing: false });
        if (!player) return;
        player.destroy();
        await interaction.reply({ embeds: [embeds.success('Left the voice channel. See you soon 👋')] });
    }
};

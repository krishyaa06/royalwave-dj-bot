const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');

module.exports = {
    data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the current track with controls'),
    async execute(interaction, client) {
        const player = client.music.get(interaction.guildId);
        if (!player?.current) return interaction.reply({ embeds: [embeds.error('Nothing is playing right now.')], ephemeral: true });
        await interaction.reply({ embeds: [embeds.nowPlaying(player)], components: embeds.controls(player) });
    }
};

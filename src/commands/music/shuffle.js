const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        if (player.queue.length < 2) return interaction.reply({ embeds: [embeds.error('Add at least two tracks to shuffle.')], ephemeral: true });
        player.shuffle();
        await interaction.reply({ embeds: [embeds.success(`Shuffled **${player.queue.length}** tracks.`)] });
    }
};

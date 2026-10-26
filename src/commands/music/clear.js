const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('clear').setDescription('Clear upcoming tracks (keeps the current one)'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        const n = player.queue.length;
        player.queue = [];
        await interaction.reply({ embeds: [embeds.success(`Cleared **${n}** upcoming tracks.`)] });
    }
};

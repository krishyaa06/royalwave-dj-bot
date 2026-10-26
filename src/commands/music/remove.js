const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(o => o.setName('position').setDescription('Queue position').setRequired(true).setMinValue(1)),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        const pos = interaction.options.getInteger('position');
        const t = player.remove(pos - 1);
        if (!t) return interaction.reply({ embeds: [embeds.error(`There is no track #${pos}.`)], ephemeral: true });
        await interaction.reply({ embeds: [embeds.success(`Removed **${t.title}**.`)] });
    }
};

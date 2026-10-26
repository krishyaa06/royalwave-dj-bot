const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a track to another queue position')
        .addIntegerOption(o => o.setName('from').setDescription('Current position').setRequired(true).setMinValue(1))
        .addIntegerOption(o => o.setName('to').setDescription('New position').setRequired(true).setMinValue(1)),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        const from = interaction.options.getInteger('from');
        const to = Math.min(interaction.options.getInteger('to'), player.queue.length);
        const t = player.move(from - 1, to - 1);
        if (!t) return interaction.reply({ embeds: [embeds.error(`There is no track #${from}.`)], ephemeral: true });
        await interaction.reply({ embeds: [embeds.success(`Moved **${t.title}** to **#${to}**.`)] });
    }
};

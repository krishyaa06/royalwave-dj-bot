const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');
const { parseTime, duration } = require('../../lib/format');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Jump to a time in the current track')
        .addStringOption(o => o.setName('time').setDescription('e.g. 1:30, 90 or 2m10s').setRequired(true)),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        const sec = parseTime(interaction.options.getString('time'));
        if (sec == null) return interaction.reply({ embeds: [embeds.error('Use a time like `1:30`, `90` or `2m10s`.')], ephemeral: true });
        await interaction.deferReply();
        try {
            await player.seek(sec);
            await interaction.editReply({ embeds: [embeds.success(`Jumped to \`${duration(sec)}\`.`)] });
        } catch (err) {
            await interaction.editReply({ embeds: [embeds.error(err.message)] });
        }
    }
};

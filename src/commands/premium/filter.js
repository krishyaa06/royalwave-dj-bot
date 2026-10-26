const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { FILTERS, choices } = require('../../lib/filters');
const { requirePlayer } = require('../../lib/music');
const { hasPremium } = require('../../lib/guards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('💎 Apply an audio effect: bass boost, nightcore, 8D, lo-fi and more')
        .addStringOption(o => o.setName('effect').setDescription('Effect').setRequired(true).addChoices(...choices())),
    premium: true,
    async execute(interaction, client) {
        const name = interaction.options.getString('effect');
        if (name !== 'off' && !hasPremium(interaction.guildId, 'filters')) return interaction.reply(embeds.premiumUpsell('Audio filters'));
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        await interaction.deferReply();
        await player.setFilter(name);
        const f = FILTERS[name];
        await interaction.editReply({ embeds: [embeds.success(name === 'off' ? 'Filters cleared.' : `${f.emoji} **${f.label}** is on.`)] });
    }
};

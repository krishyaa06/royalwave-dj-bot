const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');
const { tierOf } = require('../../lib/premium');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the volume (Free: up to 100, Premium: up to 200)')
        .addIntegerOption(o => o.setName('level').setDescription('1-200').setRequired(true).setMinValue(1).setMaxValue(200)),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true });
        if (!player) return;
        const level = interaction.options.getInteger('level');
        const tier = tierOf(interaction.guildId);
        if (level > tier.maxVolume) return interaction.reply(embeds.premiumUpsell(`Volume above ${tier.maxVolume}%`));
        player.setVolume(level);
        await interaction.reply({ embeds: [embeds.success(`Volume set to **${level}%**.`)] });
    }
};

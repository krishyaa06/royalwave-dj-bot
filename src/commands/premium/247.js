const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../lib/embeds');
const settings = require('../../lib/settings');
const { hasPremium } = require('../../lib/guards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('💎 Keep the bot in voice 24/7, even when the queue ends')
        .addBooleanOption(o => o.setName('enabled').setDescription('On or off').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    premium: true,
    async execute(interaction) {
        const on = interaction.options.getBoolean('enabled');
        if (on && !hasPremium(interaction.guildId, 'alwaysOn')) return interaction.reply(embeds.premiumUpsell('24/7 mode'));
        settings.update(interaction.guildId, { alwaysOn: on });
        await interaction.reply({ embeds: [embeds.success(on ? '24/7 mode is **on**. I will stay in voice.' : '24/7 mode is **off**.')] });
    }
};

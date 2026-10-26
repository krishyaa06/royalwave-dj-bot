const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../lib/embeds');
const { redeem } = require('../../lib/premium');
const brand = require('../../../bot.config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a Premium key for this server')
        .addStringOption(o => o.setName('key').setDescription(`Your key, e.g. ${brand.keyPrefix}-XXXX-XXXX-XXXX`).setRequired(true).setMaxLength(40))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    cooldown: 10,
    async execute(interaction) {
        const r = redeem({ code: interaction.options.getString('key'), guildId: interaction.guildId, userId: interaction.user.id });
        if (!r.ok) return interaction.reply({ embeds: [embeds.error(r.error)], ephemeral: true });
        await interaction.reply({
            embeds: [embeds.base(brand.colors.premium)
                .setTitle(`${brand.emoji.premium} ${r.tier.name} activated`)
                .setDescription(`Thank you for supporting ${brand.name}! **${interaction.guild.name}** now has **${r.tier.name}**${r.expiresAt ? ` until <t:${Math.floor(r.expiresAt / 1000)}:D>` : ' forever'}.\n\nTry \`/filter\`, \`/247\`, \`/autoplay\` and \`/playlist\`.`)]
        });
    }
};

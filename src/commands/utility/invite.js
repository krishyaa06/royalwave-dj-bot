const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../lib/embeds');
const brand = require('../../../bot.config');

module.exports = {
    data: new SlashCommandBuilder().setName('invite').setDescription(`Add ${brand.short} to another server`),
    async execute(interaction, client) {
        const url = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot+applications.commands&permissions=3230720`;
        await interaction.reply({
            embeds: [embeds.info(`${brand.emoji.brand} Bring **${brand.name}** to your server. It's free, with optional Premium.`)],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Invite').setURL(url),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Support server').setURL(brand.links.support)
            )]
        });
    }
};

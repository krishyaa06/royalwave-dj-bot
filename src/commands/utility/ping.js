const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Check latency'),
    async execute(interaction, client) {
        const sent = Date.now();
        await interaction.reply({ embeds: [embeds.info('🏓 Pinging…')] });
        await interaction.editReply({ embeds: [embeds.info(`🏓 **Pong!** API \`${Date.now() - sent}ms\` · Gateway \`${Math.round(client.ws.ping)}ms\``)] });
    }
};

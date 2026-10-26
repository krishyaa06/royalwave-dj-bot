const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { generateKeys, summary } = require('../../lib/premium');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('genkey')
        .setDescription('Owner only: create Premium keys after a purchase')
        .addStringOption(o => o.setName('tier').setDescription('Plan').setRequired(true)
            .addChoices({ name: 'Premium', value: 'premium' }, { name: 'Premium+', value: 'plus' }))
        .addIntegerOption(o => o.setName('days').setDescription('Validity in days (0 = lifetime)').setRequired(true).setMinValue(0).setMaxValue(3650))
        .addIntegerOption(o => o.setName('count').setDescription('How many keys').setMinValue(1).setMaxValue(20)),
    owner: true,
    async execute(interaction) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ embeds: [embeds.error('Only the bot owner can create keys.')], ephemeral: true });
        }
        const codes = generateKeys({
            tier: interaction.options.getString('tier'),
            days: interaction.options.getInteger('days'),
            count: interaction.options.getInteger('count') || 1,
            createdBy: interaction.user.id
        });
        const s = summary();
        await interaction.reply({
            embeds: [embeds.success(`Created **${codes.length}** key(s). They are shown only once:\n\`\`\`\n${codes.join('\n')}\n\`\`\`\nActive premium servers: **${s.activeServers}** · unused keys: **${s.keysUnused}**`)],
            ephemeral: true
        });
    }
};
